"use client";

import React, { useEffect, useRef } from "react";
import { LiveMonitorResponse, RiskRegime } from "@/types/cryptoshield";
import { resolveRiskRegime } from "@/lib/api";
import {
  AlertOctagon,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface KMeansDetectionPanelProps {
  data: LiveMonitorResponse | null;
  liveHistory: LiveMonitorResponse[];
  isLoading: boolean;
  isTransitioningSymbol?: boolean;
}

const REGIME_STYLES: Record<
  RiskRegime,
  {
    dotBg: string;
    badgeBg: string;
    text: string;
    border: string;
    cardGlow: string;
    heroTint: string;
    strokeHex: string;
    label: string;
  }
> = {
  SAFE: {
    dotBg: "bg-emerald-500",
    badgeBg: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-slate-800",
    cardGlow: "",
    heroTint: "bg-emerald-500/[0.03]",
    strokeHex: "#10b981",
    label: "SAFE",
  },
  WARNING: {
    dotBg: "bg-amber-500",
    badgeBg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/40",
    cardGlow: "",
    heroTint: "bg-amber-500/[0.04]",
    strokeHex: "#f59e0b",
    label: "WARNING",
  },
  DANGER: {
    dotBg: "bg-rose-600",
    badgeBg: "bg-rose-600",
    text: "text-rose-400",
    border: "border-rose-500/60",
    cardGlow:
      "shadow-[0_0_28px_-6px_rgba(225,29,72,0.4)] ring-1 ring-rose-500/30",
    heroTint: "bg-rose-600/[0.06]",
    strokeHex: "#e11d48",
    label: "DANGER",
  },
};

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const PriceValue: React.FC<{
  value: number;
  className?: string;
  symbolClassName?: string;
}> = ({
  value,
  className = "text-sm font-semibold text-slate-100",
  symbolClassName = "text-slate-500 font-normal mr-0.5",
}) => (
  <span className={`font-mono tabular-nums ${className}`}>
    <span className={symbolClassName}>$</span>
    {formatNumber(value, 2)}
  </span>
);

export const KMeansDetectionPanel: React.FC<KMeansDetectionPanelProps> = ({
  data,
  liveHistory,
  isLoading,
  isTransitioningSymbol = false,
}) => {
  const priceReadoutRef = useRef<HTMLDivElement | null>(null);
  const regimeBannerRef = useRef<HTMLParagraphElement | null>(null);
  const prevCloseRef = useRef<number | null>(null);
  const prevRegimeRef = useRef<RiskRegime | null>(null);

  const regime: RiskRegime = data
    ? resolveRiskRegime(
        data.current_detection_kmeans.risk_color,
        data.current_detection_kmeans.risk_status
      )
    : "SAFE";

  // Programmatic WAAPI micro-feedback on live price tick & regime transition (animate/RECIPES.md)
  useEffect(() => {
    if (!data) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const newClose = data.ohlcv.close;
    if (
      prevCloseRef.current !== null &&
      prevCloseRef.current !== newClose &&
      priceReadoutRef.current
    ) {
      const isUp = newClose > prevCloseRef.current;
      priceReadoutRef.current.animate(
        [
          {
            transform: "translateY(2px) scale(0.985)",
            color: isUp ? "#34d399" : "#fb7185",
          },
          {
            transform: "translateY(0px) scale(1)",
            color: "#f1f5f9",
          },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        }
      );
    }
    prevCloseRef.current = newClose;

    // Blur-bridge transition when market regime shifts (e.g. SAFE -> DANGER)
    if (
      prevRegimeRef.current !== null &&
      prevRegimeRef.current !== regime &&
      regimeBannerRef.current
    ) {
      regimeBannerRef.current.animate(
        [
          {
            opacity: 0.4,
            filter: "blur(3px)",
            transform: "translateY(4px) scale(0.97)",
          },
          {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px) scale(1)",
          },
        ],
        {
          duration: 240,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        }
      );
    }
    prevRegimeRef.current = regime;
  }, [data, regime]);

  if (isLoading && !data) {
    return (
      <section className="rounded-[10px] border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        <div className="p-4 flex items-center justify-between">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="p-5 h-28 animate-pulse bg-slate-800/30" />
        <div className="grid grid-cols-4 divide-x divide-slate-800 h-16 animate-pulse bg-slate-800/20" />
        <div className="p-4 h-14 animate-pulse bg-slate-800/30" />
      </section>
    );
  }

  if (!data) return null;

  const { ohlcv, current_metrics, current_detection_kmeans } = data;
  const style = REGIME_STYLES[regime];

  const candleDelta = ohlcv.close - ohlcv.open;
  const candlePct = ohlcv.open > 0 ? (candleDelta / ohlcv.open) * 100 : 0;
  const deltaSign = candleDelta >= 0 ? "+" : "-";

  // 32px inline sparkline
  const sparkValues =
    liveHistory.length >= 3
      ? [...liveHistory]
          .slice(0, 12)
          .reverse()
          .map((d) => d.ohlcv.close)
      : [ohlcv.open, ohlcv.low, ohlcv.high, ohlcv.close];

  const minSpark = Math.min(...sparkValues);
  const maxSpark = Math.max(...sparkValues);
  const sparkSpan = Math.max(0.01, maxSpark - minSpark);
  const sparkW = 88;
  const sparkH = 28;
  const sparkPts = sparkValues
    .map((v, i) => {
      const x =
        sparkValues.length > 1
          ? (i / (sparkValues.length - 1)) * sparkW
          : sparkW / 2;
      const y = sparkH - 3 - ((v - minSpark) / sparkSpan) * (sparkH - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const spikeScale = Math.min(
    1,
    Math.max(0.04, current_metrics.spike_ratio / 5)
  );

  return (
    <section
      data-transitioning={isTransitioningSymbol ? "true" : "false"}
      className={`blur-bridge hover-lift flex flex-col justify-between overflow-hidden rounded-[10px] border bg-slate-900 divide-y divide-slate-800 ${style.border} ${style.cardGlow}`}
    >
      {/* 1. Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Cpu className={`h-4 w-4 ${style.text}`} aria-hidden="true" />
          <div>
            <h2 className="text-sm font-medium tracking-tight text-slate-100">
              Current Market Status
            </h2>
            <p className="font-mono text-[11px] text-slate-400 tabular-nums">
              K-Means anomaly detection · Cluster #
              {current_detection_kmeans.cluster_id} · {data.interval} window
            </p>
          </div>
        </div>

        {/* 3-Lamp Physical Status Indicator (SAFE / WARNING / DANGER) */}
        <div
          aria-label={`Status pasar saat ini: ${style.label}`}
          className="flex items-center gap-2 rounded-md border border-slate-800 bg-[#0B0F19] px-2.5 py-1"
        >
          <div className="flex items-center gap-1.5">
            <span
              title="DANGER"
              className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity] duration-200 ${
                regime === "DANGER"
                  ? "scale-110 bg-rose-600 ring-2 ring-rose-400/40"
                  : "scale-95 bg-slate-800 opacity-40"
              }`}
            />
            <span
              title="WARNING"
              className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity] duration-200 ${
                regime === "WARNING"
                  ? "scale-110 bg-amber-500 ring-2 ring-amber-400/40"
                  : "scale-95 bg-slate-800 opacity-40"
              }`}
            />
            <span
              title="SAFE"
              className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity] duration-200 ${
                regime === "SAFE"
                  ? "scale-110 bg-emerald-500 ring-2 ring-emerald-400/40"
                  : "scale-95 bg-slate-800 opacity-40"
              }`}
            />
          </div>
          <span className={`font-mono text-xs font-semibold ${style.text}`}>
            {style.label}
          </span>
        </div>
      </div>

      {/* 2. Tier 1 Hero Region: In-place Icon Swap + Regime Readout + Hero Price */}
      <div
        className={`flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center ${style.heroTint}`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* In-Place Icon Swap (.swap-slot from motion.md) */}
            <span className="swap-slot h-4 w-4">
              <ShieldCheck
                data-visible={regime === "SAFE" ? "true" : "false"}
                className="h-4 w-4 text-emerald-400"
              />
              <AlertTriangle
                data-visible={regime === "WARNING" ? "true" : "false"}
                className="h-4 w-4 text-amber-400"
              />
              <AlertOctagon
                data-visible={regime === "DANGER" ? "true" : "false"}
                className="h-4 w-4 text-rose-400"
              />
            </span>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Active regime classification
            </span>
          </div>
          <p
            ref={regimeBannerRef}
            className={`font-mono text-base font-semibold tracking-tight sm:text-lg ${style.text}`}
          >
            {current_detection_kmeans.risk_status}
          </p>
          <p className="font-mono text-xs text-slate-400 tabular-nums">
            Last candle timestamp: {data.timestamp}
          </p>
        </div>

        {/* Hero Price Readout + 32px Inline Sparkline */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
          <svg
            width={sparkW}
            height={sparkH}
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            className="shrink-0 overflow-visible"
            aria-label="Tren harga penutupan terbaru"
          >
            <polyline
              fill="none"
              stroke={style.strokeHex}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparkPts}
            />
          </svg>

          <div>
            <div
              ref={priceReadoutRef}
              className="font-mono text-2xl font-bold tracking-tight text-slate-100 tabular-nums sm:text-[28px]"
            >
              <span className="mr-0.5 text-base font-normal text-slate-500">
                $
              </span>
              {formatNumber(ohlcv.close, 2)}
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
              {deltaSign}${formatNumber(Math.abs(candleDelta), 2)} ({deltaSign}
              {Math.abs(candlePct).toFixed(2)}%) vs 5m open
            </p>
          </div>
        </div>
      </div>

      {/* 3. Tier 2 Supporting Metrics: Hairline 5m OHLCV Strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">Open (5m)</span>
          <PriceValue
            value={ohlcv.open}
            className="mt-0.5 block text-sm font-medium text-slate-200"
          />
        </div>

        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">High (5m)</span>
          <PriceValue
            value={ohlcv.high}
            className="mt-0.5 block text-sm font-medium text-emerald-400"
          />
        </div>

        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">Low (5m)</span>
          <PriceValue
            value={ohlcv.low}
            className="mt-0.5 block text-sm font-medium text-rose-400"
          />
        </div>

        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">Volume (5m)</span>
          <span className="mt-0.5 block font-mono text-sm font-medium text-slate-200 tabular-nums">
            {formatNumber(ohlcv.volume, 2)}{" "}
            <span className="text-[11px] font-normal text-slate-500">
              {data.symbol.replace("USDT", "")}
            </span>
          </span>
        </div>
      </div>

      {/* 4. Tier 2 Volatility & Spike Telemetry Strip (GPU scaleX bar) */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 bg-[#0B0F19]/40">
        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">
            Current volatility
          </span>
          <PriceValue
            value={current_metrics.current_volatility}
            className={`mt-0.5 block text-sm font-semibold ${style.text}`}
          />
        </div>

        <div className="px-4 py-2.5">
          <span className="block text-xs text-slate-400">
            Historical avg baseline
          </span>
          <PriceValue
            value={current_metrics.historical_daily_avg_baseline}
            className="mt-0.5 block text-sm font-medium text-slate-300"
          />
        </div>

        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-slate-400">Spike ratio</span>
            <span
              className={`font-mono text-xs font-semibold tabular-nums ${style.text}`}
            >
              {current_metrics.spike_ratio.toFixed(2)}×
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`gpu-bar-fill h-full w-full ${style.badgeBg}`}
              style={{ transform: `scaleX(${spikeScale})` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Bot Execution Directive Footer */}
      <div className="flex items-center justify-between gap-3 bg-[#0B0F19]/75 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Terminal
            className="h-3.5 w-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <span className="text-xs text-slate-400 shrink-0">
            Bot directive:
          </span>
          <p className={`truncate font-mono text-xs font-semibold ${style.text}`}>
            {current_detection_kmeans.action_recommendation}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white ${style.badgeBg}`}
        >
          {style.label}
        </span>
      </div>
    </section>
  );
};
