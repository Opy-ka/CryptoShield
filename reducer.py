#!/usr/bin/env python3
import sys

current_key = None
data_points = []

def process_group(key, points):
    if not points: return
    coin, date_hour_str = key.split('_', 1)
    
    vols = [ (h - l) for t, h, l, v in points ]
    volumes = [ v for t, h, l, v in points ]
    
    max_vol = max(vols)
    avg_vol = sum(vols) / len(vols) if vols else 0
    spike_ratio = max_vol / avg_vol if avg_vol > 0 else 1.0
    total_vol = sum(volumes)
    
    peak_time = points[vols.index(max_vol)][0]
    
    print(f"{coin}\t{date_hour_str}\t{peak_time}\t{max_vol:.2f}\t{avg_vol:.2f}\t{spike_ratio:.2f}\t{total_vol:.2f}")

for line in sys.stdin:
    line = line.strip()
    if not line: continue
    
    try:
        key, val = line.split('\t', 1)
        time_str, high, low, vol = val.split('\t')
        high, low, vol = float(high), float(low), float(vol)
        
        if current_key == key:
            data_points.append((time_str, high, low, vol))
        else:
            if current_key:
                process_group(current_key, data_points)
            current_key = key
            data_points = [(time_str, high, low, vol)]
    except Exception:
        pass

if current_key:
    process_group(current_key, data_points)
