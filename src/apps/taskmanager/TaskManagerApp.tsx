import { useState, useEffect } from 'react';
import { useProcesses } from '../../context/ProcessContext';
import { osEvents } from '../../core/events/EventBus';
import { Activity, XCircle } from 'lucide-react';

interface MonitoredProcess {
  id: string;
  name: string;
  status: 'running' | 'focused' | 'minimized';
  uptime: number; // in seconds
  memory: number; // simulated MB
}

export const TaskManagerApp = () => {
  const { processes, closeProcess } = useProcesses();
  const [monitored, setMonitored] = useState<MonitoredProcess[]>([]);

  // Initial load
  useEffect(() => {
    const initial: MonitoredProcess[] = processes.map(p => ({
      id: p.id,
      name: p.name,
      status: p.isFocused ? 'focused' : p.isMinimized ? 'minimized' : 'running',
      uptime: 0,
      memory: Math.floor(Math.random() * 50) + 10, // 10-60 MB initial
    }));
    setMonitored(initial);
  }, []); // Only on mount

  // Reactive updates for new/killed processes
  useEffect(() => {
    const handleSpawned = (payload: { id: string, name: string }) => {
      setMonitored(prev => {
        // Prevent duplicate entries if the initial load caught it
        if (prev.find(p => p.id === payload.id)) return prev;
        
        return [
          ...prev,
          {
            id: payload.id,
            name: payload.name,
            status: 'focused', // Spawned processes are typically focused
            uptime: 0,
            memory: Math.floor(Math.random() * 50) + 10,
          }
        ];
      });
    };

    const handleKilled = (payload: { id: string }) => {
      setMonitored(prev => prev.filter(p => p.id !== payload.id));
    };

    osEvents.on('process:spawned', handleSpawned);
    osEvents.on('process:killed', handleKilled);

    return () => {
      osEvents.off('process:spawned', handleSpawned);
      osEvents.off('process:killed', handleKilled);
    };
  }, []);

  // Sync statuses from Context (focus/minimize changes)
  useEffect(() => {
    setMonitored(prev => prev.map(mp => {
      const liveProcess = processes.find(p => p.id === mp.id);
      if (!liveProcess) return mp; // Will be removed by handleKilled anyway
      
      const newStatus = liveProcess.isFocused ? 'focused' : liveProcess.isMinimized ? 'minimized' : 'running';
      if (mp.status === newStatus) return mp; // No change
      return { ...mp, status: newStatus };
    }));
  }, [processes]);

  // Telemetry loop
  useEffect(() => {
    const interval = setInterval(() => {
      setMonitored(prev => prev.map(p => {
        // Fluctuate memory slightly (-2 to +2 MB)
        const fluctuation = Math.floor(Math.random() * 5) - 2;
        const newMemory = Math.max(5, p.memory + fluctuation);
        
        return {
          ...p,
          uptime: p.uptime + 1,
          memory: newMemory
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200 text-sm">
      <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-slate-800">
        <Activity className="w-5 h-5 text-green-400" />
        <span className="font-semibold text-white">Task Manager</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 sticky top-0 border-b border-white/10">
              <th className="px-4 py-2 font-medium text-slate-400">PID</th>
              <th className="px-4 py-2 font-medium text-slate-400">Name</th>
              <th className="px-4 py-2 font-medium text-slate-400">Status</th>
              <th className="px-4 py-2 font-medium text-slate-400 text-right">Uptime</th>
              <th className="px-4 py-2 font-medium text-slate-400 text-right">Memory</th>
              <th className="px-4 py-2 font-medium text-slate-400 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {monitored.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    p.status === 'focused' ? 'bg-blue-500/20 text-blue-300' :
                    p.status === 'minimized' ? 'bg-slate-500/20 text-slate-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-300">{formatUptime(p.uptime)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-300">{p.memory.toFixed(1)} MB</td>
                <td className="px-4 py-2 text-center">
                  <button 
                    onClick={() => closeProcess(p.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="Kill Process"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {monitored.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No active processes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="h-8 bg-slate-800 border-t border-white/10 flex items-center px-4 text-xs text-slate-400 justify-between">
        <span>{monitored.length} Processes</span>
        <span>Total Memory: {monitored.reduce((acc, p) => acc + p.memory, 0).toFixed(1)} MB</span>
      </div>
    </div>
  );
};

