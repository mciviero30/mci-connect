import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// Always use the correct Base44 backend for this app
const serverUrl = appParams.serverUrl || "https://gestion-pro-3d0561d3.base44.app";

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});
