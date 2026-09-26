import React from 'react';
import {
  LayoutDashboard,
  CloudSunRain,
  Map,
  Database,
  BrainCircuit,
  FlaskConical,
  TriangleAlert,
  BarChart3,
  History,
  Activity,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activePage, onNavigate }) {
  const foundationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'forecast', label: 'Live Forecast', icon: CloudSunRain },
    { id: 'map', label: 'District Map', icon: Map },
  ];

  const mlItems = [
    { id: 'regime', label: 'Weather Regime', icon: BrainCircuit },
    { id: 'correction', label: 'AI Correction', icon: FlaskConical },
    { id: 'risk', label: 'Heavy Rainfall Risk', icon: TriangleAlert },
  ];

  const verificationItems = [
    { id: 'verification', label: 'Verification', icon: BarChart3 },
    { id: 'error-analysis', label: 'Error Analysis', icon: Activity },
    { id: 'events', label: 'Historical Events', icon: History },
  ];

  const assistantItems = [
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'data-sources', label: 'Data Sources', icon: Database },
  ];

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
          isActive
            ? 'bg-blue-600 text-white font-semibold shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            RI
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">Rainfall Intel</div>
            <div className="text-[10px] text-blue-400 font-mono font-medium">SIH26080 · AI/ML</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
        {/* Foundation */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Overview
          </div>
          <div className="space-y-0.5">
            {foundationItems.map((item) => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        {/* AI/ML Layer */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-400/80 uppercase tracking-wider flex items-center gap-1.5">
            <BrainCircuit className="w-3 h-3" />
            AI/ML Intelligence
          </div>
          <div className="space-y-0.5">
            {mlItems.map((item) => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        {/* Verification */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-violet-400/80 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            Verification & Analysis
          </div>
          <div className="space-y-0.5">
            {verificationItems.map((item) => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        {/* Assistant & Sources */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Assistant & Sources
          </div>
          <div className="space-y-0.5">
            {assistantItems.map((item) => <NavButton key={item.id} item={item} />)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 m-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Operational Platform</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Open-Meteo NWP + Regime Classifier + Ridge Correction Engine
        </p>
        <div className="mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-500">
          SIH26080 System Active
        </div>
      </div>
    </aside>
  );
}
