import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Validate token - support both x-auth-token and Authorization Bearer
        const xAuthToken = req.headers.get('x-auth-token');
        const authHeader = req.headers.get('Authorization');
        const bearerToken = authHeader?.replace('Bearer ', '');
        const authToken = xAuthToken || bearerToken;
        const expectedToken = Deno.env.get('CROSS_APP_TOKEN');
        
        if (!authToken || authToken !== expectedToken) {
            return Response.json({ 
                error: 'Unauthorized - Invalid token' 
            }, { status: 401 });
        }

        // Fetch active items from ItemCatalog
        const items = await base44.asServiceRole.entities.ItemCatalog.filter({ 
            active: true 
        }, '-updated_date', 500);

        // Return items data
        return Response.json({
            success: true,
            count: items.length,
            items: items.map(item => ({
                id: item.id,
                item_name: item.name,
                description: item.description,
                unit_price: item.unit_price,
                unit: item.uom,
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