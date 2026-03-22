import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * Sincroniza el perfil de usuario (foto y datos) con MCI Web
 * Se llama automáticamente cuando un usuario actualiza su perfil
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { userId, userData } = await req.json();

    // Obtener credenciales de MCI Web desde secrets
    const MCI_WEB_URL = Deno.env.get("MCI_CONNECT_URL"); // Usamos el existente
    const MCI_WEB_TOKEN = Deno.env.get("CROSS_APP_TOKEN");

    if (!MCI_WEB_URL || !MCI_WEB_TOKEN) {
      if (import.meta.env?.DEV) {
        console.warn('MCI Web credentials not configured');
      }
      return Response.json({ 
        success: false, 
        message: 'MCI Web not configured' 
      });
    }

    // Obtener datos completos del usuario desde MCI Connect
    const userToSync = userId ? 
      await base44.asServiceRole.entities.User.filter({ id: userId }) :
      [user];

    if (!userToSync || userToSync.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userProfile = userToSync[0];

    // Preparar datos para sincronizar
    const syncData = {
      email: userProfile.email,
      full_name: userProfile.full_name,
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      phone: userProfile.phone,
      position: userProfile.position,
      department: userProfile.department,
      profile_photo_url: userProfile.profile_photo_url,
      avatar_image_url: userProfile.avatar_image_url,
      preferred_profile_image: userProfile.preferred_profile_image,
      profile_last_updated: new Date().toISOString(),
    };

    // Sincronizar con MCI Web
    const syncResponse = await fetch(`${MCI_WEB_URL}/api/user/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCI_WEB_TOKEN}`,
      },
      body: JSON.stringify(syncData),
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      if (import.meta.env?.DEV) {
        console.error('Failed to sync with MCI Web:', errorText);
      }
      return Response.json({ 
        success: false, 
        error: 'Failed to sync with MCI Web',
        details: errorText 
      }, { status: 500 });
    }

    const result = await syncResponse.json();

    return Response.json({ 
      success: true, 
      message: 'Profile synced successfully with MCI Web',
      data: result 
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error syncing user profile:', error);
    }
    return Response.json({ 
      error: 'Profile sync failed',
      success: false 
    }, { status: 500 });
  }
});