import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthorizedFetch } from '../../auth/authorizedFetch';
import { useConfig } from '../../config';
import { RegistryClient } from './client';
import type { Capabilities, ListParams } from './types';

export function useRegistryClient(): RegistryClient {
  const config = useConfig();
  const fetchFn = useAuthorizedFetch();
  return useMemo(
    () => new RegistryClient(config.registryUrl, fetchFn),
    [config.registryUrl, fetchFn],
  );
}

/** Lists entries; routes through /agents/search when a query is present. */
export function useEntries(params: ListParams, options?: { refetchInterval?: number }) {
  const client = useRegistryClient();
  return useQuery({
    queryKey: ['entries', params],
    queryFn: () => (params.q ? client.search(params) : client.list(params)),
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval,
  });
}

const NO_CAPABILITIES: Capabilities = { semantic_search: false };

/** Capabilities probe: soft-fails to "no optional capabilities". */
export function useCapabilities() {
  const client = useRegistryClient();
  const query = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => client.capabilities(),
    staleTime: Infinity,
    retry: false,
  });
  return query.data ?? NO_CAPABILITIES;
}
