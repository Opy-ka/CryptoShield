"use client";

import React, { useEffect, useState } from "react";
import { CryptoSymbol, SimulateCrashPayload } from "@/types/cryptoshield";
import { DEFAULT_CRASH_PRESETS, FASTAPI_BASE_URL } from "@/lib/api";
import {
  AlertCircle,
  Check,
  Code2,
  Flame,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  TerminalSquare,
} from "lucide-react";

interface DemoControlBarProps {
  symbol: CryptoSymbol;
  isSimulated: boolean;
  isSubmitting: boolean;
  onSimulateCrash: (payload: SimulateCrashPayload) => Promise<void>;
  onResetSimulation: () => Promise<void>;
  lastActionStatus: {
    type: "success" | "error" | "info";
    message: string;
  } | null;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  symbol,
  isSimulated,
  isSubmitting,
  onSimulateCrash,
  onResetSimulation,
  lastActionStatus,
}) => {
  const [showCustomParams, setShowCustomParams] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  const [simHigh, setSimHigh] = useState<string>(
    DEFAULT_CRASH_PRESETS[symbol].simulated_high.toFixed(2)
  );
  const [simLow, setSimLow] = useState<string>(
    DEFAULT_CRASH_PRESETS[symbol].simulated_low.toFixed(2)
  );
  const [simVolume, setSimVolume] = useState<string>(
    DEFAULT_CRASH_PRESETS[symbol].simulated_volume.toFixed(2)
  );

  useEffect(() => {
    const preset = DEFAULT_CRASH_PRESETS[symbol];
    setSimHigh(preset.simulated_high.toFixed(2));
    setSimLow(preset.simulated_low.toFixed(2));
    setSimVolume(preset.simulated_volume.toFixed(2));
  }, [symbol]);

  const buildPayload = (): SimulateCrashPayload => {
    const preset = DEFAULT_CRASH_PRESETS[symbol];
    return {
      symbol,
      simulated_high: Number(simHigh) || preset.simulated_high,
      simulated_low: Number(simLow) || preset.simulated_low,
      simulated_volume: Number(simVolume) || preset.simulated_volume,
    };
  };

  return (
    <section
      className={`overflow-hidden rounded-[10px] border bg-slate-900 divide-y divide-slate-800 transition-[border-color,box-shadow] duration-200 ${
        isSimulated
          ? "border-rose-500/60 shadow-[0_0_28px_-6px_rgba(225,29,72,0.35)]"
          : "border-slate-800"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 px-4 py-3.5 lg:flex-row lg:items-center">
        {/* Left: Operator Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
              isSimulated
                ? "border-rose-500/40 bg-rose-600/15 text-rose-400"
                : "border-slate-800 bg-[#0B0F19] text-slate-400"
            }`}
          >
            <TerminalSquare className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium tracking-tight text-slate-100">
                Anomaly Stress-Test &amp; Presentation Controls
              </h2>
              <span className="font-mono text-[11px] text-slate-500">
                · {symbol}
              </span>
            </div>
            <p className="truncate text-xs text-slate-400">
              Injeksi skenario flash crash untuk menguji respons klasifikasi
              K-Means &amp; Random Forest Jam&nbsp;+1.
            </p>
          </div>
        </div>

        {/* Right: Ghost Secondary Controls + Primary Action Pair */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomParams((v) => !v)}
            aria-expanded={showCustomParams}
            className={`btn-press flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
              showCustomParams
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Parameters</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPayloadPreview((v) => !v)}
            aria-expanded={showPayloadPreview}
            className={`btn-press flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
              showPayloadPreview
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>JSON contract</span>
          </button>

          <span
            className="hidden h-4 w-px bg-slate-800 sm:inline-block"
            aria-hidden="true"
          />

          {/* Primary Action: Simulate Flash Crash with clip-path sweep & in-place icon swap */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSimulateCrash(buildPayload())}
            className="crash-btn btn-press relative overflow-hidden flex items-center gap-2 rounded-md border border-rose-500/80 bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* Clip-path sweep overlay (animate/RECIPES.md) */}
            <span
              aria-hidden="true"
              className="crash-btn-overlay pointer-events-none absolute inset-0 bg-rose-500"
            />
            <span className="swap-slot relative z-10 h-3.5 w-3.5">
              <Flame
                data-visible={!isSubmitting ? "true" : "false"}
                className="h-3.5 w-3.5"
              />
              <Loader2
                data-visible={isSubmitting ? "true" : "false"}
                className="h-3.5 w-3.5 animate-spin"
              />
            </span>
            <span className="relative z-10">Simulate Flash Crash</span>
          </button>

          {/* Secondary Outline Action: Reset to Live */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onResetSimulation}
            className="btn-press flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <span>Reset to Live</span>
          </button>
        </div>
      </div>

      {/* @starting-style Entry Confirmation Strip */}
      {lastActionStatus && (
        <div
          role="status"
          className="enter-surface flex items-center justify-between gap-2 bg-[#0B0F19]/80 px-4 py-2 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="swap-slot h-3.5 w-3.5 shrink-0">
              <AlertCircle
                data-visible={
                  lastActionStatus.type === "error" ? "true" : "false"
                }
                className="h-3.5 w-3.5 text-rose-400"
              />
              <Check
                data-visible={
                  lastActionStatus.type !== "error" ? "true" : "false"
                }
                className="h-3.5 w-3.5 text-emerald-400"
              />
            </span>
            <span
              className={`truncate font-mono ${
                lastActionStatus.type === "error"
                  ? "text-rose-300"
                  : "text-slate-300"
              }`}
            >
              {lastActionStatus.message}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] text-slate-500">
            {FASTAPI_BASE_URL}
          </span>
        </div>
      )}

      {/* @starting-style Expandable Parameter Overrides */}
      {showCustomParams && (
        <div className="enter-surface grid grid-cols-1 gap-3 bg-[#0B0F19]/60 px-4 py-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="sim-high-input"
              className="block text-xs font-medium text-slate-400"
            >
              Simulated high ($)
            </label>
            <input
              id="sim-high-input"
              type="number"
              step="0.01"
              value={simHigh}
              onChange={(e) => setSimHigh(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="sim-low-input"
              className="block text-xs font-medium text-slate-400"
            >
              Simulated low ($)
            </label>
            <input
              id="sim-low-input"
              type="number"
              step="0.01"
              value={simLow}
              onChange={(e) => setSimLow(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="sim-vol-input"
              className="block text-xs font-medium text-slate-400"
            >
              Simulated 5m volume
            </label>
            <input
              id="sim-vol-input"
              type="number"
              step="0.1"
              value={simVolume}
              onChange={(e) => setSimVolume(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* @starting-style Expandable API Contract Inspector */}
      {showPayloadPreview && (
        <div className="enter-surface grid grid-cols-1 divide-y divide-slate-800 bg-[#0B0F19]/80 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="p-3.5">
            <span className="block font-mono text-[11px] text-rose-400">
              POST {FASTAPI_BASE_URL}/api/simulate-crash
            </span>
            <pre className="mt-1.5 overflow-x-auto font-mono text-[11px] text-slate-300 tabular-nums">
              {JSON.stringify(buildPayload(), null, 2)}
            </pre>
          </div>
          <div className="p-3.5">
            <span className="block font-mono text-[11px] text-emerald-400">
              POST {FASTAPI_BASE_URL}/api/reset-simulation?symbol={symbol}
            </span>
            <pre className="mt-1.5 overflow-x-auto font-mono text-[11px] text-slate-400">
              {`Query: ?symbol=${symbol}\nEffect: Clears SIMULATION_STATE["${symbol}"] and resumes live Binance 5m stream.`}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
