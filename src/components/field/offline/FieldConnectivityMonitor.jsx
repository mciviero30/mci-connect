/**
 * Field Connectivity Monitor
 * 
 * Monitors network state and triggers sync
 */

import { startSync } from './FieldSyncEngine';

let isOnline = navigator.onLine;
let listeners = [];
let syncInProgress = false;

/**
 * Initialize connectivity monitoring
 */
export function initConnectivityMonitor(base44Client, user) {
  // Listen to online/offline events
  window.addEventListener('online', () => handleOnline(base44Client, user));
  window.addEventListener('offline', handleOffline);
  
  // Poll connectivity every 30 seconds
  setInterval(() => checkConnectivity(base44Client, user), 30000);
  
  console.log('Connectivity monitor initialized');
}

/**
 * Handle online event
 */
async function handleOnline(base44Client, user) {
  if (isOnline) return;
  
  console.log('Network connection restored');
  isOnline = true;
  notifyListeners(true);
  
  // Trigger sync after 2 second delay (let connection stabilize)
  setTimeout(() => {
    triggerAutoSync(base44Client, user);
  }, 2000);
}

/**
 * Handle offline event
 */
function handleOffline() {
  if (!isOnline) return;
  
  console.log('Network connection lost');
  isOnline = false;
  notifyListeners(false);
}

/**
 * Check connectivity
 */
async function checkConnectivity(base44Client, user) {
  const wasOnline = isOnline;
  
  try {
    // Ping server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(window.location.origin + '/ping', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    isOnline = response.ok;
  } catch (error) {
    isOnline = false;
  }
  
  // State changed
  if (wasOnline !== isOnline) {
    console.log(`Connectivity changed: ${isOnline ? 'online' : 'offline'}`);
    notifyListeners(isOnline);
    
    if (isOnline) {
      triggerAutoSync(base44Client, user);
    }
  }
}

/**
 * Trigger automatic sync
 */
async function triggerAutoSync(base44Client, user) {
  if (syncInProgress) {
    console.log('Sync already in progress');
    return;
  }
  
  syncInProgress = true;
  
  try {
    console.log('Auto-sync triggered');
    const result = await startSync(base44Client, user);
    console.log('Auto-sync completed:', result);
  } catch (error) {
    console.error('Auto-sync failed:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Get online status
 */
export function getOnlineStatus() {
  return isOnline;
}

/**
 * Subscribe to connectivity changes
 */
export function subscribeToConnectivity(listener) {
  listeners.push(listener);
  
  // Immediately notify of current state
  listener(isOnline);
  
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

/**
 * Notify listeners
 */
function notifyListeners(online) {
  listeners.forEach(listener => {
    try {
      listener(online);
    } catch (error) {
      console.error('Connectivity listener error:', error);
    }
  });
}

/**
 * Force sync check
 */
export function forceSyncCheck(base44Client, user) {
  if (isOnline) {
    triggerAutoSync(base44Client, user);
  } else {
    console.log('Cannot sync: offline');
  }
}