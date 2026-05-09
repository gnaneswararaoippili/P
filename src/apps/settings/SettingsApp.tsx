import { useSettings } from '../../core/settings/useSettings';
import { Monitor, Palette, Image as ImageIcon } from 'lucide-react';
import { NotificationManager } from '../../core/notifications/NotificationManager';

const WALLPAPERS = [
  { id: 'abstract-1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', label: 'Abstract Flow' },
  { id: 'nature-1', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80', label: 'Neon Cyber' },
  { id: 'space-1', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop', label: 'Deep Space' },
  { id: 'minimal-1', url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1920&auto=format&fit=crop', label: 'Rain Drops' },
];

export const SettingsApp = () => {
  const { settings, setSetting } = useSettings();

  const currentTheme = settings['system.theme'] || 'dark';
  const currentWallpaper = settings['system.wallpaper'];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Monitor className="w-6 h-6 text-blue-500" />
          Personalization
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize the appearance and behavior of your operating environment.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Theme Section */}
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Theme Mode
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setSetting('system.theme', 'light');
                NotificationManager.success('Theme Applied', 'System theme changed to light mode.');
              }}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                currentTheme === 'light' 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="w-full h-24 bg-slate-100 rounded-lg mb-3 shadow-inner border border-slate-200" />
              <div className="font-medium text-center">Light</div>
            </button>
            
            <button
              onClick={() => {
                setSetting('system.theme', 'dark');
                NotificationManager.success('Theme Applied', 'System theme changed to dark mode.');
              }}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                currentTheme === 'dark' 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="w-full h-24 bg-slate-900 rounded-lg mb-3 shadow-inner border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-4 bg-slate-800 border-b border-slate-700" />
                <div className="absolute bottom-0 w-full h-4 bg-slate-950 border-t border-slate-800" />
              </div>
              <div className="font-medium text-center">Dark</div>
            </button>
          </div>
        </section>

        {/* Wallpaper Section */}
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Desktop Background
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                onClick={() => {
                  setSetting('system.wallpaper', wp.url);
                  NotificationManager.success('Wallpaper Applied', `Desktop background changed to ${wp.label}.`);
                }}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${
                  currentWallpaper === wp.url
                    ? 'border-blue-500 scale-[1.02] shadow-md shadow-blue-500/20'
                    : 'border-transparent hover:scale-[1.02] hover:shadow-lg'
                }`}
              >
                <img 
                  src={wp.url} 
                  alt={wp.label} 
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity ${
                  currentWallpaper === wp.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <span className="absolute bottom-2 left-3 text-white text-xs font-medium">
                    {wp.label}
                  </span>
                </div>
                {currentWallpaper === wp.url && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

