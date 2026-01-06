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

    const { public_token } = await req.json();

    if (!public_token) {
      return Response.json({ error: 'public_token is required' }, { status: 400 });
    }

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

    // Exchange public token for access token
    const exchangeResponse = await fetch(`https://${PLAID_ENV}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', exchangeData);
      return Response.json({ error: exchangeData.error_message || 'Failed to exchange token' }, { status: 500 });
    }

    const access_token = exchangeData.access_token;
    const item_id = exchangeData.item_id;

    // Get accounts info
    const accountsResponse = await fetch(`https://${PLAID_ENV}.plaid.com/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token,
      }),
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      console.error('Plaid accounts error:', accountsData);
      return Response.json({ error: accountsData.error_message || 'Failed to get accounts' }, { status: 500 });
    }

    // Get institution info
    const institution = accountsData.item.institution_id;
    const institutionResponse = await fetch(`https://${PLAID_ENV}.plaid.com/institutions/get_by_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        institution_id: institution,
        country_codes: ['US'],
      }),
    });

    const institutionData = await institutionResponse.json();
    const institution_name = institutionData.institution?.name || 'Unknown Bank';

    // Save accounts to database
    const savedAccounts = [];
    for (const account of accountsData.accounts) {
      const bankAccount = await base44.asServiceRole.entities.BankAccount.create({
        account_name: `${institution_name} ${account.subtype || account.type}`,
        institution_name,
        account_type: account.type,
        account_mask: account.mask,
        plaid_access_token: access_token,
        plaid_account_id: account.account_id,
        plaid_item_id: item_id,
        current_balance: account.balances.current || 0,
        available_balance: account.balances.available || 0,
        currency: account.balances.iso_currency_code || 'USD',
        last_sync: new Date().toISOString(),
        status: 'active',
      });
      savedAccounts.push(bankAccount);
    }

    return Response.json({ 
      success: true, 
      accounts: savedAccounts,
      message: `Connected ${savedAccounts.length} account(s) successfully`
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});