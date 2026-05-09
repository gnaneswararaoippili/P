import { useState, useEffect } from 'react';
import { osEvents } from '../../core/events/EventBus';
import { NotificationManager, type NotificationPayload } from '../../core/notifications/NotificationManager';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const getIcon = (type: NotificationPayload['type']) => {
  switch (type) {
    case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
    case 'info': return <Info className="w-5 h-5 text-blue-400" />;
    case 'system': return <Info className="w-5 h-5 text-slate-400" />;
  }
};

export const NotificationOverlay = () => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    const handleUpdate = (notifs: NotificationPayload[]) => {
      setNotifications([...notifs]);
    };
    
    // Initial sync
    setNotifications(NotificationManager.getNotifications());

    osEvents.on('notification:update', handleUpdate);
    return () => osEvents.off('notification:update', handleUpdate);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none w-80">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-slate-800 border border-white/10 rounded-lg shadow-2xl p-4 pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300"
        >
          <div className="shrink-0 mt-0.5">
            {getIcon(notif.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{notif.title}</h4>
            <p className="text-xs text-slate-300 mt-1 break-words">{notif.message}</p>
          </div>
          <button 
            onClick={() => NotificationManager.dismiss(notif.id)}
            className="shrink-0 p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

