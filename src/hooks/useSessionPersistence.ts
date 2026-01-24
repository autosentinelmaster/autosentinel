import { useState, useEffect } from 'react';

interface SessionState {
  tokenCode: string;
  sessionId: string | null;
  sessionSecret: string | null;
  driving: boolean;
  speed: number;
  distance: number;
  elapsed: number;
  fuel: number;
  carPosition: { x: number; y: number };
  seatBeltConfirmed: boolean;
  isPaused: boolean;
}

const STORAGE_KEY = 'autosentinel_simulator_session';

export function useSessionPersistence(tokenCode: string) {
  const [isRestored, setIsRestored] = useState(false);
  
  const saveSession = (state: Partial<SessionState>) => {
    if (!tokenCode) return;
    
    const currentState = getSession();
    const newState = { ...currentState, ...state, tokenCode };
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Failed to save session state');
    }
  };

  const getSession = (): SessionState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as SessionState;
      // Only return if token matches
      if (parsed.tokenCode === tokenCode) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const clearSession = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session state');
    }
  };

  const restoreSession = (): SessionState | null => {
    const session = getSession();
    setIsRestored(true);
    return session;
  };

  // Mark session as paused when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const session = getSession();
      if (session?.driving) {
        saveSession({ isPaused: true });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tokenCode]);

  return {
    saveSession,
    getSession,
    clearSession,
    restoreSession,
    isRestored
  };
}