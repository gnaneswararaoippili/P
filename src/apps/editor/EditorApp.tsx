import React, { useState, useEffect, useCallback } from 'react';
import { vfs } from '../../core/fs/FileSystem';
import { Save, AlertCircle, FileText } from 'lucide-react';

export const EditorApp = ({ args }: { args?: Record<string, any> }) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filePath = args?.filePath;

  useEffect(() => {
    if (!filePath) {
      setError('No file specified.');
      return;
    }

    let isMounted = true;
    const loadFile = async () => {
      try {
        const fileContent = await vfs.readFile(filePath, '/');
        if (isMounted) {
          setContent(fileContent);
          setIsDirty(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      }
    };

    loadFile();

    return () => { isMounted = false; };
  }, [filePath]);

  const handleSave = useCallback(async () => {
    if (!filePath || !isDirty) return;
    
    setIsSaving(true);
    try {
      await vfs.writeFile(filePath, content, '/');
      setIsDirty(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, isDirty, content]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  if (!filePath) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
        <FileText className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-lg font-medium text-slate-300">No file selected</h2>
        <p className="text-sm mt-2 max-w-sm">
          Open a file from the File Explorer, or launch the editor via the terminal with <code className="bg-black/30 px-1 py-0.5 rounded">open editor &lt;path&gt;</code>.
        </p>
      </div>
    );
  }

  const filename = filePath.split('/').pop();

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-white/10 bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">
            {filename}
            {isDirty && <span className="text-yellow-400 ml-1">*</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400 flex items-center gap-1 bg-red-400/10 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors text-white"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-0 m-0">
        <textarea
          value={content}
          onChange={handleChange}
          spellCheck={false}
          className="w-full h-full p-4 bg-transparent border-none outline-none resize-none text-slate-200 font-mono text-sm leading-relaxed"
          placeholder="Type your code here..."
        />
      </div>
    </div>
  );
};
