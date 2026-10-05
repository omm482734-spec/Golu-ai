import React from 'react';
import { LogEntry } from '../types/assistant';
import { Volume2, CheckCircle2, Terminal, Trash2, Cpu, Activity } from 'lucide-react';

interface DiagnosticPanelProps {
  logs: LogEntry[];
  onTestSpeaker: () => void;
  onClearLogs: () => void;
  isSpeakerTesting: boolean;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  logs,
  onTestSpeaker,
  onClearLogs,
  isSpeakerTesting,
}) => {
  const [filter, setFilter] = React.useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.category === filter;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs font-mono shadow-xl backdrop-blur-md">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-slate-200 text-sm">Audio & System Diagnostics</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speaker Diagnostic Test Button as requested */}
          <button
            onClick={onTestSpeaker}
            disabled={isSpeakerTesting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isSpeakerTesting
                ? 'bg-rose-900/60 text-rose-300 animate-pulse'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
            }`}
            title="Plays a 440Hz test sine wave to verify Web Audio output graph on device speaker"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isSpeakerTesting ? 'Testing 440Hz...' : 'Test Speaker (440Hz)'}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Audio Pipeline Status Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-[11px]">
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Mic Format:</span>
          <span className="font-bold text-cyan-400">16kHz PCM LE</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Output Audio:</span>
          <span className="font-bold text-fuchsia-400">24kHz Native</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Owner Identity:</span>
          <span className="font-bold text-amber-400">Rohit Sir</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Model:</span>
          <span className="font-bold text-emerald-400">gemini-3.8-live</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 my-2 overflow-x-auto pb-1 text-[10px]">
        {['ALL', 'MIC', 'GEMINI', 'AUDIO_OUT', 'ACTION', 'ERROR'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-0.5 rounded transition ${
              filter === cat
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Log Console Window */}
      <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-950/90 border border-slate-800/80 font-mono text-[11px]">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 py-3 text-center italic">
            Waiting for audio events... Press Start/Mic to begin.
          </div>
        ) : (
          filteredLogs.slice(-40).map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            let catColor = 'text-slate-400';
            if (log.category === 'MIC') catColor = 'text-cyan-400';
            if (log.category === 'GEMINI') catColor = 'text-fuchsia-400';
            if (log.category === 'AUDIO_OUT') catColor = 'text-teal-400';
            if (log.category === 'ACTION') catColor = 'text-amber-400';
            if (log.category === 'ERROR') catColor = 'text-rose-400 font-bold';

            return (
              <div key={log.id} className="leading-tight flex items-start gap-2 border-b border-slate-900/60 pb-1">
                <span className="text-slate-600 flex-shrink-0">{timeStr}</span>
                <span className={`font-semibold flex-shrink-0 ${catColor}`}>[{log.category}]</span>
                <span className="text-slate-300 break-words flex-1">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
