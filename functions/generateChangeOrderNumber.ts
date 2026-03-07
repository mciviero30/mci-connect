import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get next counter
    const result = await base44.asServiceRole.functions.invoke('getNextCounter', {
      counter_name: 'change_order'
    });

    const number = `CO-${String(result.next_value).padStart(5, '0')}`;

    return Response.json({ change_order_number: number });
  } catch (error) {
    console.error('Error generating change order number:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});