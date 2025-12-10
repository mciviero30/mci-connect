import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Validate token
        const authToken = req.headers.get('x-auth-token');
        const expectedToken = Deno.env.get('CROSS_APP_TOKEN');
        
        if (!authToken || authToken !== expectedToken) {
            return Response.json({ 
                error: 'Unauthorized - Invalid token' 
            }, { status: 401 });
        }

        // Fetch active items from ItemCatalog
        const items = await base44.asServiceRole.entities.ItemCatalog.filter({ 
            status: 'active' 
        }, '-updated_date', 500);

        // Return items data
        return Response.json({
            success: true,
            count: items.length,
            items: items.map(item => ({
                id: item.id,
                item_name: item.item_name,
                description: item.description,
                unit_price: item.unit_price,
                unit: item.unit,
                category: item.category,
                updated_date: item.updated_date
            }))
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});