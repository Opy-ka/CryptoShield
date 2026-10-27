# 🛡️ CryptoShield — Real-Time Volatility Detection Dashboard

Frontend Web UI Dashboard berbasis **Next.js (App Router) + TypeScript + Tailwind CSS** untuk proyek Skripsi / Big Data **CryptoShield**.

## Struktur Komponen Modular

- [`src/types/cryptoshield.ts`](./src/types/cryptoshield.ts) — Kontrak tipe data TypeScript sesuai JSON response FastAPI.
- [`src/lib/api.ts`](./src/lib/api.ts) — Service layer untuk komunikasi ke FastAPI (`http://localhost:8000`) beserta fallback generator saat server backend sedang offline.
- [`src/components/HeaderBar.tsx`](./src/components/HeaderBar.tsx) — Top Bar berisi judul proyek, selector koin (`BTCUSDT` / `ETHUSDT`), badge status (`Live Binance API` / `Simulation Mode Active`), dan countdown polling 5 detik.
- [`src/components/KMeansDetectionPanel.tsx`](./src/components/KMeansDetectionPanel.tsx) — Panel Kiri (*Current Market Status — K-Means Detection*) dengan lampu indikator `SAFE` / `WARNING` / `DANGER`, harga OHLCV 5m, rasio lonjakan volatilitas (*Spike Ratio*), dan rekomendasi aksi bot trading.
- [`src/components/RandomForestForecastPanel.tsx`](./src/components/RandomForestForecastPanel.tsx) — Panel Kanan (*Prediksi Risiko Jam +1 / Next-Hour Forecast — Random Forest Prediction*) dengan *Progress Bar* probabilitas (`% SAFE`, `% WARNING`, `% DANGER`), estimasi rentang harga Jam +1 (*Upper Resistance* & *Lower Support / Stop Loss*), serta pesan naratif AI.
- [`src/components/HistoricalBaselineSection.tsx`](./src/components/HistoricalBaselineSection.tsx) — Visualisasi grafik area SVG interaktif yang membandingkan volatilitas aktual terhadap *Historical Daily Avg Baseline* beserta tabel ringkasan historis & log polling real-time.
- [`src/components/DemoControlBar.tsx`](./src/components/DemoControlBar.tsx) — Panel khusus dosen/presentasi dengan tombol **🚨 Simulate Flash Crash** (`POST /api/simulate-crash`) dan **🔄 Reset to Live** (`POST /api/reset-simulation`).
- [`src/components/CryptoShieldDashboard.tsx`](./src/components/CryptoShieldDashboard.tsx) — Komponen utama yang mengintegrasikan siklus `setInterval` 5 detik, loading skeleton, dan error handling apabila FastAPI belum aktif.

## Cara Menjalankan

```bash
cd D:\CryptoShield\dashboard
npm install
npm run dev
```

Buka `http://localhost:3000` di browser. Pastikan server FastAPI berjalan di `http://localhost:8000` (atau gunakan fitur **Buka Simulasi Offline / Preview UI** di dalam dashboard jika ingin mendemokan antarmuka tanpa backend).
