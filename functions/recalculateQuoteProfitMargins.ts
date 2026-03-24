import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Recalculates profit margins for all existing quotes based on catalog costs
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only validation
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('🔄 Starting profit margin recalculation for all quotes...');

    // Fetch all quotes
    const quotes = await base44.asServiceRole.entities.Quote.list();
    console.log(`📋 Found ${quotes.length} quotes to process`);

    // Fetch catalog items for cost lookups
    const catalogItems = await base44.asServiceRole.entities.QuoteItem.list();
    const catalogMap = new Map(catalogItems.map(item => [item.name, item]));
    console.log(`📦 Loaded ${catalogItems.length} catalog items`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const quote of quotes) {
      try {
        // Calculate estimated cost from quote items
        const estimated_cost = (quote.items || []).reduce((sum, item) => {
          const catalogItem = catalogMap.get(item.item_name);
          if (!catalogItem) {
            console.warn(`⚠️ Catalog item not found for: ${item.item_name}`);
            return sum;
          }

          const costPerUnit = catalogItem.cost_per_unit || 0;
          const materialCost = catalogItem.material_cost || 0;
          const totalCost = (costPerUnit + materialCost) * (item.quantity || 0);
          return sum + totalCost;
        }, 0);

        // Calculate profit margin
        const total = quote.total || 0;
        const profit_margin = total > 0 ? ((total - estimated_cost) / total) * 100 : 0;

        // Skip if already has correct values
        if (quote.estimated_cost === estimated_cost && quote.profit_margin === profit_margin) {
          skipped++;
          continue;
        }

        // Update quote with calculated values
        await base44.asServiceRole.entities.Quote.update(quote.id, {
          estimated_cost,
          profit_margin
        });

        updated++;
        console.log(`✅ Updated quote ${quote.quote_number}: Profit = $${(total - estimated_cost).toFixed(2)} (${profit_margin.toFixed(1)}%)`);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing quote ${quote.quote_number}:`, error);
      }
    }

    const summary = {
      total: quotes.length,
      updated,
      skipped,
      errors,
      message: `Successfully recalculated profit margins for ${updated} quotes`
    };

    console.log('✨ Recalculation complete:', summary);

    return Response.json(summary);
  } catch (error) {
    console.error('❌ Function error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});