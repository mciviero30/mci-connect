import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * I2 - Automated Quote Follow-up Reminders
 * 
 * Runs daily - finds quotes in "sent" status with no activity for 7+ days
 * Sends follow-up reminders to improve conversion rate
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('📧 Checking quotes for follow-up...');

    // Get all sent quotes
    const quotes = await base44.asServiceRole.entities.Quote.filter({ 
      status: 'sent' 
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find quotes needing follow-up (sent 7+ days ago, no recent updates)
    const needsFollowUp = quotes.filter(quote => {
      const sentDate = new Date(quote.updated_date);
      return sentDate < sevenDaysAgo;
    });

    console.log(`Found ${needsFollowUp.length} quotes needing follow-up`);

    if (needsFollowUp.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No quotes need follow-up',
        count: 0
      });
    }

    // Send reminders
    const reminders = [];
    for (const quote of needsFollowUp) {
      try {
        // Get customer email
        const customer = await base44.asServiceRole.entities.Customer.get(quote.customer_id);
        
        if (!customer?.email) {
          console.log(`Skipping quote ${quote.quote_number} - no customer email`);
          continue;
        }

        // Get quote creator for CC
        const creator = await base44.asServiceRole.entities.User.filter({ 
          id: quote.created_by_user_id 
        });

        const daysSince = Math.floor((Date.now() - new Date(quote.updated_date)) / (1000 * 60 * 60 * 24));

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customer.email,
          subject: `Follow-up: Quote ${quote.quote_number} - ${quote.job_name}`,
          body: `Hi ${customer.name || 'there'},\n\nWe wanted to follow up on the quote we sent you ${daysSince} days ago for:\n\n${quote.job_name}\nQuote #: ${quote.quote_number}\nTotal: $${quote.total.toFixed(2)}\n\nDo you have any questions or need any clarification? We're here to help!\n\nBest regards,\nMCI Team`,
          from_name: 'MCI Connect'
        });

        reminders.push({
          quote_number: quote.quote_number,
          customer: customer.name,
          days_since: daysSince
        });

        console.log(`✅ Sent follow-up for ${quote.quote_number} to ${customer.email}`);

      } catch (error) {
        console.error(`Failed to send reminder for ${quote.quote_number}:`, error.message);
      }
    }

    return Response.json({ 
      success: true,
      reminders_sent: reminders.length,
      details: reminders
    });

  } catch (error) {
    console.error('[Quote Follow-up Error]', error.message);
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});