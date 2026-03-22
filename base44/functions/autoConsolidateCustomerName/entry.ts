import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO-CONSOLIDATE CUSTOMER NAME ON CREATION/UPDATE
 * Entity automation triggered on Customer create/update
 * Ensures consolidated 'name' field exists
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const customer = data;

    // Check if 'name' field needs to be set
    let consolidatedName = customer.name;

    // Priority: first_name + last_name > name > company > email
    if (!consolidatedName) {
      if (customer.first_name && customer.last_name) {
        consolidatedName = `${customer.first_name} ${customer.last_name}`.trim();
      } else if (customer.first_name) {
        consolidatedName = customer.first_name;
      } else if (customer.last_name) {
        consolidatedName = customer.last_name;
      } else if (customer.company) {
        consolidatedName = customer.company;
      } else if (customer.email) {
        // Extract name from email (before @)
        consolidatedName = customer.email.split('@')[0];
      } else {
        consolidatedName = 'Customer';
      }
    }

    // Update if name changed or was missing
    if (consolidatedName !== customer.name) {
      await base44.asServiceRole.entities.Customer.update(customer.id, { 
        name: consolidatedName 
      });

      return Response.json({ 
        success: true,
        customer_id: customer.id,
        name_updated: consolidatedName
      });
    }

    return Response.json({ 
      skipped: true, 
      reason: 'Name already set' 
    });
  } catch (error) {
    console.error('❌ Auto-consolidate customer name failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});