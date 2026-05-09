import { useState, useEffect } from 'react';
import { SettingsManager } from './SettingsManager';
import type { SystemSettings } from './SettingsManager';
import { osEvents } from '../events/EventBus';

export const useSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>(SettingsManager.getAll());

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(SettingsManager.getAll());
    };

    osEvents.on('settings:changed', handleSettingsChange);
    return () => {
      osEvents.off('settings:changed', handleSettingsChange);
    };
  }, []);

  return {
    settings,
    setSetting: SettingsManager.set.bind(SettingsManager),
  };
};
