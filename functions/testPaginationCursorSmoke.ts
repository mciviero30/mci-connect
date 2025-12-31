import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

/**
 * SMOKE TEST: Cursor-Based Pagination Validation
 * Tests that pagination is truly server-side with no duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    const results = {
      test: 'Cursor Pagination Smoke Test',
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Invoice Pagination
    try {
      const page1 = await base44.asServiceRole.functions.invoke('listInvoicesPaginated', {
        limit: 50,
        cursor: null
      });

      const page2 = page1.nextCursor
        ? await base44.asServiceRole.functions.invoke('listInvoicesPaginated', {
            limit: 50,
            cursor: page1.nextCursor
          })
        : { items: [], nextCursor: null, hasMore: false };

      const page3 = page2.nextCursor
        ? await base44.asServiceRole.functions.invoke('listInvoicesPaginated', {
            limit: 50,
            cursor: page2.nextCursor
          })
        : { items: [], nextCursor: null, hasMore: false };

      // Collect all IDs
      const allIds = [
        ...page1.items.map(i => i.id),
        ...page2.items.map(i => i.id),
        ...page3.items.map(i => i.id)
      ];

      const uniqueIds = new Set(allIds);
      const hasDuplicates = allIds.length !== uniqueIds.size;

      // Check ordering (descending by created_date)
      const allItems = [...page1.items, ...page2.items, ...page3.items];
      let orderCorrect = true;
      for (let i = 0; i < allItems.length - 1; i++) {
        const current = new Date(allItems[i].created_date);
        const next = new Date(allItems[i + 1].created_date);
        if (current < next) {
          orderCorrect = false;
          break;
        }
      }

      results.tests.push({
        entity: 'Invoice',
        page1_count: page1.items.length,
        page2_count: page2.items.length,
        page3_count: page3.items.length,
        total_items: allIds.length,
        unique_items: uniqueIds.size,
        has_duplicates: hasDuplicates,
        order_correct: orderCorrect,
        page1_has_more: page1.hasMore,
        page2_has_more: page2.hasMore,
        page3_has_more: page3.hasMore,
        status: !hasDuplicates && orderCorrect ? 'PASS' : 'FAIL'
      });

    } catch (error) {
      results.tests.push({
        entity: 'Invoice',
        error: error.message,
        status: 'ERROR'
      });
    }

    // Test 2: Quote Pagination
    try {
      const page1 = await base44.asServiceRole.functions.invoke('listQuotesPaginated', {
        limit: 50,
        cursor: null
      });

      const page2 = page1.nextCursor
        ? await base44.asServiceRole.functions.invoke('listQuotesPaginated', {
            limit: 50,
            cursor: page1.nextCursor
          })
        : { items: [], nextCursor: null, hasMore: false };

      const allIds = [...page1.items.map(i => i.id), ...page2.items.map(i => i.id)];
      const uniqueIds = new Set(allIds);

      results.tests.push({
        entity: 'Quote',
        page1_count: page1.items.length,
        page2_count: page2.items.length,
        total_items: allIds.length,
        unique_items: uniqueIds.size,
        has_duplicates: allIds.length !== uniqueIds.size,
        status: allIds.length === uniqueIds.size ? 'PASS' : 'FAIL'
      });

    } catch (error) {
      results.tests.push({
        entity: 'Quote',
        error: error.message,
        status: 'ERROR'
      });
    }

    // Test 3: Job Pagination
    try {
      const page1 = await base44.asServiceRole.functions.invoke('listJobsPaginated', {
        limit: 50,
        cursor: null
      });

      const page2 = page1.nextCursor
        ? await base44.asServiceRole.functions.invoke('listJobsPaginated', {
            limit: 50,
            cursor: page1.nextCursor
          })
        : { items: [], nextCursor: null, hasMore: false };

      const allIds = [...page1.items.map(i => i.id), ...page2.items.map(i => i.id)];
      const uniqueIds = new Set(allIds);

      results.tests.push({
        entity: 'Job',
        page1_count: page1.items.length,
        page2_count: page2.items.length,
        total_items: allIds.length,
        unique_items: uniqueIds.size,
        has_duplicates: allIds.length !== uniqueIds.size,
        status: allIds.length === uniqueIds.size ? 'PASS' : 'FAIL'
      });

    } catch (error) {
      results.tests.push({
        entity: 'Job',
        error: error.message,
        status: 'ERROR'
      });
    }

    // Overall status
    const allPassed = results.tests.every(t => t.status === 'PASS');
    results.overall_status = allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌';

    return Response.json(results);

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Smoke test error:', error);
    }
    return safeJsonError('Smoke test failed', 500, error.message);
  }
});