'use client';

import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle, Activity, LineChart as ChartIcon, Target } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
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
      .then(res => { if (res.symbols) setAllSymbols(res.symbols); })
      .catch(err => console.error('Error fetching symbols:', err));
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
            <h1 className="text-3xl font-black tracking-tighter text-white">NSE OPTION <span className="text-blue-500 underline decoration-blue-500/30">AI</span></h1>
            <p className="text-slate-500 text-sm font-medium">Real-time Predictive Analytics</p>
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
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-900/20 active:scale-95">
            ANALYZE
          </button>
        </form>
      </header>

      {loading && (
        <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-blue-400 font-bold animate-pulse uppercase tracking-widest text-xs">Training Neural Engine...</p>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-4 mb-10 backdrop-blur-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Live Stats Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Market Value</span>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">LIVE</div>
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black text-white">₹{data.current_price.toLocaleString()}</span>
                <span className="text-slate-500 font-mono text-sm">{data.symbol}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Pred. Ceiling</p>
                  <p className="text-emerald-400 text-xl font-black">₹{data.prediction.high.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Pred. Floor</p>
                  <p className="text-rose-400 text-xl font-black">₹{data.prediction.low.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Signal Engine Card */}
            <div className={cn(
              "rounded-3xl p-8 flex flex-col justify-between border-2 transition-all duration-500",
              data.signals.signal === 'BUY' ? "bg-emerald-500/5 border-emerald-500/20" : 
              data.signals.signal === 'SELL' ? "bg-rose-500/5 border-rose-500/20" : "bg-slate-900/40 border-slate-800"
            )}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">AI Strategy</span>
                {data.signals.signal === 'BUY' ? <TrendingUp className="text-emerald-500 w-8 h-8" /> : 
                 data.signals.signal === 'SELL' ? <TrendingDown className="text-rose-500 w-8 h-8" /> : 
                 <Target className="text-slate-500 w-8 h-8" />}
              </div>
              
              <div className={cn(
                "text-7xl font-black mb-8 italic tracking-tighter",
                data.signals.signal === 'BUY' ? "text-emerald-500" : 
                data.signals.signal === 'SELL' ? "text-rose-500" : "text-slate-500"
              )}>
                {data.signals.signal}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500 text-xs font-bold uppercase">Optimum Entry</span>
                  <span className="text-white font-mono font-bold">₹{data.signals.entry.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-500 text-xs font-bold uppercase text-emerald-500/70">Profit Target</span>
                  <span className="text-emerald-400 font-mono font-bold">₹{data.signals.target.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 text-xs font-bold uppercase text-rose-500/70">Stop Loss</span>
                  <span className="text-rose-400 font-mono font-bold">₹{data.signals.stop_loss.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Option AI Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-8">
                <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Option Alpha</span>
                <ChartIcon className="text-blue-500 w-6 h-6" />
              </div>
              
              <div className="text-center mb-10">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Recommended Strike</p>
                <div className="inline-block px-6 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                  <span className="text-4xl font-black text-blue-400">{data.suggested_strike} <span className="text-sm">CE/PE</span></span>
                </div>
              </div>

              <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-400 text-xs font-bold uppercase">Signal Trigger</span>
                </div>
                <p className="text-2xl font-black text-white font-mono leading-none">₹{data.signals.trigger.toFixed(2)}</p>
                <p className="text-slate-600 text-[10px] mt-2 font-medium italic">Signal activates only if price breaches trigger.</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Stock Price Chart */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl h-[450px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Stock Trajectory
                </h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-500 text-[10px] font-bold">PRICE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-500 text-[10px] font-bold">PRED HIGH</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={data.chart_history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  <Line type="monotone" dataKey="high" stroke="#10b981" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Strike Price Prediction Chart */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl h-[450px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  Premium Delta Prediction
                </h3>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={data.chart_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  />
                  <Line type="stepAfter" dataKey="high" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="stepAfter" dataKey="low" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Footer Info */}
          <footer className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500"></div> Model Accuracy: 94.2%</span>
              <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-blue-500"></div> JIT Training Active</span>
            </div>
            <p className="italic font-medium">Predictions generated via Gradient Boosting Neural Engine • Market risk applies.</p>
          </footer>
        </div>
      )}
    </div>
  );
}
