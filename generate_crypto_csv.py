import requests
import pandas as pd
import time
import os

win_dropzone = "/mnt/d/BIGDATA/NiFi_Input"
os.makedirs(win_dropzone, exist_ok=True)
coins = ["BTCUSDT", "ETHUSDT"]

# Ambil data asli dari Binance sebagai referensi bentuk candle
for coin in coins:
    print(f"Mengambil sampel dasar {coin} dari Binance...")
    url = f"https://api.binance.com/api/v3/klines?symbol={coin}&interval=5m&limit=1000"
    sample_data = requests.get(url).json()
    
    rows = []
    total_days = 5475  # Tepat 15 tahun (365 * 15)
    candles_per_day = 288
    base_ts = int(time.time() * 1000) - (total_days * 24 * 60 * 60 * 1000) 
    
    print(f"Menghasilkan 1,5 juta baris data historis (15 tahun) untuk {coin}...")
    for day in range(total_days):
        is_crash_day = (day % 30 == 0) 
        for candle in range(candles_per_day):
            sample = sample_data[(day * candles_per_day + candle) % len(sample_data)]
            ts = base_ts + (((day * candles_per_day) + candle) * 5 * 60 * 1000)
            open_p = float(sample[1])
            high_p = float(sample[2])
            low_p = float(sample[3])
            close_p = float(sample[4])
            vol = float(sample[5])
            
            if is_crash_day and candle == 120:
                shock = open_p * 0.06
                high_p = open_p + (shock * 0.2)
                low_p = open_p - (shock * 0.8)
                vol = vol * 25.0
                
            rows.append([ts, open_p, high_p, low_p, close_p, vol])
            
    df = pd.DataFrame(rows, columns=["open_time", "open", "high", "low", "close", "volume"])
    out_path = os.path.join(win_dropzone, f"{coin}_5m.csv")
    df.to_csv(out_path, index=False)
    print(f"Sukses! File {coin} berukuran {len(df):,} baris ({total_days} hari) tersimpan.")
