import React, { useState, useEffect, useRef } from 'react';
import { SearchManager } from '../../core/search';
import type { SearchResult } from '../../core/search';
import { useProcesses } from '../../context/ProcessContext';
import { Search, Terminal, AppWindow, FileText } from 'lucide-react';

export const Spotlight = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { openProcess } = useProcesses();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+K or Ctrl+Space
      if ((e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === ' ')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim() === '') {
        setResults([]);
        setSelectedIndex(0);
        return;
      }
      const res = await SearchManager.query(query);
      setResults(res.slice(0, 10)); // Top 10
      setSelectedIndex(0);
    };

    const debounceId = setTimeout(fetchResults, 100);
    return () => clearTimeout(debounceId);
  }, [query]);

  const handleLaunch = (result: SearchResult) => {
    setIsOpen(false);
    openProcess(result.launchConfig.appId, result.launchConfig.appName, result.launchConfig.args);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleLaunch(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Spotlight Window */}
      <div className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Input area */}
        <div className="flex items-center px-4 h-16 border-b border-slate-200 dark:border-white/10">
          <Search className="w-6 h-6 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search apps, files, and commands..."
            className="flex-1 h-full bg-transparent border-none outline-none text-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 font-light"
          />
        </div>

        {/* Results Area */}
        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.map((result, idx) => (
              <div
                key={result.id}
                onClick={() => handleLaunch(result)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {result.type === 'app' ? <AppWindow className="w-5 h-5" /> : 
                   result.type === 'command' ? <Terminal className="w-5 h-5" /> : 
                   <FileText className="w-5 h-5" />}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">{result.title}</span>
                  <span className={`text-xs truncate ${idx === selectedIndex ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {result.subtitle}
                  </span>
                </div>

                {/* Action Hint */}
                {idx === selectedIndex && (
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider bg-black/20 rounded font-semibold">
                    Return ↵
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* No Results Empty State */}
        {query.trim() !== '' && results.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
};
