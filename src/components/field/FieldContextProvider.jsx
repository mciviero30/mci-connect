import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const FieldContext = createContext();

export function FieldContextProvider({ children, jobId, blueprintId = null, areaId = null }) {
  const [context, setContext] = useState({
    job_id: jobId,
    blueprint_id: blueprintId,
    area_id: areaId,
    created_by: null,
    created_by_name: null,
    gps_latitude: null,
    gps_longitude: null,
  });

  // Fetch current user
  useEffect(() => {
    base44.auth.me().then(user => {
      setContext(prev => ({
        ...prev,
        created_by: user.email,
        created_by_name: user.full_name,
      }));
    }).catch(() => {});
  }, []);

  // Try to get GPS location (non-blocking)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setContext(prev => ({
            ...prev,
            gps_latitude: position.coords.latitude,
            gps_longitude: position.coords.longitude,
          }));
        },
        () => {} // Silent failure
      );
    }
  }, []);

  // Update blueprint/area when they change
  useEffect(() => {
    setContext(prev => ({
      ...prev,
      blueprint_id: blueprintId,
      area_id: areaId,
    }));
  }, [blueprintId, areaId]);

  return (
    <FieldContext.Provider value={context}>
      {children}
    </FieldContext.Provider>
  );
}

export function useFieldContext() {
  const context = useContext(FieldContext);
  if (!context) {
    // Return safe defaults instead of throwing
    return {
      job_id: null,
      blueprint_id: null,
      area_id: null,
      created_by: null,
      created_by_name: null,
      gps_latitude: null,
      gps_longitude: null,
    };
  }
  return context;
}

// Helper to auto-attach context to entity data
export function withFieldContext(data, context, entityType) {
  const defaultStatuses = {
    tasks: 'in_progress',
    incidents: 'open',
    photos: 'uploaded',
    notes: 'active',
  };

  return {
    ...data,
    job_id: data.job_id || context.job_id,
    blueprint_id: data.blueprint_id || context.blueprint_id || undefined,
    area_id: data.area_id || context.area_id || undefined,
    created_by: data.created_by || context.created_by,
    created_by_name: data.created_by_name || context.created_by_name,
    gps_latitude: data.gps_latitude || context.gps_latitude || undefined,
    gps_longitude: data.gps_longitude || context.gps_longitude || undefined,
    status: data.status || defaultStatuses[entityType] || 'active',
    created_at: data.created_at || new Date().toISOString(),
    // CRITICAL: Ensure tasks are NEVER marked as templates
    is_template: false,
    is_global: false,
  };
}