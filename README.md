# NSE Stock Options Predictor

A real-time web application to predict NSE stock option strike prices and premiums, provide buy/sell signals, and perform fundamental analysis.

## Features
- **Real-time Predictions:** ML-based predictions for stock high/low/close targets.
- **Signals:** Buy/Sell signals with Entry, Exit, Stop Loss, and Trigger price.
- **Fundamentals:** Key metrics like P/E, EPS, and Market Cap.
- **Auto-training:** Models are automatically retrained daily via GitHub Actions.
- **Responsive Dashboard:** Built with Next.js and Tailwind CSS.

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Python (FastAPI) running on Vercel Serverless Functions.
- **ML:** Scikit-learn (Random Forest Regressor).
- **Data:** NSEPython and yfinance.

## Local Development

1. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train Initial Models:**
   ```bash
   python scripts/train.py
   ```

4. **Run with Vercel CLI (Recommended for API testing):**
   ```bash
   vercel dev
   ```

## Automated Training
The application includes a GitHub Action (`.github/workflows/train.yml`) that runs every day at midnight. It fetches the latest 2 years of market data, retrains the models for supported symbols, and commits the updated weights back to the repository.

## Supported Symbols
Currently trained for: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK. To add more, update `scripts/train.py`.

---
*Disclaimer: This tool is for educational purposes. Trading in stock markets involves significant risk.*
