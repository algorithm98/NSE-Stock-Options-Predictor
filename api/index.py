from fastapi import FastAPI
from nsepython import nse_quote, nse_optionchain_scrapper, fnolist
import yfinance as yf
import pandas as pd
import numpy as np
import joblib
import os
import time
from sklearn.ensemble import RandomForestRegressor

app = FastAPI()

def compute_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def generate_signals(current_price, predicted_high, predicted_low, rsi, fundamentals):
    signal = "NEUTRAL"
    entry = current_price
    target = predicted_high
    stop_loss = predicted_low
    trigger = current_price
    
    if predicted_high > current_price * 1.01 and rsi < 70:
        if fundamentals.get('pe') and fundamentals['pe'] < 40:
            signal = "BUY"
            entry = current_price
            target = predicted_high
            stop_loss = current_price * 0.98
            trigger = current_price * 1.002
    
    elif predicted_low < current_price * 0.99 and rsi > 30:
        signal = "SELL"
        entry = current_price
        target = predicted_low
        stop_loss = current_price * 1.02
        trigger = current_price * 0.998
        
    return {
        "signal": signal,
        "entry": entry,
        "target": target,
        "stop_loss": stop_loss,
        "trigger": trigger
    }

def train_model_for_symbol(symbol):
    symbol = symbol.upper()
    # On Vercel, /tmp is the only writable directory
    is_vercel = os.environ.get('VERCEL') == '1'
    base_dir = "/tmp" if is_vercel else os.getcwd()
    models_dir = os.path.join(base_dir, "models")
    model_path = os.path.join(models_dir, f"{symbol}_model.joblib")
    
    # Check if model already exists and is recent
    if os.path.exists(model_path):
        mtime = os.path.getmtime(model_path)
        if (time.time() - mtime) < 86400: # 24 hours
            return True, model_path

    try:
        yf_symbol = f"{symbol}.NS"
        df = yf.download(yf_symbol, period="2y", progress=False)
        if df.empty or len(df) < 50:
            return False, None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['RSI'] = compute_rsi(df['Close'], 14)
        
        df['Target_High'] = df['High'].shift(-1)
        df['Target_Low'] = df['Low'].shift(-1)
        df['Target_Close'] = df['Close'].shift(-1)
        
        df.dropna(inplace=True)
        if df.empty: return False, None

        features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_5', 'SMA_20', 'RSI']
        X = df[features].astype(float)
        y = df[['Target_High', 'Target_Low', 'Target_Close']].astype(float)
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump(model, model_path)
        return True, model_path
    except Exception as e:
        print(f"Training error for {symbol}: {e}")
        return False, None

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "NSE Stock Options Predictor API is running"}

@app.get("/api/symbols")
def get_all_symbols():
    try:
        symbols = fnolist()
        return {"symbols": symbols}
    except Exception as e:
        return {"symbols": ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]}

@app.get("/api/options/{symbol}")
def get_options_data(symbol: str):
    try:
        payload = nse_optionchain_scrapper(symbol.upper())
        return payload
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/predict/{symbol}")
def predict_stock(symbol: str):
    try:
        symbol = symbol.upper()
        # Train on-the-fly if needed
        success, model_path = train_model_for_symbol(symbol)
        if not success:
            return {"error": f"Insufficient data or invalid symbol: {symbol}"}

        # Fetch current data
        yf_symbol = f"{symbol}.NS"
        df = yf.download(yf_symbol, period="1mo", progress=False)
        if df.empty:
            return {"error": "Symbol not found"}
        
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['RSI'] = compute_rsi(df['Close'], 14)
        
        df = df.dropna()
        if df.empty:
            return {"error": "Insufficient data for technical indicators"}
            
        last_row = df.iloc[-1]
        features = [
            float(last_row['Open']), float(last_row['High']), float(last_row['Low']), 
            float(last_row['Close']), float(last_row['Volume']), 
            float(last_row['SMA_5']), float(last_row['SMA_20']), float(last_row['RSI'])
        ]
        
        model = joblib.load(model_path)
        prediction = model.predict([features])[0]
        
        pred_high, pred_low, pred_close = prediction
        
        ticker = yf.Ticker(yf_symbol)
        info = ticker.info
        fundamentals = {
            "pe": info.get('trailingPE'),
            "eps": info.get('trailingEps'),
            "marketCap": info.get('marketCap')
        }
        
        signals = generate_signals(last_row['Close'], pred_high, pred_low, last_row['RSI'], fundamentals)
        suggested_strike = round(last_row['Close'] / 50) * 50
        
        return {
            "symbol": symbol,
            "current_price": float(last_row['Close']),
            "prediction": {
                "high": float(pred_high),
                "low": float(pred_low),
                "close": float(pred_close)
            },
            "signals": signals,
            "suggested_strike": suggested_strike,
            "fundamentals": fundamentals
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stock/{symbol}")
def get_stock_details(symbol: str):
    try:
        quote = nse_quote(symbol)
        yf_symbol = f"{symbol}.NS"
        ticker = yf.Ticker(yf_symbol)
        info = ticker.info
        return {
            "symbol": symbol,
            "price": quote.get('priceInfo', {}).get('lastPrice'),
            "change": quote.get('priceInfo', {}).get('change'),
            "pChange": quote.get('priceInfo', {}).get('pChange'),
            "fundamentals": {
                "pe": info.get('trailingPE'),
                "eps": info.get('trailingEps'),
                "marketCap": info.get('marketCap')
            }
        }
    except Exception as e:
        return {"error": str(e)}
