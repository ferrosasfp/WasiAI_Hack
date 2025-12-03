const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Security Tests", function () {
  
  // ============ FIXTURES ============
  
  async function deployInferenceSplitterFixture() {
    const [owner, seller, creator, marketplace, user, attacker] = await ethers.getSigners();
    
    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    // Deploy InferenceSplitter
    const InferenceSplitter = await ethers.getContractFactory("InferenceSplitter");
    const splitter = await InferenceSplitter.deploy(
      await usdc.getAddress(),
      marketplace.address,
      marketplace.address
    );
    
    // Mint USDC to users
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await usdc.mint(attacker.address, ethers.parseUnits("10000", 6));
    
    return { splitter, usdc, owner, seller, creator, marketplace, user, attacker };
  }
  
  async function deployMarketplaceV2Fixture() {
    const [owner, seller, creator, feeRecipient, buyer, attacker] = await ethers.getSigners();
    
    const MarketplaceV2 = await ethers.getContractFactory("MarketplaceV2");
    const marketplace = await MarketplaceV2.deploy(
      250, // 2.5% fee
      feeRecipient.address,
      0, // no limit
      owner.address
    );
    
    return { marketplace, owner, seller, creator, feeRecipient, buyer, attacker };
  }

  // ============ INFERENCE SPLITTER TESTS ============
  
  describe("InferenceSplitter Security", function () {
    
    it("Should prevent unauthorized split configuration", async function () {
      const { splitter, attacker, seller, creator } = await loadFixture(deployInferenceSplitterFixture);
      
      await expect(
        splitter.connect(attacker).configureSplit(1, seller.address, creator.address, 500, 250)
      ).to.be.revertedWithCustomError(splitter, "OnlyAuthorizedCaller");
    });
    
    it("Should enforce BPS limits on split configuration", async function () {
      const { splitter, owner, seller, creator } = await loadFixture(deployInferenceSplitterFixture);
      
      // Royalty too high (>20%)
      await expect(
        splitter.connect(owner).configureSplit(1, seller.address, creator.address, 2500, 250)
      ).to.be.revertedWithCustomError(splitter, "InvalidBps");
      
      // Marketplace fee too high (>10%)
      await expect(
        splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 1500)
      ).to.be.revertedWithCustomError(splitter, "InvalidBps");
    });
    
    it("Should enforce minimum withdrawal amount", async function () {
      const { splitter, usdc, owner, seller, creator, user } = await loadFixture(deployInferenceSplitterFixture);
      
      // Configure split
      await splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 250);
      
      // Approve and distribute small amount
      await usdc.connect(user).approve(await splitter.getAddress(), ethers.parseUnits("0.001", 6));
      await splitter.connect(owner).setAuthorizedCaller(user.address, true);
      await splitter.connect(user).distributePayment(1, ethers.parseUnits("0.001", 6));
      
      // Try to withdraw (should fail - below minimum)
      await expect(
        splitter.connect(seller).withdraw()
      ).to.be.revertedWithCustomError(splitter, "BelowMinimumWithdrawal");
    });
    
    it("Should enforce timelock on marketplace wallet change", async function () {
      const { splitter, owner, attacker } = await loadFixture(deployInferenceSplitterFixture);
      
      // Request change
      await splitter.connect(owner).requestMarketplaceWalletChange(attacker.address);
      
      // Try to execute immediately (should fail)
      await expect(
        splitter.connect(owner).executeMarketplaceWalletChange()
      ).to.be.revertedWithCustomError(splitter, "TimelockNotExpired");
      
      // Advance time by 24 hours
      await time.increase(24 * 60 * 60);
      
      // Now should succeed
      await expect(
        splitter.connect(owner).executeMarketplaceWalletChange()
      ).to.not.be.reverted;
    });
    
    it("Should prevent reentrancy in withdraw", async function () {
      const { splitter, usdc, owner, seller, creator, user } = await loadFixture(deployInferenceSplitterFixture);
      
      // Configure split
      await splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 250);
      
      // Distribute payment
      await usdc.connect(user).approve(await splitter.getAddress(), ethers.parseUnits("100", 6));
      await splitter.connect(owner).setAuthorizedCaller(user.address, true);
      await splitter.connect(user).distributePayment(1, ethers.parseUnits("100", 6));
      
      // Withdraw should work (ReentrancyGuard protects)
      const sellerBalanceBefore = await usdc.balanceOf(seller.address);
      await splitter.connect(seller).withdraw();
      const sellerBalanceAfter = await usdc.balanceOf(seller.address);
      
      expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
    });
    
    it("Should correctly calculate split amounts", async function () {
      const { splitter, owner, seller, creator } = await loadFixture(deployInferenceSplitterFixture);
      
      // Configure: 5% royalty, 2.5% marketplace
      await splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 250);
      
      const amount = ethers.parseUnits("100", 6); // $100 USDC
      const [sellerAmount, creatorAmount, marketplaceAmount] = await splitter.calculateSplit(1, amount);
      
      // Marketplace: 2.5% = $2.50
      expect(marketplaceAmount).to.equal(ethers.parseUnits("2.5", 6));
      
      // Creator: 5% = $5.00
      expect(creatorAmount).to.equal(ethers.parseUnits("5", 6));
      
      // Seller: 92.5% = $92.50
      expect(sellerAmount).to.equal(ethers.parseUnits("92.5", 6));
    });
    
    it("Should allow owner to pause and unpause", async function () {
      const { splitter, owner, seller, creator } = await loadFixture(deployInferenceSplitterFixture);
      
      await splitter.connect(owner).pause();
      
      await expect(
        splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 250)
      ).to.be.revertedWithCustomError(splitter, "EnforcedPause");
      
      await splitter.connect(owner).unpause();
      
      await expect(
        splitter.connect(owner).configureSplit(1, seller.address, creator.address, 500, 250)
      ).to.not.be.reverted;
    });
  });

  // ============ MARKETPLACE V2 TESTS ============
  
  describe("MarketplaceV2 Security", function () {
    
    it("Should validate inference price bounds", async function () {
      const { marketplace, seller } = await loadFixture(deployMarketplaceV2Fixture);
      
      // Price too low
      await expect(
        marketplace.connect(seller)["listOrUpgrade(string,string,string,uint256,uint256,uint256,uint256,uint8,uint8,bytes32,uint256,address)"](
          "test-model",
          "Test Model",
          "ipfs://test",
          500, // 5% royalty
          ethers.parseEther("1"), // 1 ETH perpetual
          0, // no subscription
          0, // no duration
          3, // API + Download
          3, // API + Download
          ethers.ZeroHash,
          50, // $0.00005 - too low
          seller.address
        )
      ).to.be.revertedWithCustomError(marketplace, "InvalidInferencePrice");
      
      // Price too high
      await expect(
        marketplace.connect(seller)["listOrUpgrade(string,string,string,uint256,uint256,uint256,uint256,uint8,uint8,bytes32,uint256,address)"](
          "test-model",
          "Test Model",
          "ipfs://test",
          500,
          ethers.parseEther("1"),
          0,
          0,
          3,
          3,
          ethers.ZeroHash,
          ethers.parseUnits("2000", 6), // $2000 - too high
          seller.address
        )
      ).to.be.revertedWithCustomError(marketplace, "InvalidInferencePrice");
    });
    
    it("Should prevent contract addresses as inference wallet", async function () {
      const { marketplace, seller } = await loadFixture(deployMarketplaceV2Fixture);
      
      // Try to use marketplace contract as wallet (should fail)
      await expect(
        marketplace.connect(seller)["listOrUpgrade(string,string,string,uint256,uint256,uint256,uint256,uint8,uint8,bytes32,uint256,address)"](
          "test-model",
          "Test Model",
          "ipfs://test",
          500,
          ethers.parseEther("1"),
          0,
          0,
          3,
          3,
          ethers.ZeroHash,
          ethers.parseUnits("0.01", 6), // $0.01
          await marketplace.getAddress() // Contract address - should fail
        )
      ).to.be.revertedWithCustomError(marketplace, "ContractNotAllowed");
    });
    
    it("Should enforce timelock on inference wallet change", async function () {
      const { marketplace, seller, attacker } = await loadFixture(deployMarketplaceV2Fixture);
      
      // List model first
      await marketplace.connect(seller)["listOrUpgrade(string,string,string,uint256,uint256,uint256,uint256,uint8,uint8,bytes32,uint256,address)"](
        "test-model",
        "Test Model",
        "ipfs://test",
        500,
        ethers.parseEther("1"),
        0,
        0,
        3,
        3,
        ethers.ZeroHash,
        ethers.parseUnits("0.01", 6),
        seller.address
      );
      
      // Request wallet change
      await marketplace.connect(seller).requestInferenceWalletChange(1, attacker.address);
      
      // Try to execute immediately
      await expect(
        marketplace.connect(seller).executeInferenceWalletChange(1)
      ).to.be.revertedWithCustomError(marketplace, "TimelockNotExpired");
      
      // Advance time
      await time.increase(24 * 60 * 60);
      
      // Now should succeed
      await marketplace.connect(seller).executeInferenceWalletChange(1);
      
      const model = await marketplace.getModel(1);
      expect(model.inferenceWallet).to.equal(attacker.address);
    });
    
    it("Should use Ownable2Step for ownership transfer", async function () {
      const { marketplace, owner, attacker } = await loadFixture(deployMarketplaceV2Fixture);
      
      // Transfer ownership (2-step)
      await marketplace.connect(owner).transferOwnership(attacker.address);
      
      // Owner should still be original until accepted
      expect(await marketplace.owner()).to.equal(owner.address);
      
      // Accept ownership
      await marketplace.connect(attacker).acceptOwnership();
      
      // Now attacker is owner
      expect(await marketplace.owner()).to.equal(attacker.address);
    });
    
    it("Should emit events for sweep operations", async function () {
      const { marketplace, owner, buyer } = await loadFixture(deployMarketplaceV2Fixture);
      
      // Send some ETH to marketplace
      await buyer.sendTransaction({
        to: await marketplace.getAddress(),
        value: ethers.parseEther("1")
      });
      
      // Sweep should emit event
      await expect(
        marketplace.connect(owner).sweep(owner.address, ethers.parseEther("1"))
      ).to.emit(marketplace, "FundsSwept").withArgs(owner.address, ethers.parseEther("1"));
    });
    
    it("Should prevent non-owner from pausing", async function () {
      const { marketplace, attacker } = await loadFixture(deployMarketplaceV2Fixture);
      
      await expect(
        marketplace.connect(attacker).pause()
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  // ============ REENTRANCY TESTS ============
  
  describe("Reentrancy Protection", function () {
    
    it("Should protect buyLicense from reentrancy", async function () {
      const { marketplace, seller, buyer } = await loadFixture(deployMarketplaceV2Fixture);
      
      // List model
      await marketplace.connect(seller)["listOrUpgrade(string,string,string,uint256,uint256,uint256,uint256,uint8,uint8,bytes32)"](
        "test-model",
        "Test Model",
        "ipfs://test",
        500,
        ethers.parseEther("1"),
        0,
        0,
        3,
        3,
        ethers.ZeroHash
      );
      
      // Buy license (ReentrancyGuard should protect)
      await expect(
        marketplace.connect(buyer).buyLicense(1, 0, 0, true, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
  });

  // ============ SINGLE-SIGNATURE INTEGRATION TESTS ============
  
  describe("Single-Signature Model + Agent Registration", function () {
    
    async function deployIntegratedFixture() {
      const [owner, seller, feeRecipient, buyer] = await ethers.getSigners();
      
      // Deploy MarketplaceV2
      const MarketplaceV2 = await ethers.getContractFactory("MarketplaceV2");
      const marketplace = await MarketplaceV2.deploy(
        250, // 2.5% fee
        feeRecipient.address,
        0, // no limit
        owner.address
      );
      
      // Deploy AgentRegistryV2 with marketplace address
      const AgentRegistryV2 = await ethers.getContractFactory("AgentRegistryV2");
      const agentRegistry = await AgentRegistryV2.deploy(await marketplace.getAddress());
      
      // Link AgentRegistry to Marketplace
      await marketplace.connect(owner).setAgentRegistry(await agentRegistry.getAddress());
      
      return { marketplace, agentRegistry, owner, seller, feeRecipient, buyer };
    }
    
    it("Should register model and agent in single transaction", async function () {
      const { marketplace, agentRegistry, seller } = await loadFixture(deployIntegratedFixture);
      
      const agentParams = {
        endpoint: "https://api.example.com/inference",
        wallet: seller.address,
        metadataUri: "ipfs://agent-metadata"
      };
      
      // Single transaction creates both model and agent
      const tx = await marketplace.connect(seller).listOrUpgradeWithAgent(
        "test-model",
        "Test Model",
        "ipfs://model-metadata",
        500, // 5% royalty
        ethers.parseEther("1"), // 1 ETH perpetual
        0, // no subscription
        0, // no duration
        3, // API + Download
        3, // API + Download
        ethers.ZeroHash,
        ethers.parseUnits("0.01", 6), // $0.01 inference
        seller.address,
        agentParams
      );
      
      const receipt = await tx.wait();
      
      // Verify model was created
      const model = await marketplace.getModel(1);
      expect(model.owner).to.equal(seller.address);
      expect(model.name).to.equal("Test Model");
      
      // Verify agent was created and linked
      const agentId = await agentRegistry.modelToAgent(1);
      expect(agentId).to.equal(1);
      
      // Verify agent data
      const agent = await agentRegistry.getAgent(1);
      expect(agent.modelId).to.equal(1);
      expect(agent.endpoint).to.equal("https://api.example.com/inference");
      expect(agent.wallet).to.equal(seller.address);
      
      // Verify seller owns the agent NFT
      expect(await agentRegistry.ownerOf(1)).to.equal(seller.address);
    });
    
    it("Should skip agent registration if no endpoint provided", async function () {
      const { marketplace, agentRegistry, seller } = await loadFixture(deployIntegratedFixture);
      
      const agentParams = {
        endpoint: "", // Empty endpoint = skip agent
        wallet: ethers.ZeroAddress,
        metadataUri: ""
      };
      
      await marketplace.connect(seller).listOrUpgradeWithAgent(
        "test-model",
        "Test Model",
        "ipfs://model-metadata",
        500,
        ethers.parseEther("1"),
        0,
        0,
        3,
        3,
        ethers.ZeroHash,
        0,
        ethers.ZeroAddress,
        agentParams
      );
      
      // Model should exist
      const model = await marketplace.getModel(1);
      expect(model.owner).to.equal(seller.address);
      
      // Agent should NOT exist
      const agentId = await agentRegistry.modelToAgent(1);
      expect(agentId).to.equal(0);
    });
    
    it("Should revert if AgentRegistry not set", async function () {
      const [owner, seller, feeRecipient] = await ethers.getSigners();
      
      // Deploy marketplace WITHOUT setting AgentRegistry
      const MarketplaceV2 = await ethers.getContractFactory("MarketplaceV2");
      const marketplace = await MarketplaceV2.deploy(250, feeRecipient.address, 0, owner.address);
      
      const agentParams = {
        endpoint: "https://api.example.com/inference",
        wallet: seller.address,
        metadataUri: "ipfs://agent-metadata"
      };
      
      await expect(
        marketplace.connect(seller).listOrUpgradeWithAgent(
          "test-model", "Test Model", "ipfs://test", 500,
          ethers.parseEther("1"), 0, 0, 3, 3, ethers.ZeroHash,
          ethers.parseUnits("0.01", 6), seller.address, agentParams
        )
      ).to.be.revertedWithCustomError(marketplace, "AgentRegistryNotSet");
    });
    
    it("Should emit AgentLinked event", async function () {
      const { marketplace, seller } = await loadFixture(deployIntegratedFixture);
      
      const agentParams = {
        endpoint: "https://api.example.com/inference",
        wallet: seller.address,
        metadataUri: "ipfs://agent-metadata"
      };
      
      await expect(
        marketplace.connect(seller).listOrUpgradeWithAgent(
          "test-model", "Test Model", "ipfs://test", 500,
          ethers.parseEther("1"), 0, 0, 3, 3, ethers.ZeroHash,
          ethers.parseUnits("0.01", 6), seller.address, agentParams
        )
      ).to.emit(marketplace, "AgentLinked").withArgs(1, 1, seller.address);
    });
    
    it("Should prevent duplicate agent for same model", async function () {
      const { marketplace, agentRegistry, seller } = await loadFixture(deployIntegratedFixture);
      
      const agentParams = {
        endpoint: "https://api.example.com/inference",
        wallet: seller.address,
        metadataUri: "ipfs://agent-metadata"
      };
      
      // First registration succeeds
      await marketplace.connect(seller).listOrUpgradeWithAgent(
        "test-model", "Test Model", "ipfs://test", 500,
        ethers.parseEther("1"), 0, 0, 3, 3, ethers.ZeroHash,
        ethers.parseUnits("0.01", 6), seller.address, agentParams
      );
      
      // Try to register agent directly for same model (should fail)
      await expect(
        agentRegistry.connect(seller).registerAgent(
          1, // same modelId
          seller.address,
          "https://another-endpoint.com",
          "ipfs://another-metadata"
        )
      ).to.be.revertedWithCustomError(agentRegistry, "AgentAlreadyExists");
    });
    
    it("Should only allow Marketplace to call registerAgentFor", async function () {
      const { agentRegistry, seller } = await loadFixture(deployIntegratedFixture);
      
      // Direct call should fail
      await expect(
        agentRegistry.connect(seller).registerAgentFor(
          seller.address,
          1,
          seller.address,
          "https://api.example.com",
          "ipfs://metadata"
        )
      ).to.be.revertedWithCustomError(agentRegistry, "OnlyMarketplace");
    });
  });
});
