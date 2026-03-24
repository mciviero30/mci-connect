import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REUSABLE PERMISSION GATE
 * 
 * Enforces multi-layered access control:
 * 1. Role-based authorization
 * 2. User ownership scoping
 * 3. Job-level scoping
 * 4. Supervisor scoping
 * 5. Tenant-ready scoping
 */

export async function checkPermission(base44, user, entity, operation) {
  if (!user) {
    throw new Error('Unauthorized: No authenticated user');
  }

  // Admin bypass
  if (user.role === 'admin') {
    return true;
  }

  // Operation: 'read', 'write', 'delete'
  // Entity: { type: 'Quote'|'Invoice'|'Commission'|etc, id: uuid, created_by_user_id: uuid, job_id: uuid }

  const entityType = entity.type;
  const entityId = entity.id;
  const creatorId = entity.created_by_user_id;
  const jobId = entity.job_id;

  // OWNERSHIP CHECK: User created this entity
  if (operation === 'write' && creatorId === user.id) {
    return true;
  }

  // SUPERVISOR CHECK: User is supervisor of creator
  if (operation === 'write' || operation === 'read') {
    const creator = await base44.entities.User.filter({ id: creatorId });
    if (creator.length > 0) {
      const creatorData = creator[0];
      // If current user is supervisor of creator, grant access
      if (creatorData.supervisor_user_id === user.id) {
        return true;
      }
    }
  }

  // JOB-LEVEL CHECK: User assigned to this job
  if (jobId) {
    const jobAssignments = await base44.entities.JobAssignment.filter({
      user_id: user.id,
      job_id: jobId
    });
    if (jobAssignments.length > 0) {
      return true;
    }
  }

  // TEAM CHECK: User in same team
  if (entity.team_id) {
    const team = await base44.entities.Team.filter({ id: entity.team_id });
    if (team.length > 0) {
      const teamData = team[0];
      if (teamData.member_ids && teamData.member_ids.includes(user.id)) {
        return true;
      }
    }
  }

  // DEFAULT: DENY ACCESS
  console.error('Permission denied', {
    user_id: user.id,
    entity_type: entityType,
    entity_id: entityId,
    operation: operation
  });

  return false;
}

/**
 * Throw 403 if permission check fails
 */
export async function requirePermission(base44, user, entity, operation) {
  const allowed = await checkPermission(base44, user, entity, operation);
  if (!allowed) {
    throw new Error(`403|Forbidden: You do not have permission to ${operation} this ${entity.type}`);
  }
}