import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Edit,
  Building2,
  MoreVertical,
  Eye,
  Trash2,
  RotateCcw,
  Archive,
  UserPlus,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeForm from "../components/empleados/EmployeeForm";
import ActiveEmployeeForm from "../components/empleados/ActiveEmployeeForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

// Helper function to format name properly
const formatDisplayName = (employee) => {
  // Priority 1: Use first_name + last_name if available
  if (employee.first_name || employee.last_name) {
    const first = employee.first_name || '';
    const last = employee.last_name || '';
    const combined = `${first} ${last}`.trim();
    if (combined && !combined.includes('@') && !combined.includes('.')) {
      return combined;
    }
  }
  
  // Priority 2: Use full_name if it's properly formatted (not an email pattern)
  if (employee.full_name && !employee.full_name.includes('@')) {
    // Check if it looks like a proper name (has space or capitalized)
    if (employee.full_name.includes(' ') || /^[A-Z]/.test(employee.full_name)) {
      return employee.full_name;
    }
    // If it's like "marzio.civiero", convert to "Marzio Civiero"
    if (employee.full_name.includes('.')) {
      return employee.full_name
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    // Single word like "marzio" -> "Marzio"
    return employee.full_name.charAt(0).toUpperCase() + employee.full_name.slice(1).toLowerCase();
  }
  
  // Priority 3: Extract from email
  if (employee.email) {
    const emailName = employee.email.split('@')[0];
    if (emailName.includes('.')) {
      return emailName
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
  }
  
  return 'Unknown';
};

// COMPACT EMPLOYEE CARD COMPONENT
const EmployeeCard = ({ employee, onEdit, onViewProfile, onDelete, isInactive = false }) => {
  const { t } = useLanguage();
  
  const displayName = formatDisplayName(employee);

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${
      isInactive ? 'opacity-60 bg-slate-50' : 'bg-white'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={displayName}
              className={`w-12 h-12 rounded-full object-cover border-2 border-blue-500/30 ${
                isInactive ? 'grayscale' : ''
              }`}
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm truncate ${
                isInactive ? 'text-slate-500' : 'text-slate-900'
              }`}>
                {displayName}
              </h3>
              {isInactive && (
                <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </div>
            
            {employee.position && (
              <p className={`text-xs truncate ${
                isInactive ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {employee.position}
              </p>
            )}
            
            {employee.team_name && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className={`w-3 h-3 ${
                  isInactive ? 'text-slate-400' : 'text-purple-600'
                }`} />
                <span className={`text-xs ${
                  isInactive ? 'text-slate-400' : 'text-purple-600'
                }`}>
                  {employee.team_name}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200">
              <DropdownMenuItem onClick={onViewProfile} className="cursor-pointer">
                <Eye className="w-4 h-4 mr-2" />
                {t('viewProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(employee)} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={onDelete} 
                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick contact info - subtle */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
          {employee.email && (
            <div className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{employee.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// PENDING EMPLOYEE CARD
const PendingEmployeeCard = ({ employee, onInvite, onResend, onEdit, onArchive, onRestore, onDelete, isSelected, onSelect }) => {
  const { t, language } = useLanguage();
  
  const displayName = formatDisplayName(employee);

  const statusConfig = {
    pending: { label: t('pending'), color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    invited: { label: t('invited'), color: 'bg-blue-100 text-blue-800', icon: Mail },
    active: { label: t('active'), color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    archived: { label: t('archived'), color: 'bg-slate-100 text-slate-800', icon: Archive }
  };

  const config = statusConfig[employee.status] || statusConfig.pending;
  const Icon = config.icon;

  const daysSinceInvite = employee.invited_date 
    ? differenceInDays(new Date(), new Date(employee.invited_date))
    : 0;

  return (
    <Card className={`group hover:shadow-lg transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {employee.status === 'pending' && employee.email && onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(employee.id, e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {displayName[0]?.toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 truncate">{displayName}</h3>
            {employee.position && (
              <p className="text-xs text-slate-600 truncate">{employee.position}</p>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${config.color} text-xs flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
              
              {employee.team_name && (
                <Badge variant="outline" className="text-xs">
                  {employee.team_name}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200">
              <DropdownMenuItem onClick={() => onEdit(employee)} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              
              {employee.status === 'pending' && employee.email && (
                <DropdownMenuItem onClick={() => onInvite(employee)} className="cursor-pointer">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('sendInvitation')}
                </DropdownMenuItem>
              )}
              
              {employee.status === 'invited' && employee.email && (
                <DropdownMenuItem onClick={() => onResend(employee)} className="cursor-pointer">
                  <Mail className="w-4 h-4 mr-2" />
                  {t('resendInvitation')}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {employee.status !== 'archived' ? (
                <DropdownMenuItem onClick={() => onArchive(employee.id)} className="cursor-pointer">
                  <Archive className="w-4 h-4 mr-2" />
                  {t('archive')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onRestore(employee.id)} className="cursor-pointer">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('restoreToPending')}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete(employee.id)} 
                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deletePermanently')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact Info */}
        {employee.email && (
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
            <Mail className="w-3 h-3" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        
        {!employee.email && (
          <Alert className="mt-2 bg-red-50 border-red-200">
            <AlertDescription className="text-red-700 text-xs">
              ⚠️ {t('noEmailCannotInvite')}
            </AlertDescription>
          </Alert>
        )}

        {/* Invitation info */}
        {employee.status === 'invited' && daysSinceInvite > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {language === 'es' ? 'Invitado hace' : 'Invited'} {daysSinceInvite} {language === 'es' ? 'días' : 'days ago'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// DELETED EMPLOYEE CARD
const DeletedEmployeeCard = ({ employee, onRestore }) => {
  const { t, language } = useLanguage();
  
  const displayName = formatDisplayName(employee);

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-red-300 grayscale opacity-50"
            />
          ) : (
            <div className="w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center text-white font-bold text-lg opacity-50">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-600 truncate line-through">
              {displayName}
            </h3>
            <p className="text-xs text-slate-500">{employee.position || t('noPosition')}</p>
            <Badge className="mt-1 bg-red-100 text-red-700 text-xs flex items-center gap-1 w-fit">
              <UserX className="w-3 h-3" />
              {t('deleted')}
            </Badge>
          </div>
        </div>

        {employee.email && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <Mail className="w-3 h-3" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}

        <Alert className="mb-3 bg-red-100 border-red-300">
          <AlertDescription className="text-red-800 text-xs">
            <UserX className="w-3 h-3 inline mr-1" />
            {language === 'es' ? 'Acceso bloqueado' : 'Access blocked'}
          </AlertDescription>
        </Alert>

        <Button
          onClick={onRestore}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {t('restoreAccess')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function Empleados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isPendingEdit, setIsPendingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Fetch actual User data for full employee details
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list('-created_date');
        return users;
      } catch (error) {
        console.error('Error loading employees:', error);
        return [];
      }
    },
    staleTime: 60000,
    retry: 1
  });

  const { data: pendingEmployees = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['pendingEmployees'],
    queryFn: async () => {
      try {
        return await base44.entities.PendingEmployee.list('-created_date');
      } catch (error) {
        console.error('Error loading pending employees:', error);
        return [];
      }
    },
    staleTime: 60000,
    retry: 1
  });

  // ============================================
  // MUTATION 1: SOFT DELETE - Mark active employee as deleted (blocks access)
  // ============================================
  const deleteActiveMutation = useMutation({
    mutationFn: async (employeeId) => {
      await base44.entities.User.update(employeeId, {
        employment_status: 'deleted'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'es' 
        ? 'Empleado marcado como borrado. Acceso bloqueado.' 
        : 'Employee marked as deleted. Access blocked.'
      );
    },
    onError: (error) => {
      toast.error(language === 'es' 
        ? 'Error al borrar empleado: ' + error.message
        : 'Failed to delete employee: ' + error.message
      );
    }
  });

  // ============================================
  // MUTATION 2: RESTORE DELETED - Restore employee from deleted to active (unblocks access)
  // ============================================
  const restoreDeletedMutation = useMutation({
    mutationFn: async (employeeId) => {
      await base44.entities.User.update(employeeId, {
        employment_status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'es' 
        ? 'Empleado restaurado exitosamente. Acceso reactivado.' 
        : 'Employee restored successfully. Access reactivated.'
      );
    },
    onError: (error) => {
      toast.error(language === 'es' 
        ? 'Error al restaurar empleado: ' + error.message
        : 'Failed to restore employee: ' + error.message
      );
    }
  });

  // ============================================
  // MANUAL SYNC - Updates existing users only
  // DOES NOT create new users (they auto-create on first login)
  // ============================================
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const results = {
        updated: 0,
        synced: 0,
        errors: []
      };

      // Only update existing users with pending employee data
      const invitedOrActive = pendingEmployees.filter(e => 
        e.email && (e.status === 'invited' || e.status === 'active')
      );

      for (const pending of invitedOrActive) {
        const existingUser = employees.find(e => e.email === pending.email);

        if (existingUser) {
          const needsUpdate = 
            (pending.first_name && existingUser.first_name !== pending.first_name) || 
            (pending.last_name && existingUser.last_name !== pending.last_name) ||
            (pending.phone && existingUser.phone !== pending.phone) ||
            (pending.position && existingUser.position !== pending.position) ||
            (pending.address && existingUser.address !== pending.address) ||
            (pending.department && existingUser.department !== pending.department) ||
            (pending.team_id && existingUser.team_id !== pending.team_id);

          if (needsUpdate) {
            const fullName = `${pending.first_name || ''} ${pending.last_name || ''}`.trim() || 
              pending.full_name || existingUser.full_name || 'Employee';

            try {
              await base44.entities.User.update(existingUser.id, {
                full_name: fullName,
                first_name: pending.first_name || existingUser.first_name || '',
                last_name: pending.last_name || existingUser.last_name || '',
                phone: pending.phone || existingUser.phone || '',
                position: pending.position || existingUser.position || '',
                department: pending.department || existingUser.department || '',
                address: pending.address || existingUser.address || '',
                ssn_tax_id: pending.ssn_tax_id || existingUser.ssn_tax_id || '',
                dob: pending.dob || existingUser.dob || '',
                tshirt_size: pending.tshirt_size || existingUser.tshirt_size || '',
                team_id: pending.team_id || existingUser.team_id || '',
                team_name: pending.team_name || existingUser.team_name || '',
                direct_manager_name: pending.direct_manager_name || existingUser.direct_manager_name || ''
              });
              results.updated++;
            } catch (error) {
              results.errors.push(`${pending.email}: ${error.message}`);
            }
          }

          // Mark pending employee as synced
          if (pending.status !== 'active') {
            try {
              await base44.entities.PendingEmployee.update(pending.id, { 
                status: 'active',
                registered_date: existingUser.created_date
              });
              results.synced++;
            } catch (error) {
              results.errors.push(`Sync ${pending.email}: ${error.message}`);
            }
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      if (results.updated > 0 || results.synced > 0) {
        toast.success(language === 'es' 
          ? `Sincronización: ${results.updated} actualizados, ${results.synced} sincronizados`
          : `Sync: ${results.updated} updated, ${results.synced} synced`
        );
      } else {
        toast.info(language === 'es' ? 'Todo sincronizado' : 'All synced');
      }

      if (results.errors.length > 0) {
        console.error('Sync errors:', results.errors);
      }
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast.error(language === 'es' 
        ? 'Error: ' + error.message
        : 'Error: ' + error.message
      );
    }
  });

  // PENDING EMPLOYEE MUTATIONS
    const inviteMutation = useMutation({
      mutationFn: async (employee) => {
        if (!employee.email) throw new Error(t('cannotInviteWithoutEmail'));

        const appUrl = window.location.origin;
        const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
          employee.full_name || 'Employee';

        // Send welcome email
        const emailBody = language === 'es' 
          ? `Hola ${employee.first_name || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${employee.email}\n\nCuando inicies sesión por primera vez, tu cuenta será creada automáticamente.\n\n¡Bienvenido al equipo!\nMCI Team`
          : `Hello ${employee.first_name || fullName},\n\nWelcome to MCI Connect!\n\nYou've been invited to join our platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${employee.email}\n\nYour account will be automatically created when you first log in.\n\nWelcome to the team!\nMCI Team`;

        await base44.integrations.Core.SendEmail({
          to: employee.email,
          subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
          body: emailBody,
          from_name: 'MCI Connect'
        });

        // Update status
        await base44.entities.PendingEmployee.update(employee.id, {
          status: 'invited',
          invited_date: new Date().toISOString(),
          last_invitation_sent: new Date().toISOString(),
          invitation_count: (employee.invitation_count || 0) + 1
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
        toast.success(language === 'es' ? '✅ Invitación enviada exitosamente' : '✅ Invitation sent successfully');
      },
      onError: (error) => {
        console.error('Invitation error:', error);
        toast.error((language === 'es' ? 'Error al enviar invitación: ' : 'Error sending invitation: ') + error.message);
      }
    });

  const bulkInviteMutation = useMutation({
    mutationFn: async (employeeIds) => {
      const employeesToInvite = pendingEmployees.filter(e => 
        employeeIds.includes(e.id) && e.email && e.status === 'pending'
      );

      const results = { success: 0, failed: 0, errors: [] };
      const appUrl = window.location.origin;

      for (const employee of employeesToInvite) {
        try {
          const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
            employee.full_name || 'Employee';

          // Send email
          const emailBody = language === 'es' 
            ? `Hola ${employee.first_name || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${employee.email}\n\nCuando inicies sesión por primera vez, tu cuenta será creada automáticamente.\n\n¡Bienvenido al equipo!\nMCI Team`
            : `Hello ${employee.first_name || fullName},\n\nWelcome to MCI Connect!\n\nYou've been invited to join our platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${employee.email}\n\nYour account will be automatically created when you first log in.\n\nWelcome to the team!\nMCI Team`;

          await base44.integrations.Core.SendEmail({
            to: employee.email,
            subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
            body: emailBody,
            from_name: 'MCI Connect'
          });

          // Update status
          await base44.entities.PendingEmployee.update(employee.id, {
            status: 'invited',
            invited_date: new Date().toISOString(),
            last_invitation_sent: new Date().toISOString(),
            invitation_count: (employee.invitation_count || 0) + 1
          });

          results.success++;
        } catch (error) {
          console.error(`Error inviting ${employee.email}:`, error);
          results.failed++;
          results.errors.push(`${employee.email}: ${error.message}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      setSelectedEmployees([]);

      if (results.success > 0) {
        toast.success(
          language === 'es' 
            ? `${results.success} invitaciones enviadas exitosamente`
            : `${results.success} invitations sent successfully`
        );
      }
      if (results.failed > 0) {
        console.error('Bulk invite errors:', results.errors);
        toast.error(
          language === 'es'
            ? `${results.failed} invitaciones fallaron`
            : `${results.failed} invitations failed`
        );
      }
    },
    onError: (error) => {
      toast.error(t('error') + ': ' + error.message);
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (employee) => {
      if (!employee.email) throw new Error(t('cannotInviteWithoutEmail'));

      const appUrl = window.location.origin;
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
        employee.full_name || 'Employee';

      const emailBody = language === 'es'
        ? `Hola ${employee.first_name || fullName},\n\nRecordatorio: Tienes acceso pendiente a MCI Connect.\n\nAccede aquí: ${appUrl}\nEmail: ${employee.email}\n\nCuando inicies sesión por primera vez, tu cuenta será creada automáticamente.\n\nSaludos,\nMCI Team`
        : `Hi ${employee.first_name || fullName},\n\nReminder: You have pending access to MCI Connect.\n\nAccess here: ${appUrl}\nEmail: ${employee.email}\n\nYour account will be automatically created when you first log in.\n\nBest regards,\nMCI Team`;

      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: language === 'es' ? 'Recordatorio: MCI Connect' : 'Reminder: MCI Connect',
        body: emailBody,
        from_name: 'MCI Connect'
      });

      await base44.entities.PendingEmployee.update(employee.id, {
        last_invitation_sent: new Date().toISOString(),
        invitation_count: (employee.invitation_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast.success(language === 'es' ? 'Recordatorio enviado' : 'Reminder sent');
    },
    onError: (error) => {
      console.error('Resend error:', error);
      toast.error(t('error') + ': ' + error.message);
    }
  });

  const archivePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast.success(t('employeeArchived'));
    }
  });

  const restorePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast.success(t('employeeRestoredToPending'));
    }
  });

  const deletePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast.success(t('employeeDeletedSuccessfully'));
    }
  });

  // SEARCH FILTER - Enhanced to search all fields
  const filterEmployees = (empList, isPendingList = false) => {
    if (!searchTerm) return empList;
    
    const term = searchTerm.toLowerCase();
    return empList.filter(emp => {
      const name = isPendingList 
        ? (emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim())
        : emp.full_name;
      
      return (
        name?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term) ||
        emp.team_name?.toLowerCase().includes(term)
      );
    });
  };

  // FILTERED LISTS - 3 MAIN TABS
  const activeEmployees = filterEmployees(
    employees.filter(e => {
      const isDeleted = e.employment_status === 'deleted';
      const isArchived = e.employment_status === 'archived';
      
      if (isDeleted || isArchived) return false;
      
      if (showInactive) {
        return true; // Show all non-deleted/archived
      }
      
      return e.employment_status === 'active' || 
             e.employment_status === 'pending_registration' || 
             !e.employment_status;
    })
  );

  const pendingList = filterEmployees(
    pendingEmployees.filter(e => e.status === 'pending' || e.status === 'invited'),
    true
  );

  const archivedList = filterEmployees(
    [
      ...pendingEmployees.filter(e => e.status === 'archived'),
      ...employees.filter(e => e.employment_status === 'archived' || e.employment_status === 'deleted')
    ],
    true
  );

  // Sub-categories for tabs
  const pendingOnly = pendingList.filter(e => e.status === 'pending');
  const invitedOnly = pendingList.filter(e => e.status === 'invited');
  const deletedUsers = employees.filter(e => e.employment_status === 'deleted');
  const archivedPending = pendingEmployees.filter(e => e.status === 'archived');

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl shadow-lg shadow-blue-500/30">
                  <Users className="w-7 h-7 text-white" />
                </div>
                {t('employeeManagement')}
              </h1>
              <p className="text-slate-600 mt-2 ml-[60px]">{t('manageYourTeamMembers')}</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => manualSyncMutation.mutate()}
                variant="outline"
                disabled={manualSyncMutation.isPending}
                className="border-slate-300 hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${manualSyncMutation.isPending ? 'animate-spin' : ''}`} />
                {manualSyncMutation.isPending ? t('syncing') : t('manualSync')}
              </Button>
              
              <Button 
                onClick={() => { 
                  setEditingEmployee(null); 
                  setIsPendingEdit(true); 
                  setShowDialog(true); 
                }}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 hover:from-[#2A8FE3] hover:to-blue-700 text-white shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('addEmployee')}
              </Button>
            </div>
          </div>

          {/* CRITICAL ALERTS ONLY */}
          {manualSyncMutation.isError && (
            <Alert className="mt-4 bg-red-50 border-red-300">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-red-800">
                {language === 'es' ? 'Error de sincronización. Intenta de nuevo.' : 'Sync error. Try again.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* SEARCH BAR */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder={t('searchEmployees')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3 MAIN TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-md border border-slate-200 p-1">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              {t('active')} ({activeEmployees.length})
            </TabsTrigger>
            
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <Clock className="w-4 h-4 mr-2" />
              {t('pending')} ({pendingList.length})
              {pendingList.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white text-xs">{pendingList.length}</Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="archived" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B9FF3] data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <Archive className="w-4 h-4 mr-2" />
              {t('archived')} ({archivedList.length})
              {deletedUsers.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">{deletedUsers.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ACTIVE TAB */}
          <TabsContent value="active" className="space-y-4">
            {/* Show Inactive Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-[#3B9FF3] cursor-pointer"
              />
              <label htmlFor="show-inactive" className="text-sm text-slate-700 cursor-pointer">
                {language === 'es' ? 'Mostrar empleados inactivos' : 'Show inactive employees'}
              </label>
            </div>

            {/* Group employees by position */}
            {(() => {
              const grouped = {
                CEO: activeEmployees.filter(e => e.position?.toLowerCase() === 'ceo'),
                Supervisor: activeEmployees.filter(e => e.position?.toLowerCase() === 'supervisor'),
                Foreman: activeEmployees.filter(e => e.position?.toLowerCase() === 'foreman'),
                Manager: activeEmployees.filter(e => e.position?.toLowerCase() === 'manager'),
                Administrator: activeEmployees.filter(e => e.position?.toLowerCase() === 'administrator'),
                Technician: activeEmployees.filter(e => e.position?.toLowerCase() === 'technician'),
                Other: activeEmployees.filter(e => {
                  const pos = e.position?.toLowerCase() || '';
                  return !['ceo', 'supervisor', 'foreman', 'manager', 'administrator', 'technician'].includes(pos);
                })
              };

              return Object.entries(grouped).map(([position, employees]) => {
                if (employees.length === 0) return null;
                
                return (
                  <div key={position} className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      {position} ({employees.length})
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employees.map(employee => (
                        <EmployeeCard
                          key={employee.id}
                          employee={employee}
                          onEdit={() => {
                            setEditingEmployee(employee);
                            setIsPendingEdit(false);
                            setShowDialog(true);
                          }}
                          onViewProfile={() => {
                            window.location.href = createPageUrl(`EmployeeProfile?id=${employee.id}`);
                          }}
                          onDelete={() => {
                            if (window.confirm(language === 'es'
                              ? `¿Estás seguro de borrar a ${employee.full_name}? Esto bloqueará su acceso a la aplicación.`
                              : `Are you sure you want to delete ${employee.full_name}? This will block their access to the app.`
                            )) {
                              deleteActiveMutation.mutate(employee.id);
                            }
                          }}
                          isInactive={employee.employment_status === 'inactive'}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}

            {activeEmployees.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">{t('noActiveEmployeesFound')}</p>
              </div>
            )}
          </TabsContent>

          {/* PENDING TAB */}
          <TabsContent value="pending" className="space-y-6">
            {/* Not yet invited */}
            {pendingOnly.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    {language === 'es' ? 'Pendientes de Invitar' : 'Not Yet Invited'} ({pendingOnly.length})
                  </h3>
                  
                  {selectedEmployees.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">
                        {selectedEmployees.length} {language === 'es' ? 'seleccionados' : 'selected'}
                      </span>
                      <Button
                        onClick={() => bulkInviteMutation.mutate(selectedEmployees)}
                        disabled={bulkInviteMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {bulkInviteMutation.isPending 
                          ? (language === 'es' ? 'Enviando...' : 'Sending...') 
                          : (language === 'es' ? 'Enviar Invitaciones' : 'Send Invitations')
                        }
                      </Button>
                      <Button
                        onClick={() => setSelectedEmployees([])}
                        variant="outline"
                        size="sm"
                      >
                        {language === 'es' ? 'Limpiar' : 'Clear'}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOnly.map(employee => (
                    <PendingEmployeeCard
                      key={employee.id}
                      employee={employee}
                      onInvite={(emp) => inviteMutation.mutate(emp)}
                      onResend={resendInviteMutation.mutate}
                      onEdit={(emp) => {
                        setEditingEmployee(emp);
                        setIsPendingEdit(true);
                        setShowDialog(true);
                      }}
                      onArchive={(id) => {
                        if (window.confirm(t('confirmArchiveEmployee'))) {
                          archivePendingMutation.mutate(id);
                        }
                      }}
                      onRestore={restorePendingMutation.mutate}
                      onDelete={(id) => {
                        if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                          deletePendingMutation.mutate(id);
                        }
                      }}
                      isSelected={selectedEmployees.includes(employee.id)}
                      onSelect={(id, checked) => {
                        if (checked) {
                          setSelectedEmployees(prev => [...prev, id]);
                        } else {
                          setSelectedEmployees(prev => prev.filter(empId => empId !== id));
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Invited (awaiting registration) */}
            {invitedOnly.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  {language === 'es' ? 'Invitados (Esperando Registro)' : 'Invited (Awaiting Registration)'} ({invitedOnly.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {invitedOnly.map(employee => (
                    <PendingEmployeeCard
                      key={employee.id}
                      employee={employee}
                      onInvite={(emp) => inviteMutation.mutate(emp)}
                      onResend={resendInviteMutation.mutate}
                      onEdit={(emp) => {
                        setEditingEmployee(emp);
                        setIsPendingEdit(true);
                        setShowDialog(true);
                      }}
                      onArchive={(id) => {
                        if (window.confirm(t('confirmArchiveEmployee'))) {
                          archivePendingMutation.mutate(id);
                        }
                      }}
                      onRestore={restorePendingMutation.mutate}
                      onDelete={(id) => {
                        if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                          deletePendingMutation.mutate(id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {pendingList.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {language === 'es' ? '¡Todos los empleados han sido invitados!' : 'All employees have been invited!'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* ARCHIVED TAB - Includes both archived pending AND deleted users */}
          <TabsContent value="archived" className="space-y-6">
            {/* Deleted users section */}
            {deletedUsers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  {language === 'es' ? 'Eliminados (Acceso Bloqueado)' : 'Deleted (Access Blocked)'} ({deletedUsers.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deletedUsers.map(employee => (
                    <DeletedEmployeeCard
                      key={employee.id}
                      employee={employee}
                      onRestore={() => {
                        if (window.confirm(language === 'es' 
                          ? `¿Restaurar acceso para ${employee.full_name}? Esto cambiará su estado a Activo.`
                          : `Restore access for ${employee.full_name}? This will change their status to Active.`
                        )) {
                          restoreDeletedMutation.mutate(employee.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived from pending */}
            {archivedPending.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-slate-600" />
                  {language === 'es' ? 'Archivados (Pendientes)' : 'Archived (Pending)'} ({archivedPending.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedPending.map(employee => (
                    <PendingEmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={(emp) => {
                        setEditingEmployee(emp);
                        setIsPendingEdit(true);
                        setShowDialog(true);
                      }}
                      onRestore={(id) => {
                        if (window.confirm(t('confirmRestoreEmployeeToPending'))) {
                          restorePendingMutation.mutate(id);
                        }
                      }}
                      onDelete={(id) => {
                        if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                          deletePendingMutation.mutate(id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {archivedList.length === 0 && (
              <div className="text-center py-16">
                <Archive className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">{t('noArchivedEmployees')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* DIALOGS */}
        {showDialog && (
          <Dialog open={showDialog} onOpenChange={(open) => {
            if (!open) {
              setShowDialog(false);
              setEditingEmployee(null);
              setIsPendingEdit(false);
            }
          }}>
            <DialogContent className="bg-white border-slate-200 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  {editingEmployee 
                    ? `${t('edit')} ${t('employee')}`
                    : `${t('add')} ${t('employee')}`
                  }
                </DialogTitle>
              </DialogHeader>
              {isPendingEdit ? (
                <EmployeeForm
                  employee={editingEmployee}
                  onClose={() => {
                    setShowDialog(false);
                    setEditingEmployee(null);
                    setIsPendingEdit(false);
                  }}
                  isPending={true}
                />
              ) : (
                <ActiveEmployeeForm
                  employee={editingEmployee}
                  onClose={() => {
                    setShowDialog(false);
                    setEditingEmployee(null);
                    setIsPendingEdit(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}