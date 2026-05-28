'use client';

import { useState, useEffect } from 'react';
import { getGraphData } from '@/lib/api';

export function useGraph(breachId: string) {
  const [data, setData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getGraphData(breachId)
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [breachId]);

  return { ...data, isLoading };
}
