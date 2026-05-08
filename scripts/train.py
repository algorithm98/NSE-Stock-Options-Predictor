import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

from nsepython import nse_eq_symbols, fnolist
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
import time

def train_for_symbol(symbol):
    symbol = symbol.upper()
    model_path = f"models/{symbol}_model.joblib"
    
    # Check if model already exists and is recent (e.g., less than 24h old)
    if os.path.exists(model_path):
        mtime = os.path.getmtime(model_path)
        if (time.time() - mtime) < 86400: # 24 hours
            print(f"Model for {symbol} is up to date.")
            return

    print(f"Training model for {symbol}...")
    try:
        # Fetch historical data (2 years)
        df = yf.download(f"{symbol}.NS", period="2y", progress=False)
        if df.empty or len(df) < 50:
            print(f"Insufficient data for {symbol}")
            return

        # Ensure single level columns if MultiIndex
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Feature Engineering
        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['RSI'] = compute_rsi(df['Close'], 14)
        
        # Target: Next day's High and Low
        df['Target_High'] = df['High'].shift(-1)
        df['Target_Low'] = df['Low'].shift(-1)
        df['Target_Close'] = df['Close'].shift(-1)
        
        df.dropna(inplace=True)
        
        if df.empty:
            return

        features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_5', 'SMA_20', 'RSI']
        X = df[features].astype(float)
        y = df[['Target_High', 'Target_Low', 'Target_Close']].astype(float)
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Save model
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, model_path)
        print(f"Model saved to {model_path}")
    except Exception as e:
        print(f"Error training {symbol}: {e}")

def compute_rsi(series, period):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

if __name__ == "__main__":
    # Get all F&O stocks (most relevant for options prediction)
    try:
        print("Fetching NSE F&O list...")
        fno_stocks = fnolist()
        print(f"Found {len(fno_stocks)} F&O symbols.")
        
        # Train for all F&O stocks (more manageable than all 2000+ equities)
        for sym in fno_stocks:
            train_for_symbol(sym)
            time.sleep(1) # Prevent rate limiting
            
    except Exception as e:
        print(f"Error fetching symbols: {e}")
        # Fallback to a core list
        symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL"]
        for sym in symbols:
            train_for_symbol(sym)
