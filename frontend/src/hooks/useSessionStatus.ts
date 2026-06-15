import { useEffect } from 'react';
import { getSessionStatus } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { PipelineStatus } from '../lib/types';

export function useSessionStatus(sessionId: string | null): void {
  const { updateStatus, setError } = useSessionStore();

  useEffect(() => {
    if (!sessionId) return;

    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const data = await getSessionStatus(sessionId);
        updateStatus(data.status as PipelineStatus, data.preferences_summary ?? null);
        
        if (data.status_detail !== undefined) {
          useSessionStore.getState().updateStatusDetail(data.status_detail || null);
        }

        if (data.error_msg) {
          setError(data.error_msg);
        }
        
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch session status";
        setError(message);
        clearInterval(intervalId);
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 2000);

    return () => clearInterval(intervalId);
  }, [sessionId, updateStatus, setError]);
}
