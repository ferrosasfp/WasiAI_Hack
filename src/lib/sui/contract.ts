// src/lib/sui/contract.ts

import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from './client';
import { FUNCTIONS, MARKET_ID, MODULES, PACKAGE_ID, SUI_CLOCK_OBJECT_ID } from './constants';

function target(fn: (typeof FUNCTIONS)[keyof typeof FUNCTIONS]) {
  return `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${fn}`;
}

export type BuyLicenseParams = {
  modelId: bigint | number;
  kind: 0 | 1; // 0=perpetual, 1=subscription
  months: number; // for subscription, >0
  transferable: boolean;
  amountInMist: bigint | number; // exact amount expected by the contract
};

export function buildBuyLicenseTx(params: BuyLicenseParams): Transaction {
  const tx = new Transaction();

  const payment = tx.splitCoins(tx.gas, [tx.pure.u64(params.amountInMist)]);

  tx.moveCall({
    target: target(FUNCTIONS.BUY_LICENSE),
    arguments: [
      tx.object(MARKET_ID),
      tx.pure.u64(params.modelId),
      tx.pure.u8(params.kind),
      tx.pure.u16(params.months),
      tx.pure.bool(params.transferable),
      tx.object(SUI_CLOCK_OBJECT_ID),
      payment,
    ],
  });

  return tx;
}

export type ListOrUpgradeParams = {
  slug: string;
  name: string;
  uri: string; // CID o URL IPFS
  royaltyBps: number; // <= 10000
  pricePerpetual: bigint | number; // en MIST
  priceSubscription: bigint | number; // en MIST por mes
  defaultDurationDays: number; // 0 si no hay sub; >=1 si hay sub
  deliveryRightsDefault: 1 | 2 | 3; // bitmask
  deliveryModeHint: 1 | 2 | 3; // bitmask
  termsHash: Uint8Array; // hash de términos
};

export function buildListOrUpgradeTx(p: ListOrUpgradeParams): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: target(FUNCTIONS.LIST_OR_UPGRADE),
    arguments: [
      tx.object(MARKET_ID),
      tx.pure.string(p.slug),
      tx.pure.string(p.name),
      tx.pure.string(p.uri),
      tx.pure.u64(p.royaltyBps),
      tx.pure.u64(p.pricePerpetual),
      tx.pure.u64(p.priceSubscription),
      tx.pure.u64(p.defaultDurationDays),
      tx.pure.u8(p.deliveryRightsDefault),
      tx.pure.u8(p.deliveryModeHint),
      tx.pure.vector('u8', Array.from(p.termsHash)),
    ],
  });

  return tx;
}

export function buildSetListedTx(modelId: bigint | number, listed: boolean): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(FUNCTIONS.SET_LISTED),
    arguments: [tx.object(MARKET_ID), tx.pure.u64(modelId), tx.pure.bool(listed)],
  });
  return tx;
}

// Helpers de lectura (simples): se pueden implementar con devInspect si es necesario
const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';

export async function devInspectGetMarketInfo(sender?: string) {
  const client = getSuiClient();
  const tx = new Transaction();
  tx.moveCall({ target: target(FUNCTIONS.GET_MARKET_INFO), arguments: [tx.object(MARKET_ID)] });
  const res = await client.devInspectTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender: sender || DEFAULT_SENDER,
  });
  return res;
}

export async function devInspectGetModelInfoEx(modelId: bigint | number, sender?: string) {
  const client = getSuiClient();
  const tx = new Transaction();
  tx.moveCall({
    target: target(FUNCTIONS.GET_MODEL_INFO_EX),
    arguments: [tx.object(MARKET_ID), tx.pure.u64(modelId)],
  });
  const res = await client.devInspectTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender: sender || DEFAULT_SENDER,
  });
  return res;
}