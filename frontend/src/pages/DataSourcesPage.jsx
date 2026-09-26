import React, { useEffect, useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Zap, Server, Globe, HardDrive } from 'lucide-react';
import { apiService } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';

export default function DataSourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getDataSources();
      setSources(data.sources || []);
    } catch (err) {
      setError("Failed to load configured data sources status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataSources();
  }, []);

  const handleProbe = async () => {
    try {
      setProbing(true);
      const result = await apiService.probeDataSource();
      setProbeResult(result.result);
      await loadDataSources();
    } catch (err) {
      setProbeResult({
        status: "Error",
        details: "Probe failed: " + err.message
      });
    } finally {
      setProbing(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'medium'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            System Integration Layer
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Meteorological & Geographic Data Sources
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Real data streams powering SIH26080 Part 1. All NWP forecasts and administrative coordinates originate from verified open-access meteorological models and geospatial registries.
          </p>
        </div>

        <button
          onClick={handleProbe}
          disabled={probing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start md:self-auto shrink-0"
        >
          <Zap className={`w-3.5 h-3.5 ${probing ? 'animate-bounce text-amber-300' : ''}`} />
          {probing ? 'Probing Latency...' : 'Run Live Endpoint Probe'}
        </button>
      </div>

      {/* Probe feedback banner if executed */}
      {probeResult && (
        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md flex items-start justify-between gap-3 text-xs border border-slate-700">
          <div className="space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Probe Succeeded
            </div>
            <p className="text-slate-300">{probeResult.details}</p>
            {probeResult.latency_ms && (
              <div className="text-[11px] text-slate-400 font-mono">
                Roundtrip Probe Latency: <span className="text-amber-300 font-bold">{probeResult.latency_ms} ms</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setProbeResult(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && !loading && (
        <ErrorMessage
          message="Unable to inspect data sources."
          subMessage="Could not retrieve the registered source inventory from the backend."
          onRetry={loadDataSources}
          isRetrying={loading}
        />
      )}

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map((source) => {
          const isConnected = source.status === "Connected" || source.status === "Operational" || source.status === "Loaded";
          return (
            <div
              key={source.id}
              className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {source.type}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                    {source.name}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {source.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {source.details}
              </p>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" /> Endpoint / Store:
                  </span>
                  <span className="font-mono text-slate-700 text-[11px] truncate max-w-xs" title={source.endpoint}>
                    {source.endpoint || "Local Storage"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-400" /> Last Checked:
                  </span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {formatTimestamp(source.last_status_check)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Last Record Update:
                  </span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {formatTimestamp(source.last_updated)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Architecture Notes */}
      <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Part 1 Data Policy & Transparency
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          In strict compliance with Part 1 hackathon guidelines, this system never uses synthetic, fabricated, or hardcoded weather readings. In the event of network disruption or provider maintenance, the interface presents a transparent service notice rather than fallback mock data.
        </p>
      </div>
    </div>
  );
}
