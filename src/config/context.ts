import { createContext, useContext } from 'react';
import type { AppConfig } from './schema';

export const ConfigContext = createContext<AppConfig | null>(null);

export function useConfig(): AppConfig {
  const config = useContext(ConfigContext);
  if (!config) throw new Error('useConfig called before config was loaded');
  return config;
}
