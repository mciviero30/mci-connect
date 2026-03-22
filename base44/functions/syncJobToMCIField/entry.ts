import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobData } = await req.json();
    
    if (!jobData || !jobData.id) {
      return Response.json({ error: 'jobData with id required' }, { status: 400 });
    }

    // MCI Field app configuration
    const MCI_FIELD_APP_ID = 'mci-fields';
    const MCI_FIELD_OWNER = '68ee5191fb756d843d0561d3';
    
    // Prepare job data for MCI Field
    const fieldJobData = {
      id: jobData.id,
      name: jobData.name,
      description: jobData.description || '',
      customer_name: jobData.customer_name || '',
      customer_id: jobData.customer_id || '',
      address: jobData.address || '',
      city: jobData.city || '',
      state: jobData.state || '',
      zip: jobData.zip || '',
      latitude: jobData.latitude || null,
      longitude: jobData.longitude || null,
      contract_amount: jobData.contract_amount || 0,
      estimated_cost: jobData.estimated_cost || 0,
      estimated_hours: jobData.estimated_hours || 0,
      team_id: jobData.team_id || '',
      team_name: jobData.team_name || '',
      status: jobData.status || 'active',
      color: jobData.color || 'blue',
      synced_from: 'mci-connect',
      synced_at: new Date().toISOString()
    };

    // Get cross-app token
    const crossAppToken = Deno.env.get('CROSS_APP_TOKEN');
    if (!crossAppToken) {
      return Response.json({ 
        success: false, 
        error: 'CROSS_APP_TOKEN not configured' 
      }, { status: 500 });
    }

    // Use Base44's cross-app entity API
    const response = await fetch(
      `https://app.base44.com/api/apps/${MCI_FIELD_OWNER}/${MCI_FIELD_APP_ID}/entities/Job/records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${crossAppToken}`
        },
        body: JSON.stringify(fieldJobData)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({
        success: false,
        error: `Failed to sync to MCI Field: ${errorText}`
      }, { status: 500 });
    }

    const result = await response.json();
    
    return Response.json({
      success: true,
      message: 'Job synced to MCI Field successfully',
      mci_field_job_id: result.id || jobData.id
    });
    
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('Sync to MCI Field failed:', error);
    }
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});