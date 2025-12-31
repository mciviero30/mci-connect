import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requireUser, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireUser(base44);

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
        if (error instanceof Response) throw error;
        return safeJsonError('Fetch failed', 500, error.message);
    }
});