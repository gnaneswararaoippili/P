import React from 'react';

export interface MenuItem {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void | Promise<void>;
  children?: MenuItem[];
}

export interface ContextMenuPayload {
  x: number;
  y: number;
  items: MenuItem[];
}
