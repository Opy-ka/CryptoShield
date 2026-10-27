import {
  CryptoSymbol,
  HistoricalBaselineResponse,
  LiveMonitorResponse,
  RiskRegime,
  SimulateCrashPayload,
} from "@/types/cryptoshield";

export const FASTAPI_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Helper untuk memetakan risk_color atau risk_status dari backend
 * ke kategori standar UI: SAFE | WARNING | DANGER
 */
export function resolveRiskRegime(
  color?: string,
  statusText?: string
): RiskRegime {
  const c = (color || "").toUpperCase();
  const s = (statusText || "").toUpperCase();

  if (c === "RED" || s.includes("DANGER") || s.includes("CRASH")) {
    return "DANGER";
  }
  if (
    c === "YELLOW" ||
    c === "AMBER" ||
    s.includes("WARNING") ||
    s.includes("CAUTION")
  ) {
    return "WARNING";
  }
  return "SAFE";
}

/**
 * Deteksi apakah response dari backend adalah data template fallback
 * (muncul saat backend FastAPI gagal menghubungi API Binance karena internet putus,
 * seperti open=86000, close=86050, volume=450, atau historical_daily_avg_baseline=50.0).
 */
export function isBackendTemplateFallback(data: LiveMonitorResponse): boolean {
  if (data.is_simulated) return false;

  const { ohlcv, current_metrics } = data;
  const isHardcodedCandle =
    (ohlcv.open === 86000 &&
      ohlcv.high === 86120 &&
      ohlcv.low === 85980 &&
      ohlcv.close === 86050) ||
    (ohlcv.volume === 450 && current_metrics.current_volatility === 150);

  const isHardcodedBaseline =
    current_metrics.historical_daily_avg_baseline === 50 ||
    current_metrics.historical_daily_avg_baseline === 50.0;

  return isHardcodedCandle || isHardcodedBaseline;
}

/**
 * Default parameter simulasi Flash Crash sesuai spesifikasi kontrak API
 */
export const DEFAULT_CRASH_PRESETS: Record<
  CryptoSymbol,
  Omit<SimulateCrashPayload, "symbol">
> = {
  BTCUSDT: {
    simulated_high: 86500.0,
    simulated_low: 84200.0,
    simulated_volume: 9500.0,
  },
  ETHUSDT: {
    simulated_high: 2680.0,
    simulated_low: 2410.0,
    simulated_volume: 48500.0,
  },
};

/**
 * 1. GET /api/live-monitor?symbol={symbol}
 */
export async function fetchLiveMonitor(
  symbol: CryptoSymbol,
  signal?: AbortSignal
): Promise<LiveMonitorResponse> {
  const url = `${FASTAPI_BASE_URL}/api/live-monitor?symbol=${encodeURIComponent(
    symbol
  )}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `FastAPI Error (${response.status}): Gagal mengambil data /api/live-monitor`
    );
  }

  return (await response.json()) as LiveMonitorResponse;
}

/**
 * 2. GET /api/historical-baseline?symbol={symbol}&limit={limit}
 */
export async function fetchHistoricalBaseline(
  symbol: CryptoSymbol,
  limit = 24,
  signal?: AbortSignal
): Promise<HistoricalBaselineResponse> {
  const url = `${FASTAPI_BASE_URL}/api/historical-baseline?symbol=${encodeURIComponent(
    symbol
  )}&limit=${limit}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `FastAPI Error (${response.status}): Gagal mengambil data /api/historical-baseline`
    );
  }

  return (await response.json()) as HistoricalBaselineResponse;
}

/**
 * 3. POST /api/simulate-crash
 */
export async function postSimulateCrash(
  payload: SimulateCrashPayload
): Promise<unknown> {
  const url = `${FASTAPI_BASE_URL}/api/simulate-crash`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `FastAPI Error (${response.status}): Gagal memicu /api/simulate-crash`
    );
  }

  return await response.json();
}

/**
 * 4. POST /api/reset-simulation?symbol={symbol}
 */
export async function postResetSimulation(
  symbol: CryptoSymbol
): Promise<unknown> {
  const url = `${FASTAPI_BASE_URL}/api/reset-simulation?symbol=${encodeURIComponent(
    symbol
  )}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `FastAPI Error (${response.status}): Gagal mereset simulasi /api/reset-simulation`
    );
  }

  return await response.json();
}
