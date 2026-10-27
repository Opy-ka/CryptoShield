"use client";

import React from "react";
import { LiveMonitorResponse, RiskRegime } from "@/types/cryptoshield";
import { resolveRiskRegime } from "@/lib/api";
import { BrainCircuit, MessageSquareText } from "lucide-react";

interface RandomForestForecastPanelProps {
  data: LiveMonitorResponse | null;
  isLoading: boolean;
  isTransitioningSymbol?: boolean;
}

const FORECAST_STYLES: Record<
  RiskRegime,
  {
    dotBg: string;
    badgeBg: string;
    text: string;
    border: string;
    cardGlow: string;
    accentBorderL: string;
  }
> = {
  SAFE: {
    dotBg: "bg-emerald-500",
    badgeBg: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-slate-800",
    cardGlow: "",
    accentBorderL: "border-l-2 border-l-emerald-500",
  },
  WARNING: {
    dotBg: "bg-amber-500",
    badgeBg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/40",
    cardGlow: "",
    accentBorderL: "border-l-2 border-l-amber-500",
  },
  DANGER: {
    dotBg: "bg-rose-600",
    badgeBg: "bg-rose-600",
    text: "text-rose-400",
    border: "border-rose-500/60",
    cardGlow:
      "shadow-[0_0_28px_-6px_rgba(225,29,72,0.4)] ring-1 ring-rose-500/30",
    accentBorderL: "border-l-2 border-l-rose-600",
  },
};

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export const RandomForestForecastPanel: React.FC<
  RandomForestForecastPanelProps
