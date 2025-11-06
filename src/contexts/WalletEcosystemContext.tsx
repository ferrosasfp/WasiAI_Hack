"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type Ecosystem = "evm" | "sui";

interface Ctx {
  ecosystem: Ecosystem;
  setEcosystem: (e: Ecosystem) => void;
}

const WalletEcosystemContext = createContext<Ctx | undefined>(undefined);

export function WalletEcosystemProvider({ children }: { children: React.ReactNode }) {
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  const [ecosystem, _setEcosystem] = useState<Ecosystem>("evm");
  const setEcosystem = (e: Ecosystem) => {
    if (!enableSui) {
      _setEcosystem('evm');
      return;
    }
    _setEcosystem(e);
  }
  const value = useMemo(() => ({ ecosystem: enableSui ? ecosystem : 'evm', setEcosystem }), [ecosystem, enableSui]);
  return (
    <WalletEcosystemContext.Provider value={value}>{children}</WalletEcosystemContext.Provider>
  );
}

export function useWalletEcosystem() {
  const ctx = useContext(WalletEcosystemContext);
  if (!ctx) throw new Error("useWalletEcosystem must be used within WalletEcosystemProvider");
  return ctx;
}
