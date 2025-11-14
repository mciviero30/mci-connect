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
  RefreshCw
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

// COMPACT EMPLOYEE CARD COMPONENT
const EmployeeCard = ({ employee, onEdit, onViewProfile, isInactive = false }) => {
  const { t } = useLanguage();
  
  const displayName = employee.full_name || 
    `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
    employee.email?.split('@')[0] || 
    t('unknownEmployee');

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
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
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
const PendingEmployeeCard = ({ employee, onInvite, onResend, onEdit, onArchive, onRestore, onDelete }) => {
  const { t, language } = useLanguage();
  
  const displayName = employee.full_name || 
    `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
    t('noName');

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
    <Card className="group hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
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
                className="cursor-pointer text-red-600 focus:text-red-700"
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
  const [lastSyncTime, setLastSyncTime] = useState(0);

  // Fetch data
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('full_name');
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

  // AUTO-SYNC MUTATIONS
  const autoCreateUsersMutation = useMutation({
    mutationFn: async () => {
      const employeesWithEmail = pendingEmployees.filter(e => e.email);
      const existingEmails = new Set(employees.map(e => e.email));
      const created = [];

      for (const pending of employeesWithEmail) {
        if (existingEmails.has(pending.email)) continue;

        const fullName = `${pending.first_name || ''} ${pending.last_name || ''}`.trim() || 
          pending.full_name || 'Employee';

        try {
          await base44.entities.User.create({
            email: pending.email,
            full_name: fullName,
            first_name: pending.first_name || '',
            last_name: pending.last_name || '',
            role: 'user',
            phone: pending.phone || '',
            position: pending.position || '',
            department: pending.department || '',
            team_id: pending.team_id || '',
            team_name: pending.team_name || '',
            employment_status: 'pending_registration'
          });
          created.push(pending.email);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`Auto-create failed for ${pending.email}:`, error.message);
          }
        }
      }
      return created;
    },
    onSuccess: (created) => {
      if (created.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    }
  });

  // MANUAL SYNC
  const syncMutation = useMutation({
    mutationFn: async () => {
      const employeesWithEmail = pendingEmployees.filter(e => 
        e.email && (e.status === 'invited' || e.status === 'active')
      );
      const updates = [];

      for (const pending of employeesWithEmail) {
        const existingUser = employees.find(e => e.email === pending.email);
        
        if (existingUser) {
          const needsUpdate = 
            (pending.first_name && existingUser.first_name !== pending.first_name) || 
            (pending.last_name && existingUser.last_name !== pending.last_name) ||
            (pending.phone && existingUser.phone !== pending.phone) ||
            (pending.position && existingUser.position !== pending.position) ||
            (pending.team_id && existingUser.team_id !== pending.team_id);

          if (needsUpdate) {
            const fullName = `${pending.first_name || ''} ${pending.last_name || ''}`.trim() || 
              pending.full_name || existingUser.full_name || 'Employee';

            updates.push(
              base44.entities.User.update(existingUser.id, {
                full_name: fullName,
                first_name: pending.first_name || existingUser.first_name || '',
                last_name: pending.last_name || existingUser.last_name || '',
                phone: pending.phone || existingUser.phone || '',
                position: pending.position || existingUser.position || '',
                team_id: pending.team_id || existingUser.team_id || '',
                team_name: pending.team_name || existingUser.team_name || ''
              })
            );
          }
          
          if (pending.status !== 'active') {
            updates.push(
              base44.entities.PendingEmployee.update(pending.id, { status: 'active' })
            );
          }
        }
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
        return updates.length;
      }
      return 0;
    },
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        toast.success(language === 'es' ? `${count} empleados sincronizados` : `${count} employees synced`);
      } else {
        toast.info(language === 'es' ? 'Todo sincronizado' : 'All synced');
      }
      setLastSyncTime(Date.now());
    },
    onError: (error) => {
      toast.error(language === 'es' ? 'Error al sincronizar' : 'Sync error');
      setLastSyncTime(Date.now());
    }
  });

  // PENDING EMPLOYEE MUTATIONS
  const inviteMutation = useMutation({
    mutationFn: async (employee) => {
      if (!employee.email) throw new Error(t('cannotInviteWithoutEmail'));

      const appUrl = window.location.origin;
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
        employee.full_name || 'Employee';

      // Create user if doesn't exist
      const existingUser = employees.find(e => e.email === employee.email);
      if (!existingUser) {
        try {
          await base44.entities.User.create({
            email: employee.email,
            full_name: fullName,
            first_name: employee.first_name || '',
            last_name: employee.last_name || '',
            role: 'user',
            phone: employee.phone || '',
            position: employee.position || '',
            team_id: employee.team_id || '',
            team_name: employee.team_name || '',
            employment_status: 'pending_registration'
          });
        } catch (error) {
          if (!error.message.includes('already exists')) throw error;
        }
      }

      // Send welcome email
      const emailBody = language === 'es' 
        ? `Hola ${employee.first_name || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${employee.email}\n\n¡Bienvenido al equipo!\nMCI Team`
        : `Hello ${employee.first_name || fullName},\n\nWelcome to MCI Connect!\n\nYou've been invited to join our platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${employee.email}\n\nWelcome to the team!\nMCI Team`;

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
        invitation_count: (employee.invitation_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'es' ? 'Invitación enviada' : 'Invitation sent');
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
        ? `Hola ${employee.first_name || fullName},\n\nRecordatorio: Tienes acceso pendiente a MCI Connect.\n\nAccede: ${appUrl}\nEmail: ${employee.email}\n\nSaludos,\nMCI Team`
        : `Hi ${employee.first_name || fullName},\n\nReminder: You have pending access to MCI Connect.\n\nAccess: ${appUrl}\nEmail: ${employee.email}\n\nBest regards,\nMCI Team`;

      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: language === 'es' ? 'Recordatorio: MCI Connect' : 'Reminder: MCI Connect',
        body: emailBody,
        from_name: 'MCI Connect'
      });

      await base44.entities.PendingEmployee.update(employee.id, {
        invitation_count: (employee.invitation_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast.success(language === 'es' ? 'Recordatorio enviado' : 'Reminder sent');
    },
    onError: (error) => {
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

  // RESTORE DELETED USER - ROBUST IMPLEMENTATION
  const restoreDeletedMutation = useMutation({
    mutationFn: async (employeeId) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) throw new Error('Employee not found');

      // Restore to active status
      await base44.entities.User.update(employeeId, {
        employment_status: 'active'
      });

      return employee;
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'es' 
        ? `${employee.full_name} restaurado exitosamente`
        : `${employee.full_name} restored successfully`
      );
    },
    onError: (error) => {
      toast.error(language === 'es' ? 'Error al restaurar' : 'Restore error');
      
      // Fallback: Show manual instructions
      alert(language === 'es' 
        ? `⚠️ Error automático. Restaura manualmente:\n\n1. Abre Dashboard en navegador\n2. Ve a: Data → User\n3. Busca el email del empleado\n4. Edita y cambia 'employment_status' de 'deleted' a 'active'\n5. Guarda`
        : `⚠️ Automatic restore failed. Manual steps:\n\n1. Open Dashboard in browser\n2. Go to: Data → User\n3. Search for employee email\n4. Edit and change 'employment_status' from 'deleted' to 'active'\n5. Save`
      );
      
      window.open('https://app.base44.com/dashboard/data/User', '_blank');
    }
  });

  // Auto-sync effects
  React.useEffect(() => {
    if (!isLoading && !isPendingLoading && pendingEmployees.length > 0) {
      const timeoutId = setTimeout(() => {
        autoCreateUsersMutation.mutate();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [pendingEmployees.length, isLoading, isPendingLoading]);

  React.useEffect(() => {
    const timeSinceLastSync = Date.now() - lastSyncTime;
    if (timeSinceLastSync > 120000 && employees.length > 0 && pendingEmployees.length > 0) {
      const timeoutId = setTimeout(() => {
        syncMutation.mutate();
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [employees.length, pendingEmployees.length, lastSyncTime]);

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

  // Sub-categories for Pending tab
  const pendingOnly = pendingList.filter(e => e.status === 'pending');
  const invitedOnly = pendingList.filter(e => e.status === 'invited');
  const deletedOnly = archivedList.filter(e => e.employment_status === 'deleted');

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
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
                onClick={() => syncMutation.mutate()}
                variant="outline"
                disabled={syncMutation.isPending}
                className="border-slate-300 hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? t('syncing') : t('manualSync')}
              </Button>
              
              <Button 
                onClick={() => { 
                  setEditingEmployee(null); 
                  setIsPendingEdit(true); 
                  setShowDialog(true); 
                }}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 hover:from-[#2A8FE3] to-blue-700 text-white shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('addEmployee')}
              </Button>
            </div>
          </div>

          {/* CRITICAL ALERTS ONLY */}
          {syncMutation.isError && (
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEmployees.map(employee => (
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
                  isInactive={employee.employment_status === 'inactive'}
                />
              ))}
            </div>

            {activeEmployees.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">{t('noActiveEmployeesFound')}</p>
              </div>
            )}
          </TabsContent>

          {/* PENDING TAB */}
          <TabsContent value="pending" className="space-y-6">
            {/* Sub-tabs for pending */}
            {pendingOnly.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  {language === 'es' ? 'Pendientes de Invitar' : 'Not Yet Invited'} ({pendingOnly.length})
                </h3>
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
                    />
                  ))}
                </div>
              </div>
            )}

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

          {/* ARCHIVED TAB */}
          <TabsContent value="archived" className="space-y-6">
            {/* Deleted users section */}
            {deletedOnly.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  {language === 'es' ? 'Eliminados' : 'Deleted'} ({deletedOnly.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deletedOnly.map(employee => (
                    <Card key={employee.id} className="border-red-200 bg-red-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center text-white font-bold text-lg grayscale">
                            {employee.full_name?.[0]?.toUpperCase()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-slate-600 truncate line-through">
                              {employee.full_name}
                            </h3>
                            <p className="text-xs text-slate-500">{employee.position}</p>
                            <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                              {t('deleted')}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            if (window.confirm(language === 'es' 
                              ? `¿Restaurar acceso para ${employee.full_name}?`
                              : `Restore access for ${employee.full_name}?`
                            )) {
                              restoreDeletedMutation.mutate(employee.id);
                            }
                          }}
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {t('restoreAccess')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Archived from pending */}
            {archivedList.filter(e => !e.employment_status || e.employment_status !== 'deleted').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-slate-600" />
                  {language === 'es' ? 'Archivados' : 'Archived'} ({archivedList.filter(e => !e.employment_status || e.employment_status !== 'deleted').length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedList.filter(e => !e.employment_status || e.employment_status !== 'deleted').map(employee => (
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