import { create } from 'zustand';
import { PipelineStatus, DatasetMetadata } from '../lib/types';

interface SessionState {
  sessionId: string | null;
  status: PipelineStatus | null;
  datasetInfo: DatasetMetadata | null;
  error: string | null;
  statusDetail: string | null;
  preferencesSummary: string | null;
  isUploading: boolean;
  
  setSession: (id: string, dataset: DatasetMetadata) => void;
  updateStatus: (status: PipelineStatus, preferencesSummary?: string | null) => void;
  updateStatusDetail: (detail: string | null) => void;
  setError: (msg: string) => void;
  setUploading: (val: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  status: null,
  datasetInfo: null,
  error: null,
  statusDetail: null,
  preferencesSummary: null,
  isUploading: false,
  
  setSession: (id, dataset) => set({ sessionId: id, datasetInfo: dataset }),
  updateStatus: (status, preferencesSummary) => set((state) => ({ 
    status, 
    preferencesSummary: preferencesSummary !== undefined ? preferencesSummary : state.preferencesSummary 
  })),
  updateStatusDetail: (detail) => set({ statusDetail: detail }),
  setError: (msg) => set({ error: msg }),
  setUploading: (val) => set({ isUploading: val }),
  reset: () => set({ sessionId: null, status: null, datasetInfo: null, error: null, statusDetail: null, preferencesSummary: null, isUploading: false }),
}));
