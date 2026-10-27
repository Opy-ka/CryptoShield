export type CryptoSymbol = "BTCUSDT" | "ETHUSDT";

export type RiskColorCode = "GREEN" | "YELLOW" | "RED";
export type RiskRegime = "SAFE" | "WARNING" | "DANGER";

export interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CurrentMetrics {
  current_volatility: number;
  historical_daily_avg_baseline: number;
  spike_ratio: number;
}

export interface KMeansDetection {
  cluster_id: number;
  risk_status: string;
  risk_color: RiskColorCode | string;
  action_recommendation: string;
}

export interface ForecastProbabilities {
  SAFE_GREEN: number;
  WARNING_YELLOW: number;
  DANGER_RED: number;
}

export interface EstimatedPriceBand {
  upper_resistance: number;
  lower_support_stoploss: number;
}

export interface RandomForestForecast {
  predicted_status: string;
  predicted_color: RiskColorCode | string;
  probabilities: ForecastProbabilities;
  expected_volatility_usd: number;
  estimated_price_band: EstimatedPriceBand;
  forecast_message: string;
}

export interface LiveMonitorResponse {
  symbol: CryptoSymbol | string;
  timestamp: string;
  interval: string;
  is_simulated: boolean;
  ohlcv: OHLCVData;
  current_metrics: CurrentMetrics;
  current_detection_kmeans: KMeansDetection;
  next_day_forecast_rf: RandomForestForecast;
}

export interface SimulateCrashPayload {
  symbol: CryptoSymbol;
  simulated_high: number;
  simulated_low: number;
  simulated_volume: number;
}

export interface HistoricalBaselineItem {
  coin: string;
  date: string;
  peak_time: string;
  max_volatility: number;
  avg_volatility: number;
  spike_ratio: number;
  total_volume: number;
  cluster_id: number;
  risk_status: string;
  risk_color: RiskColorCode | string;
}

export interface HistoricalBaselineResponse {
  status: string;
  symbol: string;
  total_days_analyzed: number;
  data: HistoricalBaselineItem[];
}
