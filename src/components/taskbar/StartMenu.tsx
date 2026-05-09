import { useState } from 'react';
import { AppRegistry } from '../../core/registry/AppRegistry';
import { useProcesses } from '../../context/ProcessContext';
import { Search } from 'lucide-react';

export const StartMenu = ({ onClose }: { onClose: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { openProcess } = useProcesses();

  const allApps = AppRegistry.getAllApps();
  
  const filteredApps = allApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunch = (id: string, name: string) => {
    openProcess(id, name);
    onClose();
  };

  return (
    <div className="fixed bottom-14 left-2 w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200 z-50">
      
      {/* App List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
        {filteredApps.length > 0 ? (
          filteredApps.map(app => (
            <button
              key={app.id}
              onClick={() => handleLaunch(app.id, app.name)}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-lg group-hover:bg-black/40 transition-colors">
                <div className="scale-75">
                  {app.icon}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-100">{app.name}</span>
                <span className="text-xs text-slate-400">{app.description}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm">
            No applications found.
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Type to search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

    </div>
  );
};

