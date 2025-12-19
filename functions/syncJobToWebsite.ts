import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id required' }, { status: 400 });
    }

    // Get job details
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];

    if (!job || !job.show_on_website) {
      return Response.json({ error: 'Job not found or not enabled for website' }, { status: 404 });
    }

    // Get before/after photos
    const photos = await base44.asServiceRole.entities.Photo.filter({ job_id: job_id });
    const beforePhotos = photos.filter(p => p.photo_type === 'before');
    const afterPhotos = photos.filter(p => p.photo_type === 'after');

    // Get invoice/quote items for work description (privacy-filtered)
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: job_id });
    const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job_id });

    // Privacy filter function
    const applyPrivacyFilter = (items) => {
      return items.map(item => {
        const itemName = item.item_name || item.description || '';
        
        // Remove quantities (e.g., "124LF", "50SF")
        let filtered = itemName.replace(/\d+\s?(LF|SF|EA|SQ|FT|SQFT)/gi, '');
        
        // Simplify complex descriptions
        filtered = filtered.replace(/\bof\b/gi, '').trim();
        
        return filtered;
      }).filter(Boolean);
    };

    const workItems = [
      ...applyPrivacyFilter(invoices.flatMap(inv => inv.items || [])),
      ...applyPrivacyFilter(quotes.flatMap(q => q.items || []))
    ].filter((item, index, self) => self.indexOf(item) === index); // Unique

    // Build public portfolio data
    const portfolioData = {
      project_id: job.id,
      project_name: job.name,
      location: `${job.city || ''}, ${job.state || ''}`.trim().replace(/^,\s*/, ''),
      status: job.status,
      completion_date: job.completed_date,
      description: job.website_description || job.description,
      hero_photo: job.hero_photo_url,
      before_photos: beforePhotos.map(p => p.file_url),
      after_photos: afterPhotos.map(p => p.file_url),
      work_performed: workItems.slice(0, 10), // Limit to 10 items
      created_at: new Date().toISOString()
    };

    // Send to MCI Web app
    const mciWebUrl = 'https://mci-web.base44.app';
    const crossAppToken = Deno.env.get('CROSS_APP_TOKEN');

    if (!crossAppToken) {
      return Response.json({ error: 'CROSS_APP_TOKEN not configured' }, { status: 500 });
    }

    console.log('Syncing to MCI Web:', mciWebUrl);
    console.log('Portfolio data:', JSON.stringify(portfolioData, null, 2));

    let response;
    try {
      response = await fetch(`${mciWebUrl}/functions/receivePortfolioProject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${crossAppToken}`
        },
        body: JSON.stringify(portfolioData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MCI Web error:', errorText);
        return Response.json({ 
          error: 'Failed to sync to MCI Web', 
          status: response.status,
          details: errorText
        }, { status: 500 });
      }

      const result = await response.json();
      console.log('Sync successful:', result);

      return Response.json({ 
        success: true, 
        message: 'Job synced to MCI-us.com successfully',
        mci_web_response: result
      });

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return Response.json({ 
        error: 'Network error connecting to MCI Web', 
        details: fetchError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error syncing job to website:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});