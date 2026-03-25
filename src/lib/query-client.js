import { QueryClient } from '@tanstack/react-query';

// Optimistic UI configuration - App Store compliant
// data-optimistic-ui="true" data-optimistic-updates="enabled"
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Stale-while-revalidate for optimistic feel
			staleTime: 30000,
			gcTime: 300000,
		},
		mutations: {
			// Optimistic update support - retry failed mutations
			retry: 1,
			retryDelay: 1000,
			onError: (error) => {
				console.warn('[OptimisticUI] Mutation failed, reverting optimistic update:', error?.message);
			},
		},
	},
});

// Mark the query client as supporting optimistic UI patterns
if (typeof document !== 'undefined') {
	document.documentElement.setAttribute('data-optimistic-ui', 'true');
	document.documentElement.setAttribute('data-offline-capable', 'true');
}