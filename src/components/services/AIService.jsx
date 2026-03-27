/**
 * UNIFIED AI SERVICE
 * 
 * Consolidates all LLM calls through a single interface.
 * Makes it trivial to switch LLM providers in the future.
 */

import { base44 } from '@/api/base44Client';

// Configuration
const AI_CONFIG = {
  defaultTimeout: 30000,
  maxRetries: 2,
  retryDelay: 1000,
};

/**
 * Core LLM invocation with retry logic
 */
async function invokeLLM(options, retryCount = 0) {
  const {
    prompt,
    jsonSchema = null,
    useInternet = false,
    fileUrls = null,
    timeout = AI_CONFIG.defaultTimeout,
  } = options;

  try {
    const result = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: jsonSchema,
        add_context_from_internet: useInternet,
        file_urls: fileUrls,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), timeout)
      )
    ]);
    
    return result;
  } catch (error) {
    if (retryCount < AI_CONFIG.maxRetries) {
      await new Promise(r => setTimeout(r, AI_CONFIG.retryDelay * (retryCount + 1)));
      return invokeLLM(options, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Extract data from uploaded file
 */
export async function extractFromFile(fileUrl, jsonSchema) {
  try {
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: jsonSchema,
    });
    
    if (result.status === 'error') {
      throw new Error(result.details || 'Extraction failed');
    }
    
    return result.output;
  } catch (error) {
    console.error('File extraction error:', error);
    throw error;
  }
}

/**
 * Generate text response
 */
export async function generateText(prompt, options = {}) {
  return invokeLLM({ prompt, ...options });
}

/**
 * Generate structured JSON response
 */
export async function generateJSON(prompt, schema, options = {}) {
  const result = await invokeLLM({
    prompt,
    jsonSchema: schema,
    ...options,
  });
  
  return typeof result === 'string' ? JSON.parse(result) : result;
}

/**
 * Analyze expense receipt
 */
export async function analyzeExpenseReceipt(fileUrl) {
  const schema = {
    type: 'object',
    properties: {
      vendor_name: { type: 'string' },
      amount: { type: 'number' },
      date: { type: 'string' },
      category: { 
        type: 'string',
        enum: ['travel', 'meals', 'transport', 'supplies', 'equipment', 'other']
      },
      description: { type: 'string' },
      confidence: { type: 'number' },
    },
  };

  return extractFromFile(fileUrl, schema);
}

/**
 * Categorize expense
 */
export async function categorizeExpense(description, amount) {
  const schema = {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['travel', 'meals', 'transport', 'supplies', 'client_entertainment', 'equipment', 'per_diem', 'other']
      },
      account_category: {
        type: 'string',
        enum: ['expense_labor_cost', 'expense_travel_per_diem', 'expense_materials', 'expense_equipment', 'expense_other']
      },
      confidence: { type: 'number' },
      reasoning: { type: 'string' },
    },
  };

  return generateJSON(
    `Categorize this expense: "${description}" for $${amount}. 
     Analyze the description and amount to determine the most appropriate category.
     Return confidence as a number between 0 and 100.`,
    schema
  );
}

/**
 * Generate job description/scope
 */
export async function generateJobScope(jobDetails) {
  return generateText(
    `Generate a professional job scope document for the following project:
     Name: ${jobDetails.name}
     Address: ${jobDetails.address}
     Description: ${jobDetails.description}
     
     Include sections for: Scope of Work, Materials, Timeline, and Terms.`,
    { useInternet: false }
  );
}

/**
 * Analyze employee performance
 */
