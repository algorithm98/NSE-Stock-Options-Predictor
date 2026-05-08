from fastapi import FastAPI
from nsepython import nse_quote, nse_optionchain_scrapper, fnolist
import yfinance as yf
import pandas as pd
import numpy as np
import joblib
import os
import time
from sklearn.ensemble import GradientBoostingRegressor

app = FastAPI()

def compute_technical_indicators(df):
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # EMA
    df['EMA_9'] = df['Close'].ewm(span=9, adjust=False).mean()
    df['EMA_21'] = df['Close'].ewm(span=21, adjust=False).mean()
    
    # Bollinger Bands
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['STD20'] = df['Close'].rolling(window=20).std()
    df['Upper_BB'] = df['MA20'] + (df['STD20'] * 2)
    df['Lower_BB'] = df['MA20'] - (df['STD20'] * 2)
    
    # ATR (for SL calculation)
    high_low = df['High'] - df['Low']
    high_close = np.abs(df['High'] - df['Close'].shift())
    low_close = np.abs(df['Low'] - df['Close'].shift())
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = np.max(ranges, axis=1)
    df['ATR'] = true_range.rolling(14).mean()
    
    return df

def train_model_for_symbol(symbol):
    symbol = symbol.upper()
    is_vercel = os.environ.get('VERCEL') == '1'
    base_dir = "/tmp" if is_vercel else os.getcwd()
    models_dir = os.path.join(base_dir, "models")
    model_path = os.path.join(models_dir, f"{symbol}_model.joblib")
    
    if os.path.exists(model_path) and (time.time() - os.path.getmtime(model_path)) < 86400:
        return True, model_path

    try:
        yf_symbol = f"{symbol}.NS"
        df = yf.download(yf_symbol, period="2y", progress=False)
        if df.empty or len(df) < 50: return False, None
        if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(0)

        df = compute_technical_indicators(df)
        df['Target_High'] = df['High'].shift(-1)
        df['Target_Low'] = df['Low'].shift(-1)
        df.dropna(inplace=True)

        features = ['Open', 'High', 'Low', 'Close', 'Volume', 'RSI', 'EMA_9', 'EMA_21', 'Upper_BB', 'Lower_BB']
        X = df[features].astype(float)
        
        # Use separate models for High and Low for better accuracy
        model_high = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
        model_low = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
        
        model_high.fit(X, df['Target_High'])
        model_low.fit(X, df['Target_Low'])
        
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump({'high': model_high, 'low': model_low, 'features': features}, model_path)
        return True, model_path
    except Exception as e:
        print(f"Error training {symbol}: {e}")
        return False, None

@app.get("/api/predict/{symbol}")
def predict_stock(symbol: str):
    try:
        symbol = symbol.upper()
        success, model_path = train_model_for_symbol(symbol)
        if not success: return {"error": f"Failed to train for {symbol}"}

        yf_symbol = f"{symbol}.NS"
        df = yf.download(yf_symbol, period="2mo", progress=False)
        if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(0)
        
        df_indicators = compute_technical_indicators(df.copy())
        last_row = df_indicators.dropna().iloc[-1]
        
        models = joblib.load(model_path)
        features_data = [last_row[f] for f in models['features']]
        
        pred_high = float(models['high'].predict([features_data])[0])
        pred_low = float(models['low'].predict([features_data])[0])
        
        # Signal Logic
        current_price = float(last_row['Close'])
        atr = float(last_row['ATR'])
        
        signal = "NEUTRAL"
        if pred_high > current_price + (atr * 0.5): signal = "BUY"
        elif pred_low < current_price - (atr * 0.5): signal = "SELL"
        
        # History for Charts
        chart_data = []
        for i in range(-20, 0):
            row = df.iloc[i]
            chart_data.append({
                "time": row.name.strftime('%H:%M' if i == -1 else '%d %b'),
                "price": float(row['Close']),
                "high": float(row['High']),
                "low": float(row['Low'])
            })

        return {
            "symbol": symbol,
            "current_price": current_price,
            "prediction": {"high": pred_high, "low": pred_low},
            "signals": {
                "signal": signal,
                "entry": current_price,
                "target": pred_high if signal == "BUY" else pred_low,
                "stop_loss": current_price - (atr * 1.5) if signal == "BUY" else current_price + (atr * 1.5),
                "trigger": current_price + (atr * 0.1) if signal == "BUY" else current_price - (atr * 0.1)
            },
            "chart_history": chart_data,
            "suggested_strike": round(current_price / 50) * 50
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/symbols")
def get_all_symbols():
    try: return {"symbols": fnolist()}
    except: return {"symbols": ["RELIANCE", "TCS", "HDFCBANK"]}

@app.get("/api/health")
def health(): return {"status": "healthy"}
