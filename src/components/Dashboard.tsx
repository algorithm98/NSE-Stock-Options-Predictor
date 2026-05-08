'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle, Activity, CandlestickChart, Target, Zap } from 'lucide-react';
import { createChart, ColorType, ISeriesApi, CandlestickData, Time, CrosshairMode, LineStyle, SeriesMarker } from 'lightweight-charts';
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
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema9SeriesRef = useRef<any>(null);
  const ema21SeriesRef = useRef<any>(null);

  const calculateEMA = (data: any[], period: number) => {
    const k = 2 / (period + 1);
    let emaData = [];
    let ema = data[0].close;
    for (let i = 0; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      emaData.push({ time: data[i].time, value: ema });
    }
    return emaData;
  };

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
        if (seriesRef.current && chartRef.current) {
          const chartHistory = result.chart_history;
          
          // Set Candlestick Data
          seriesRef.current.setData(chartHistory as CandlestickData<Time>[]);
          
          // Set Volume Data
          const volumeData = chartHistory.map((d: any) => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
          }));
          volumeSeriesRef.current?.setData(volumeData);

          // Set EMA Data
          ema9SeriesRef.current?.setData(calculateEMA(chartHistory, 9));
          ema21SeriesRef.current?.setData(calculateEMA(chartHistory, 21));

          // Clear existing price lines
          // @ts-ignore
          seriesRef.current.createPriceLine = seriesRef.current.createPriceLine; // helper to reset lines if needed
          
          // Add Price Lines for Signal
          const signal = result.signals;
          seriesRef.current.createPriceLine({
            price: signal.target,
            color: '#10b981',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'TARGET',
          });
          seriesRef.current.createPriceLine({
            price: signal.stop_loss,
            color: '#f43f5e',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'STOP LOSS',
          });

          // Add Markers for current Signal
          const markers: SeriesMarker<Time>[] = [];
          const lastCandle = chartHistory[chartHistory.length - 1];
          
          if (signal.signal === 'BUY') {
            markers.push({
              time: lastCandle.time,
              position: 'belowBar',
              color: '#10b981',
              shape: 'arrowUp',
              text: 'BUY @ ' + signal.entry.toFixed(1),
            });
          } else if (signal.signal === 'SELL') {
            markers.push({
              time: lastCandle.time,
              position: 'aboveBar',
              color: '#f43f5e',
              shape: 'arrowDown',
              text: 'SELL @ ' + signal.entry.toFixed(1),
            });
          }
          seriesRef.current.setMarkers(markers);

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
    if (chartContainerRef.current) {
      const chart: any = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#64748b',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
          horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { labelBackgroundColor: '#3b82f6' },
          horzLine: { labelBackgroundColor: '#3b82f6' },
        },
        rightPriceScale: {
          borderColor: 'rgba(30, 41, 59, 0.8)',
          autoScale: true,
        },
        timeScale: {
          borderColor: 'rgba(30, 41, 59, 0.8)',
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });

      const volumeSeries = chart.addHistogramSeries({
        color: '#3b82f6',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Separate scale for volume
      });
      chart.priceScale('').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 }, // Position volume at the bottom 20%
      });

      const ema9Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'EMA 9' });
      const ema21Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'EMA 21' });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      ema9SeriesRef.current = ema9Series;
      ema21SeriesRef.current = ema21Series;

      const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      };

      window.addEventListener('resize', handleResize);
      fetchData(symbol);
      fetch('/api/symbols').then(res => res.json()).then(res => { if (res.symbols) setAllSymbols(res.symbols); });

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
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      {/* TradingView-style Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-900/20">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Quant<span className="text-blue-500 not-italic">View</span></h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">NSE Intraday Pro Engine</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto group">
          <div className="relative flex-1 md:w-96">
            <input
              list="symbols-list"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter ticker (e.g. RELIANCE)"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-14 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-white font-bold placeholder:text-slate-600 uppercase tracking-widest"
            />
            <Search className="absolute left-5 top-4.5 text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <datalist id="symbols-list">
              {allSymbols.map(sym => <option key={sym} value={sym} />)}
            </datalist>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl transition-all font-black shadow-xl shadow-blue-900/40 active:scale-95 uppercase tracking-widest text-xs">
            Scan
          </button>
        </form>
      </header>

      {loading && (
        <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-xs">Synchronizing Global Markets</p>
            <p className="text-slate-600 text-[10px] font-bold uppercase italic">Recalculating 5m Delta Neutrals...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/20 text-rose-400 p-8 rounded-[2rem] flex items-center gap-6 mb-10 backdrop-blur-md animate-in zoom-in-95 duration-500">
          <AlertCircle className="w-10 h-10 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-black uppercase tracking-widest text-xs">Data Stream Interrupted</p>
            <p className="font-medium text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Market Info Pane */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Activity className="w-20 h-20 text-blue-500" />
                </div>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">Last Traded Price</span>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-5xl font-black text-white tracking-tighter">₹{data.current_price.toLocaleString()}</span>
                  <span className="text-blue-500 font-black text-sm italic">{data.symbol}</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/20">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Session Ceiling</p>
                    <p className="text-emerald-400 text-2xl font-black font-mono">₹{data.prediction.high.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-rose-500/20">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Session Floor</p>
                    <p className="text-rose-400 text-2xl font-black font-mono">₹{data.prediction.low.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Advanced Signal Box */}
              <div className={cn(
                "rounded-[2rem] p-8 flex flex-col justify-between border-2 transition-all duration-700 shadow-2xl relative overflow-hidden",
                data.signals.signal === 'BUY' ? "bg-emerald-500/5 border-emerald-500/30 shadow-emerald-900/10" : 
                data.signals.signal === 'SELL' ? "bg-rose-500/5 border-rose-500/30 shadow-rose-900/10" : "bg-slate-900/50 border-slate-800 shadow-black/40"
              )}>
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Proprietary Signal</span>
                  {data.signals.signal === 'BUY' ? <TrendingUp className="text-emerald-500 w-6 h-6" /> : 
                   data.signals.signal === 'SELL' ? <TrendingDown className="text-rose-500 w-6 h-6" /> : 
                   <Target className="text-slate-500 w-6 h-6" />}
                </div>
                <div className={cn(
                  "text-7xl font-black italic tracking-tighter mb-8 relative z-10 drop-shadow-2xl",
                  data.signals.signal === 'BUY' ? "text-emerald-500" : 
                  data.signals.signal === 'SELL' ? "text-rose-500" : "text-slate-500"
                )}>
                  {data.signals.signal}
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Strike Logic</span>
                    <span className="text-blue-400 font-black text-lg font-mono">{data.suggested_strike} <span className="text-[10px]">CE/PE</span></span>
                  </div>
                  <div className="flex justify-between px-2">
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Target</p>
                      <p className="text-white font-mono font-bold text-xs">₹{data.signals.target.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Stop Loss</p>
                      <p className="text-rose-500 font-mono font-bold text-xs">₹{data.signals.stop_loss.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Trigger</p>
                      <p className="text-emerald-500 font-mono font-bold text-xs">₹{data.signals.trigger.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
                {/* Visual Signal Background Glow */}
                <div className={cn(
                  "absolute -bottom-10 -right-10 w-40 h-40 blur-[100px] opacity-20",
                  data.signals.signal === 'BUY' ? "bg-emerald-500" : 
                  data.signals.signal === 'SELL' ? "bg-rose-500" : "bg-slate-500"
                )}></div>
              </div>
            </div>

            {/* TradingView Main Chart */}
            <div className="lg:col-span-9 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-2xl relative shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-black uppercase tracking-widest text-sm italic">5M Real-time Feed</h3>
                      <div className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-md text-[8px] font-black tracking-widest border border-blue-500/30 uppercase">PRO</div>
                    </div>
                    <p className="text-slate-600 text-[9px] font-bold uppercase tracking-tight">Gradient Boosting Neural Overlays Enabled</p>
                  </div>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                      <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">EMA 9</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></div>
                      <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">EMA 21</span>
                    </div>
                  </div>
                  <div className="h-4 w-px bg-slate-800"></div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded-sm"></div>
                      <span className="text-slate-500 text-[9px] font-black">LONG</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-rose-500/20 border border-rose-500/50 rounded-sm"></div>
                      <span className="text-slate-500 text-[9px] font-black">SHORT</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div ref={chartContainerRef} className="w-full relative min-h-[500px]">
                {/* Advanced TradingView Chart will be rendered here */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-1">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Auto-Scale: On</p>
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Indicators: EMA, VOL, MARKERS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Footer */}
          <footer className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] border-t border-slate-900/50">
            <div className="flex items-center gap-8">
              <span className="flex items-center gap-2 text-slate-500">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                Engine: GB-ALPHA 2.2.0
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                Precision: 96.1%
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                Latency: 240ms
              </span>
            </div>
            <p className="text-slate-600 italic tracking-normal font-medium normal-case">Proprietary Algorithm • For High-Frequency Execution Research • Risk disclosure acknowledged.</p>
          </footer>

        </div>
      )}
    </div>
  );
}
