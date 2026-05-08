'use client';

import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info, Activity } from 'lucide-react';
import { getPrediction } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPrediction(sym);
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to fetch data from API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(symbol);
    fetch('/api/symbols')
      .then(res => res.json())
      .then(res => {
        if (res.symbols) setAllSymbols(res.symbols);
      })
      .catch(err => console.error('Error fetching symbols:', err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(symbol);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            NSE Stock Options Predictor
          </h1>
          <p className="text-gray-400">Real-time signals & ML predictions</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-96 flex gap-2">
          <div className="relative flex-1">
            <input
              list="symbols-list"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Search Symbol (e.g. SBIN)"
              className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg py-2 px-10 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500 w-5 h-5" />
            <datalist id="symbols-list">
              {allSymbols.map(sym => <option key={sym} value={sym} />)}
            </datalist>
          </div>
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap"
          >
            Predict
          </button>
        </form>
      </header>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-3 mb-8">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Price & Prediction Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-gray-400 font-medium">Live Price</h2>
              <Activity className="text-blue-500 w-5 h-5" />
            </div>
            <div className="text-4xl font-bold mb-2">₹{data.current_price.toLocaleString()}</div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Pred. High</p>
                <p className="text-emerald-400 font-semibold">₹{data.prediction.high.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Pred. Low</p>
                <p className="text-red-400 font-semibold">₹{data.prediction.low.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Target</p>
                <p className="text-blue-400 font-semibold">₹{data.prediction.close.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Signal Card */}
          <div className={cn(
            "border rounded-xl p-6 flex flex-col justify-between",
            data.signals.signal === 'BUY' ? "bg-emerald-950/10 border-emerald-500/30" : 
            data.signals.signal === 'SELL' ? "bg-red-950/10 border-red-500/30" : "bg-[#111111] border-gray-800"
          )}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-gray-400 font-medium">Signal Status</h2>
              {data.signals.signal === 'BUY' ? <TrendingUp className="text-emerald-500 w-6 h-6" /> : 
               data.signals.signal === 'SELL' ? <TrendingDown className="text-red-500 w-6 h-6" /> : 
               <Info className="text-gray-500 w-6 h-6" />}
            </div>
            
            <div className={cn(
              "text-3xl font-black mb-6",
              data.signals.signal === 'BUY' ? "text-emerald-500" : 
              data.signals.signal === 'SELL' ? "text-red-500" : "text-gray-400"
            )}>
              {data.signals.signal}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entry</span>
                <span className="font-mono">₹{data.signals.entry.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Exit (Target)</span>
                <span className="font-mono text-emerald-400">₹{data.signals.target.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Stop Loss</span>
                <span className="font-mono text-red-400">₹{data.signals.stop_loss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-800">
                <span className="text-gray-500">Trigger Price</span>
                <span className="font-mono font-bold">₹{data.signals.trigger.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Option & Fundamentals Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-gray-400 font-medium">Option Recommendation</h2>
              <CheckCircle2 className="text-purple-500 w-5 h-5" />
            </div>
            
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase mb-1">Suggested Strike</p>
              <div className="text-2xl font-bold text-purple-400">{data.suggested_strike} CE/PE</div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs text-gray-500 uppercase border-b border-gray-800 pb-2">Fundamentals</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">P/E Ratio</p>
                  <p className="font-medium">{data.fundamentals.pe?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">EPS</p>
                  <p className="font-medium">{data.fundamentals.eps?.toFixed(2) || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Market Cap</p>
                  <p className="font-medium">₹{(data.fundamentals.marketCap / 10000000000).toFixed(2)} Cr</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-12 text-center text-gray-600 text-sm">
        <p>Models are automatically retrained daily at midnight UTC.</p>
        <p className="mt-2 italic">Disclaimer: Predictions are for educational purposes only. Market trading involves risk.</p>
      </footer>
    </div>
  );
}
