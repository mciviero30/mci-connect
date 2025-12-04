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
};