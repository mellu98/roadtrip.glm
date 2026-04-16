import { create } from 'zustand'
import { getTheme, setTheme as applyStoredTheme, listenToSystemTheme } from '../utils/theme'

const VIEWS = {
  HOME: 'home',
  FORM: 'form',
  LOADING: 'loading',
  ITINERARY: 'itinerary',
}

export const useUiStore = create((set) => ({
  // State
  view: VIEWS.HOME,
  activeDay: 0,
  selectedActivity: null,
  mobileDetailOpen: false,
  error: null,
  theme: getTheme(),
  subView: 'itinerary',

  // Actions
  setView: (view) => set({ view }),
  setActiveDay: (day) => set({ activeDay: day }),
  selectActivity: (activity) => set({ selectedActivity: activity, mobileDetailOpen: true }),
  setSubView: (subView) => set({ subView }),
  closeMobileDetail: () => set({ mobileDetailOpen: false, selectedActivity: null }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  goHome: () => set({ view: VIEWS.HOME, activeDay: 0, selectedActivity: null, mobileDetailOpen: false, error: null }),
  setTheme: (theme) => {
    applyStoredTheme(theme)
    set({ theme })
  },
}))

// Listen for system theme changes
if (typeof window !== 'undefined') {
  listenToSystemTheme((resolved) => {
    const currentTheme = useUiStore.getState().theme
    if (currentTheme === 'system') {
      useUiStore.setState({ theme: 'system' })
    }
  })
}

export { VIEWS }
