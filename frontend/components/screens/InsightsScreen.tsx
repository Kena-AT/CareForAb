"use client";

import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Target, Zap, Heart, Droplets, Calendar, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHealth } from '@/contexts/HealthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

export const InsightsScreen = () => {
  const { bloodSugarReadings, bloodPressureReadings, medications } = useHealth();

  // Mock data for trends if real data is sparse
  const trendsData = [
    { day: 'Mon', value: 95 },
    { day: 'Tue', value: 110 },
    { day: 'Wed', value: 105 },
    { day: 'Thu', value: 120 },
    { day: 'Fri', value: 98 },
    { day: 'Sat', value: 102 },
    { day: 'Sun', value: 108 },
  ];

  const insights = [
    {
      title: 'Glucose Stability',
      value: '+12%',
      label: 'Improvement',
      description: 'Your fasting glucose has stabilized over the last 14 days.',
      icon: Droplets,
      color: 'text-[#004c56ff]',
      bg: 'bg-[#f0fdfaff]',
      status: 'improving'
    },
    {
      title: 'Blood Pressure',
      value: '118/72',
      label: 'Avg. Optimal',
      description: 'Maintaining a consistent range. Systolic average is down by 4%.',
      icon: Heart,
      color: 'text-red-500',
      bg: 'bg-red-50',
      status: 'stable'
    },
    {
      title: 'Medication Sync',
      value: '98%',
      label: 'Adherence',
      description: 'Excellent adherence! You missed only 1 dose in the last month.',
      icon: Zap,
      color: 'text-[#006672ff]',
      bg: 'bg-slate-50',
      status: 'peak'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 bg-[#f6fafacc] backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="h-6 w-1 bg-primary rounded-full" />
           <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Health Insights Protocol</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="rounded-xl h-10 px-4 font-bold text-slate-400 hover:text-primary">
              <Calendar size={16} className="mr-2" /> Last 30 Days
           </Button>
           <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-50 group">
              <Info size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
           </Button>
        </div>
      </header>

      <main className="px-10 py-10 max-w-7xl mx-auto space-y-10">
        {/* Top Insights Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {insights.map((insight, idx) => (
              <motion.div
                 key={idx}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.1 }}
              >
                 <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[24px] overflow-hidden">
                    <CardContent className="p-8">
                       <div className="flex items-start justify-between mb-6">
                          <div className={`w-12 h-12 rounded-2xl ${insight.bg} ${insight.color} flex items-center justify-center`}>
                             <insight.icon size={24} />
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-slate-900 tracking-tight">{insight.value}</p>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">{insight.label}</p>
                          </div>
                       </div>
                       <h3 className="text-sm font-black text-slate-900 mb-2">{insight.title}</h3>
                       <p className="text-xs font-medium text-slate-400 leading-relaxed">{insight.description}</p>
                    </CardContent>
                 </Card>
              </motion.div>
           ))}
        </section>

        {/* Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           {/* Detailed Trend Chart */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-[#004c56ff] rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Longitudinal Trends</h3>
                 </div>
              </div>
              
              <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[32px] p-8">
                 <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={trendsData}>
                          <defs>
                             <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#004c56" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#004c56" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                             dataKey="day" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                          />
                          <YAxis 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                          />
                          <Tooltip 
                             contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontWeight: 'black'
                             }} 
                          />
                          <Area 
                             type="monotone" 
                             dataKey="value" 
                             stroke="#004c56" 
                             strokeWidth={4} 
                             fillOpacity={1} 
                             fill="url(#colorValue)" 
                          />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

           {/* Pattern Analysis */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-[#006672ff] rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Pattern Intelligence</h3>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <motion.div whileHover={{ x: 4 }} className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-200/50 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                          <TrendingUp size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">Postprandial Spike</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pattern Detected Yesterday</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-all" />
                 </motion.div>

                 <motion.div whileHover={{ x: 4 }} className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-200/50 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                          <Target size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">Target Range Consistency</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">85% of readings within range</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-all" />
                 </motion.div>

                 <Card className="border-none bg-[#004c56ff] shadow-xl shadow-[#004c5633] rounded-[24px] overflow-hidden">
                    <CardContent className="p-8">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                             <Activity size={16} className="text-white" />
                          </div>
                          <h4 className="text-xs font-black uppercase text-white/60 tracking-widest">Health Projection</h4>
                       </div>
                       <p className="text-sm font-bold text-white leading-relaxed">
                          "At your current adherence and stability rate, you are on track to lower your HbA1c average by 0.3% in the next 3 months."
                       </p>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </section>
      </main>
    </div>
  );
};
