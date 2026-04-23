/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Layers, 
  BarChart3, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCcw,
  LayoutGrid
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CollectionStat {
  collection: string;
  floorPrice: number;
  totalNfts: number;
  nftsListed: number;
  totalVolume: number;
  averagePrice: number;
  fetched_at: string;
}

// --- Linear Regression Helper ---
function calculateTrendLine(data: number[]) {
  const n = data.length;
  if (n < 2) return data;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((_, i) => parseFloat((slope * i + intercept).toFixed(6)));
}

export default function App() {
  const [collections, setCollections] = React.useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = React.useState<string>('');
  const [stats, setStats] = React.useState<CollectionStat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/collections')
      .then(res => res.json())
      .then(data => {
        setCollections(data);
        if (data.length > 0) setSelectedCollection(data[0]);
      })
      .catch(err => {
        console.error('Failed to fetch collections:', err);
        setError('Failed to load collections');
      });
  }, []);

  React.useEffect(() => {
    if (!selectedCollection) return;

    setLoading(true);
    fetch(`/api/stats/${selectedCollection}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        const sortedData = data.sort((a: CollectionStat, b: CollectionStat) => 
          new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime()
        );
        setStats(sortedData);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setError('No historical data found for this collection yet.');
      })
      .finally(() => setLoading(false));
  }, [selectedCollection]);

  const latestStat = stats[stats.length - 1];
  const chartData = React.useMemo(() => {
    if (stats.length === 0) return [];
    
    const prices = stats.map(s => s.floorPrice);
    const trendValues = calculateTrendLine(prices);

    return stats.map((s, index) => ({
      date: new Date(s.fetched_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      fullDate: new Date(s.fetched_at).toLocaleString(),
      price: s.floorPrice,
      trend: trendValues[index]
    }));
  }, [stats]);

  const isTrendingUp = stats.length > 1 && 
    stats[stats.length - 1].floorPrice >= stats[0].floorPrice;

  const dateRange = stats.length > 1 
    ? `${new Date(stats[0].fetched_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} — ${new Date(stats[stats.length - 1].fetched_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`
    : '--';

  const trendPercentage = stats.length > 1 
    ? ((stats[stats.length - 1].floorPrice - stats[0].floorPrice) / stats[0].floorPrice * 100).toFixed(2)
    : '0.00';

  return (
    <div className="relative min-h-screen">
      {/* Background Orbs */}
      <div className="orb w-[500px] h-[500px] bg-accent-1 top-[-200px] right-[-100px]" />
      <div className="orb w-[400px] h-[400px] bg-accent-2 bottom-[-150px] left-[-100px]" />

      <div className="relative z-10 flex flex-col min-h-screen p-10 gap-6 max-w-[1400px] mx-auto">
        <header className="flex justify-between items-center shrink-0">
          <div className="text-[20px] font-[800] tracking-wider text-white">
            FloorPrice<span className="text-accent-1 opacity-80">Monitor</span>
          </div>
        </header>

        <div className="flex items-center gap-3 bg-glass-card/50 border border-glass-border px-4 py-2 rounded-xl w-fit">
          <span className="text-[11px] uppercase tracking-widest text-text-dim">Collection</span>
          <div className="flex items-center gap-2">
            <select 
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer appearance-none pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_6px] bg-[right_8px_center] bg-no-repeat"
            >
              {collections.map(id => (
                <option key={id} value={id} className="bg-bg-dark">{id}</option>
              ))}
            </select>
          </div>
        </div>

        <main className="space-y-6">
          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 items-start w-[662px]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card flex flex-col justify-between w-[200px] h-fit p-5"
            >
              <span className="stat-label">Current Floor</span>
              <div className="text-[24px] font-bold leading-tight mt-1">
                {latestStat?.floorPrice.toFixed(2) ?? '--'} <span className="text-[12px] font-normal text-text-dim">EGLD</span>
              </div>
              <div className={cn(
                "text-[11px] font-semibold mt-1",
                isTrendingUp ? "text-emerald-400" : "text-rose-400"
              )}>
                {isTrendingUp ? '▲' : '▼'} {trendPercentage}%
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card flex flex-col justify-between w-[200px] h-fit p-5"
            >
              <span className="stat-label">Total Volume</span>
              <div className="text-[24px] font-bold leading-tight mt-1">
                {latestStat?.totalVolume.toFixed(2) ?? '--'} <span className="text-[12px] font-normal text-text-dim">EGLD</span>
              </div>
              <div className="text-[11px] font-semibold text-accent-1 mt-1 opacity-80 uppercase tracking-wider">
                Secondary
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card flex flex-col justify-between w-[200px] h-fit p-5"
            >
              <span className="stat-label">Listing Density</span>
              <div className="text-[24px] font-bold leading-tight mt-1">
                {latestStat?.nftsListed ?? '--'} <span className="text-[12px] font-normal text-text-dim">NFTs</span>
              </div>
              <div className="text-[11px] font-semibold text-text-dim mt-1">
                {latestStat ? ((latestStat.nftsListed / latestStat.totalNfts) * 100).toFixed(2) : '--'}% listed
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6 w-[662px]">
            {/* Main Chart Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card flex flex-col w-[635px]"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex justify-between w-full items-center">
                  <h2 className="text-[20px] font-semibold text-white">Floor Price History</h2>
                  <div className="badge">LIVE FEED</div>
                </div>
              </div>
              <p className="text-text-dim text-[13px] mb-6">Daily aggregate trends with linear regression overlay.</p>

              <div className="h-[320px] w-full relative">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-1" />
                  </div>
                ) : error ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-dim gap-2">
                    <Activity className="w-12 h-12 opacity-20" />
                    <p>{error}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a0a0b8', fontSize: 10 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a0a0b8', fontSize: 10 }}
                        dx={-10}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: 'rgba(255,255,255,0.1)', 
                          borderRadius: '12px',
                          backdropFilter: 'blur(10px)',
                        }}
                        itemStyle={{ color: '#00f2fe' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#00f2fe" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        name="Floor Price"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="trend" 
                        stroke="#b224ef" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Trend (LR)"
                        activeDot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex justify-between items-center text-text-dim text-[12px] pt-[12px] border-t border-white/10 mt-6 uppercase tracking-wider">
                <span>{dateRange}</span>
                <span className={cn(isTrendingUp ? "text-emerald-400" : "text-rose-400")}>
                  TREND: {isTrendingUp ? 'BULLISH' : 'BEARISH'} ({isTrendingUp ? '+' : ''}{trendPercentage}%)
                </span>
              </div>
            </motion.div>
          </div>
        </main>

        <footer className="mt-auto flex justify-between text-text-dim text-[11px] tracking-widest uppercase">
          <span>SYSTEM STATUS: OPERATIONAL</span>
          <span>LAST SYNC: {latestStat?.fetched_at ?? 'NEVER'}</span>
        </footer>
      </div>
    </div>
  );
}
