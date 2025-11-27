"use client";

import React, { createContext, useContext, useMemo } from "react";

/**
 * Wallet Ecosystem Context
 * Currently only supports EVM (Avalanche)
 */
export type Ecosystem = "evm";

interface Ctx {
  ecosystem: Ecosystem;
  setEcosystem: (e: Ecosystem) => void;
}

const WalletEcosystemContext = createContext<Ctx | undefined>(undefined);

export function WalletEcosystemProvider({ children }: { children: React.ReactNode }) {
  // Avalanche only - ecosystem is always 'evm'
  const ecosystem: Ecosystem = 'evm';
  const setEcosystem = (_e: Ecosystem) => {
    // No-op: Only EVM/Avalanche is supported
  };
  const value = useMemo(() => ({ ecosystem, setEcosystem }), []);
  return (
    <WalletEcosystemContext.Provider value={value}>{children}</WalletEcosystemContext.Provider>
  );
}

export function useWalletEcosystem() {
  const ctx = useContext(WalletEcosystemContext);
  if (!ctx) throw new Error("useWalletEcosystem must be used within WalletEcosystemProvider");
  return ctx;
}