> = ({ data, isLoading, isTransitioningSymbol = false }) => {
  if (isLoading && !data) {
    return (
      <section className="rounded-[10px] border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        <div className="p-4 flex items-center justify-between">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="p-5 h-32 animate-pulse bg-slate-800/30" />
        <div className="p-5 h-28 animate-pulse bg-slate-800/20" />
        <div className="p-4 h-14 animate-pulse bg-slate-800/30" />
      </section>
    );
  }

  if (!data) return null;

  const { next_day_forecast_rf, ohlcv } = data;
  const predictedRegime = resolveRiskRegime(
    next_day_forecast_rf.predicted_color,
    next_day_forecast_rf.predicted_status
  );
  const style = FORECAST_STYLES[predictedRegime];

  const probSafe = Math.max(
    0,
    Math.min(100, Number(next_day_forecast_rf.probabilities.SAFE_GREEN || 0))
  );
  const probWarn = Math.max(
    0,
    Math.min(
      100,
      Number(next_day_forecast_rf.probabilities.WARNING_YELLOW || 0)
    )
  );
  const probDanger = Math.max(
    0,
    Math.min(100, Number(next_day_forecast_rf.probabilities.DANGER_RED || 0))
  );

  const upperRes = next_day_forecast_rf.estimated_price_band.upper_resistance;
  const lowerSup =
    next_day_forecast_rf.estimated_price_band.lower_support_stoploss;
  const bandRange = Math.max(0.01, upperRes - lowerSup);
  const currentPosPct = Math.max(
    4,
    Math.min(96, ((ohlcv.close - lowerSup) / bandRange) * 100)
  );

  return (
    <section
      data-transitioning={isTransitioningSymbol ? "true" : "false"}
      className={`blur-bridge hover-lift flex flex-col justify-between overflow-hidden rounded-[10px] border bg-slate-900 divide-y divide-slate-800 ${style.border} ${style.cardGlow}`}
    >
      {/* 1. Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BrainCircuit
            className={`h-4 w-4 ${style.text}`}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-medium tracking-tight text-slate-100">
              Prediksi Risiko Jam&nbsp;+1 (Next-Hour Forecast)
            </h2>
            <p className="font-mono text-[11px] text-slate-400 tabular-nums">
              Random Forest classifier · Horizon T+1h · Expected swing ±$
              {formatNumber(next_day_forecast_rf.expected_volatility_usd, 2)}
            </p>
          </div>
        </div>

        {/* Predicted Status Indicator */}
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-[#0B0F19] px-2.5 py-1">
          <span className="text-xs text-slate-400">Forecast:</span>
          <span className={`h-2 w-2 rounded-full ${style.dotBg}`} />
          <span className={`font-mono text-xs font-semibold ${style.text}`}>
            {next_day_forecast_rf.predicted_status}
          </span>
        </div>
      </div>

      {/* 2. Ensemble Regime Probabilities (GPU compositor scaleX bars — zero layout thrashing) */}
      <div className="px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">
            Distribusi probabilitas rezim (Jam&nbsp;+1)
          </span>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            1,000 trees ensemble
          </span>
        </div>

        <div className="space-y-2">
          {/* SAFE (Hijau) */}
          <div className="grid grid-cols-12 items-center gap-2 font-mono text-xs">
            <span className="col-span-3 flex items-center gap-2 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Safe
            </span>
            <div className="col-span-7 h-2 w-full overflow-hidden rounded-sm bg-slate-800/90">
              <div
                className="gpu-bar-fill h-full w-full bg-emerald-500"
                style={{ transform: `scaleX(${probSafe / 100})` }}
              />
            </div>
            <span className="col-span-2 text-right font-semibold text-emerald-400 tabular-nums">
              {probSafe.toFixed(1)}%
            </span>
          </div>

          {/* WARNING (Kuning) */}
          <div className="grid grid-cols-12 items-center gap-2 font-mono text-xs">
            <span className="col-span-3 flex items-center gap-2 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Warning
            </span>
            <div className="col-span-7 h-2 w-full overflow-hidden rounded-sm bg-slate-800/90">
              <div
                className="gpu-bar-fill h-full w-full bg-amber-500"
                style={{ transform: `scaleX(${probWarn / 100})` }}
              />
            </div>
            <span className="col-span-2 text-right font-semibold text-amber-400 tabular-nums">
              {probWarn.toFixed(1)}%
            </span>
          </div>

          {/* DANGER / CRASH (Merah) */}
          <div className="grid grid-cols-12 items-center gap-2 font-mono text-xs">
            <span className="col-span-3 flex items-center gap-2 text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
              Danger
            </span>
            <div className="col-span-7 h-2 w-full overflow-hidden rounded-sm bg-slate-800/90">
              <div
                className="gpu-bar-fill h-full w-full bg-rose-600"
                style={{ transform: `scaleX(${probDanger / 100})` }}
              />
            </div>
            <span className="col-span-2 text-right font-semibold text-rose-400 tabular-nums">
              {probDanger.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Signature Detail: T+1 Hour Price Band Horizon Ruler */}
      <div className="px-4 py-3.5 bg-[#0B0F19]/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">
            Estimasi rentang harga Jam&nbsp;+1 (Support &amp; Resistance Band)
          </span>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            Spread: ${formatNumber(upperRes - lowerSup, 2)}
          </span>
        </div>

        {/* Two-column hairline readout for Lower Support vs Upper Resistance */}
        <div className="mt-2.5 grid grid-cols-2 divide-x divide-slate-800 rounded-md border border-slate-800 bg-[#0B0F19]">
          <div className="px-3.5 py-2.5">
            <span className="block text-[11px] text-slate-400">
              Batas bawah (Lower support / stop loss)
            </span>
            <div className="mt-0.5 font-mono text-base font-bold text-rose-400 tabular-nums sm:text-lg">
              <span className="mr-0.5 text-xs font-normal text-slate-500">
                $
              </span>
              {formatNumber(lowerSup, 2)}
            </div>
            <span className="block font-mono text-[11px] text-slate-500 tabular-nums">
              -${formatNumber(Math.max(0, ohlcv.close - lowerSup), 2)} dari spot
            </span>
          </div>

          <div className="px-3.5 py-2.5 text-right">
            <span className="block text-[11px] text-slate-400">
              Batas atas (Upper resistance)
            </span>
            <div className="mt-0.5 font-mono text-base font-bold text-emerald-400 tabular-nums sm:text-lg">
              <span className="mr-0.5 text-xs font-normal text-slate-500">
                $
              </span>
              {formatNumber(upperRes, 2)}
            </div>
            <span className="block font-mono text-[11px] text-slate-500 tabular-nums">
              +${formatNumber(Math.max(0, upperRes - ohlcv.close), 2)} dari spot
            </span>
          </div>
        </div>

        {/* Precision Horizon Ruler Gauge */}
        <div className="mt-3">
          <div className="relative h-5 w-full select-none">
            <div className="absolute top-2 h-1.5 w-full rounded-sm bg-slate-800" />
            <div className="absolute top-1.5 flex w-full justify-between px-0.5">
              {[0, 25, 50, 75, 100].map((tick) => (
                <span
                  key={tick}
                  className="h-2.5 w-px bg-slate-700"
                  aria-hidden="true"
                />
              ))}
            </div>
            {/* GPU translateX Spot Marker Track */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `translateX(${currentPosPct}%)` }}
            >
              <span
                title={`Spot saat ini: $${formatNumber(ohlcv.close, 2)}`}
                className="block h-3.5 w-1.5 -translate-x-1/2 rounded-[2px] bg-slate-100 ring-2 ring-[#0B0F19]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 tabular-nums">
            <span>Stop loss floor</span>
            <span className="text-slate-300">
              Spot: ${formatNumber(ohlcv.close, 2)}
            </span>
            <span>Resistance ceiling</span>
          </div>
        </div>
      </div>

      {/* 4. Narrative AI Forecast Synthesis Footer */}
      <div
        className={`flex items-center justify-between gap-3 bg-[#0B0F19]/75 px-4 py-3 ${style.accentBorderL}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquareText
            className={`h-3.5 w-3.5 shrink-0 ${style.text}`}
            aria-hidden="true"
          />
          <p className="truncate text-xs font-medium text-slate-200">
            {next_day_forecast_rf.forecast_message}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-slate-500">
          RF-Regressor
        </span>
      </div>
    </section>
  );
};
