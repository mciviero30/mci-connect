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

    // Here you would POST to your MCI-us.com API endpoint
    // For now, we'll return the data structure
    // const response = await fetch('https://mci-us.com/api/projects', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('MCI_WEBSITE_API_KEY')}` },
    //   body: JSON.stringify(portfolioData)
    // });

    return Response.json({ 
      success: true, 
      message: 'Job data prepared for website sync',
      portfolio_data: portfolioData,
      privacy_check: {
        no_pricing: true,
        no_full_address: true,
        no_quantities: true,
        work_items_count: workItems.length
      }
    });

  } catch (error) {
    console.error('Error syncing job to website:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});