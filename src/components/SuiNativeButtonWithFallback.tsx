"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConnectButton as SuiConnectButton, useCurrentAccount as useSuiAccount } from "@mysten/dapp-kit";

export function SuiNativeButtonWithFallback({ children = "Connect Wallet" }: { children?: React.ReactNode }) {
  const acc = useSuiAccount();
  const [lastAddr, setLastAddr] = useState<string | null>(acc?.address ?? null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastAddr(acc?.address ?? null);
  }, [acc?.address]);

  const handleClickCapture = () => {
    const before = acc?.address ?? null;
    setTimeout(() => {
      const after = acc?.address ?? null;
      // If nothing changed shortly after click, try forcing the hidden button click
      if (before === after) {
        const btn = hiddenRef.current?.querySelector("button, [role=button]") as HTMLElement | null;
        if (btn) {
          try { btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); } catch { (btn as any).click?.(); }
        }
      }
    }, 60);
  };

  return (
    <div ref={containerRef} onClickCapture={handleClickCapture} style={{ display: "inline-block" }}>
      <SuiConnectButton>{children}</SuiConnectButton>
      {/* Hidden fallback trigger to force-open modal if the visible one didn't */}
      <div ref={hiddenRef} style={{ position: "fixed", left: 8, top: 8, opacity: 0, pointerEvents: "auto", zIndex: 9999 }} aria-hidden>
        <SuiConnectButton>Open</SuiConnectButton>
      </div>
    </div>
  );
}
