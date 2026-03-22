import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchTerms = [
      'civiero18ge',
      'rigoberto.pena',
      'angelo.civiero',
      'juancaricote08',
      'rojasdoranteraul',
      'alexandergarciagro',
      'cathihuizacheleonel',
      'ladinojhonatan120'
    ];

    const allUsers = await base44.asServiceRole.entities.User.list();

    const results = {
      found: [],
      not_found: []
    };

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();
      
      const match = allUsers.find(u => 
        u.email?.toLowerCase().includes(lowerTerm) ||
        u.full_name?.toLowerCase().includes(lowerTerm)
      );

      if (match) {
        results.found.push({
          search_term: term,
          email: match.email,
          full_name: match.full_name,
          employment_status: match.employment_status,
          role: match.role
        });
      } else {
        results.not_found.push(term);
      }
    }

    return Response.json({
      success: true,
      found_count: results.found.length,
      missing_count: results.not_found.length,
      results
    });

  } catch (error) {
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});