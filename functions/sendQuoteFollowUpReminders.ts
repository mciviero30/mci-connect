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
        const daysSince = Math.floor((Date.now() - new Date(quote.updated_date)) / (1000 * 60 * 60 * 24));

        // Create internal notification for quote owner/creator
        if (quote.created_by_user_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: quote.created_by_user_id,
            type: 'quote_followup',
            title: `Follow-up: ${quote.quote_number}`,
            message: `Quote for ${quote.customer_name} has been sent ${daysSince} days ago with no activity. Consider following up.`,
            link: `/VerEstimado?id=${quote.id}`,
            priority: 'medium',
            read: false
          });

          reminders.push({
            quote_number: quote.quote_number,
            customer: quote.customer_name,
            days_since: daysSince
          });

          console.log(`✅ Created follow-up notification for ${quote.quote_number}`);
        } else {
          console.log(`Skipping quote ${quote.quote_number} - no creator`);
        }

      } catch (error) {
        console.error(`Failed to create reminder for ${quote.quote_number}:`, error.message);
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