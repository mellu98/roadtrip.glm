import { create } from 'zustand'
import { getApiConfig, saveApiConfig as storageSaveApiConfig, hasApiConfig } from '../utils/storage'

export const useApiStore = create((set, get) => ({
  // State
  config: getApiConfig(),
  isConfigured: hasApiConfig(),

  // Actions
  saveConfig: (config) => {
    storageSaveApiConfig(config)
    set({ config: getApiConfig(), isConfigured: hasApiConfig() })
  },

  refreshConfig: () => {
    set({ config: getApiConfig(), isConfigured: hasApiConfig() })
  },
}))
