#!/usr/bin/env python3
import sys
import os
from datetime import datetime

for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("open_time"): 
        continue
    try:
        parts = line.split(',')
        ts = float(parts[0])
        dt = datetime.fromtimestamp(ts/1000.0)
        # BEDA DI SINI: Ambil sampai level jam
        date_hour_str = dt.strftime('%Y-%m-%d %H:00:00') 
        time_str = dt.strftime('%H:%M:%S')
        
        filepath = os.environ.get("mapreduce_map_input_file", "BTCUSDT")
        coin = "ETHUSDT" if "ETH" in filepath else "BTCUSDT"
        
        high = float(parts[2])
        low = float(parts[3])
        vol = float(parts[5])
        
        # Kunci: KOIN_TANGGALTAMBAHJAM
        print(f"{coin}_{date_hour_str}\t{time_str}\t{high}\t{low}\t{vol}")
    except Exception:
        pass
