import { QueryClient } from '@tanstack/react-query';

/**
 * Global Query Client Configuration
 * 
 * staleTime: 5 min — data is considered fresh for 5 minutes, no refetch during that window
 * gcTime: 30 min — unused cache stays in memory 30 min before being garbage collected
 * refetchOnWindowFocus: false — don't refetch when user switches tabs/windows
 * refetchOnMount: false — if data is in cache and still fresh, don't refetch on component mount
 * refetchOnReconnect: false — don't refetch on network reconnect if data is fresh
 * retry: 1 — only retry failed requests once (not 3x default)
 * 
 * CREDIT SAVINGS ESTIMATE: ~40-60% reduction in API calls
 */
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,        // 5 minutes - data stays fresh
			gcTime: 1000 * 60 * 30,           // 30 minutes - keep in cache
			refetchOnWindowFocus: false,       // no refetch on tab switch
			refetchOnMount: false,             // use cache if available
			refetchOnReconnect: false,         // no refetch on reconnect
			retry: 1,                          // only retry once on error
		},
	},
});
