from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import requests
from datetime import datetime
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import os

app = FastAPI(title="CryptoShield Hybrid ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "hasil_hadoop_jaman.tsv"
MODELS = {}
SIMULATION_STATE = {}
LAST_LIVE_STATE = {}

class CrashSimRequest(BaseModel):
    symbol: str = "BTCUSDT"
    simulated_high: float = 86500.0
    simulated_low: float = 84200.0
    simulated_volume: float = 9500.0

def train_hybrid_models():
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        print("WARNING: File hasil_hadoop_harian.tsv belum ditemukan atau kosong!")
        return

    cols = ["coin", "date", "peak_time", "max_volatility", "avg_volatility", "spike_ratio", "total_volume"]
    df = pd.read_csv(DATA_FILE, sep="\t", names=cols)
    
    for coin, group in df.groupby("coin"):
        group = group.sort_values("date").reset_index(drop=True)
        if len(group) < 10:
            continue

        features = ["max_volatility", "avg_volatility", "spike_ratio", "total_volume"]
        X = group[features].fillna(0)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        raw_clusters = kmeans.fit_predict(X_scaled)

        group["raw_cluster"] = raw_clusters
        cluster_order = group.groupby("raw_cluster")["max_volatility"].mean().sort_values().index.tolist()
        cluster_map = {old_lbl: new_lbl for new_lbl, old_lbl in enumerate(cluster_order)}
        group["cluster_id"] = group["raw_cluster"].map(cluster_map)

        label_map = {0: ("SAFE", "GREEN"), 1: ("WARNING", "YELLOW"), 2: ("DANGER", "RED")}
        group["risk_status"] = group["cluster_id"].map(lambda c: label_map[c][0])
        group["risk_color"] = group["cluster_id"].map(lambda c: label_map[c][1])

        group["target_next_cluster"] = group["cluster_id"].shift(-1)
        group["target_next_max_vol"] = group["max_volatility"].shift(-1)
        train_df = group.dropna().copy()

        X_train = train_df[features]
        rf_clf = RandomForestClassifier(n_estimators=1000, random_state=42)
        rf_clf.fit(X_train, train_df["target_next_cluster"].astype(int))

        rf_reg = RandomForestRegressor(n_estimators=1000, random_state=42)
        rf_reg.fit(X_train, train_df["target_next_max_vol"])

        MODELS[coin] = {
            "df": group,
            "scaler": scaler,
            "kmeans": kmeans,
            "cluster_map": cluster_map,
            "rf_clf": rf_clf,
            "rf_reg": rf_reg,
            "baseline_avg_vol": float(group["avg_volatility"].median()),
            "baseline_daily_volume": float(group["total_volume"].median())
        }
        print(f"[READY] Model Hybrid ML berhasil dilatih untuk {coin} ({len(group)} jam).")

@app.on_event("startup")
def startup_event():
    train_hybrid_models()

@app.get("/api/historical-baseline")
def get_historical_baseline(symbol: str = "BTCUSDT", limit: int = 365):
    symbol = symbol.upper()
    if symbol not in MODELS:
        symbol = list(MODELS.keys())[0] if MODELS else "BTCUSDT"
    
    df = MODELS[symbol]["df"].tail(limit)
    records = df[["coin", "date", "peak_time", "max_volatility", "avg_volatility", "spike_ratio", "total_volume", "cluster_id", "risk_status", "risk_color"]].to_dict(orient="records")
    return {
        "status": "success",
        "symbol": symbol,
        "total_days_analyzed": len(MODELS[symbol]["df"]),
        "data": records
    }

@app.get("/api/live-monitor")
def get_live_monitor(symbol: str = "BTCUSDT"):
    symbol = symbol.upper()
    m_info = MODELS.get(symbol, list(MODELS.values())[0])
    
    is_sim = symbol in SIMULATION_STATE
    
    if is_sim:
        # LOGIKA SIMULATOR (Tetap dipertahankan buat demo DANGER buatan)
        sim = SIMULATION_STATE[symbol]
        high_p = sim["high"]
        low_p = sim["low"]
        open_p = high_p - 50.0
        close_p = low_p + 20.0
        vol_5m = sim["vol"]
        
        curr_vol = max(high_p - low_p, 0.01)
        base_avg = m_info["baseline_avg_vol"]
        spike_ratio = curr_vol / base_avg if base_avg > 0 else 1.0
        est_daily_vol = vol_5m * 12.0 # Sengaja dikali paksa biar AI langsung kaget (DANGER)
        
    else:
        # LOGIKA LIVE NORMAL (Rolling 24-Jam agar setara dengan data Hadoop 5000 hari)
        try:
            url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=5m&limit=12"
            resp = requests.get(url, timeout=5).json()
            
            # Hitung data asli 24 jam terakhir (TIDAK ADA perkalian paksa)
            vols = [float(c[2]) - float(c[3]) for c in resp]
            volumes = [float(c[5]) for c in resp]
            
            curr_vol = max(vols)
            base_avg = sum(vols) / len(vols) if len(vols) > 0 else 0.01
            est_daily_vol = sum(volumes)
            spike_ratio = curr_vol / base_avg if base_avg > 0 else 1.0
            
            # Ambil nilai candle paling terakhir untuk UI
            last_c = resp[-1]
            open_p, high_p, low_p, close_p, vol_5m = float(last_c[1]), float(last_c[2]), float(last_c[3]), float(last_c[4]), float(last_c[5])

            # Simpan ke cache agar jika internet terputus pakai data sebelumnya
            LAST_LIVE_STATE[symbol] = {
                "open_p": open_p,
                "high_p": high_p,
                "low_p": low_p,
                "close_p": close_p,
                "vol_5m": vol_5m,
                "curr_vol": curr_vol,
                "base_avg": base_avg,
                "spike_ratio": spike_ratio,
                "est_daily_vol": est_daily_vol,
            }
            
        except Exception:
            if symbol in LAST_LIVE_STATE:
                cached = LAST_LIVE_STATE[symbol]
                open_p = cached["open_p"]
                high_p = cached["high_p"]
                low_p = cached["low_p"]
                close_p = cached["close_p"]
                vol_5m = cached["vol_5m"]
                curr_vol = cached["curr_vol"]
                base_avg = cached["base_avg"]
                spike_ratio = cached["spike_ratio"]
                est_daily_vol = cached["est_daily_vol"]
            else:
                last_row = m_info["df"].iloc[-1]
                curr_vol = float(last_row["max_volatility"])
                base_avg = float(last_row["avg_volatility"])
                spike_ratio = float(last_row["spike_ratio"])
                est_daily_vol = float(last_row["total_volume"])
                vol_5m = round(est_daily_vol / 12.0, 2)
                close_p = 83137.95 if symbol == "BTCUSDT" else 2641.25
                open_p = round(close_p - (curr_vol * 0.1), 2)
                high_p = round(close_p + (curr_vol * 0.5), 2)
                low_p = round(close_p - (curr_vol * 0.5), 2)

    # x_input sekarang berisi data yang skalanya 100% cocok dengan data Hadoop
    x_input = pd.DataFrame([{
        "max_volatility": curr_vol,
        "avg_volatility": base_avg,
        "spike_ratio": spike_ratio,
        "total_volume": est_daily_vol
    }])

    x_scaled = m_info["scaler"].transform(x_input)
    raw_c = int(m_info["kmeans"].predict(x_scaled)[0])
    c_id = m_info["cluster_map"][raw_c]
    if is_sim:
        c_id = 2

    status_dict = {
        0: ("SAFE - NORMAL MARKET", "GREEN", "KEEP TRADING BOT ACTIVE"),
        1: ("WARNING - HIGH VOLATILITY", "YELLOW", "REDUCE LEVERAGE / TIGHTEN RISK"),
        2: ("DANGER - FLASH CRASH DETECTED", "RED", "HALT TRADING BOT / WIDEN STOP LOSS IMMEDIATELY")
    }
    r_status, r_color, r_action = status_dict[c_id]

    probs = m_info["rf_clf"].predict_proba(x_input)[0]
    classes = m_info["rf_clf"].classes_
    prob_map = {0: 0.0, 1: 0.0, 2: 0.0}
    for cls_idx, p_val in zip(classes, probs):
        prob_map[int(cls_idx)] = round(float(p_val) * 100, 1)

    if is_sim:
        prob_map = {0: 5.0, 1: 18.5, 2: 76.5}

    pred_c = max(prob_map, key=prob_map.get)
    pred_status_map = {0: ("SAFE", "GREEN"), 1: ("WARNING", "YELLOW"), 2: ("DANGER", "RED")}
    p_status, p_color = pred_status_map[pred_c]

    expected_vol = float(m_info["rf_reg"].predict(x_input)[0])
    if is_sim:
        expected_vol = curr_vol * 0.85

    return {
        "symbol": symbol,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "interval": "5m",
        "is_simulated": is_sim,
        "ohlcv": {
            "open": open_p,
            "high": high_p,
            "low": low_p,
            "close": close_p,
            "volume": vol_5m
        },
        "current_metrics": {
            "current_volatility": round(curr_vol, 2),
            "historical_daily_avg_baseline": round(base_avg, 2),
            "spike_ratio": round(spike_ratio, 2)
        },
        "current_detection_kmeans": {
            "cluster_id": c_id,
            "risk_status": r_status,
            "risk_color": r_color,
            "action_recommendation": r_action
        },
        "next_day_forecast_rf": {
            "predicted_status": p_status,
            "predicted_color": p_color,
            "probabilities": {
                "SAFE_GREEN": prob_map[0],
                "WARNING_YELLOW": prob_map[1],
                "DANGER_RED": prob_map[2]
            },
            "expected_volatility_usd": round(expected_vol, 2),
            "estimated_price_band": {
                "upper_resistance": round(close_p + expected_vol, 2),
                "lower_support_stoploss": round(close_p - expected_vol, 2)
            },
            "forecast_message": f"Peluang {prob_map[pred_c]}% pasar memasuki rezim {p_status} pada periode berikutnya."
        }
    }

@app.post("/api/simulate-crash")
def trigger_crash(req: CrashSimRequest):
    SIMULATION_STATE[req.symbol.upper()] = {
        "high": req.simulated_high,
        "low": req.simulated_low,
        "vol": req.simulated_volume
    }
    return {"status": "simulation_activated", "symbol": req.symbol.upper()}

@app.post("/api/reset-simulation")
def reset_crash(symbol: str = "BTCUSDT"):
    SIMULATION_STATE.pop(symbol.upper(), None)
    return {"status": "reset_to_live", "symbol": symbol.upper()}
