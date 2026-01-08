import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageData } = await req.json();

    if (!packageData) {
      return Response.json({ error: 'Package data required' }, { status: 400 });
    }

    // Store package data in a shareable format
    const packageRecord = await base44.asServiceRole.entities.MeasurementPackage.create({
      package_id: packageData.metadata.package_id,
      job_id: packageData.metadata.job_id,
      job_name: packageData.job_info.name,
      area: packageData.metadata.area,
      package_data: packageData,
      generated_by: user.email,
      generated_by_name: user.full_name,
      generated_date: packageData.metadata.generated_date,
      is_active: true,
      access_token: generateAccessToken()
    });

    const shareableUrl = `${Deno.env.get('APP_URL')}/measurement-package/${packageRecord.access_token}`;

    return Response.json({
      success: true,
      package_id: packageData.metadata.package_id,
      shareable_url: shareableUrl,
      record_id: packageRecord.id
    });

  } catch (error) {
    console.error('Failed to create shareable package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateAccessToken() {
  return `mci_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}