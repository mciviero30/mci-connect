/**
 * Cross-App Communication Client
 * Secure communication between MCI Connect and other Base44 apps
 */

const BASE44_API_URL = 'https://api.base44.com/v1';

export class CrossAppClient {
  constructor(appId, serviceRoleKey) {
    if (!appId || !serviceRoleKey) {
      throw new Error('App ID and Service Role Key are required');
    }
    this.appId = appId;
    this.serviceRoleKey = serviceRoleKey;
  }

  /**
   * Make authenticated request to external app
   */
  async request(endpoint, method = 'GET', data = null) {
    const url = `${BASE44_API_URL}/apps/${this.appId}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceRoleKey}`,
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cross-app request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Entity operations
  async listEntities(entityName, limit = 50) {
    return this.request(`/entities/${entityName}?limit=${limit}`);
  }

  async getEntity(entityName, entityId) {
    return this.request(`/entities/${entityName}/${entityId}`);
  }

  async createEntity(entityName, data) {
    return this.request(`/entities/${entityName}`, 'POST', data);
  }

  async updateEntity(entityName, entityId, data) {
    return this.request(`/entities/${entityName}/${entityId}`, 'PATCH', data);
  }

  async deleteEntity(entityName, entityId) {
    return this.request(`/entities/${entityName}/${entityId}`, 'DELETE');
  }

  async filterEntities(entityName, filter) {
    return this.request(`/entities/${entityName}/filter`, 'POST', filter);
  }

  // Integration-specific functions
  async executeIntegration(integrationPackage, integrationName, params) {
    return this.request(
      `/integrations/${integrationPackage}/${integrationName}`,
      'POST',
      params
    );
  }
}

// Singleton instances for configured external apps
let externalApp1Client = null;
let externalApp2Client = null;

/**
 * Initialize external app clients with secrets
 */
export function initializeCrossAppClients(secrets) {
  if (secrets.EXTERNAL_APP_1_ID && secrets.EXTERNAL_APP_1_SERVICE_KEY) {
    externalApp1Client = new CrossAppClient(
      secrets.EXTERNAL_APP_1_ID,
      secrets.EXTERNAL_APP_1_SERVICE_KEY
    );
  }

  if (secrets.EXTERNAL_APP_2_ID && secrets.EXTERNAL_APP_2_SERVICE_KEY) {
    externalApp2Client = new CrossAppClient(
      secrets.EXTERNAL_APP_2_ID,
      secrets.EXTERNAL_APP_2_SERVICE_KEY
    );
  }

  return {
    app1: externalApp1Client,
    app2: externalApp2Client,
  };
}

/**
 * Get configured external app client
 */
export function getExternalAppClient(appNumber = 1) {
  if (appNumber === 1) return externalApp1Client;
  if (appNumber === 2) return externalApp2Client;
  throw new Error(`External app ${appNumber} not configured`);
}

export default CrossAppClient;