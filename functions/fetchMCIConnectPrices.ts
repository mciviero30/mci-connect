import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Validate user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get MCI Connect URL and token from secrets
        const mciConnectUrl = Deno.env.get('MCI_CONNECT_URL');
        const mciConnectToken = Deno.env.get('CROSS_APP_TOKEN');

        if (!mciConnectUrl || !mciConnectToken) {
            return Response.json({ 
                error: 'MCI Connect credentials not configured' 
            }, { status: 500 });
        }

        // Call MCI Connect function
        const response = await fetch(mciConnectUrl, {
            method: 'GET',
            headers: {
                'x-auth-token': mciConnectToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCI Connect error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return Response.json({
            success: true,
            items: data.items,
            count: data.count,
            synced_at: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});