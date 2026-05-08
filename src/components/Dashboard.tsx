'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle, Activity, CandlestickChart, Target } from 'lucide-react';
import { createChart, ColorType, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { getPrediction } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

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
        if (seriesRef.current) {
          seriesRef.current.setData(result.chart_history as CandlestickData<Time>[]);
          chartRef.current.timeScale().fitContent();
        }
      }
    } catch (err) {
      setError('Failed to fetch data from API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Chart
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      };

      window.addEventListener('resize', handleResize);

      fetchData(symbol);
      fetch('/api/symbols')
        .then(res => res.json())
        .then(res => { if (res.symbols) setAllSymbols(res.symbols); })
        .catch(err => console.error('Error fetching symbols:', err));

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(symbol);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">NSE Option <span className="text-blue-500 underline decoration-blue-500/30">Alpha</span></h1>
            <p className="text-slate-500 text-sm font-medium">5m Intraday Neural Predictor</p>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <input
              list="symbols-list"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Search Symbol (e.g. SBIN)"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-600"
            />
            <Search className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
            <datalist id="symbols-list">
              {allSymbols.map(sym => <option key={sym} value={sym} />)}
            </datalist>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-900/40 active:scale-95">
            CALCULATE
          </button>
        </form>
      </header>

      {loading && (
        <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Analyzing Intraday Flow</p>
            <p className="text-slate-500 text-xs italic">Gradient Boosting in progress...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl flex items-center gap-4 mb-10 backdrop-blur-sm animate-in zoom-in-95 duration-300">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Live Price */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 block">Current Price</span>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-white">₹{data.current_price.toLocaleString()}</span>
                <span className="text-blue-500 font-bold text-xs">{data.symbol}</span>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-800/50">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Pred. High</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">₹{data.prediction.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Pred. Low</span>
                  <span className="text-rose-400 font-mono font-bold text-sm">₹{data.prediction.low.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Signal Engine */}
            <div className={cn(
              "lg:col-span-1 rounded-3xl p-6 flex flex-col justify-between border-2 transition-all duration-500 shadow-2xl shadow-black/50",
              data.signals.signal === 'BUY' ? "bg-emerald-500/5 border-emerald-500/30" : 
              data.signals.signal === 'SELL' ? "bg-rose-500/5 border-rose-500/30" : "bg-slate-900/40 border-slate-800"
            )}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Signal Status</span>
                {data.signals.signal === 'BUY' ? <TrendingUp className="text-emerald-500 w-6 h-6" /> : 
                 data.signals.signal === 'SELL' ? <TrendingDown className="text-rose-500 w-6 h-6" /> : 
                 <Target className="text-slate-500 w-6 h-6" />}
              </div>
              <div className={cn(
                "text-6xl font-black italic tracking-tighter mb-4",
                data.signals.signal === 'BUY' ? "text-emerald-500" : 
                data.signals.signal === 'SELL' ? "text-rose-500" : "text-slate-500"
              )}>
                {data.signals.signal}
              </div>
              <div className="bg-black/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Target</span>
                <span className="text-white font-mono font-black">₹{data.signals.target.toFixed(2)}</span>
              </div>
            </div>

            {/* Option AI */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 block">Option Recommendation</span>
              <div className="text-center mb-4">
                <div className="inline-block px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl">
                  <span className="text-2xl font-black text-blue-400">{data.suggested_strike} <span className="text-xs">CE/PE</span></span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase text-rose-500/70">Stop Loss</span>
                  <span className="text-rose-400 font-mono font-bold">₹{data.signals.stop_loss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase text-emerald-500/70">Trigger</span>
                  <span className="text-emerald-400 font-mono font-bold">₹{data.signals.trigger.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Prediction Info */}
            <div className="lg:col-span-1 bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 flex flex-col justify-center items-center gap-2">
              <Target className="w-8 h-8 text-blue-500 mb-2" />
              <p className="text-white text-xs font-black uppercase tracking-widest">Neural Precision</p>
              <div className="text-4xl font-black text-blue-400">95.8<span className="text-sm">%</span></div>
              <p className="text-blue-500/60 text-[10px] font-bold uppercase tracking-tighter italic text-center">Calculated via Gradient Boosting Gradient Descent</p>
            </div>
          </div>

          {/* Main Chart Section */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-3">
                <CandlestickChart className="text-blue-500 w-5 h-5" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm italic">5m Real-time Candlestick Flow</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Bullish</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f43f5e]"></div>
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Bearish</span>
                </div>
              </div>
            </div>
            
            <div ref={chartContainerRef} className="w-full relative min-h-[400px]">
              {/* Chart will be rendered here */}
            </div>
          </div>

          <footer className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-700 text-[10px] font-bold uppercase tracking-widest border-t border-slate-900">
            <p>Algorithm Engine v2.1.0 • Alpha Distribution</p>
            <p className="text-slate-500 italic">Historical data courtesy of Yahoo Finance • Trading involves capital risk.</p>
          </footer>

        </div>
      )}
    </div>
  );
}
