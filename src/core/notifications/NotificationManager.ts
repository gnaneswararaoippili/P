import { osEvents } from '../events/EventBus';

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'system';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // 0 for infinite
}

class NotificationManagerImpl {
  private notifications: NotificationPayload[] = [];
  
  public getNotifications() {
    return this.notifications;
  }

  public show(payload: Omit<NotificationPayload, 'id' | 'timestamp'> & { id?: string }) {
    const duration = payload.duration !== undefined ? payload.duration : 5000;

    const notification: NotificationPayload = {
      id: payload.id || `notif-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...payload,
      duration
    };

    this.notifications = [...this.notifications, notification];
    this.emit();

    if (notification.duration !== 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  public dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit();
  }

  public success(title: string, message: string, duration?: number) {
    return this.show({ type: 'success', title, message, duration });
  }

  public error(title: string, message: string, duration?: number) {
    return this.show({ type: 'error', title, message, duration });
  }

  public info(title: string, message: string, duration?: number) {
    return this.show({ type: 'info', title, message, duration });
  }

  public warning(title: string, message: string, duration?: number) {
    return this.show({ type: 'warning', title, message, duration });
  }

  private emit() {
    osEvents.emit('notification:update', this.notifications);
  }
}

export const NotificationManager = new NotificationManagerImpl();
