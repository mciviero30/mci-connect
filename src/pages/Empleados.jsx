
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserPlus,
  Trash2,
  Check,
  Clock,
  Archive,
  UserX,
  RotateCcw,
  ChevronRight,
  Edit,
  Building2,
  Loader2,
  MoreVertical,
  Eye,
  Sparkles,
  CheckCircle2 // New icon for "All invitations accepted"
} from "lucide-react";
// Removed PageHeader import as per outline
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeForm from "../components/empleados/EmployeeForm";
import ActiveEmployeeForm from "../components/empleados/ActiveEmployeeForm";
import AIPerformanceAnalyzer from "../components/empleados/AIPerformanceAnalyzer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays } from "date-fns"; // Add differenceInDays
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

import OnboardingTracker from "../components/empleados/OnboardingTracker";
import PendingInvitationCard from "../components/empleados/PendingInvitationCard";

const PendingEmployeeCard = ({ employee, onInvite, onDelete, onArchive, onRestore, onEdit, onResendInvite }) => {
  const { t } = useLanguage();
  
  const getFullName = () => {
    if (employee.full_name) return employee.full_name;
    if (employee.first_name && employee.last_name) return `${employee.first_name} ${employee.last_name}`;
    if (employee.first_name) return employee.first_name;
    if (employee.last_name) return employee.last_name;
    return t('noName');
  };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    invited: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    archived: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  };

  const statusIcons = {
    pending: <Clock className="w-3 h-3" />,
    invited: <Mail className="w-3 h-3" />,
    active: <Check className="w-3 h-3" />,
    archived: <Archive className="w-3 h-3" />
  };

  return (
    <Card className="glass-card shadow-xl border-slate-700 hover:border-cyan-500/30 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">{getFullName()}</h3>
            <p className="text-cyan-400 text-sm">{employee.position || t('noPosition')}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={statusColors[employee.status]}>
                <span className="flex items-center gap-1">
                  {statusIcons[employee.status]}
                  {employee.status}
                </span>
              </Badge>
              {employee.team_name && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Building2 className="w-3 h-3 mr-1" />
                  {employee.team_name}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                {t('actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800">
              <DropdownMenuItem onClick={() => onEdit(employee)} className="text-white hover:bg-slate-800">
                <Edit className="w-4 h-4 mr-2" />
                {t('editEmployee')}
              </DropdownMenuItem>
              {employee.status === 'pending' && employee.email && (
                <DropdownMenuItem onClick={() => onInvite(employee)} className="text-white hover:bg-slate-800">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('sendInvitation')}
                </DropdownMenuItem>
              )}
              {employee.status === 'invited' && employee.email && (
                <DropdownMenuItem onClick={() => onResendInvite(employee)} className="text-white hover:bg-slate-800">
                  <Mail className="w-4 h-4 mr-2" />
                  {t('resendInvitation')}
                </DropdownMenuItem>
              )}
              {employee.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onArchive(employee.id)} className="text-white hover:bg-slate-800">
                  <Archive className="w-4 h-4 mr-2" />
                  {t('archive')}
                </DropdownMenuItem>
              )}
              {employee.status === 'archived' && (
                <DropdownMenuItem onClick={() => onRestore(employee.id)} className="text-white hover:bg-slate-800">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('restoreToPending')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(employee.id)} className="text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deletePermanently')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {employee.email && (
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="truncate">{employee.email}</span>
            </div>
          )}
          {!employee.email && employee.status === 'pending' && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-400 text-xs">
                ⚠️ {t('noEmailCannotInvite')}
              </AlertDescription>
            </Alert>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{employee.phone}</span>
            </div>
          )}
          {employee.address && (
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-xs truncate">{employee.address}</span>
            </div>
          )}
          {employee.dob && (
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{t('born')}: {format(new Date(employee.dob), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {employee.invited_date && (
            <div className="text-xs text-slate-500 mt-2">
              {t('invited')}: {format(new Date(employee.invited_date), 'MMM dd, yyyy HH:mm')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Empleados() {
  const { t, language } = useLanguage();
  const [showDialog, setShowDialog] = useState(false); // Renamed from showForm as per outline implies
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isPendingEdit, setIsPendingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastSyncTime, ReactSetLastSyncTime] = React.useState(0); 

  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedEmployeeForAI, setSelectedEmployeeForAI] = useState(null);
  
  // NEW: Prompt #57 - Toggle for showing inactive employees
  const [showInactive, setShowInactive] = useState(false);
  
  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    staleTime: Infinity
  });
  
  // OPTIMIZED: Increased staleTime for employee data
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('full_name', 200); // Added limit
      } catch (error) {
        console.error('Error loading employees:', error);
        return [];
      }
    },
    staleTime: 300000, // Increased to 5 minutes
    retry: 1
  });

  const { data: pendingEmployees = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['pendingEmployees'],
    queryFn: async () => {
      try {
        return await base44.entities.PendingEmployee.list('-created_date', 100); // Added limit
      } catch (error) {
        console.error('Error loading pending employees:', error);
        return [];
      }
    },
    staleTime: 180000, // 3 minutes
    retry: 1
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    staleTime: 600000, // 10 minutes
    initialData: [],
  });

  // OPTIMIZED: Only load heavy data when AI insights are actually open
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 200), // Reduced from 500
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 100), // Reduced from 200
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 100), // Reduced from 200
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const { data: allRecognitions = [] } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list('-date', 50), // Added limit
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const { data: allCertifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date', 100), // Added limit
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const { data: allDrivingLogs = [] } = useQuery({
    queryKey: ['drivingLogs'],
    queryFn: () => base44.entities.DrivingLog.list('-date', 100), // Reduced from 200
    enabled: showAIInsights,
    staleTime: 300000,
    initialData: []
  });

  const autoCreateUsersMutation = useMutation({
    mutationFn: async () => {
      const employeesWithEmail = pendingEmployees.filter(e => e.email);
      const existingEmails = new Set(employees.map(e => e.email));
      const created = [];

      for (const pending of employeesWithEmail) {
        if (existingEmails.has(pending.email)) continue;

        let fullName = '';
        if (pending.first_name && pending.last_name) {
          fullName = `${pending.first_name} ${pending.last_name}`;
        } else if (pending.first_name) {
          fullName = pending.first_name;
        } else if (pending.last_name) {
          fullName = pending.last_name;
        } else if (pending.full_name) {
          fullName = pending.full_name;
        } else {
          fullName = 'Employee';
        }

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
            address: pending.address || '',
            dob: pending.dob || '',
            ssn_tax_id: pending.ssn_tax_id || '',
            tshirt_size: pending.tshirt_size || '',
            team_id: pending.team_id || '',
            team_name: pending.team_name || '',
            direct_manager_name: pending.direct_manager_name || '',
            employment_status: 'pending_registration' 
          });
          created.push(pending.email);
        } catch (error) {
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            console.warn(`Auto-create user for ${pending.email} failed:`, error.message);
          }
        }
      }

      return created;
    },
    onSuccess: (created) => {
      if (created.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    },
    onError: (error) => {
      console.log('Auto-create users error (silent):', error.message);
    }
  });

  const syncUserDataMutation = useMutation({
    mutationFn: async () => {
      const employeesWithEmail = pendingEmployees.filter(e => e.email && (e.status === 'invited' || e.status === 'active'));
      const updates = [];

      for (const pending of employeesWithEmail) {
        const existingUser = employees.find(e => e.email === pending.email);
        
        if (existingUser) {
          const needsUpdate = 
            (pending.first_name && existingUser.first_name !== pending.first_name) || 
            (pending.last_name && existingUser.last_name !== pending.last_name) ||
            (pending.phone && existingUser.phone !== pending.phone) ||
            (pending.position && existingUser.position !== pending.position) ||
            (pending.department && existingUser.department !== pending.department) ||
            (pending.address && existingUser.address !== pending.address) ||
            (pending.dob && existingUser.dob !== pending.dob) ||
            (pending.ssn_tax_id && existingUser.ssn_tax_id !== pending.ssn_tax_id) ||
            (pending.tshirt_size && existingUser.tshirt_size !== pending.tshirt_size) ||
            (pending.team_id && existingUser.team_id !== pending.team_id) ||
            (pending.team_name && existingUser.team_name !== pending.team_name) ||
            (pending.direct_manager_name && existingUser.direct_manager_name !== pending.direct_manager_name);

          if (needsUpdate) {
            let fullName = '';
            if (pending.first_name && pending.last_name) {
              fullName = `${pending.first_name} ${pending.last_name}`;
            } else if (pending.first_name) {
              fullName = pending.first_name;
            } else if (pending.last_name) {
              fullName = pending.last_name;
            } else if (pending.full_name) {
              fullName = pending.full_name;
            } else {
              fullName = existingUser.full_name || 'Employee';
            }

            updates.push(
              base44.entities.User.update(existingUser.id, {
                full_name: fullName,
                first_name: pending.first_name || existingUser.first_name || '',
                last_name: pending.last_name || existingUser.last_name || '',
                phone: pending.phone || existingUser.phone || '',
                position: pending.position || existingUser.position || '',
                department: pending.department || existingUser.department || '',
                address: pending.address || existingUser.address || '',
                dob: pending.dob || existingUser.dob || '',
                ssn_tax_id: pending.ssn_tax_id || existingUser.ssn_tax_id || '',
                tshirt_size: pending.tshirt_size || existingUser.tshirt_size || '',
                team_id: pending.team_id || existingUser.team_id || '',
                team_name: pending.team_name || existingUser.team_name || '',
                direct_manager_name: pending.direct_manager_name || existingUser.direct_manager_name || '',
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
      }
      ReactSetLastSyncTime(Date.now()); 
    },
    onError: (error) => {
      console.log('Sync user data error (silent):', error.message);
      ReactSetLastSyncTime(Date.now()); 
    }
  });

  // OPTIMIZED: Increased delay and interval for auto-sync
  React.useEffect(() => {
    if (!isLoading && !isPendingLoading && pendingEmployees.length > 0) {
      const timeoutId = setTimeout(() => {
        if (!autoCreateUsersMutation.isPending && !autoCreateUsersMutation.isSuccess && !autoCreateUsersMutation.isError) {
           autoCreateUsersMutation.mutate();
        }
      }, 5000); // Increased from 2000 to 5000ms

      return () => clearTimeout(timeoutId);
    }
  }, [pendingEmployees.length, isLoading, isPendingLoading, autoCreateUsersMutation]);

  // OPTIMIZED: Increased sync interval
  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    const minSyncInterval = 300000; // Increased to 5 minutes

    if (!isLoading && !isPendingLoading && employees.length > 0 && pendingEmployees.length > 0) {
      if (timeSinceLastSync > minSyncInterval) {
        const timeoutId = setTimeout(() => {
          syncUserDataMutation.mutate();
        }, 10000); // Increased from 5000 to 10000ms

        return () => clearTimeout(timeoutId);
      }
    }
  }, [employees.length, pendingEmployees.length, isLoading, isPendingLoading, lastSyncTime, syncUserDataMutation]);

  const deletePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast({ title: t('success'), description: t('employeeDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToDeleteEmployee') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  const archivePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast({ title: t('success'), description: t('employeeArchived') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToArchiveEmployee') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  const restorePendingMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      toast({ title: t('success'), description: t('employeeRestoredToPending') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToRestoreEmployee') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (employee) => {
      if (!employee.email) throw new Error(t('cannotInviteWithoutEmail'));

      const appUrl = window.location.origin;
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name || 'Employee';

      // Create user in User entity if doesn't exist
      const existingUser = employees.find(e => e.email === employee.email);
      if (!existingUser) {
        try {
          await base44.entities.User.create({
            email: employee.email,
            full_name: fullName,
            first_name: employee.first_name,
            last_name: employee.last_name,
            role: 'user',
            phone: employee.phone,
            position: employee.position,
            department: employee.department,
            address: employee.address,
            dob: employee.dob,
            ssn_tax_id: employee.ssn_tax_id,
            tshirt_size: employee.tshirt_size,
            team_id: employee.team_id,
            team_name: employee.team_name,
            direct_manager_name: employee.direct_manager_name,
            employment_status: 'pending_registration' 
          });
        } catch (error) {
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            throw error;
          }
        }
      }

      // Send automated welcome email
      try {
        const emailBody = language === 'es' 
          ? `Hola ${employee.first_name || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma de gestión empresarial.\n\nPara acceder:\n1. Abre este link: ${appUrl}\n2. La primera vez, crea tu cuenta con tu email: ${employee.email}\n3. Crea tu contraseña\n4. ¡Listo! Ya puedes usar la app\n\nSi ya tienes cuenta, simplemente inicia sesión con tu email y contraseña.\n\n⚠️ IMPORTANTE: Usa el email ${employee.email} para registrarte.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\n¡Bienvenido al equipo!\nMCI Team`
          : `Hello ${employee.first_name || fullName},\n\nWelcome to MCI Connect!\n\nYou have been invited to join our business management platform.\n\nTo access:\n1. Open this link: ${appUrl}\n2. First time: Create your account with your email: ${employee.email}\n3. Create your password\n4. Done! You can now use the app\n\nIf you already have an account, just log in with your email and password.\n\n⚠️ IMPORTANT: Use the email ${employee.email} to register.\n\nIf you have any questions, don't hesitate to contact us.\n\nWelcome to the team!\nMCI Team`;

        await base44.integrations.Core.SendEmail({
          to: employee.email,
          subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
          body: emailBody,
          from_name: 'MCI Connect'
        });
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      // Update PendingEmployee status
      const now = new Date().toISOString();
      await base44.entities.PendingEmployee.update(employee.id, {
        status: 'invited',
        invited_date: now,
        last_invitation_sent: now,
        invitation_count: (employee.invitation_count || 0) + 1
      });

      return { employee, appUrl, fullName };
    },
    onSuccess: ({ employee, appUrl, fullName }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast({
        title: language === 'es' ? '✅ Invitación Enviada' : '✅ Invitation Sent',
        description: language === 'es' 
          ? `Email enviado a ${employee.email}. El empleado recibirá instrucciones completas.`
          : `Email sent to ${employee.email}. Employee will receive complete instructions.`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToInviteEmployee') + `: ${error.message}`, variant: 'destructive' });
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (employee) => {
      if (!employee.email) throw new Error(t('cannotInviteWithoutEmail'));

      const appUrl = window.location.origin;
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name || 'Employee';

      // Send reminder email
      try {
        const emailBody = language === 'es'
          ? `Hola ${employee.first_name || fullName},\n\nEste es un recordatorio sobre tu invitación a MCI Connect.\n\nAbre este link para acceder:\n${appUrl}\n\nLuego:\n- Si ya tienes cuenta: Inicia sesión con ${employee.email}\n- Si es tu primera vez: Crea tu cuenta usando ${employee.email}\n\n¿Necesitas ayuda? Contáctanos.\n\nSaludos,\nMCI Team`
          : `Hi ${employee.first_name || fullName},\n\nThis is a reminder about your MCI Connect invitation.\n\nOpen this link to access:\n${appUrl}\n\nThen:\n- If you have an account: Log in with ${employee.email}
- If it's your first time: Create your account using ${employee.email}\n\nNeed help? Contact us.\n\nBest regards,\nMCI Team`;

        await base44.integrations.Core.SendEmail({
          to: employee.email,
          subject: language === 'es' ? 'Recordatorio: Acceso a MCI Connect' : 'Reminder: MCI Connect Access',
          body: emailBody,
          from_name: 'MCI Connect'
        });
      } catch (error) {
        console.error('Failed to send reminder email:', error);
      }

      // Update invitation count
      const now = new Date().toISOString();
      await base44.entities.PendingEmployee.update(employee.id, {
        last_invitation_sent: now,
        invitation_count: (employee.invitation_count || 0) + 1
      });

      return { employee, appUrl, fullName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      
      toast({
        title: language === 'es' ? '✅ Recordatorio Enviado' : '✅ Reminder Sent',
        description: language === 'es'
          ? 'Email de recordatorio enviado exitosamente'
          : 'Reminder email sent successfully',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToResendInvitation') + `: ${error.message}`, variant: 'destructive' });
    }
  });

  const restoreDeletedEmployeeMutation = useMutation({
    mutationFn: async (employeeId) => {
      return { employeeId };
    },
    onSuccess: (data) => {
      const employee = employees.find(e => e.id === data.employeeId);
      
      alert(`⚠️ ${t('restoreAccessFor')} ${employee.full_name}:\n\n1. ${t('openDashboardInBrowser')}\n2. ${t('goToDataUser')}\n3. ${t('searchFor')} ${employee.email}\n4. ${t('clickEdit')}\n5. ${t('changeEmploymentStatusFromDeletedToActive')}\n6. ${t('saveChanges')}\n\n✅ ${t('employeeCanAccessAppAgain')}`);
      
      window.open('https://app.base44.com/dashboard/data/User', '_blank');
    }
  });

  const handleEditPending = (employee) => {
    setEditingEmployee(employee);
    setIsPendingEdit(true);
    setShowDialog(true); // Renamed from setShowForm
  };

  const handleEditActive = (employee) => {
    setEditingEmployee(employee);
    setIsPendingEdit(false);
    setShowDialog(true); // Renamed from setShowForm
  };

  const handleCloseForm = () => {
    setShowDialog(false); // Renamed from setShowForm
    setEditingEmployee(null);
    setIsPendingEdit(false);
  };

  const handleResendInvite = (employee) => {
    resendInviteMutation.mutate(employee);
  };

  const handleRestoreDeleted = (employee) => {
    if (window.confirm(t('confirmRestoreEmployeeAccess', { fullName: employee.full_name }))) {
      restoreDeletedEmployeeMutation.mutate(employee.id);
    }
  };

  const handleViewAIInsights = (employee) => {
    setSelectedEmployeeForAI(employee);
    setShowAIInsights(true);
  };

  // Helper function to get display name
  const getDisplayName = (employee) => {
    if (employee.first_name || employee.last_name) {
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      if (fullName) return fullName;
    }
    
    if (employee.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
      return employee.full_name;
    }
    
    if (employee.email) {
      const emailName = employee.email.split('@')[0];
      return emailName
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    
    return t('unknownEmployee');
  };

  const needsNameConfiguration = (employee) => {
    return !employee.first_name || !employee.last_name;
  };

  // Sync to Directory mutation (renamed from syncToDirectoryMutation in outline for consistency)
  const syncMutation = useMutation({ // Renamed from syncToDirectoryMutation as per outline
    mutationFn: async () => {
      const employeesToSync = employees.filter(e => {
        const status = e.employment_status;
        return (status !== 'deleted' && status !== 'archived' && status !== 'pending_registration') && e.email;
      });

      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const existingDirectoryMap = new Map(existingDirectory.map(d => [d.employee_email, d]));

      for (const emp of employeesToSync) {
        const existing = existingDirectoryMap.get(emp.email);

        const directoryData = {
          employee_email: emp.email,
          full_name: emp.full_name || '',
          position: emp.position || '',
          department: emp.department || '',
          phone: emp.phone || '',
          profile_photo_url: emp.profile_photo_url || '',
          status: 'active'
        };

        if (existing) {
          let needsUpdate = false;
          for (const key in directoryData) {
            if (directoryData[key] !== existing[key]) {
              needsUpdate = true;
              break;
            }
          }
          if (existing.status !== 'active') needsUpdate = true; // Also update if status changed to active

          if (needsUpdate) {
            await base44.entities.EmployeeDirectory.update(existing.id, directoryData);
          }
        } else {
          await base44.entities.EmployeeDirectory.create(directoryData);
        }
      }

      const activeEmails = new Set(employeesToSync.map(e => e.email));
      const toDeactivate = existingDirectory.filter(d =>
        !activeEmails.has(d.employee_email) && d.status === 'active'
      );

      for (const d of toDeactivate) {
        await base44.entities.EmployeeDirectory.update(d.id, { status: 'inactive' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDirectory'] });
      toast({ title: t('success'), description: t('directorySyncedSuccessfully') });
    },
    onError: (error) => {
      console.error('Directory sync error:', error);
      toast({ title: t('error'), description: t('failedToSyncDirectory') + `: ${error.message}`, variant: 'destructive' });
    }
  });

  const handleManualSync = () => { // New function as per outline
    syncMutation.mutate();
  };

  // --- FILTERING LOGIC based on outline and existing structure ---
  // Apply search term to all relevant employee lists first
  const searchFilteredEmployees = employees.filter(emp =>
    getDisplayName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchFilteredPendingEmployees = pendingEmployees.filter(emp => {
    const fullName = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Then apply tab-specific and showInactive filters
  const displayedActiveEmployees = searchFilteredEmployees.filter(emp => {
    const isNotDeletedOrArchived = emp.employment_status !== 'deleted' && emp.employment_status !== 'archived';
    
    if (showInactive) {
      // If showInactive is true, display 'active', 'inactive', 'pending_registration', etc. but exclude deleted/archived.
      return isNotDeletedOrArchived;
    } else {
      // If showInactive is false, only display 'active' or default (undefined/null) status.
      // This also includes 'pending_registration' which is a form of active (not deleted/archived) but awaiting completion
      return isNotDeletedOrArchived && (emp.employment_status === 'active' || emp.employment_status === 'pending_registration' || !emp.employment_status);
    }
  });

  const displayedPendingTabEmployees = searchFilteredPendingEmployees.filter(e => e.status === 'pending');
  const displayedInvitedTabEmployees = searchFilteredPendingEmployees.filter(e => e.status === 'invited');
  const displayedRegisteredTabEmployees = searchFilteredPendingEmployees.filter(e => e.status === 'active');
  const displayedArchivedTabEmployees = searchFilteredPendingEmployees.filter(e => e.status === 'archived');
  const displayedDeletedTabEmployees = searchFilteredEmployees.filter(emp => emp.employment_status === 'deleted');

  const pendingInvitations = searchFilteredPendingEmployees.filter(e => e.status === 'invited' && !e.registered_date);


  // Re-calculate counts based on the new filtered arrays for tabs
  const pendingCount = displayedPendingTabEmployees.length;
  const invitedCount = displayedInvitedTabEmployees.length;
  const activePendingCount = displayedRegisteredTabEmployees.length;
  const archivedCount = displayedArchivedTabEmployees.length;
  const deletedCount = displayedDeletedTabEmployees.length;
  // ------------------------------------------------------------------

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8"> {/* This div replaces PageHeader based on outline */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{t('employeeManagement')}</h1>
              <p className="text-slate-600 mt-1">{t('manageYourTeamMembers')}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* NEW: Prompt #57 - Toggle for inactive employees */}
              {activeTab === 'active' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="show-inactive"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="w-4 h-4 accent-[#3B9FF3]"
                  />
                  <label htmlFor="show-inactive" className="text-sm text-slate-700 cursor-pointer">
                    Show Inactive Employees
                  </label>
                </div>
              )}
              
              <Button
                onClick={handleManualSync} // Changed to handleManualSync as per outline
                variant="outline"
                disabled={syncMutation.isPending} // Changed from syncToDirectoryMutation
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Users className="w-4 h-4 mr-2" />
                {syncMutation.isPending ? t('syncing') + '...' : t('manualSync')} {/* Changed from syncToDirectoryMutation */}
              </Button>
              <Button onClick={() => { setEditingEmployee(null); setIsPendingEdit(true); setShowDialog(true); }} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/20">
                <Plus className="w-5 h-5 mr-2" />
                {t('addEmployee')}
              </Button>
            </div>
          </div>

          {/* Alert for pending invitations */}
          {pendingInvitations.length > 0 && (
            <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
              <AlertDescription className="text-blue-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>
                  <strong>{pendingInvitations.length}</strong> {language === 'es' ? 'invitaciones pendientes de aceptación' : 'pending invitations awaiting acceptance'}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {pendingCount > 0 && (
            <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
              <AlertDescription className="text-yellow-400">
                ⚠️ {t('youHaveXPendingEmployees', { count: pendingCount })}
              </AlertDescription>
            </Alert>
          )}

          {deletedCount > 0 && (
            <Alert className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-400">
                ⚠️ {t('youHaveXDeletedEmployees', { count: deletedCount })}
              </AlertDescription>
            </Alert>
          )}
          
          {activePendingCount > 0 && (
            <Alert className="mb-6 bg-green-500/10 border-green-500/30">
              <AlertDescription className="text-green-400">
                ✅ {t('xEmployeesHaveRegistered', { count: activePendingCount })}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Search input wrapped in Card as per outline */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mb-6">
          <CardContent className="p-4"> {/* Changed padding to p-4 as per outline */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
              <Input
                placeholder={t('searchEmployees')}
                value={searchTerm} // Using searchTerm from original code
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500" // Updated classes
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('active')} ({displayedActiveEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('pending')} ({pendingCount})
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-black text-xs">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending_invitations" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              Pending Invitations ({pendingInvitations.length})
              {pendingInvitations.length > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white text-xs">{pendingInvitations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invited" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('invited')} ({invitedCount})
            </TabsTrigger>
            <TabsTrigger value="registered" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('registered')} ({activePendingCount})
            </TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('archived')} ({archivedCount})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <span className="flex items-center gap-2">
                {t('deleted')} ({deletedCount})
                {deletedCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{deletedCount}</Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedActiveEmployees.map((employee) => { // Using new displayedActiveEmployees
                const displayName = getDisplayName(employee);
                const needsConfig = needsNameConfiguration(employee);
                
                // NEW: Prompt #57 - Style inactive employees differently
                const isInactive = employee.employment_status === 'inactive';
                const cardClassName = isInactive 
                  ? 'opacity-60 bg-slate-100 border-slate-300' 
                  : 'bg-white/90 backdrop-blur-sm border-slate-200';
                const textClassName = isInactive ? 'text-slate-500' : 'text-slate-900';

                return (
                  <Card key={employee.id} className={`${cardClassName} shadow-lg hover:shadow-xl transition-all duration-300 group`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {employee.profile_photo_url ? (
                          <img
                            src={employee.profile_photo_url}
                            alt={displayName}
                            className={`w-16 h-16 rounded-full object-cover border-2 border-cyan-500/30 ${isInactive ? 'grayscale' : ''}`}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold ${textClassName} truncate`}>{displayName}</h3>
                            {needsConfig && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                ⚠️
                              </Badge>
                            )}
                            {isInactive && (
                              <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm ${isInactive ? 'text-slate-500' : 'text-cyan-700'} truncate`}>{employee.position || t('noPosition')}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employee.department && (
                              <Badge variant="outline" className={`text-xs ${isInactive ? 'border-slate-300 text-slate-500' : 'border-slate-300 text-slate-700'}`}>
                                {employee.department}
                              </Badge>
                            )}
                            {employee.team_name && (
                              <Badge className={`text-xs ${isInactive ? 'bg-purple-500/10 text-purple-500 border-purple-200' : 'bg-purple-500/20 text-purple-700 border-purple-300'}`}>
                                <Building2 className="w-3 h-3 mr-1" />
                                {employee.team_name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={`hover:bg-slate-100 ${isInactive ? 'text-slate-400 hover:text-slate-500' : 'text-slate-500 hover:text-slate-700'}`}>
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white border-slate-200">
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl(`EmployeeProfile?id=${employee.id}`)} className="flex items-center cursor-pointer text-slate-700 hover:bg-slate-100">
                                <ChevronRight className="w-4 h-4 mr-2" />
                                {t('viewProfile')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditActive(employee)} className="text-slate-700 hover:bg-slate-100">
                              <Edit className="w-4 h-4 mr-2" />
                              {t('editEmployee')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {needsConfig && (
                        <Alert className="mb-3 bg-yellow-500/10 border-yellow-500/30">
                          <AlertDescription className="text-yellow-700 text-xs">
                            ⚠️ {t('nameNeedsConfigurationInstruction')}
                          </AlertDescription>
                        </Alert>
                      )}

                      {isInactive && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700 font-medium">⚠️ {t('inactiveEmployee')}</p>
                        </div>
                      )}

                      <div className="space-y-1 text-sm">
                        <div className={`flex items-center gap-2 ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className={`flex items-center gap-2 ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                            <Phone className="w-3 h-3" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link to={createPageUrl(`EmployeeProfile?id=${employee.id}`)}>
                          <Button variant="outline" size="sm" className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700">
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewProfile')}
                          </Button>
                        </Link>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAIInsights(employee)}
                          className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Insights
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {displayedActiveEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noActiveEmployeesFound')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending_invitations">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  Pending Invitations Dashboard
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  Track all employees who have been invited but haven't registered yet. Follow up with employees who haven't responded.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Total Pending</p>
                    <p className="text-2xl font-bold text-white">{pendingInvitations.length}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Over 7 Days</p>
                    <p className="text-2xl font-bold text-red-400">
                      {pendingInvitations.filter(e => {
                        const days = differenceInDays(new Date(), new Date(e.invited_date));
                        return days > 7;
                      }).length}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Recent (&lt; 3 Days)</p>
                    <p className="text-2xl font-bold text-green-400">
                      {pendingInvitations.filter(e => {
                        const days = differenceInDays(new Date(), new Date(e.invited_date));
                        return days <= 3;
                      }).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingInvitations
                  .sort((a, b) => new Date(a.invited_date) - new Date(b.invited_date)) // Oldest first
                  .map((employee) => (
                    <PendingInvitationCard
                      key={employee.id}
                      employee={employee}
                      onResend={handleResendInvite}
                      isResending={resendInviteMutation.isPending}
                    />
                  ))}
              </div>

              {pendingInvitations.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-slate-500">All invitations have been accepted! 🎉</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPendingTabEmployees.map((employee) => ( // Using new displayedPendingTabEmployees
                  <PendingEmployeeCard
                    key={employee.id}
                    employee={employee}
                    onInvite={(emp) => inviteMutation.mutate(emp)}
                    onResendInvite={handleResendInvite}
                    onEdit={handleEditPending}
                    onDelete={(id) => {
                      if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                        deletePendingMutation.mutate(id);
                      }
                    }}
                    onArchive={(id) => {
                      if (window.confirm(t('confirmArchiveEmployee'))) {
                        archivePendingMutation.mutate(id);
                      }
                    }}
                  />
                ))}
            </div>
            {displayedPendingTabEmployees.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noPendingEmployees')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invited">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedInvitedTabEmployees.map((employee) => ( // Using new displayedInvitedTabEmployees
                  <PendingEmployeeCard
                    key={employee.id}
                    employee={employee}
                    onInvite={(emp) => inviteMutation.mutate(emp)}
                    onResendInvite={handleResendInvite}
                    onEdit={handleEditPending}
                    onDelete={(id) => {
                      if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                        deletePendingMutation.mutate(id);
                      }
                    }}
                    onArchive={(id) => {
                      if (window.confirm(t('confirmArchiveEmployee'))) {
                        archivePendingMutation.mutate(id);
                      }
                    }}
                  />
                ))}
            </div>
            {displayedInvitedTabEmployees.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noInvitedEmployees')}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="registered">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedRegisteredTabEmployees.map((employee) => ( // Using new displayedRegisteredTabEmployees
                  <PendingEmployeeCard
                    key={employee.id}
                    employee={{ ...employee, status: 'active' }}
                    onEdit={handleEditPending}
                    onDelete={(id) => {
                      if (window.confirm(t('confirmDeleteEmployeePermanently'))) {
                        deletePendingMutation.mutate(id);
                      }
                    }}
                    onArchive={(id) => {
                      if (window.confirm(t('confirmArchiveEmployee'))) {
                        archivePendingMutation.mutate(id);
                      }
                    }}
                  />
                ))}
            </div>
            {displayedRegisteredTabEmployees.length === 0 && (
              <div className="text-center py-12">
                <Check className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noRegisteredEmployees')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedArchivedTabEmployees.map((employee) => ( // Using new displayedArchivedTabEmployees
                  <PendingEmployeeCard
                    key={employee.id}
                    employee={employee}
                    onEdit={handleEditPending}
                    onResendInvite={handleResendInvite}
                    onDelete={(id) => {
                      if (window.confirm(t('confirmDeleteEmployeePermanentlyUndone'))) {
                        deletePendingMutation.mutate(id);
                      }
                    }}
                    onRestore={(id) => {
                      if (window.confirm(t('confirmRestoreEmployeeToPending'))) {
                        restorePendingMutation.mutate(id);
                      }
                    }}
                  />
                ))}
            </div>
            {displayedArchivedTabEmployees.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noArchivedEmployees')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedDeletedTabEmployees.map((employee) => ( // Using new displayedDeletedTabEmployees
                <Card key={employee.id} className="glass-card shadow-xl border-red-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {employee.profile_photo_url ? (
                        <img
                          src={employee.profile_photo_url}
                          alt={employee.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-red-500/30 grayscale"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {employee.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        <h3 className="font-bold text-slate-400 line-through">{employee.full_name}</h3>
                        <p className="text-sm text-slate-500">{employee.position || t('noPosition')}</p>
                        <Badge className="mt-2 bg-red-500/20 text-red-400 border-red-500/30">
                          <UserX className="w-3 h-3 mr-1" />
                          {t('deletedAndBlocked')}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 mb-3">
                        ⚠️ {t('allDataDeletedEmployeeBlocked')}
                      </p>
                      <Button
                        onClick={() => handleRestoreDeleted(employee)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t('restoreAccess')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {displayedDeletedTabEmployees.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noDeletedEmployees')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog for editing PENDING employee with Onboarding Tracker */}
        {showDialog && editingEmployee && isPendingEdit && ( // Renamed from showForm
          <Dialog open={showDialog} onOpenChange={handleCloseForm}> {/* Renamed from showForm */}
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {t('employee')} - {editingEmployee.first_name} {editingEmployee.last_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <EmployeeForm
                    employee={editingEmployee}
                    onClose={handleCloseForm}
                    isPending={true}
                  />
                </div>
                
                <div>
                  <OnboardingTracker employee={editingEmployee} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Original Dialog for adding new PENDING employee OR editing ACTIVE employee */}
        {showDialog && (!editingEmployee || !isPendingEdit) && ( // Renamed from showForm
          <Dialog open={showDialog} onOpenChange={handleCloseForm}> {/* Renamed from showForm */}
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {t('employee')}
                </DialogTitle>
              </DialogHeader>
              {isPendingEdit ? (
                <EmployeeForm
                  employee={editingEmployee}
                  onClose={handleCloseForm}
                  isPending={true}
                />
              ) : (
                <ActiveEmployeeForm
                  employee={editingEmployee}
                  onClose={handleCloseForm}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                AI Performance Insights - {selectedEmployeeForAI && getDisplayName(selectedEmployeeForAI)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEmployeeForAI && (
              <div className="py-4">
                <AIPerformanceAnalyzer
                  employee={selectedEmployeeForAI}
                  timeEntries={allTimeEntries.filter(e => e.employee_email === selectedEmployeeForAI.email)}
                  jobs={allJobs}
                  expenses={allExpenses.filter(e => e.employee_email === selectedEmployeeForAI.email)}
                  drivingLogs={allDrivingLogs.filter(l => l.employee_email === selectedEmployeeForAI.email)}
                  certifications={allCertifications.filter(c => c.employee_email === selectedEmployeeForAI.email)}
                  recognitions={allRecognitions.filter(r => r.employee_email === selectedEmployeeForAI.email)}
                  allEmployees={employees} // Use the general employees list
                  showFullAnalysis={true}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </div>
  );
}
