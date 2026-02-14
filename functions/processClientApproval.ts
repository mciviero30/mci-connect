import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      approval_id, 
      action, // 'approve' or 'reject'
      approver_name, 
      approver_email,
      signature_data_url,
      rejection_reason 
    } = await req.json();

    if (!approval_id || !action) {
      return Response.json({ error: 'approval_id and action required' }, { status: 400 });
    }

    // Get approval request
    const approvals = await base44.asServiceRole.entities.ClientApproval.filter({ id: approval_id });
    if (approvals.length === 0) {
      return Response.json({ error: 'Approval not found' }, { status: 404 });
    }

    const approval = approvals[0];

    if (approval.status !== 'pending') {
      return Response.json({ error: 'Approval already processed' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update approval record
      await base44.asServiceRole.entities.ClientApproval.update(approval_id, {
        status: 'approved',
        approved_by_name: approver_name || approval.customer_name,
        approved_by_email: approver_email || approval.customer_email,
        approved_at: now,
        signature_data_url: signature_data_url || null
      });

      // Update the original item
      if (approval.item_type === 'quote') {
        await base44.asServiceRole.entities.Quote.update(approval.item_id, {
          status: 'approved',
          customer_signature: signature_data_url,
          signed_date: now
        });
      } else if (approval.item_type === 'change_order') {
        await base44.asServiceRole.entities.ChangeOrder.update(approval.item_id, {
          status: 'approved',
          approval_status: 'approved',
          approved_by_client: approver_email || approval.customer_email,
          approved_by_client_name: approver_name || approval.customer_name,
          client_approval_date: now,
          client_signature: signature_data_url
        });
      } else if (approval.item_type === 'rfi') {
        await base44.asServiceRole.entities.RFI.update(approval.item_id, {
          status: 'client_approved',
          client_approval_date: now
        });
      } else if (approval.item_type === 'submittal') {
        await base44.asServiceRole.entities.Submittal.update(approval.item_id, {
          status: 'client_approved',
          client_approval_date: now
        });
      }

      // Notify internal team
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approval.requested_by_email || 'admin@mci-connect.com',
        subject: `Client Approved: ${approval.title}`,
        body: `${approval.customer_name} has approved ${approval.title}. You can now proceed with the work.`,
        from_name: 'MCI Connect'
      });

      return Response.json({ 
        success: true, 
        message: 'Approval processed successfully'
      });

    } else if (action === 'reject') {
      // Update approval record
      await base44.asServiceRole.entities.ClientApproval.update(approval_id, {
        status: 'rejected',
        rejected_by_name: approver_name || approval.customer_name,
        rejected_at: now,
        rejection_reason: rejection_reason || 'No reason provided'
      });

      // Update the original item
      if (approval.item_type === 'quote') {
        await base44.asServiceRole.entities.Quote.update(approval.item_id, {
          status: 'rejected'
        });
      } else if (approval.item_type === 'change_order') {
        await base44.asServiceRole.entities.ChangeOrder.update(approval.item_id, {
          status: 'rejected',
          approval_status: 'rejected',
          rejected_by: approver_email || approval.customer_email,
          rejection_date: now,
          rejection_reason: rejection_reason || 'Client rejected'
        });
      } else if (approval.item_type === 'rfi') {
        await base44.asServiceRole.entities.RFI.update(approval.item_id, {
          status: 'client_rejected',
          rejection_reason: rejection_reason
        });
      } else if (approval.item_type === 'submittal') {
        await base44.asServiceRole.entities.Submittal.update(approval.item_id, {
          status: 'client_rejected',
          rejection_reason: rejection_reason
        });
      }

      // Notify internal team
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: approval.requested_by_email || 'admin@mci-connect.com',
        subject: `Client Rejected: ${approval.title}`,
        body: `${approval.customer_name} has rejected ${approval.title}. Reason: ${rejection_reason || 'Not specified'}`,
        from_name: 'MCI Connect'
      });

      return Response.json({ 
        success: true, 
        message: 'Rejection processed successfully'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Process Approval Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});