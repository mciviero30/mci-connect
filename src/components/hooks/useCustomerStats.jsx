import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Batch fetch stats for multiple customers to avoid N+1 queries
 * Usage: useCustomerStats([id1, id2, id3])
 */
export function useCustomerStats(customerIds = []) {
  return useQuery({
    queryKey: ['customerStats', customerIds.sort().join(',')],
    queryFn: async () => {
      if (!customerIds.length) return {};
      
      // Batch fetch all quotes and invoices
      const [quotes, invoices] = await Promise.all([
        base44.entities.Quote.filter({ customer_id: { $in: customerIds } }, '', 500),
        base44.entities.Invoice.filter({ customer_id: { $in: customerIds } }, '', 500)
      ]);
      
      // Aggregate by customer_id
      const stats = {};
      customerIds.forEach(id => {
        stats[id] = {
          quotes: quotes.filter(q => q.customer_id === id).length,
          invoices: invoices.filter(i => i.customer_id === id).length,
          totalRevenue: invoices
            .filter(i => i.customer_id === id && i.status === 'paid')
            .reduce((sum, i) => sum + (i.total || 0), 0)
        };
      });
      
      return stats;
    },
    enabled: customerIds.length > 0,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}