import { useEffect, useState } from 'react';

import { useResolvedScheme } from '@/context/ThemeContext';

/**
 * Web target of `use-color-scheme`. Metro picks this file over the native one.
 *
 * Reads the app's own preference like the native hook does, but holds 'light'
 * until hydration: the server-rendered markup has no access to the stored
 * preference or the OS setting, so committing to either before hydrating would
 * mismatch what the server sent.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const scheme = useResolvedScheme();

  return hasHydrated ? scheme : 'light';
}
