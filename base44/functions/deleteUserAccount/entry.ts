/**
 * deleteUserAccount
 * Securely removes a user's personal data and marks their account for deletion.
 * Steps:
 *  1. Authenticate caller
 *  2. Verify confirmation phrase
 *  3. Soft-delete: mark employment_status = 'deleted', store deletion timestamp
 *  4. Anonymize PII fields (name, phone, address, profile photos)
 *  5. Log audit event
 *  6. Return success — client logs out immediately after
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Auth
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    if (!confirmation || confirmation.trim().toUpperCase() !== CONFIRM_PHRASE) {
      return Response.json({ error: 'Confirmation phrase does not match.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 3. Soft-delete + anonymize PII on the User record
    await base44.auth.updateMe({
      employment_status: 'deleted',
      deletion_requested: true,
      deletion_requested_at: now,
      deletion_confirmed_at: now,
      // Anonymize PII
      full_name: `Deleted User ${user.id.slice(0, 6)}`,
      phone: null,
      address: null,
      profile_photo_url: null,
      avatar_image_url: null,
      date_of_birth: null,
    });

    // 4. Log audit event (fire-and-forget — don't block response)
    base44.asServiceRole.entities.AuditLog.create({
      action: 'account_deletion_confirmed',
      entity_type: 'User',
      entity_id: user.id,
      performed_by: user.email,
      timestamp: now,
      details: 'User confirmed account deletion via DELETE MY ACCOUNT phrase',
    }).catch(() => {});

    // 5. Respond with success
    return Response.json({
      success: true,
      message: 'Account deletion request confirmed. Your account has been deactivated.',
    });

  } catch (error) {
    console.error('[deleteUserAccount] Error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});