import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        // Validate token FIRST - support both x-auth-token and Authorization Bearer
        const xAuthToken = req.headers.get('x-auth-token');
        const authHeader = req.headers.get('Authorization');
        const bearerToken = authHeader?.replace('Bearer ', '');
        const authToken = xAuthToken || bearerToken;
        const expectedToken = Deno.env.get('CROSS_APP_TOKEN');
        
        console.log('🔐 Token validation:', { 
            hasXAuthToken: !!xAuthToken, 
            hasAuthHeader: !!authHeader,
            tokenMatch: authToken === expectedToken 
        });
        
        if (!authToken || authToken !== expectedToken) {
            return Response.json({ 
                error: 'Unauthorized - Invalid token' 
            }, { status: 401 });
        }

        // Create Base44 client AFTER token validation
        const base44 = createClientFromRequest(req);

        // Fetch active items from ItemCatalog
        console.log('📦 Fetching items with filter: { active: true }');
        const items = await base44.asServiceRole.entities.ItemCatalog.filter({ 
            active: true 
        }, '-updated_date', 500);

        console.log(`✅ Found ${items.length} active items`);
        if (items.length > 0) {
            console.log('📋 Sample item:', JSON.stringify(items[0], null, 2));
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
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});