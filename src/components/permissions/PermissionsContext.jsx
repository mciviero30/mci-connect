import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  // CRITICAL: All hooks at top level, unconditional, stable order
  const queryClient = useQueryClient();
  
  // Safely get user from cache (no additional query)
  const user = queryClient.getQueryData(['currentUser']);

  // Fetch role only if custom_role_id exists - hook always called
  const { data: userRole } = useQuery({
    queryKey: ['userRole', user?.custom_role_id],
    queryFn: async () => {
      if (!user?.custom_role_id) return null;
      const roles = await base44.entities.Role.filter({ id: user.custom_role_id });
      return roles[0] || null;
    },
    enabled: !!user?.custom_role_id,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Build permissions object - stable dependencies
  const permissions = useMemo(() => {
    // If admin, grant all permissions
    if (user?.role === 'admin') {
      return {
        isAdmin: true,
        hasPermission: () => true,
        canView: () => true,
        canEdit: () => true,
      };
    }

    // If custom role exists, use its permissions
    if (userRole?.permissions) {
      return {
        isAdmin: false,
        raw: userRole.permissions,
        
        hasPermission: (module, action) => {
          if (!userRole.permissions[module]) return false;
          return userRole.permissions[module][action] === true;
        },

        canView: (module) => {
          if (!userRole.permissions[module]) return false;
          return userRole.permissions[module].view === true;
        },

        canEdit: (module) => {
          if (!userRole.permissions[module]) return false;
          return userRole.permissions[module].edit === true;
        },

        canViewAll: (module) => {
          if (!userRole.permissions[module]) return false;
          return userRole.permissions[module].view_all === true;
        },

        canViewTeamOnly: (module) => {
          if (!userRole.permissions[module]) return false;
          return userRole.permissions[module].view_team_only === true;
        },
      };
    }

    // Default: minimal permissions for regular users
    return {
      isAdmin: false,
      raw: {},
      hasPermission: () => false,
      canView: (module) => ['dashboard', 'time_tracking', 'expenses'].includes(module),
      canEdit: () => false,
      canViewAll: () => false,
      canViewTeamOnly: () => false,
    };
  }, [user, userRole]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    // DEFENSIVE: Instead of throwing, return default safe permissions
    if (import.meta.env.DEV) {
      console.warn('usePermissions called outside PermissionsProvider - returning default permissions');
    }
    return {
      isAdmin: false,
      raw: {},
      hasPermission: () => false,
      canView: () => false,
      canEdit: () => false,
      canViewAll: () => false,
      canViewTeamOnly: () => false,
    };
  }
  return context;
};

// HOC for protected routes
export const withPermission = (Component, module, action) => {
  return (props) => {
    const permissions = usePermissions();
    
    if (permissions.isAdmin || permissions.hasPermission(module, action)) {
      return <Component {...props} />;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
        <div className="text-center p-8 bg-white dark:bg-[#282828] rounded-xl border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">You don't have permission to access this resource.</p>
        </div>
      </div>
    );
  };
};