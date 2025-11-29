"use client";

import { useAccount as useEvmAccount } from "wagmi";

/**
 * Hook to get the connected wallet address.
 * EVM-only: Returns Avalanche wallet address from wagmi.
 */
export function useWalletAddress() {
  const { address: evmAddress } = useEvmAccount();
  return { 
    walletAddress: evmAddress as string | undefined, 
    evmAddress: evmAddress as string | undefined,
    ecosystem: 'evm' as const
  };
}
