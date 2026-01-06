import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return Response.json({ 
        error: 'Plaid credentials not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET in settings.' 
      }, { status: 500 });
    }

    // Create Link Token
    const response = await fetch(`https://${PLAID_ENV}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: {
          client_user_id: user.id,
        },
        client_name: 'MCI Connect',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Plaid error:', data);
      return Response.json({ error: data.error_message || 'Failed to create link token' }, { status: 500 });
    }

    return Response.json({ link_token: data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});