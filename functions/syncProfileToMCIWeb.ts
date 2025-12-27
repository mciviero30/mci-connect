import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticación
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      email,
      full_name,
      profile_photo_url,
      avatar_image_url,
      preferred_profile_image,
      phone,
      position,
      department,
      profile_last_updated
    } = payload;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Obtener URL y token de MCI Web desde variables de entorno
    const MCI_WEB_URL = Deno.env.get('MCI_CONNECT_URL'); // Reutilizamos esta variable
    const MCI_WEB_TOKEN = Deno.env.get('CROSS_APP_TOKEN'); // Token para autenticar con MCI Web

    if (!MCI_WEB_URL || !MCI_WEB_TOKEN) {
      console.error('❌ MCI Web credentials not configured');
      return Response.json({ 
        error: 'Cross-app sync not configured',
        message: 'Missing MCI_CONNECT_URL or CROSS_APP_TOKEN'
      }, { status: 500 });
    }

    // Sincronizar con MCI Web
    const syncResponse = await fetch(`${MCI_WEB_URL}/functions/receiveMCIConnectProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCI_WEB_TOKEN}`
      },
      body: JSON.stringify({
        email,
        full_name,
        profile_photo_url,
        avatar_image_url,
        preferred_profile_image,
        phone,
        position,
        department,
        profile_last_updated,
        source: 'mci-connect'
      })
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('❌ Error syncing to MCI Web:', errorText);
      return Response.json({ 
        error: 'Sync failed',
        details: errorText
      }, { status: 500 });
    }

    const syncResult = await syncResponse.json();
    console.log('✅ Profile synced to MCI Web:', email);

    return Response.json({ 
      success: true,
      message: 'Profile synced to MCI Web',
      result: syncResult
    });

  } catch (error) {
    console.error('❌ Error in syncProfileToMCIWeb:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});