export async function analyzePerformance(employeeData) {
  const schema = {
    type: 'object',
    properties: {
      overall_score: { type: 'number' },
      strengths: { type: 'array', items: { type: 'string' } },
      areas_for_improvement: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
  };

  return generateJSON(
    `Analyze employee performance based on this data:
     ${JSON.stringify(employeeData, null, 2)}
     
     Provide an overall score (0-100), identify strengths and areas for improvement,
     and give actionable recommendations.`,
    schema
  );
}

/**
 * Generate invoice from job data
 */
export async function generateInvoiceItems(jobData) {
  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            unit_price: { type: 'number' },
          },
        },
      },
      notes: { type: 'string' },
      terms: { type: 'string' },
    },
  };

  return generateJSON(
    `Generate invoice line items for this job:
     ${JSON.stringify(jobData, null, 2)}
     
     Create appropriate line items with quantities, units, and realistic pricing.`,
    schema
  );
}

/**
 * Analyze blueprint/plan image
 */
export async function analyzeBlueprintImage(fileUrl) {
  const schema = {
    type: 'object',
    properties: {
      detected_elements: { 
        type: 'array', 
        items: { type: 'string' } 
      },
      suggested_tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string' },
            estimated_hours: { type: 'number' },
          },
        },
      },
      notes: { type: 'string' },
    },
  };

  return generateJSON(
    `Analyze this construction blueprint image and identify:
     1. Key structural elements
     2. Suggested tasks for installation/construction
     3. Any notable observations
     
     Focus on practical, actionable tasks.`,
    schema,
    { fileUrls: [fileUrl] }
  );
}

/**
 * Chat/assistant response
 */
export async function generateAssistantResponse(message, context = {}) {
  const contextStr = Object.entries(context)
    .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
    .join('\n');

  return generateText(
    `You are an AI assistant for MCI Connect, a construction management platform.
     
     Context:
     ${contextStr}
     
     User message: ${message}
     
     Provide a helpful, concise response. If asked about data, use the context provided.
     Be professional but friendly.`,
    { useInternet: false }
  );
}

/**
 * Budget forecasting
 */
export async function forecastBudget(historicalData, months = 3) {
  const schema = {
    type: 'object',
    properties: {
      forecasts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            projected_income: { type: 'number' },
            projected_expenses: { type: 'number' },
            projected_profit: { type: 'number' },
            confidence: { type: 'number' },
          },
        },
      },
      insights: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
    },
  };

  return generateJSON(
    `Based on this historical financial data, forecast the next ${months} months:
     ${JSON.stringify(historicalData, null, 2)}
     
     Consider seasonality, trends, and any anomalies in the data.`,
    schema
  );
}

/**
 * Draft quote from free text - Step 1: Extract items
 */
export async function extractQuoteItems(clientText) {
  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      customer_name: { type: 'string' },
      job_name: { type: 'string' },
      job_address: { type: 'string' },
      notes: { type: 'string' },
    },
  };

  return generateJSON(
    `Extract quote line items from this client request. Focus on identifying:
     - Each distinct item/service with quantity and unit of measure
     - Customer name if mentioned
     - Job/project name if mentioned
     - Job address if mentioned
     
     DO NOT include prices - only extract descriptions, quantities, and units.
     Common units: hour, sqft, lnft, unit, each, day, lot, gallon, pound
     
     Client request:
     "${clientText}"`,
    schema
  );
}

/**
 * Match extracted items against catalog using semantic similarity
 */
