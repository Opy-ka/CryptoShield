"use client";

import React from "react";
import { CryptoSymbol } from "@/types/cryptoshield";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Shield,
  WifiOff,
} from "lucide-react";

interface HeaderBarProps {
  selectedSymbol: CryptoSymbol;
  onSelectSymbol: (symbol: CryptoSymbol, viaKeyboard?: boolean) => void;
  isKeyboardSwitch: boolean;
  isSimulated: boolean;
  isOffline: boolean;
  lastUpdated: string | null;
  secondsToNextPoll: number;
  isPolling: boolean;
  onManualRefresh: () => void;
}

const SYMBOLS: { id: CryptoSymbol; label: string; shortcut: string }[] = [
  { id: "BTCUSDT", label: "BTCUSDT", shortcut: "1" },
  { id: "ETHUSDT", label: "ETHUSDT", shortcut: "2" },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  selectedSymbol,
  onSelectSymbol,
  isKeyboardSwitch,
  isSimulated,
  isOffline,
  lastUpdated,
  secondsToNextPoll,
  isPolling,
  onManualRefresh,
}) => {
  // Active tab clip-path inset for 2 equal-width tabs (BTCUSDT = left half, ETHUSDT = right half)
  const activeClipPath =
    selectedSymbol === "BTCUSDT"
      ? "inset(0 50% 0 0 round 5px)"
      : "inset(0 0% 0 50% round 5px)";

  const connState = isOffline ? "offline" : isSimulated ? "sim" : "live";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B0F19]/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
        {/* Left: Brand Identity & Surface Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-emerald-400">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-slate-100">
              CryptoShield&nbsp;— Real-Time Volatility Detection
            </h1>
            <span className="hidden text-xs text-slate-500 md:inline">·</span>
            <p className="hidden text-xs text-slate-400 md:inline">
              K-Means anomaly clustering &amp; Random Forest Jam&nbsp;+1 forecast
            </p>
          </div>
        </div>

        {/* Right: Operator Controls & Live Telemetry */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Asset Switcher with Emil Kowalski's Duplicated clip-path Tab Indicator */}
          <div
            role="group"
            aria-label="Pilih pasangan aset kripto"
            className="relative inline-grid grid-cols-2 rounded-md border border-slate-800 bg-slate-900/90 p-0.5"
          >
            {/* Base Inactive Layer */}
            {SYMBOLS.map((sym) => {
              const active = selectedSymbol === sym.id;
              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => onSelectSymbol(sym.id, false)}
                  aria-pressed={active}
                  className="btn-press relative z-10 flex items-center justify-center gap-1.5 rounded-[5px] px-3 py-1 font-mono text-xs font-medium text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span>{sym.label}</span>
                  <kbd className="hidden rounded border border-slate-700/80 bg-slate-950/80 px-1 py-0.2 font-mono text-[10px] text-slate-500 sm:inline-block">
                    {sym.shortcut}
                  </kbd>
                </button>
              );
            })}

            {/* Duplicated Active Overlay Layer (clipped via GPU clip-path) */}
            <div
              aria-hidden="true"
              data-instant={isKeyboardSwitch ? "true" : "false"}
              style={{ clipPath: activeClipPath }}
              className="clip-tabs-overlay pointer-events-none absolute inset-0.5 z-20 grid grid-cols-2 rounded-[5px] bg-slate-800 shadow-sm ring-1 ring-emerald-500/25"
            >
              {SYMBOLS.map((sym) => (
                <div
                  key={sym.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-1 font-mono text-xs font-medium text-emerald-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{sym.label}</span>
                  <kbd className="hidden rounded border border-emerald-500/30 bg-slate-950/90 px-1 py-0.2 font-mono text-[10px] text-emerald-300 sm:inline-block">
                    {sym.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status Indicator with In-Place Icon Swap (.swap-slot) */}
          <div
            className={`flex items-center gap-2 rounded-md border bg-slate-900 px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
              connState === "offline"
                ? "border-rose-500/30 text-rose-400"
                : connState === "sim"
                ? "border-amber-500/40 text-amber-400"
                : "border-slate-800 text-emerald-400"
            }`}
          >
            <span className="swap-slot h-3.5 w-3.5">
              <WifiOff
                data-visible={connState === "offline" ? "true" : "false"}
                className="h-3.5 w-3.5 text-rose-400"
              />
              <AlertTriangle
                data-visible={connState === "sim" ? "true" : "false"}
                className="h-3.5 w-3.5 text-amber-400"
              />
              <CheckCircle2
                data-visible={connState === "live" ? "true" : "false"}
                className="h-3.5 w-3.5 text-emerald-400"
              />
            </span>
            <span>
              {connState === "offline"
                ? "FastAPI offline"
                : connState === "sim"
                ? "Simulation Mode Active"
                : "Live Binance API"}
            </span>
          </div>

          {/* Timestamp & 5s Poll Trigger */}
          <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-400 tabular-nums">
            <span className="text-slate-300">
              {lastUpdated
                ? lastUpdated.split(" ")[1] || lastUpdated
                : "--:--:--"}
            </span>
            <span className="text-slate-700">·</span>
            <span className="w-4 text-right text-[11px] text-slate-500">
              {secondsToNextPoll}s
            </span>
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isPolling}
              title="Muat ulang data (R)"
              aria-label="Muat ulang data sekarang"
              className="btn-press -mr-1 flex items-center gap-1 rounded px-1 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3 w-3 ${
                  isPolling ? "animate-spin text-emerald-400" : ""
                }`}
              />
              <kbd className="hidden rounded border border-slate-700/80 bg-slate-950 px-1 text-[10px] text-slate-500 sm:inline-block">
                R
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
