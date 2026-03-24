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

    const { account_id } = await req.json();

    if (!account_id) {
      return Response.json({ error: 'account_id is required' }, { status: 400 });
    }

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

    // Get bank account
    const bankAccounts = await base44.asServiceRole.entities.BankAccount.filter({ id: account_id });
    const bankAccount = bankAccounts[0];

    if (!bankAccount) {
      return Response.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Get transactions from last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const transactionsResponse = await fetch(`https://${PLAID_ENV}.plaid.com/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: bankAccount.plaid_access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          account_ids: [bankAccount.plaid_account_id],
        },
      }),
    });

    const transactionsData = await transactionsResponse.json();

    if (!transactionsResponse.ok) {
      console.error('Plaid transactions error:', transactionsData);
      
      // Update account status if error
      if (transactionsData.error_code === 'ITEM_LOGIN_REQUIRED') {
        await base44.asServiceRole.entities.BankAccount.update(account_id, {
          status: 'disconnected',
        });
        return Response.json({ 
          error: 'Bank login required. Please reconnect your account.',
          error_code: 'ITEM_LOGIN_REQUIRED'
        }, { status: 401 });
      }
      
      return Response.json({ error: transactionsData.error_message || 'Failed to get transactions' }, { status: 500 });
    }

    // Category mapping for expenses
    const expenseCategoryMap = {
      'Food and Drink': 'meals',
      'Travel': 'travel',
      'Transportation': 'transport',
      'Shops': 'supplies',
      'Service': 'other_expense',
      'Recreation': 'client_entertainment',
    };
    
    // Income categories
    const incomeCategoryMap = {
      'Payment': 'sales',
      'Transfer': 'sales',
      'Deposit': 'sales',
    };

    // Save transactions
    let syncedCount = 0;
    let skippedCount = 0;

    for (const transaction of transactionsData.transactions) {
      // Skip if already exists
      const existing = await base44.asServiceRole.entities.Transaction.filter({
        description: `${transaction.name} (Bank Sync)`,
        date: transaction.date,
        amount: Math.abs(transaction.amount)
      });

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      // Determine type (income vs expense)
      const type = transaction.amount < 0 ? 'income' : 'expense';
      const amount = Math.abs(transaction.amount);

      // Map category intelligently
      const primaryCategory = transaction.category?.[0] || 'Service';
      let category;
      
      if (type === 'income') {
        category = incomeCategoryMap[primaryCategory] || 'sales';
      } else {
        category = expenseCategoryMap[primaryCategory] || 'other_expense';
      }

      // Create transaction
      await base44.asServiceRole.entities.Transaction.create({
        type,
        amount,
        category,
        description: `${transaction.name}`,
        date: transaction.date,
        payment_method: 'bank_transfer',
        notes: `Auto-synced from ${bankAccount.institution_name} ${bankAccount.account_mask}`,
        bank_account_id: account_id,
        plaid_transaction_id: transaction.transaction_id,
        reconciliation_status: 'unreconciled'
      });

      syncedCount++;
    }

    // Update account balance and last sync
    const accountBalanceResponse = await fetch(`https://${PLAID_ENV}.plaid.com/accounts/balance/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: bankAccount.plaid_access_token,
        options: {
          account_ids: [bankAccount.plaid_account_id],
        },
      }),
    });

    const balanceData = await accountBalanceResponse.json();
    
    if (accountBalanceResponse.ok && balanceData.accounts?.[0]) {
      const balance = balanceData.accounts[0].balances;
      await base44.asServiceRole.entities.BankAccount.update(account_id, {
        current_balance: balance.current || 0,
        available_balance: balance.available || 0,
        last_sync: new Date().toISOString(),
        status: 'active',
      });
    } else {
      await base44.asServiceRole.entities.BankAccount.update(account_id, {
        last_sync: new Date().toISOString(),
      });
    }

    return Response.json({ 
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: transactionsData.transactions.length,
      message: `Synced ${syncedCount} new transactions (${skippedCount} already existed)`
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});