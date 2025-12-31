import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requireToken, safeJsonError, checkRateLimit } from './_auth.js';

Deno.serve(async (req) => {
    try {
        requireToken(req, 'CROSS_APP_TOKEN');

        // Rate limit: max 30 requests per minute
        checkRateLimit('expose-items', 30, 60000);

        const base44 = createClientFromRequest(req);

        // Fetch active items from ItemCatalog
        const items = await base44.asServiceRole.entities.ItemCatalog.filter({ 
            active: true 
        }, '-updated_date', 500);

        if (import.meta.env?.DEV) {
          console.log(`✅ Found ${items.length} active items`);
          if (items.length > 0) {
            console.log('📋 Sample item:', JSON.stringify(items[0], null, 2));
          }
        }

        // Return items data with all required fields
        return Response.json({
            success: true,
            count: items.length,
            items: items.map(item => ({
                id: item.id,
                name: item.name,
                item_name: item.name,
                sku: item.sku || '',
                description: item.description || '',
                unit_price: item.unit_price || 0,
                uom: item.uom,
                unit: item.uom,
                category: item.category,
                active: item.active,
                updated_date: item.updated_date
            }))
        });

    } catch (error) {
        if (error instanceof Response) throw error;
        return safeJsonError('Failed to fetch items', 500, error.message);
    }
});