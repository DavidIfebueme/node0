'use client';

import { useState, useEffect } from 'react';
import { Breach } from '@/lib/types';
import { getBreaches } from '@/lib/api';

export function useBreaches() {
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBreaches()
      .then(setBreaches)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { breaches, isLoading, error, refetch: () => { setIsLoading(true); getBreaches().then(setBreaches).catch(e => setError(e.message)).finally(() => setIsLoading(false)); } };
}
