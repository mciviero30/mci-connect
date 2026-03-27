import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    const { event, old_data } = await req.json();
    
    if (event.type === 'delete' && event.entity_name === 'Transaction') {
      const auditLog = {
        action: 'TRANSACTION_DELETED',
        transactionId: event.entity_id,
        deletedBy: user?.email || 'unknown',
        deletedAt: new Date().toISOString(),
        transactionSnapshot: old_data ? {
          type: old_data.type,
          amount: old_data.amount,
          category: old_data.category,
          date: old_data.date,
          reconciliation_status: old_data.reconciliation_status,
          created_by: old_data.created_by
        } : null
      };
      
      console.error('⚠️ [AUDIT] Transaction deleted:', JSON.stringify(auditLog, null, 2));
    }
    
    return Response.json({ status: 'logged' });
  } catch (error) {
    console.error('❌ Audit logging failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});