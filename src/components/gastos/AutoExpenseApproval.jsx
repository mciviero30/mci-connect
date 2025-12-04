/**
 * AUTO-APPROVAL ENGINE FOR EXPENSES
 * 
 * Automatically approves expenses that meet certain criteria,
 * reducing admin workload for routine approvals.
 */

// Default auto-approval rules
const DEFAULT_RULES = {
  maxAutoApproveAmount: 50, // Auto-approve expenses under $50
  trustedCategories: ['per_diem', 'transport'], // Categories that can be auto-approved
  requireReceipt: true, // Must have receipt for auto-approval
  requireAIValidation: true, // AI must confirm category
  minAIConfidence: 80, // Minimum AI confidence for auto-approval
};

/**
 * Check if an expense qualifies for auto-approval
 */
export function checkAutoApproval(expense, rules = DEFAULT_RULES) {
  const reasons = [];
  let canAutoApprove = true;

  // Amount check
  if (expense.amount > rules.maxAutoApproveAmount) {
    canAutoApprove = false;
    reasons.push(`Amount $${expense.amount} exceeds limit $${rules.maxAutoApproveAmount}`);
  }

  // Category check
  if (!rules.trustedCategories.includes(expense.category)) {
    canAutoApprove = false;
    reasons.push(`Category '${expense.category}' requires manual review`);
  }

  // Receipt check
  if (rules.requireReceipt && !expense.receipt_url) {
    canAutoApprove = false;
    reasons.push('Missing receipt');
  }

  // AI validation check
  if (rules.requireAIValidation) {
    if (!expense.ai_analyzed) {
      canAutoApprove = false;
      reasons.push('Not analyzed by AI');
    } else if (expense.ai_confidence < rules.minAIConfidence) {
      canAutoApprove = false;
      reasons.push(`AI confidence ${expense.ai_confidence}% below threshold ${rules.minAIConfidence}%`);
    } else if (expense.ai_suggested_category !== expense.category) {
      canAutoApprove = false;
      reasons.push('Category differs from AI suggestion');
    }
  }

  return {
    canAutoApprove,
    reasons,
    score: calculateApprovalScore(expense, rules)
  };
}

/**
 * Calculate approval priority score (0-100)
 * Higher score = more urgent review needed
 */
function calculateApprovalScore(expense, rules) {
  let score = 50; // Base score

  // Amount factor
  if (expense.amount > 200) score += 20;
  else if (expense.amount > 100) score += 10;
  else if (expense.amount < 25) score -= 10;

  // Category risk factor
  const highRiskCategories = ['equipment', 'client_entertainment', 'other'];
  if (highRiskCategories.includes(expense.category)) score += 15;

  // AI confidence factor
  if (expense.ai_analyzed) {
    if (expense.ai_confidence < 50) score += 25;
    else if (expense.ai_confidence > 90) score -= 15;
  } else {
    score += 10;
  }

  // User correction factor
  if (expense.user_corrected_ai) score += 10;

  // Receipt factor
  if (!expense.receipt_url) score += 20;

  return Math.max(0, Math.min(100, score));
}

/**
 * Process expense with AI categorization and auto-approval in one step
 */
export async function processExpenseWithAI(expense, invokeAI, rules = DEFAULT_RULES) {
  // Skip if already processed
  if (expense.ai_analyzed) {
    return { expense, autoApproved: false, result: checkAutoApproval(expense, rules) };
  }

  try {
    // Call AI for categorization (if receipt exists)
    if (expense.receipt_url) {
      const aiResult = await invokeAI({
        prompt: `Analyze this expense receipt. Current description: "${expense.description || 'N/A'}". Amount: $${expense.amount}. Determine the best category.`,
        file_urls: [expense.receipt_url],
        response_json_schema: {
          type: 'object',
          properties: {
            suggested_category: {
              type: 'string',
              enum: ['travel', 'meals', 'transport', 'supplies', 'client_entertainment', 'equipment', 'per_diem', 'other']
            },
            confidence: { type: 'number' },
            description_suggestion: { type: 'string' },
            flags: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      expense.ai_suggested_category = aiResult.suggested_category;
      expense.ai_confidence = aiResult.confidence;
      expense.ai_analyzed = true;

      // Auto-set category if high confidence and user hasn't set one
      if (aiResult.confidence >= 90 && !expense.category) {
        expense.category = aiResult.suggested_category;
      }
    }

    // Check auto-approval
    const result = checkAutoApproval(expense, rules);
    
    if (result.canAutoApprove) {
      expense.status = 'approved';
      expense.notes = (expense.notes || '') + '\n[Auto-approved]';
    }

    return {
      expense,
      autoApproved: result.canAutoApprove,
      result
    };
  } catch (error) {
    console.error('AI processing failed:', error);
    return {
      expense,
      autoApproved: false,
      result: { canAutoApprove: false, reasons: ['AI processing failed'], score: 70 }
    };
  }
}

/**
 * Batch process expenses for efficiency
 */
export async function batchProcessExpenses(expenses, invokeAI, rules = DEFAULT_RULES) {
  const results = [];
  
  // Process in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < expenses.length; i += batchSize) {
    const batch = expenses.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(exp => processExpenseWithAI(exp, invokeAI, rules))
    );
    results.push(...batchResults);
  }

  return {
    results,
    summary: {
      total: results.length,
      autoApproved: results.filter(r => r.autoApproved).length,
      needsReview: results.filter(r => !r.autoApproved).length,
      highPriority: results.filter(r => r.result.score >= 70).length
    }
  };
}