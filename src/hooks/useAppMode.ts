import { useCallback } from 'react';
import { AppMode } from '@/types';
import { useModeStore } from '@/store/slices/mode';
import { ROLE_CONFIG } from '@/lib/constants';

export function useAppMode() {
  const mode = useModeStore(s => s.mode);
  const setMode = useModeStore(s => s.setMode);
  const config = ROLE_CONFIG[mode];

  const toggle = useCallback(() => {
    setMode(mode === 'passenger' ? 'driver' : 'passenger');
  }, [mode, setMode]);

  return { mode, setMode, toggle, config, isDriver: mode === 'driver', isPassenger: mode === 'passenger' };
}