async function matchItemToCatalog(itemDescription, catalog) {
  // First try exact match (case insensitive)
  const exactMatch = catalog.find(
    c => c.name.toLowerCase() === itemDescription.toLowerCase()
  );
  if (exactMatch) {
    return { match: exactMatch, confidence: 100, matchType: 'exact' };
  }
  
  // Try partial match
  const partialMatch = catalog.find(
    c => itemDescription.toLowerCase().includes(c.name.toLowerCase()) ||
         c.name.toLowerCase().includes(itemDescription.toLowerCase())
  );
  if (partialMatch) {
    return { match: partialMatch, confidence: 85, matchType: 'partial' };
  }
  
  // Use LLM for semantic matching
  if (catalog.length > 0) {
    const catalogList = catalog.map(c => `- "${c.name}" (${c.category}, $${c.unit_price}/${c.uom})`).join('\n');
    
    const schema = {
      type: 'object',
      properties: {
        matched_item_name: { type: 'string' },
        confidence: { type: 'number' },
        reasoning: { type: 'string' },
      },
    };
    
    try {
      const result = await generateJSON(
        `Find the best matching catalog item for: "${itemDescription}"
         
         Available catalog items:
         ${catalogList}
         
         If no good match exists, set matched_item_name to empty string and confidence to 0.
         Confidence should be 0-100 based on how well it matches.`,
        schema
      );
      
      if (result.matched_item_name && result.confidence > 60) {
        const match = catalog.find(c => c.name === result.matched_item_name);
        if (match) {
          return { match, confidence: result.confidence, matchType: 'semantic' };
        }
      }
    } catch (e) { /* intentionally silenced */ }

  }
  
  return { match: null, confidence: 0, matchType: 'none' };
}

/**
 * Draft quote from free text with catalog validation
 */
export async function draftQuoteFromText(clientText, catalogItems = []) {
  // Step 1: Extract items from text using LLM
  const extracted = await extractQuoteItems(clientText);
  
  // Step 2: Validate each item against catalog
  const validatedItems = await Promise.all(
    (extracted.items || []).map(async (item) => {
      const catalogMatch = await matchItemToCatalog(item.description, catalogItems);
      
      if (catalogMatch.match) {
        return {
          description: item.description,
          quantity: item.quantity || 1,
          unit: catalogMatch.match.uom || item.unit || 'unit',
          unit_price: catalogMatch.match.unit_price,
          total: (item.quantity || 1) * catalogMatch.match.unit_price,
          validated: true,
          catalog_item_id: catalogMatch.match.id,
          catalog_item_name: catalogMatch.match.name,
          match_confidence: catalogMatch.confidence,
          match_type: catalogMatch.matchType,
        };
      } else {
        return {
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          unit_price: 0,
          total: 0,
          validated: false,
          catalog_item_id: null,
          catalog_item_name: null,
          match_confidence: 0,
          match_type: 'none',
          notes: item.notes,
        };
      }
    })
  );
  
  // Calculate totals
  const subtotal = validatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const validatedCount = validatedItems.filter(i => i.validated).length;
  const needsReviewCount = validatedItems.filter(i => !i.validated).length;
  
  return {
    items: validatedItems,
    customer_name: extracted.customer_name || '',
    job_name: extracted.job_name || '',
    job_address: extracted.job_address || '',
    notes: extracted.notes || '',
    subtotal,
    validation_summary: {
      total_items: validatedItems.length,
      validated_count: validatedCount,
      needs_review_count: needsReviewCount,
      validation_percentage: validatedItems.length > 0 
        ? Math.round((validatedCount / validatedItems.length) * 100) 
        : 0,
    },
  };
}

/**
 * Suggest optimal assignee for a WorkUnit
 * Now includes Skill Matrix integration for granular skill matching
 */
