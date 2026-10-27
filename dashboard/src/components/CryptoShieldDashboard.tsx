"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CryptoSymbol,
  HistoricalBaselineItem,
  LiveMonitorResponse,
  SimulateCrashPayload,
} from "@/types/cryptoshield";
import {
  FASTAPI_BASE_URL,
  fetchHistoricalBaseline,
  fetchLiveMonitor,
  isBackendTemplateFallback,
  postResetSimulation,
  postSimulateCrash,
} from "@/lib/api";
import { HeaderBar } from "@/components/HeaderBar";
import { KMeansDetectionPanel } from "@/components/KMeansDetectionPanel";
import { RandomForestForecastPanel } from "@/components/RandomForestForecastPanel";
import { HistoricalBaselineSection } from "@/components/HistoricalBaselineSection";
import { DemoControlBar } from "@/components/DemoControlBar";
import { AlertTriangle, RefreshCw, ServerCrash } from "lucide-react";

const POLL_INTERVAL_MS = 5000;
const STORAGE_KEY_PREFIX = "cryptoshield_last_valid_";

export const CryptoShieldDashboard: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<CryptoSymbol>("BTCUSDT");
  const [isKeyboardSwitch, setIsKeyboardSwitch] = useState<boolean>(false);
  const [isTransitioningSymbol, setIsTransitioningSymbol] =
    useState<boolean>(false);

  const [monitorData, setMonitorData] = useState<LiveMonitorResponse | null>(
    null
  );
  const [historicalItems, setHistoricalItems] = useState<
    HistoricalBaselineItem[]
  >([]);
  const [totalAnalyzed, setTotalAnalyzed] = useState<number>(0);
  const [liveHistory, setLiveHistory] = useState<LiveMonitorResponse[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isBaselineLoading, setIsBaselineLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUsingCachedLive, setIsUsingCachedLive] = useState<boolean>(false);

  const [secondsToNextPoll, setSecondsToNextPoll] = useState<number>(5);
  const [lastActionStatus, setLastActionStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const lastValidDataRef = useRef<
    Partial<Record<CryptoSymbol, LiveMonitorResponse>>
  >({});

  const getSavedValidData = useCallback(
    (symbol: CryptoSymbol): LiveMonitorResponse | null => {
      if (lastValidDataRef.current[symbol]) {
        return lastValidDataRef.current[symbol]!;
      }
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(
            `${STORAGE_KEY_PREFIX}${symbol}`
          );
          if (raw) {
            const parsed = JSON.parse(raw) as LiveMonitorResponse;
            if (!isBackendTemplateFallback(parsed)) {
              lastValidDataRef.current[symbol] = parsed;
              return parsed;
            }
          }
        } catch {
          // Ignore localStorage parse error
        }
      }
      return null;
    },
    []
  );

  const saveValidData = useCallback(
    (symbol: CryptoSymbol, data: LiveMonitorResponse) => {
      lastValidDataRef.current[symbol] = data;
      if (!data.is_simulated && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${symbol}`,
            JSON.stringify(data)
          );
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    []
  );

  // Fetch /api/live-monitor?symbol={symbol}
  const loadLiveMonitorData = useCallback(
    async (symbol: CryptoSymbol, showSpinner = false) => {
      if (showSpinner) setIsPolling(true);
      try {
        const response = await fetchLiveMonitor(symbol);

        if (isBackendTemplateFallback(response)) {
          const previousData = getSavedValidData(symbol);
          if (previousData) {
            setMonitorData(previousData);
            setIsUsingCachedLive(true);
            setApiError(null);
            return;
          }
        }

        saveValidData(symbol, response);
        setMonitorData(response);
        setIsUsingCachedLive(false);
        setLiveHistory((prev) => [response, ...prev].slice(0, 25));
        setApiError(null);
      } catch (err) {
        const previousData = getSavedValidData(symbol);
        if (previousData) {
          setMonitorData(previousData);
          setIsUsingCachedLive(true);
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Tidak dapat terhubung ke server FastAPI";
        setApiError(
          `Server FastAPI (${FASTAPI_BASE_URL}) tidak merespons: ${msg}`
        );
      } finally {
        setIsInitialLoading(false);
        setIsPolling(false);
        setIsTransitioningSymbol(false);
        setSecondsToNextPoll(5);
      }
    },
    [getSavedValidData, saveValidData]
  );

  // Fetch /api/historical-baseline?symbol={symbol}&limit=24
  const loadHistoricalBaseline = useCallback(async (symbol: CryptoSymbol) => {
    setIsBaselineLoading(true);
    try {
      const res = await fetchHistoricalBaseline(symbol, 24);
      setHistoricalItems(res.data || []);
      setTotalAnalyzed(res.total_days_analyzed || 0);
    } catch {
      // Handled by main apiError if backend is down
    } finally {
      setIsBaselineLoading(false);
    }
  }, []);

  // Trigger initial fetch + 5-second setInterval polling whenever selectedSymbol changes
  useEffect(() => {
    const cached = getSavedValidData(selectedSymbol);
    if (cached) {
      setMonitorData(cached);
      setIsInitialLoading(false);
    } else {
      setIsInitialLoading(true);
    }

    loadLiveMonitorData(selectedSymbol, true);
    loadHistoricalBaseline(selectedSymbol);

    const pollTimer = setInterval(() => {
      loadLiveMonitorData(selectedSymbol, false);
    }, POLL_INTERVAL_MS);

    const countdownTimer = setInterval(() => {
      setSecondsToNextPoll((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(countdownTimer);
    };
  }, [
    selectedSymbol,
    getSavedValidData,
    loadLiveMonitorData,
    loadHistoricalBaseline,
  ]);

  // Handler: Switch Symbol (via pointer = blur-bridge + clip-path glide; via keyboard = 0ms instant)
  const handleSelectSymbol = useCallback(
    (newSymbol: CryptoSymbol, viaKeyboard = false) => {
      if (newSymbol === selectedSymbol) return;
      setIsKeyboardSwitch(viaKeyboard);
      if (!viaKeyboard) {
        setIsTransitioningSymbol(true);
      }
      setSelectedSymbol(newSymbol);
      setLastActionStatus(null);
      setIsUsingCachedLive(false);
    },
    [selectedSymbol]
  );

  // Operator keyboard shortcuts (1: BTCUSDT, 2: ETHUSDT, R: Refresh) — Gate #1: zero animation on keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "1") {
        handleSelectSymbol("BTCUSDT", true);
      } else if (e.key === "2") {
        handleSelectSymbol("ETHUSDT", true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        loadLiveMonitorData(selectedSymbol, true);
        loadHistoricalBaseline(selectedSymbol);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedSymbol,
    handleSelectSymbol,
    loadLiveMonitorData,
    loadHistoricalBaseline,
  ]);

  // Handler: Simulate Flash Crash (POST /api/simulate-crash)
  const handleSimulateCrash = async (payload: SimulateCrashPayload) => {
    setIsSubmittingDemo(true);
    setLastActionStatus(null);

    try {
      await postSimulateCrash(payload);
      setLastActionStatus({
        type: "success",
        message: `POST /api/simulate-crash diterapkan untuk ${payload.symbol} (High $${payload.simulated_high}, Low $${payload.simulated_low}).`,
      });
      await loadLiveMonitorData(selectedSymbol, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request gagal";
      setLastActionStatus({
        type: "error",
        message: `Gagal mengirim POST /api/simulate-crash ke ${FASTAPI_BASE_URL}: ${msg}`,
      });
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  // Handler: Reset to Live (POST /api/reset-simulation?symbol=...)
  const handleResetSimulation = async () => {
    setIsSubmittingDemo(true);
    setLastActionStatus(null);

    try {
      await postResetSimulation(selectedSymbol);
      setLastActionStatus({
        type: "success",
        message: `Simulasi direset (${selectedSymbol}). Kembali ke aliran data Live Binance API.`,
      });
      await loadLiveMonitorData(selectedSymbol, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request gagal";
      setLastActionStatus({
        type: "error",
        message: `Gagal mereset simulasi (${FASTAPI_BASE_URL}): ${msg}`,
      });
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Top Bar / Header */}
      <HeaderBar
        selectedSymbol={selectedSymbol}
        onSelectSymbol={handleSelectSymbol}
        isKeyboardSwitch={isKeyboardSwitch}
        isSimulated={Boolean(monitorData?.is_simulated)}
        isOffline={Boolean(apiError)}
        lastUpdated={monitorData?.timestamp ?? null}
        secondsToNextPoll={secondsToNextPoll}
        isPolling={isPolling}
        onManualRefresh={() => {
          loadLiveMonitorData(selectedSymbol, true);
          loadHistoricalBaseline(selectedSymbol);
        }}
      />

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
        {/* Cached Live Notice when Internet to Binance drops momentarily */}
        {isUsingCachedLive && !apiError && (
          <div className="enter-surface flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-amber-500/30 bg-slate-900 px-4 py-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-400"
                aria-hidden="true"
              />
              <span>
                Koneksi ke Binance API sempat terputus — menampilkan data valid
                terakhir pada{" "}
                <span className="font-mono font-medium text-slate-100 tabular-nums">
                  {monitorData?.timestamp}
                </span>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadLiveMonitorData(selectedSymbol, true)}
              className="btn-press rounded-md border border-slate-700 bg-[#0B0F19] px-2.5 py-1 font-mono text-[11px] font-medium text-slate-200 hover:bg-slate-800"
            >
              Muat ulang
            </button>
          </div>
        )}

        {/* FastAPI Offline Error Handling Banner */}
        {apiError && (
          <div className="enter-surface rounded-[10px] border border-rose-500/40 bg-slate-900 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <ServerCrash
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-xs font-semibold text-rose-300">
                    Koneksi ke backend FastAPI terputus ({FASTAPI_BASE_URL})
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {monitorData
                      ? `Menampilkan snapshot terakhir yang tersimpan (${monitorData.timestamp}). `
                      : ""}
                    Pastikan server FastAPI aktif di{" "}
                    <code className="font-mono text-slate-200">
                      http://localhost:8000
                    </code>
                    . Polling otomatis berjalan setiap 5 detik.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadLiveMonitorData(selectedSymbol, true);
                  loadHistoricalBaseline(selectedSymbol);
                }}
                className="btn-press flex shrink-0 items-center gap-1.5 self-start rounded-md border border-slate-700 bg-[#0B0F19] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 md:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Coba lagi</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Dual-Core AI Status Panel (Top Main Grid) */}
        {monitorData || isInitialLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Panel Kiri: Current Market Status — K-Means Detection */}
            <KMeansDetectionPanel
              data={monitorData}
              liveHistory={liveHistory}
              isLoading={isInitialLoading}
              isTransitioningSymbol={isTransitioningSymbol}
            />

            {/* Panel Kanan: Prediksi Risiko Jam +1 — Random Forest Prediction */}
            <RandomForestForecastPanel
              data={monitorData}
              isLoading={isInitialLoading}
              isTransitioningSymbol={isTransitioningSymbol}
            />
          </div>
        ) : (
          <div className="rounded-[10px] border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="font-mono text-xs text-slate-400">
              Menunggu respons data pertama dari{" "}
              <code className="text-emerald-400">
                GET {FASTAPI_BASE_URL}/api/live-monitor?symbol={selectedSymbol}
              </code>
              ...
            </p>
          </div>
        )}

        {/* 3. Grafik & Visualisasi Historis */}
        <HistoricalBaselineSection
          symbol={selectedSymbol}
          items={historicalItems}
          totalAnalyzed={totalAnalyzed}
          liveHistory={liveHistory}
          isLoading={isBaselineLoading}
        />

        {/* 4. Demo Control Bar */}
        <DemoControlBar
          symbol={selectedSymbol}
          isSimulated={Boolean(monitorData?.is_simulated)}
          isSubmitting={isSubmittingDemo}
          onSimulateCrash={handleSimulateCrash}
          onResetSimulation={handleResetSimulation}
          lastActionStatus={lastActionStatus}
        />
      </main>
    </div>
  );
};
