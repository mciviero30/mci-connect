import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Esta función debe ser desplegada en MCI Web (mci-us.com)
 * Recibe actualizaciones de perfil desde MCI Connect
 */
Deno.serve(async (req) => {
  try {
    // Verificar autenticación con token
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('CROSS_APP_TOKEN');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== expectedToken) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
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
      profile_last_updated,
      source
    } = payload;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`📥 Receiving profile update from ${source} for ${email}`);

    // Crear cliente con privilegios de servicio
    const base44 = createClientFromRequest(req);

    // Buscar usuario por email
    const users = await base44.asServiceRole.entities.User.filter({ email });

    if (users.length === 0) {
      console.log(`⚠️ User not found: ${email}, creating new user record`);
      
      // Crear nuevo registro de usuario
      await base44.asServiceRole.entities.User.create({
        email,
        full_name,
        profile_photo_url,
        avatar_image_url,
        preferred_profile_image,
        phone,
        position,
        department,
        profile_last_updated,
        role: 'user',
        employment_status: 'active'
      });

      console.log(`✅ User created: ${email}`);
      return Response.json({ 
        success: true,
        message: 'User created',
        action: 'created'
      });
    }

    // Actualizar usuario existente
    const user = users[0];
    await base44.asServiceRole.entities.User.update(user.id, {
      full_name,
      profile_photo_url,
      avatar_image_url,
      preferred_profile_image,
      phone,
      position,
      department,
      profile_last_updated
    });

    console.log(`✅ User updated: ${email}`);

    return Response.json({ 
      success: true,
      message: 'Profile updated',
      action: 'updated'
    });

  } catch (error) {
    console.error('❌ Error in receiveMCIConnectProfile:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});