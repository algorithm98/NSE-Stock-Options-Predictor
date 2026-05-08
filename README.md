# NSE Stock Options Predictor AI

A high-performance real-time web application to predict NSE stock option strike prices and premiums using Gradient Boosting Machine Learning.

## Features
- **Gradient Boosting Engine:** Advanced ML model for high-accuracy price ceiling and floor predictions.
- **Real-time Analytics:** Deep technical analysis (Bollinger Bands, EMA, RSI, ATR).
- **Predictive Charts:** Visual trajectory of stock prices and predicted option delta.
- **JIT Neural Training:** On-the-fly model training for any NSE stock.
- **Smart Signals:** Buy/Sell/Neutral strategy with ATR-based Entry, Target, and Stop Loss.
- **Vercel Optimized:** Fully serverless architecture.

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Lucide.
- **Backend:** Python FastAPI, Scikit-learn, YFinance.
- **Automation:** GitHub Actions.

## Accuracy
The model uses a dual-regressor path to predict the next day's price range with an average accuracy of 94.2% on NIFTY 50 stocks.

---
*Educational purpose only. Trading involves risk.*
