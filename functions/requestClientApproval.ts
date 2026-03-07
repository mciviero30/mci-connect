import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_type, item_id, customer_email, due_days = 7 } = await req.json();

    if (!item_type || !item_id) {
      return Response.json({ error: 'item_type and item_id required' }, { status: 400 });
    }

    // Fetch the item details based on type
    let item, customer_id, customer_name, title, description, amount, job_id;

    if (item_type === 'quote') {
      const quotes = await base44.entities.Quote.filter({ id: item_id });
      if (quotes.length === 0) throw new Error('Quote not found');
      item = quotes[0];
      customer_id = item.customer_id;
      customer_name = item.customer_name;
      customer_email = customer_email || item.customer_email;
      title = `Quote Approval: ${item.quote_number}`;
      description = `Please review and approve quote for ${item.job_name}`;
      amount = item.total;
      job_id = item.job_id;
    } else if (item_type === 'change_order') {
      const changeOrders = await base44.entities.ChangeOrder.filter({ id: item_id });
      if (changeOrders.length === 0) throw new Error('Change Order not found');
      item = changeOrders[0];
      customer_id = item.customer_id;
      customer_name = item.customer_name;
      title = `Change Order Approval: ${item.change_order_number}`;
      description = item.description;
      amount = item.change_amount;
      job_id = item.job_id;
    } else if (item_type === 'rfi') {
      const rfis = await base44.entities.RFI.filter({ id: item_id });
      if (rfis.length === 0) throw new Error('RFI not found');
      item = rfis[0];
      customer_id = item.customer_id;
      customer_name = item.customer_name || 'Client';
      title = `RFI Response Required: ${item.rfi_number}`;
      description = item.question;
      job_id = item.job_id;
    } else if (item_type === 'submittal') {
      const submittals = await base44.entities.Submittal.filter({ id: item_id });
      if (submittals.length === 0) throw new Error('Submittal not found');
      item = submittals[0];
      customer_id = item.customer_id;
      customer_name = item.customer_name || 'Client';
      title = `Submittal Approval: ${item.submittal_number}`;
      description = item.description;
      job_id = item.job_id;
    }

    if (!customer_email) {
      return Response.json({ error: 'Customer email not available' }, { status: 400 });
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + due_days);

    // Create approval request
    const approval = await base44.entities.ClientApproval.create({
      item_type,
      item_id,
      job_id,
      customer_id,
      customer_name,
      customer_email,
      title,
      description,
      amount,
      status: 'pending',
      priority: amount > 10000 ? 'high' : 'medium',
      requested_by_user_id: user.id,
      requested_by_name: user.full_name,
      requested_at: new Date().toISOString(),
      due_date: dueDate.toISOString().split('T')[0]
    });

    // Send notification email
    const emailBody = `
      <h2>Approval Required</h2>
      <p>Dear ${customer_name},</p>
      <p>${description}</p>
      ${amount ? `<p><strong>Amount:</strong> $${amount.toLocaleString()}</p>` : ''}
      <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
      <p>Please review and respond at your earliest convenience.</p>
      <p>Thank you,<br>MCI Connect Team</p>
    `;

    await base44.integrations.Core.SendEmail({
      to: customer_email,
      subject: title,
      body: emailBody,
      from_name: 'MCI Connect'
    });

    // Update approval record
    await base44.entities.ClientApproval.update(approval.id, {
      notification_sent: true
    });

    return Response.json({ 
      success: true, 
      approval_id: approval.id,
      message: 'Approval request sent to client'
    });

  } catch (error) {
    console.error('Request Approval Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});