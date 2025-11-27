"use client";

import { useAccount as useEvmAccount } from "wagmi";
import { useWalletEcosystem } from "@/contexts/WalletEcosystemContext";
// Nota: Importamos el tipo pero evitamos llamar al hook de Sui si está deshabilitado.
import type { useCurrentAccount as UseSuiAccountType } from "@mysten/dapp-kit";

export function useWalletAddress() {
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  const { address: evmAddress } = useEvmAccount();
  let suiAddress: string | undefined = undefined
  if (enableSui) {
    try {
      // Lazy require para evitar resolver el hook cuando SUI está deshabilitado
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("@mysten/dapp-kit") as { useCurrentAccount: typeof UseSuiAccountType }
      const acc = (mod as any).useCurrentAccount?.()
      suiAddress = acc?.address as string | undefined
    } catch {}
  }
  const { ecosystem } = useWalletEcosystem();
  const walletAddress = ecosystem === 'evm' ? (evmAddress as string | undefined) : suiAddress;
  return { walletAddress, evmAddress: evmAddress as string | undefined, suiAddress, ecosystem };
}
