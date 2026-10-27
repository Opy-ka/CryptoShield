# CryptoShield — Design Brief

## 1. Product Identity & Intent
- **Surface:** Real-time crypto market volatility detection & T+1 hour ML regime forecasting terminal (`BTCUSDT`, `ETHUSDT`).
- **Audience:** Quantitative trading operators, thesis examiners, and risk monitoring engineers.
- **60-Second Decision:** "Is the current 5-minute market regime safe for automated trading bots, and what is the T+1 hour volatility/price band risk?"

## 2. Knobs (Locked — Dense Operator Dashboard)
- **CRAFT_LEVEL:** 8
- **MOTION_INTENSITY:** 3 (Micro-interactions only: `150ms cubic-bezier(0.23, 1, 0.32, 1)`, `:active` `scale(0.97)`, no scroll reveals)
- **VISUAL_DENSITY:** 9 (Tight 4/8px grid, hairline `1px` dividers over nested floating cards)
- **DESIGN_VARIANCE:** 4 (Structured terminal layout with asymmetric hero-to-telemetry weighting)

## 3. Signature Bet
- **T+1 Hour Price Band Horizon Ruler & Inline Telemetry Strip:** A precision horizontal price gauge plotting Lower Support (Stop-Loss), live Spot price pin, and Upper Resistance on a proportional scale, paired with an inline 5m close sparkline in the primary K-Means panel.

## 4. Learned Constraints
1. **Forecast Horizon Label:** UI labels use **Jam +1 (Next-Hour / T+1 Hour)** while preserving the backend JSON contract (`next_day_forecast_rf`).
2. **Zero Template Fallback:** Never display hardcoded/template fallback values (`86000` / `avg 50`) when internet drops; always retain and display the last valid market state.
3. **Anti-Slop Discipline:** Sentence case on headings and table headers; 6px status dots + inline proportion bars in tables instead of loud pill badges; hairline grid dividers instead of nested cards-inside-cards; real SVG icons instead of decorative emojis; never `transition-all`.
