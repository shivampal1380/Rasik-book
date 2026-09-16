import { useQuery } from '@tanstack/react-query';
import { fetchHeadConfig } from './configApi.js';

// Shared config query — which heads are currently visible.
export function useVisibleHeads() {
  const query = useQuery({ queryKey: ['head-config'], queryFn: fetchHeadConfig });
  const heads = query.data?.heads ?? [];
  return {
    ...query,
    heads,
    visibleHeads: heads.filter(h => h.visible),
    visibleKeySet: new Set(heads.filter(h => h.visible).map(h => h.head)),
  };
}