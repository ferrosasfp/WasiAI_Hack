const { expect } = require("chai");
const { ethers } = require("hardhat");

const RIGHTS_API = 1;
const RIGHTS_DOWNLOAD = 2;
const KIND_PERPETUAL = 0;
const KIND_SUBSCRIPTION = 1;

describe("Marketplace", function () {
  let deployer, creator, buyer, other;
  let market;

  beforeEach(async () => {
    [deployer, creator, buyer, other] = await ethers.getSigners();
    const feeBps = 500; // 5%
    const feeRecipient = await deployer.getAddress();
    const modelsLimit = 0;

    const Marketplace = await ethers.getContractFactory("Marketplace", deployer);
    market = await Marketplace.deploy(feeBps, feeRecipient, modelsLimit, await deployer.getAddress());
    await market.waitForDeployment();
  });

  async function listBasic(slug, opts = {}) {
    const royalty = opts.royalty ?? 1000;
    const pricePerp = opts.pricePerp ?? ethers.parseEther("0.001");
    const priceSub = opts.priceSub ?? 0;
    const durationDays = opts.durationDays ?? 0;
    const rights = opts.rights ?? RIGHTS_API;
    const delivery = opts.delivery ?? RIGHTS_API;
    const termsHash = opts.termsHash ?? ("0x" + "11".repeat(32));

    const tx = await market.listOrUpgrade(
      slug,
      "Model One",
      "ipfs://cid",
      royalty,
      pricePerp,
      priceSub,
      durationDays,
      rights,
      delivery,
      termsHash
    );
    return tx;
  }

  it("lists a perpetual-only model and buys a perpetual license", async () => {
    const tx = await listBasic("fam-a");
    await expect(tx).to.emit(market, "ModelListed");

    const m = await market.models(1);
    expect(m.listed).to.eq(true);
    expect(m.pricePerpetual).to.gt(0n);
    expect(m.priceSubscription).to.eq(0n);

    const price = m.pricePerpetual;
    await expect(
      market.connect(buyer).buyLicense(1, KIND_PERPETUAL, 0, true, { value: price })
    ).to.emit(market, "LicenseMinted");

    const lid = await market.lastLicenseId();
    expect(lid).to.eq(1n);

    const licAddr = await market.licenseNFTAddress();
    const lic = await ethers.getContractAt("LicenseNFT", licAddr);
    expect(await lic.ownerOf(lid)).to.eq(await buyer.getAddress());
  });

  it("lists a subscription model and buys/renews correctly", async () => {
    const tx1 = await listBasic("fam-b", { pricePerp: 0, priceSub: 100, durationDays: 30 });
    await expect(tx1).to.emit(market, "ModelListed");

    const m = await market.models(1);
    const price = m.priceSubscription * 2n;
    await expect(
      market.connect(buyer).buyLicense(1, KIND_SUBSCRIPTION, 2, false, { value: price })
    ).to.emit(market, "LicenseMinted");

    const lid = await market.lastLicenseId();
    const licAddr = await market.licenseNFTAddress();
    const lic = await ethers.getContractAt("LicenseNFT", licAddr);

    await expect(market.renewLicense(lid, 1, { value: 100 })).to.be.revertedWithCustomError(market, "NotOwner");
    await expect(market.connect(buyer).renewLicense(lid, 1, { value: 100 }))
      .to.emit(market, "LicenseRenewed");
  });

  it("enforces fee + royalty <= 100% and price caps", async () => {
    await expect(await listBasic("cap-ok", { royalty: 9500 })).to.emit(market, "ModelListed");
    await expect(listBasic("cap-bad", { royalty: 9800 })).to.be.revertedWithCustomError(market, "FeePlusRoyaltyOver100");

    const MAX_PRICE_CAP = await market.MAX_PRICE_CAP();
    await expect(listBasic("cap2", { pricePerp: MAX_PRICE_CAP + 1n })).to.be.revertedWithCustomError(market, "PriceTooHigh");

    // Use a monthly price below the cap and months=3 to exceed the total cap
    const monthly = (MAX_PRICE_CAP / 3n) + 1n; // below cap
    const tx2 = await listBasic("sub-cap", { pricePerp: 0, priceSub: monthly, durationDays: 30 });
    await expect(tx2).to.emit(market, "ModelListed");
    // months = 3 => total > cap
    const latestId = (await market.nextId()) - 1n;
    await expect(
      market.connect(buyer).buyLicense(latestId, KIND_SUBSCRIPTION, 3, { value: monthly * 3n })
    ).to.be.revertedWithCustomError(market, "PriceTooHigh");
  });

  it("versioning per family increments and unlists previous", async () => {
    const tx3 = await listBasic("fam-v");
    await expect(tx3).to.emit(market, "ModelListed");
    let fam = await market.families(await deployer.getAddress(), ethers.keccak256(ethers.toUtf8Bytes("fam-v")));
    expect(fam.latestId).to.eq(1n);
    expect(fam.latestVersion).to.eq(1);

    const tx4 = await listBasic("fam-v", { pricePerp: 2000n });
    await expect(tx4).to.emit(market, "ModelUnlisted");

    fam = await market.families(await deployer.getAddress(), ethers.keccak256(ethers.toUtf8Bytes("fam-v")));
    expect(fam.latestId).to.eq(2n);
    expect(fam.latestVersion).to.eq(2);

    const old = await market.models(1);
    expect(old.listed).to.eq(false);
    const cur = await market.models(2);
    expect(cur.listed).to.eq(true);
  });

  it("pause blocks state-changing ops", async () => {
    await market.setPaused(true);
    await expect(listBasic("paused")).to.be.revertedWithCustomError(market, "MarketIsPaused");
  });

  it("revocation by admin and model owner works and blocks renew", async () => {
    await listBasic("fam-r", { pricePerp: 0, priceSub: 100, durationDays: 30 });
    const price = 100n;
    await market.connect(buyer).buyLicense(1, KIND_SUBSCRIPTION, 1, false, { value: price });
    const lid = await market.lastLicenseId();

    await expect(market.revokeByModelOwner(lid)).to.emit(market, "LicenseRevoked");
    await expect(market.connect(buyer).renewLicense(lid, 1, { value: price })).to.be.revertedWithCustomError(market, "LicenseRevokedError");

    await market.connect(buyer).buyLicense(1, KIND_SUBSCRIPTION, 1, false, { value: price });
    const lid2 = await market.lastLicenseId();
    await expect(market.revokeByAdmin(lid2)).to.emit(market, "LicenseRevoked");
  });

  it("distributes fee/royalty/seller amounts correctly (perpetual)", async () => {
    // feeBps = 5%, royalty = 10%
    const [, , , feeRecSigner] = await ethers.getSigners();
    const feeRecipient = await feeRecSigner.getAddress();
    const royaltyBps = 1000; // 10%
    const pricePerp = ethers.parseEther("1");
    const tx = await listBasic("dist", { royalty: royaltyBps, pricePerp });
    await expect(tx).to.emit(market, "ModelListed");

    // Redirect marketplace fees to dedicated recipient to avoid balance noise
    await market.setFees(500, feeRecipient);

    const m = await market.models(1);
    const creator = m.creator;
    const seller = m.owner;

    const balFeeBefore = await ethers.provider.getBalance(feeRecipient);
    const balCreatorBefore = await ethers.provider.getBalance(creator);
    const balSellerBefore = creator.toLowerCase() === seller.toLowerCase()
      ? balCreatorBefore
      : await ethers.provider.getBalance(seller);

    await expect(market.connect(buyer).buyLicense(1, KIND_PERPETUAL, 0, false, { value: pricePerp }))
      .to.emit(market, "LicenseMinted");

    const feePaid = (pricePerp * 5n) / 100n; // 5%
    const royaltyPaid = (pricePerp * BigInt(royaltyBps)) / 10000n;
    const sellerAmount = pricePerp - feePaid - royaltyPaid;

    const balFeeAfter = await ethers.provider.getBalance(feeRecipient);
    const balCreatorAfter = await ethers.provider.getBalance(creator);
    const balSellerAfter = creator.toLowerCase() === seller.toLowerCase()
      ? balCreatorAfter
      : await ethers.provider.getBalance(seller);

    expect(balFeeAfter - balFeeBefore).to.eq(feePaid);
    if (creator.toLowerCase() === seller.toLowerCase()) {
      expect(balCreatorAfter - balCreatorBefore).to.eq(royaltyPaid + sellerAmount);
    } else {
      expect(balCreatorAfter - balCreatorBefore).to.eq(royaltyPaid);
      expect(balSellerAfter - balSellerBefore).to.eq(sellerAmount);
    }
  });

  it("modelsLimit enforces cap and allows same-family upgrade swap 1:1", async () => {
    // Set limit to 1
    await market.setModelsLimit(1);
    const txA = await listBasic("fam-cap-a");
    await expect(txA).to.emit(market, "ModelListed");
    const beforeActive = await market.activeModels();
    expect(beforeActive).to.eq(1n);

    // Upgrade same family should pass and keep activeModels at 1
    const txA2 = await listBasic("fam-cap-a", { pricePerp: ethers.parseEther("2") });
    await expect(txA2).to.emit(market, "ModelUnlisted");
    const activeAfterUpgrade = await market.activeModels();
    expect(activeAfterUpgrade).to.eq(1n);

    // Listing a different family should revert due to cap
    await expect(listBasic("fam-cap-b")).to.be.revertedWithCustomError(market, "ModelsLimitReached");
  });

  it("licenseStatus matrix: perpetual vs subscription, rights and revoked/expired", async () => {
    // Perpetual with both rights (3) -> always valid
    const txP = await listBasic("mx-perp", { rights: RIGHTS_API | RIGHTS_DOWNLOAD });
    await expect(txP).to.emit(market, "ModelListed");
    const priceP = (await market.models(1)).pricePerpetual;
    await market.connect(buyer).buyLicense(1, KIND_PERPETUAL, 0, false, { value: priceP });
    const lidP = await market.lastLicenseId();
    let st = await market.licenseStatus(lidP);
    expect(st.revoked_).to.eq(false);
    expect(st.validApi).to.eq(true);
    expect(st.validDownload).to.eq(true);

    // Subscription API-only for 1 month; after expiration, invalid
    const txS = await listBasic("mx-sub", { pricePerp: 0, priceSub: 100, durationDays: 1, rights: RIGHTS_API });
    await expect(txS).to.emit(market, "ModelListed");
    await market.connect(buyer).buyLicense(2, KIND_SUBSCRIPTION, 1, false, { value: 100 });
    const lidS = await market.lastLicenseId();
    st = await market.licenseStatus(lidS);
    expect(st.validApi).to.eq(true);
    expect(st.validDownload).to.eq(false);

    // Advance time beyond expiresAt
    const now = BigInt((await ethers.provider.getBlock('latest')).timestamp);
    const after = now + (2n * 24n * 60n * 60n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(after)]);
    await ethers.provider.send("evm_mine", []);
    st = await market.licenseStatus(lidS);
    expect(st.validApi).to.eq(false);
    expect(st.validDownload).to.eq(false);

    // Revoke perpetual and verify
    await expect(market.revokeByAdmin(lidP)).to.emit(market, "LicenseRevoked");
    st = await market.licenseStatus(lidP);
    expect(st.revoked_).to.eq(true);
    expect(st.validApi).to.eq(false);
    expect(st.validDownload).to.eq(false);
  });

  it("fuzz months within range and bps edge values", async () => {
    // Fuzz months 1..20 for subscription
    const tx = await listBasic("fuzz-sub", { pricePerp: 0, priceSub: 7, durationDays: 30 });
    await expect(tx).to.emit(market, "ModelListed");
    for (let m = 1; m <= 20; m++) {
      const total = 7n * BigInt(m);
      await expect(market.connect(buyer).buyLicense(1, KIND_SUBSCRIPTION, m, false, { value: total }))
        .to.emit(market, "LicenseMinted");
    }

    // BPS edges for setFees
    await expect(market.setFees(0, await (await ethers.getSigners())[0].getAddress()))
      .to.emit(market, "MarketFeesSet");
    await expect(market.setFees(2000, await (await ethers.getSigners())[0].getAddress()))
      .to.emit(market, "MarketFeesSet");
    await expect(market.setFees(2001, await (await ethers.getSigners())[0].getAddress()))
      .to.be.revertedWithCustomError(market, "FeeOverCap");
    await expect(market.setFees(10_001, await (await ethers.getSigners())[0].getAddress()))
      .to.be.revertedWithCustomError(market, "InvalidBps");
  });

  it("negative reentrancy via fee recipient, creator and seller receivers", async () => {
    // Deploy reentrant receiver
    const Reentrant = await ethers.getContractFactory("ReentrantFeeReceiver");
    const r = await Reentrant.deploy(await market.getAddress());
    await r.waitForDeployment();

    // Set as fee recipient
    await market.setFees(500, await r.getAddress());
    // List a model by deployer (so creator/seller are deployer). Try buy -> receiver tries reenter on fee
    await expect(await listBasic("re-fee"))
      .to.emit(market, "ModelListed");
    const price = (await market.models(1)).pricePerpetual;
    await expect(market.connect(buyer).buyLicense(1, KIND_PERPETUAL, 0, false, { value: price }))
      .to.emit(market, "LicenseMinted");

    // Now creator/seller as reentrant: list via r.listSelf so creator/seller == r
    await r.listSelf("re-seller", "N", "ipfs://", 0, ethers.parseEther("0.001"), 0, 0, RIGHTS_API, RIGHTS_API, "0x" + "22".repeat(32));
    // set params for reentry attempt
    await r.setParams(2, KIND_PERPETUAL, 0);
    const price2 = (await market.models(2)).pricePerpetual;
    await expect(market.connect(buyer).buyLicense(2, KIND_PERPETUAL, 0, false, { value: price2 }))
      .to.emit(market, "LicenseMinted");
  });

  it("listOrUpgrade and setLicensingParams validate rights and delivery", async () => {
    // Invalid rights (bitmask not 1,2,3)
    await expect(listBasic("inv-rights", { rights: 4 })).to.be.revertedWithCustomError(market, "InvalidRights");
    // Valid list
    const tx = await listBasic("ok-rights", { rights: RIGHTS_API, delivery: RIGHTS_API });
    await expect(tx).to.emit(market, "ModelListed");
    // Invalid delivery on setLicensingParams
    const m = await market.models(1);
    await expect(
      market.setLicensingParams(1, m.pricePerpetual, m.priceSubscription, m.defaultDurationDays, m.deliveryRightsDefault, 4, m.termsHash)
    ).to.be.revertedWithCustomError(market, "InvalidDelivery");
  });

  it("licenseStatus extra combos: download-only and exact expiry boundary", async () => {
    // Download only perpetual => always validDownload
    const txP = await listBasic("dl-perp", { rights: RIGHTS_DOWNLOAD });
    await expect(txP).to.emit(market, "ModelListed");
    const priceP = (await market.models(1)).pricePerpetual;
    await market.connect(buyer).buyLicense(1, KIND_PERPETUAL, 0, false, { value: priceP });
    const lidP = await market.lastLicenseId();
    let st = await market.licenseStatus(lidP);
    expect(st.validApi).to.eq(false);
    expect(st.validDownload).to.eq(true);

    // Subscription rights both, 1 day duration, check exact boundary
    const txS = await listBasic("dl-sub", { pricePerp: 0, priceSub: 1, durationDays: 1, rights: RIGHTS_API | RIGHTS_DOWNLOAD });
    await expect(txS).to.emit(market, "ModelListed");
    await market.connect(buyer).buyLicense(2, KIND_SUBSCRIPTION, 1, false, { value: 1 });
    const lidS = await market.lastLicenseId();
    st = await market.licenseStatus(lidS);
    const exp = st.expiresAt;
    // Jump exactly to expiry timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(exp)]);
    await ethers.provider.send("evm_mine", []);
    st = await market.licenseStatus(lidS);
    // At boundary, notExpired = block.timestamp < expiresAt => false
    expect(st.validApi).to.eq(false);
    expect(st.validDownload).to.eq(false);
  });

  it("renew handles large months and reverts when total exceeds cap", async () => {
    const monthly = 10n; // small base
    const txS = await listBasic("big-renew", { pricePerp: 0, priceSub: monthly, durationDays: 30 });
    await expect(txS).to.emit(market, "ModelListed");
    await market.connect(buyer).buyLicense(1, KIND_SUBSCRIPTION, 1, false, { value: monthly });
    const lid = await market.lastLicenseId();
    // Large months within safe range
    await expect(market.connect(buyer).renewLicense(lid, 1000, { value: monthly * 1000n }))
      .to.emit(market, "LicenseRenewed");

    // Now configure a high monthly price to trigger cap on renew but affordable buy
    const monthlyHigh = ethers.parseEther("4000"); // 4000 ETH
    const tx2 = await listBasic("cap-renew", { pricePerp: 0, priceSub: monthlyHigh, durationDays: 30 });
    await expect(tx2).to.emit(market, "ModelListed");
    await market.connect(buyer).buyLicense(2, KIND_SUBSCRIPTION, 1, false, { value: monthlyHigh });
    const lid2 = await market.lastLicenseId();
    // 26 months * 4000 ETH = 104,000 ETH > MAX_PRICE_CAP => revert (value is ignored due to early revert)
    await expect(market.connect(buyer).renewLicense(lid2, 26, { value: 0 }))
      .to.be.revertedWithCustomError(market, "PriceTooHigh");
  });
});
