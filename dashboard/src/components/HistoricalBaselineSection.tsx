"use client";

import React, { useState } from "react";
import {
  CryptoSymbol,
  HistoricalBaselineItem,
  LiveMonitorResponse,
  RiskRegime,
} from "@/types/cryptoshield";
import { resolveRiskRegime } from "@/lib/api";
import { Activity, BarChart2, Clock } from "lucide-react";

interface HistoricalBaselineSectionProps {
  symbol: CryptoSymbol;
  items: HistoricalBaselineItem[];
  totalAnalyzed: number;
  liveHistory: LiveMonitorResponse[];
  isLoading: boolean;
}

const REGIME_INDICATOR: Record<
  RiskRegime,
  { dot: string; text: string; bar: string; label: string }
> = {
  SAFE: {
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    bar: "bg-emerald-500/60",
    label: "Safe",
  },
  WARNING: {
    dot: "bg-amber-500",
    text: "text-amber-400",
    bar: "bg-amber-500/70",
    label: "Warning",
  },
  DANGER: {
    dot: "bg-rose-600",
    text: "text-rose-400",
    bar: "bg-rose-600/80",
    label: "Danger",
  },
};

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export const HistoricalBaselineSection: React.FC<
  HistoricalBaselineSectionProps
> = ({ symbol, items, totalAnalyzed, liveHistory, isLoading }) => {
  const [activeTab, setActiveTab] = useState<"baseline" | "stream">("baseline");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (isLoading && !items.length) {
    return (
      <section className="rounded-[10px] border border-slate-800 bg-slate-900 p-4">
        <div className="h-64 animate-pulse rounded-md bg-slate-800/40" />
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rounded-[10px] border border-slate-800 bg-slate-900 p-4">
        <p className="font-mono text-xs text-slate-400">
          Menunggu data historis dari{" "}
          <code className="text-emerald-400">
            GET /api/historical-baseline?symbol={symbol}
          </code>{" "}
          (Tekan{" "}
          <kbd className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px]">
            R
          </kbd>{" "}
          untuk memuat ulang).
        </p>
      </section>
    );
  }

  const maxVol = Math.max(
    ...items.map((d) => Math.max(d.max_volatility, d.avg_volatility)),
    1
  );
  const maxSpike = Math.max(...items.map((d) => d.spike_ratio), 3);

  // SVG Chart dimensions
  const width = 760;
  const height = 224;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (index: number) =>
    padLeft +
    (items.length > 1 ? (index / (items.length - 1)) * plotW : plotW / 2);
  const getY = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / (maxVol * 1.1))) * plotH;

  const points = items.map((item, idx) => ({
    x: getX(idx),
    yMax: getY(item.max_volatility),
    yAvg: getY(item.avg_volatility),
    regime: resolveRiskRegime(item.risk_color, item.risk_status),
    item,
  }));

  const maxLinePath = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.yMax.toFixed(1)}`
    )
    .join(" ");

  const avgLinePath = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.yAvg.toFixed(1)}`
    )
    .join(" ");

  const areaPath = `${maxLinePath} L ${points[
    points.length - 1
  ].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(
    1
  )} ${(padTop + plotH).toFixed(1)} Z`;

  const activePoint =
    hoveredIdx !== null && points[hoveredIdx]
      ? points[hoveredIdx]
      : points[points.length - 1];

  const tabClipPath =
    activeTab === "baseline"
      ? "inset(0 50% 0 0 round 5px)"
      : "inset(0 0% 0 50% round 5px)";

  return (
    <section className="overflow-hidden rounded-[10px] border border-slate-800 bg-slate-900 divide-y divide-slate-800">
      {/* 1. Section Header & Duplicated clip-path View Switcher */}
      <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-medium tracking-tight text-slate-100">
              Historical Volatility Baseline &amp; Hourly Trend ({symbol})
            </h2>
            <p className="font-mono text-[11px] text-slate-400 tabular-nums">
              {totalAnalyzed.toLocaleString("en-US")} hourly intervals analyzed
              · Last {items.length} hours shown
            </p>
          </div>
        </div>

        {/* Duplicated clip-path Tab Switcher (animate/RECIPES.md) */}
        <div
          role="tablist"
          aria-label="Tampilan data historis"
          className="relative inline-grid grid-cols-2 rounded-md border border-slate-800 bg-[#0B0F19] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "baseline"}
            onClick={() => setActiveTab("baseline")}
            className="btn-press relative z-10 flex items-center justify-center gap-1.5 rounded-[5px] px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Baseline ({items.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "stream"}
            onClick={() => setActiveTab("stream")}
            className="btn-press relative z-10 flex items-center justify-center gap-1.5 rounded-[5px] px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Live log ({liveHistory.length})</span>
          </button>

          {/* Clipped Active Layer */}
          <div
            aria-hidden="true"
            style={{ clipPath: tabClipPath }}
            className="clip-tabs-overlay pointer-events-none absolute inset-0.5 z-20 grid grid-cols-2 rounded-[5px] bg-emerald-500/15 ring-1 ring-emerald-500/30"
          >
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Baseline ({items.length})</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-400">
              <Activity className="h-3.5 w-3.5" />
              <span>Live log ({liveHistory.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Split Workspace: Chart Canvas (Left 7 cols) + Hairline Data Table (Right 5 cols) */}
      <div className="grid grid-cols-1 divide-y divide-slate-800 xl:grid-cols-12 xl:divide-x xl:divide-y-0">
        {/* Left 7 Cols: Single-Hue Area Chart */}
        <div className="flex flex-col justify-between p-4 xl:col-span-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="h-0.5 w-3.5 bg-emerald-400" />
                Max volatility
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-b border-dashed border-emerald-400/50" />
                Avg baseline
              </span>
            </div>

            {activePoint && (
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
                <span className="text-slate-300">
                  {activePoint.item.date.slice(0, 16)}
                </span>
                <span>·</span>
                <span>
                  Max{" "}
                  <strong className="font-semibold text-slate-100">
                    ${formatNumber(activePoint.item.max_volatility, 2)}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Avg{" "}
                  <strong className="font-medium text-slate-300">
                    ${formatNumber(activePoint.item.avg_volatility, 2)}
                  </strong>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      REGIME_INDICATOR[activePoint.regime].dot
                    }`}
                  />
                  <span className={REGIME_INDICATOR[activePoint.regime].text}>
                    {activePoint.item.spike_ratio.toFixed(2)}×
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-52 w-full select-none overflow-visible"
              aria-label={`Grafik tren volatilitas ${symbol}`}
            >
              <defs>
                <linearGradient
                  id="emeraldAreaFade"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((step, i) => {
                const y = padTop + plotH * (1 - step);
                const labelVal = maxVol * 1.1 * step;
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px] tabular-nums"
                    >
                      ${labelVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#emeraldAreaFade)" />

              <path
                d={avgLinePath}
                fill="none"
                stroke="rgba(16, 185, 129, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              <path
                d={maxLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.75"
              />

              {points.map((pt, idx) => {
                const dotColor =
                  pt.regime === "DANGER"
                    ? "#e11d48"
                    : pt.regime === "WARNING"
                    ? "#f59e0b"
                    : "#10b981";
                const isLast = idx === points.length - 1;
                const isHovered = hoveredIdx === idx;
                const stepEvery = Math.max(1, Math.floor(points.length / 6));

                return (
                  <g
                    key={`${pt.item.date}-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <rect
                      x={pt.x - 10}
                      y={padTop}
                      width={20}
                      height={plotH}
                      fill="transparent"
                    />
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={padTop}
                        x2={pt.x}
                        y2={padTop + plotH}
                        stroke="#334155"
                        strokeWidth="1"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.yMax}
                      r={isHovered || isLast ? 4 : 2.5}
                      fill={dotColor}
                      stroke="#0B0F19"
                      strokeWidth="1.25"
                    />
                    {(idx % stepEvery === 0 || isLast) && (
                      <text
                        x={pt.x}
                        y={height - 6}
                        textAnchor="middle"
                        className="fill-slate-500 font-mono text-[10px] tabular-nums"
                      >
                        {pt.item.date.slice(11, 16) ||
                          pt.item.date.slice(5, 10)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 5 Cols: Operator Data Table */}
        <div className="flex flex-col xl:col-span-5">
          <div className="max-h-[280px] overflow-x-auto overflow-y-auto scroll-gutter-stable">
            {activeTab === "baseline" ? (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Time (peak)</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Max vol
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Avg base
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Spike ratio
                    </th>
                    <th className="px-3 py-2 font-medium">Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                  {[...items].reverse().map((row, idx) => {
                    const reg = resolveRiskRegime(
                      row.risk_color,
                      row.risk_status
                    );
                    const ind = REGIME_INDICATOR[reg];
                    const propScale = Math.min(
                      1,
                      Math.max(0.06, row.spike_ratio / maxSpike)
                    );

                    return (
                      <tr
                        key={`${row.date}-${idx}`}
                        className="transition-colors duration-100 hover:bg-slate-800/40"
                      >
                        <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                          <span>{row.date.slice(5, 16)}</span>
                          <span className="ml-1.5 text-[10px] text-slate-500">
                            {row.peak_time}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-200 whitespace-nowrap">
                          <span className="text-slate-500">$</span>
                          {formatNumber(row.max_volatility, 2)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">
                          <span className="text-slate-600">$</span>
                          {formatNumber(row.avg_volatility, 2)}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden h-1.5 w-12 overflow-hidden rounded-sm bg-slate-800 sm:block">
                              <div
                                className={`gpu-bar-fill h-full w-full ${ind.bar}`}
                                style={{ transform: `scaleX(${propScale})` }}
                              />
                            </div>
                            <span className={`font-medium ${ind.text}`}>
                              {row.spike_ratio.toFixed(2)}×
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-sans">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${ind.dot}`}
                            />
                            <span className={ind.text}>{ind.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Timestamp</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Spot close
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Spike ratio
                    </th>
                    <th className="px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                  {liveHistory.map((item, idx) => (
                    <tr
                      key={`${item.timestamp}-${idx}`}
                      className="transition-colors duration-100 hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                        {item.timestamp.split(" ")[1] || item.timestamp}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-200 whitespace-nowrap">
                        <span className="text-slate-500">$</span>
                        {formatNumber(item.ohlcv.close, 2)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300 whitespace-nowrap">
                        {item.current_metrics.spike_ratio.toFixed(2)}×
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-sans">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_simulated
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={
                              item.is_simulated
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }
                          >
                            {item.is_simulated ? "Simulated" : "Live"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