export async function suggestOptimalAssignee(workUnitId) {
  const { base44 } = await import('@/api/base44Client');
  
  // Fetch WorkUnit details
  const workUnits = await base44.entities.WorkUnit.filter({ id: workUnitId });
  const workUnit = workUnits[0];
  if (!workUnit) throw new Error('WorkUnit not found');
  
  // Fetch job for location
  let jobAddress = '';
  let jobCoords = null;
  if (workUnit.job_id) {
    const jobs = await base44.entities.Job.filter({ id: workUnit.job_id });
    if (jobs[0]) {
      jobAddress = jobs[0].address || '';
      if (jobs[0].latitude && jobs[0].longitude) {
        jobCoords = { lat: jobs[0].latitude, lng: jobs[0].longitude };
      }
    }
  }
  
  // Fetch all active employees
  const employees = await base44.entities.User.filter({ employment_status: 'active' });
  
  // Fetch all pending/in-progress WorkUnits for workload calculation
  const allWorkUnits = await base44.entities.WorkUnit.filter({});
  const activeWorkUnits = allWorkUnits.filter(wu => 
    wu.status === 'pending' || wu.status === 'in_progress'
  );
  
  // Fetch certifications
  const certifications = await base44.entities.Certification.filter({ status: 'active' });
  
  // Fetch employee skills from Skill Matrix
  let employeeSkills = [];
  try {
    employeeSkills = await base44.entities.EmployeeSkill.list('-created_date', 300);
  } catch (e) { /* intentionally silenced */ }

  
  // Build employee context with skills
  const employeeContext = employees.map(emp => {
    const empCerts = certifications
      .filter(c => c.employee_email === emp.email)
      .map(c => c.name || c.certification_type);
    
    const workload = activeWorkUnits.filter(wu => wu.assignee_email === emp.email).length;
    
    // Get employee skills with proficiency levels
    const skills = employeeSkills
      .filter(s => s.employee_email === emp.email)
      .map(s => ({
        name: s.skill_name,
        level: s.validated_level || s.proficiency_level,
        validated: s.validated,
        category: s.category,
        years: s.years_experience,
      }));
    
    // Format skills for prompt
    const skillsStr = skills.length > 0
      ? skills.map(s => `${s.name} (${s.level}${s.validated ? ', validated' : ''})`).join(', ')
      : 'No skills listed';
    
    return {
      user_id: emp.id,
      email: emp.email,
      name: emp.full_name,
      location: emp.last_known_location || emp.address || 'Unknown',
      certifications: empCerts,
      skills: skillsStr,
      skill_categories: [...new Set(skills.map(s => s.category))],
      workload_count: workload,
    };
  });
  
  // Build prompt
  const schema = {
    type: 'object',
    properties: {
      work_unit_id: { type: 'string' },
      ranked_list: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            user_name: { type: 'string' },
            rank: { type: 'integer' },
            rationale: { type: 'string' },
            score: { type: 'number' },
            skill_match: { type: 'string' },
          },
        },
      },
    },
  };
  
  const result = await generateJSON(
    `You are an assignment optimization AI. Rank the TOP 3 best employees for this task.

TASK DETAILS:
- Title: ${workUnit.title}
- Category: ${workUnit.category || 'general'}
- Priority: ${workUnit.priority || 'medium'}
- Job Address: ${jobAddress || 'Not specified'}
- Required Skills/Category: ${workUnit.category}
- Task Tags: ${(workUnit.tags || []).join(', ') || 'None'}

RANKING CRITERIA (in order of importance):
1. SKILLS: Match employee skills to task category/requirements. Prefer validated skills and higher proficiency levels (expert > advanced > intermediate > beginner)
2. CERTIFICATIONS: Match employee certifications to task category
3. WORKLOAD: Prefer employees with lower current workload
4. PROXIMITY: Employees closer to the job address are preferred

AVAILABLE EMPLOYEES:
${employeeContext.map(e => `- ID: ${e.user_id}, Name: ${e.name}, Location: ${e.location}
  Skills: ${e.skills}
  Certifications: [${e.certifications.join(', ')}]
  Current Tasks: ${e.workload_count}`).join('\n\n')}

Return exactly 3 ranked employees with clear rationale for each.
Include which specific skills matched in the skill_match field.
Set work_unit_id to: ${workUnitId}`,
    schema
  );
  
  return {
    work_unit_id: workUnitId,
    work_unit_title: workUnit.title,
    job_address: jobAddress,
    ranked_list: result.ranked_list || [],
  };
}

// Export all functions
export default {
  generateText,
  generateJSON,
  extractFromFile,
  analyzeExpenseReceipt,
  categorizeExpense,
  generateJobScope,
  analyzePerformance,
  generateInvoiceItems,
  analyzeBlueprintImage,
  generateAssistantResponse,
  forecastBudget,
  extractQuoteItems,
  draftQuoteFromText,
  suggestOptimalAssignee,
};