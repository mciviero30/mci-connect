export default async function syncJobToMCIField({ jobData }) {
  // MCI Field app API endpoint
  const MCI_FIELD_APP_ID = 'mci-fields'; // Adjust if different
  const MCI_FIELD_OWNER = '68ee5191fb756d843d0561d3'; // Same owner
  
  try {
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

    // Use Base44's cross-app entity API
    const response = await fetch(`https://app.base44.com/api/apps/${MCI_FIELD_OWNER}/${MCI_FIELD_APP_ID}/entities/Job/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BASE44_API_KEY}`
      },
      body: JSON.stringify(fieldJobData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to sync to MCI Field: ${errorText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      message: 'Job synced to MCI Field successfully',
      mci_field_job_id: result.id || jobData.id
    };
    
  } catch (error) {
    console.error('Sync to MCI Field failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}