/**
 * UNIFIED EMPLOYEE EVENT TRACKER
 * 
 * Handles lifecycle events for:
 * - Recognitions (now embedded in User)
 * - Goals (progress tracking)
 * - Certifications (expiry monitoring)
 */

import { base44 } from '@/api/base44Client';

/**
 * Give recognition to an employee (embedded in User)
 */
export async function giveRecognition(toEmail, recognition, fromUser) {
  // Get target user
  const users = await base44.entities.User.filter({ email: toEmail });
  if (users.length === 0) throw new Error('User not found');
  
  const targetUser = users[0];
  const currentRecognitions = targetUser.recognitions || [];
  
  const newRecognition = {
    id: Date.now().toString(),
    type: recognition.type || 'kudos',
    title: recognition.title,
    message: recognition.message,
    from_email: fromUser.email,
    from_name: fromUser.full_name,
    created_at: new Date().toISOString(),
    likes: 0
  };
  
  // Update user with new recognition
  await base44.entities.User.update(targetUser.id, {
    recognitions: [...currentRecognitions, newRecognition],
    total_recognitions_count: (targetUser.total_recognitions_count || 0) + 1
  });
  
  return newRecognition;
}

/**
 * Get all recognitions for leaderboard/feed
 */
export async function getAllRecognitions(limit = 50) {
  const users = await base44.entities.User.list();
  
  const allRecognitions = [];
  for (const user of users) {
    if (user.recognitions?.length > 0) {
      for (const rec of user.recognitions) {
        allRecognitions.push({
          ...rec,
          to_email: user.email,
          to_name: user.full_name,
          to_profile_photo: user.profile_photo_url || user.avatar_image_url
        });
      }
    }
  }
  
  // Sort by date descending
  allRecognitions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return allRecognitions.slice(0, limit);
}

/**
 * Get recognition stats for an employee
 */
export function getRecognitionStats(user) {
  const recognitions = user.recognitions || [];
  
  return {
    total: recognitions.length,
    kudos: recognitions.filter(r => r.type === 'kudos').length,
    achievements: recognitions.filter(r => r.type === 'achievement').length,
    milestones: recognitions.filter(r => r.type === 'milestone').length,
    awards: recognitions.filter(r => r.type === 'award').length,
    totalLikes: recognitions.reduce((sum, r) => sum + (r.likes || 0), 0),
    recent: recognitions.slice(-5).reverse()
  };
}

/**
 * Monitor goal progress and send notifications
 */
export async function checkGoalDeadlines(userEmail) {
  const goals = await base44.entities.Goal.filter({ 
    owner_email: userEmail,
    status: 'active'
  });
  
  const today = new Date();
  const alerts = [];
  
  for (const goal of goals) {
    if (!goal.target_date) continue;
    
    const targetDate = new Date(goal.target_date);
    const daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    const progressPercent = goal.target_value > 0 
      ? (goal.current_value / goal.target_value) * 100 
      : 0;
    
    if (daysRemaining <= 0 && progressPercent < 100) {
      alerts.push({ type: 'overdue', goal, daysRemaining });
    } else if (daysRemaining <= 7 && progressPercent < 75) {
      alerts.push({ type: 'at_risk', goal, daysRemaining, progressPercent });
    } else if (daysRemaining <= 3) {
      alerts.push({ type: 'deadline_soon', goal, daysRemaining });
    }
  }
  
  return alerts;
}

/**
 * Check certification expirations
 */
export async function checkCertificationExpirations(userEmail, daysAhead = 30) {
  const certifications = await base44.entities.Certification.filter({
    employee_email: userEmail,
    status: 'active'
  });
  
  const today = new Date();
  const alerts = [];
  
  for (const cert of certifications) {
    if (!cert.expiry_date) continue;
    
    const expiryDate = new Date(cert.expiry_date);
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      alerts.push({ type: 'expired', certification: cert, daysRemaining });
    } else if (daysRemaining <= daysAhead) {
      alerts.push({ type: 'expiring_soon', certification: cert, daysRemaining });
    }
  }
  
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Unified employee event check
 */
export async function checkAllEmployeeEvents(userEmail) {
  const [goalAlerts, certAlerts] = await Promise.all([
    checkGoalDeadlines(userEmail),
    checkCertificationExpirations(userEmail)
  ]);
  
  return {
    goals: goalAlerts,
    certifications: certAlerts,
    totalAlerts: goalAlerts.length + certAlerts.length,
    hasUrgent: goalAlerts.some(a => a.type === 'overdue') || certAlerts.some(a => a.type === 'expired')
  };
}