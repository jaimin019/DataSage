import { create } from 'zustand'
  
type AnalysisGoal = 'explore' | 'prepare_ml' | 'detect_anomalies' | 'forecast' | 'quick_overview'
type AnalysisDepth = 'quick' | 'standard' | 'deep'
type FocusArea = 'data_quality' | 'distributions' | 'correlations' | 'anomalies' | 'clustering' | 'forecasting'
type OutlierHandling = 'flag_only' | 'remove_extreme'

export interface UserPreferences {
  goal: AnalysisGoal
  target_column: string | null
  depth: AnalysisDepth
  focus_areas: FocusArea[]
  outlier_handling: OutlierHandling
}

interface PreferenceStore {
  // Form state
  currentStep: number           // 0-4 (5 steps)
  isFormVisible: boolean
  availableColumns: string[]    // populated from CSV preview before upload
  
  // Preference values
  preferences: UserPreferences
  
  // Actions
  setStep: (step: number) => void
  showForm: (columns: string[]) => void
  hideForm: () => void
  setGoal: (goal: AnalysisGoal) => void
  setTargetColumn: (col: string | null) => void
  setDepth: (depth: AnalysisDepth) => void
  toggleFocusArea: (area: FocusArea) => void
  setOutlierHandling: (handling: OutlierHandling) => void
  resetToDefaults: () => void
  toJSON: () => string
}

const DEFAULT_PREFERENCES: UserPreferences = {
  goal: 'explore',
  target_column: null,
  depth: 'standard',
  focus_areas: [],
  outlier_handling: 'flag_only',
}

export const usePreferenceStore = create<PreferenceStore>((set, get) => ({
  currentStep: 0,
  isFormVisible: false,
  availableColumns: [],
  preferences: { ...DEFAULT_PREFERENCES },
  
  setStep: (step) => set({ currentStep: step }),
  showForm: (columns) => set({
    isFormVisible: true,
    currentStep: 0,
    availableColumns: columns,
    preferences: { ...DEFAULT_PREFERENCES }
  }),
  hideForm: () => set({ isFormVisible: false }),
  setGoal: (goal) => set(s => ({ preferences: { ...s.preferences, goal } })),
  setTargetColumn: (col) => set(s => ({ preferences: { ...s.preferences, target_column: col } })),
  setDepth: (depth) => set(s => ({ preferences: { ...s.preferences, depth } })),
  toggleFocusArea: (area) => set(s => {
    const current = s.preferences.focus_areas
    const updated = current.includes(area)
      ? current.filter(a => a !== area)
      : [...current, area]
    return { preferences: { ...s.preferences, focus_areas: updated } }
  }),
  setOutlierHandling: (handling) => set(s => ({
    preferences: { ...s.preferences, outlier_handling: handling }
  })),
  resetToDefaults: () => set({ preferences: { ...DEFAULT_PREFERENCES } }),
  toJSON: () => JSON.stringify(get().preferences),
}))
