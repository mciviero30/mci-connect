/**
 * Field Cleanup Service
 * CRITICAL: User isolation on shared devices (FASE 2A.2 - B1)
 * 
 * Guarantees:
 * - User A's Field data NEVER visible to User B
 * - Complete wipe on logout
 * - Safe for shared tablets/iPads in the field
 */

import { FieldSessionManager } from './FieldSessionManager';

/**
 * Clear all Field-related localStorage keys
 */
function clearFieldLocalStorage() {
  try {
    const keys = Object.keys(localStorage);
    const fieldKeys = keys.filter(key => key.startsWith('field_'));
    
    fieldKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (import.meta.env?.DEV && fieldKeys.length > 0) {
      console.log(`[FieldCleanup] 🗑️ Cleared ${fieldKeys.length} localStorage keys`);
    }
  } catch (error) {
    console.error('[FieldCleanup] Failed to clear localStorage:', error);
  }
}

/**
 * Clear all Field-related sessionStorage keys
 */
function clearFieldSessionStorage() {
  try {
    const keys = Object.keys(sessionStorage);
    const fieldKeys = keys.filter(key => key.startsWith('field_') || key.startsWith('emergency_draft_'));
    
    fieldKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    if (import.meta.env?.DEV && fieldKeys.length > 0) {
      console.log(`[FieldCleanup] 🗑️ Cleared ${fieldKeys.length} sessionStorage keys`);
    }
  } catch (error) {
    console.error('[FieldCleanup] Failed to clear sessionStorage:', error);
  }
}

/**
 * Clear all Field IndexedDB databases
 */
async function clearFieldIndexedDB() {
  const fieldDatabases = [
    'mci_field_queue',
    'mci_field_offline',
    'mci_field_state',
    'mci_field_conflicts'
  ];
  
  try {
    for (const dbName of fieldDatabases) {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onsuccess = () => {
          if (import.meta.env?.DEV) {
            console.log(`[FieldCleanup] 🗑️ Deleted IndexedDB: ${dbName}`);
          }
          resolve();
        };
        
        request.onerror = () => {
          console.error(`[FieldCleanup] Failed to delete IndexedDB ${dbName}:`, request.error);
          resolve(); // Don't block on errors
        };
        
        request.onblocked = () => {
          console.warn(`[FieldCleanup] IndexedDB ${dbName} deletion blocked (active connections)`);
          resolve(); // Don't block on errors
        };
      });
    }
  } catch (error) {
    console.error('[FieldCleanup] Failed to clear IndexedDB:', error);
  }
}

/**
 * MASTER CLEANUP - Complete Field data wipe
 * CRITICAL: Call this on logout to enforce user isolation
 */
export async function clearAllFieldData() {
  try {
    console.log('[FieldCleanup] 🧹 Starting complete Field data wipe...');
    
    // 1. Clear active session
    FieldSessionManager.clearSession();
    
    // 2. Clear localStorage
    clearFieldLocalStorage();
    
    // 3. Clear sessionStorage
    clearFieldSessionStorage();
    
    // 4. Clear IndexedDB (async, don't await to avoid blocking logout)
    clearFieldIndexedDB().catch(err => {
      console.error('[FieldCleanup] IndexedDB cleanup failed:', err);
    });
    
    console.log('[FieldCleanup] ✅ Field data wipe complete');
  } catch (error) {
    console.error('[FieldCleanup] ❌ Cleanup failed:', error);
    // Don't throw - logout should proceed even if cleanup fails
  }
}

/**
 * Cleanup on user switch (if implemented later)
 */
export async function clearFieldDataForUserSwitch(oldUserEmail, newUserEmail) {
  if (oldUserEmail === newUserEmail) {
    return; // Same user, keep data
  }
  
  // Different user - full wipe
  await clearAllFieldData();
}