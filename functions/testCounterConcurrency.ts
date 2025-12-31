import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DEV-ONLY: Concurrency stress test for counter system
 * Simulates 20 concurrent invoice number generations
 * Verifies no duplicates and correct sequencing
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only in production, anyone in DEV
    if (!import.meta.env?.DEV && user.role !== 'admin') {
      return Response.json({ error: 'This endpoint is only available in DEV mode' }, { status: 403 });
    }

    console.log('🧪 Starting concurrency test...');

    // Create 20 concurrent requests
    const concurrentCalls = 20;
    const promises = [];

    for (let i = 0; i < concurrentCalls; i++) {
      promises.push(
        base44.asServiceRole.functions.invoke('generateInvoiceNumber', {})
          .then(response => {
            const number = response?.invoice_number || response?.data?.invoice_number;
            console.log(`  [${i + 1}] Generated: ${number}`);
            return number;
          })
      );
    }

    // Wait for all to complete
    const results = await Promise.all(promises);

    // Analyze results
    const uniqueNumbers = new Set(results);
    const hasDuplicates = uniqueNumbers.size !== results.length;
    
    // Extract numeric values for sequence check
    const numbers = results
      .filter(r => r && r.startsWith('INV-'))
      .map(r => parseInt(r.replace('INV-', '')))
      .sort((a, b) => a - b);

    // Check if sequence is continuous
    const isSequential = numbers.every((num, idx) => {
      if (idx === 0) return true;
      return num === numbers[idx - 1] + 1;
    });

    // Build report
    const report = {
      test_config: {
        concurrent_calls: concurrentCalls,
        counter_key: 'invoice_number'
      },
      results: {
        total_generated: results.length,
        unique_count: uniqueNumbers.size,
        has_duplicates: hasDuplicates,
        is_sequential: isSequential,
        min_number: numbers.length > 0 ? numbers[0] : null,
        max_number: numbers.length > 0 ? numbers[numbers.length - 1] : null,
        range_expected: numbers.length,
        range_actual: numbers.length > 0 ? (numbers[numbers.length - 1] - numbers[0] + 1) : 0
      },
      all_numbers: results,
      verdict: !hasDuplicates && isSequential ? '✅ PASS' : '❌ FAIL'
    };

    console.log('\n📊 CONCURRENCY TEST REPORT:');
    console.log(`   Generated: ${report.results.total_generated}`);
    console.log(`   Unique: ${report.results.unique_count}`);
    console.log(`   Duplicates: ${hasDuplicates ? '❌ YES' : '✅ NO'}`);
    console.log(`   Sequential: ${isSequential ? '✅ YES' : '❌ NO'}`);
    console.log(`   Verdict: ${report.verdict}\n`);

    return Response.json(report);

  } catch (error) {
    console.error('❌ Test failed:', error);
    return Response.json({ 
      error: error.message,
      verdict: '❌ ERROR'
    }, { status: 500 });
  }
});