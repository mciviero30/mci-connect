
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
  FileText, // For W-9/Agreement review
  RefreshCcw // For resend onboarding link
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubcontractorOnboardingForm from "../components/subcontractors/SubcontractorOnboardingForm"; // Renamed from EmployeeForm
import ActiveSubcontractorForm from "../components/subcontractors/ActiveSubcontractorForm"; // Renamed from ActiveEmployeeForm
import AIPerformanceAnalyzer from "../components/empleados/AIPerformanceAnalyzer"; // Still uses 'empleados' for now
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays } from "date-fns";
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

import OnboardingTracker from "../components/empleados/OnboardingTracker"; // Still uses 'empleados' for now

// Renamed and refactored from PendingEmployeeCard
const OnboardingReviewCard = ({ subcontractor, onSendOnboardingLink, onDelete, onArchive, onRestore, onEdit, canActivate, onActivate }) => {
  const { t } = useLanguage();

  const getFullName = () => {
    if (subcontractor.full_name) return subcontractor.full_name;
    if (subcontractor.first_name && subcontractor.last_name) return `${subcontractor.first_name} ${subcontractor.last_name}`;
    if (subcontractor.first_name) return subcontractor.first_name;
    if (subcontractor.last_name) return subcontractor.last_name;
    return t('noName');
  };

  const statusColors = {
    PENDIENTE_ONBOARDING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    ACTIVO: "bg-green-500/20 text-green-400 border-green-500/30", // For pending_employee that completed onboarding
    ARCHIVADO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  const statusIcons = {
    PENDIENTE_ONBOARDING: <Clock className="w-3 h-3" />,
    ACTIVO: <Check className="w-3 h-3" />,
    ARCHIVADO: <Archive className="w-3 h-3" />,
  };

  const hasW9AndAgreement = subcontractor.w9_completed && subcontractor.agreement_signed;

  return (
    <Card className="glass-card shadow-xl border-slate-700 hover:border-cyan-500/30 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">{getFullName()}</h3>
            <p className="text-cyan-400 text-sm">{subcontractor.position || t('noPosition')}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={statusColors[subcontractor.status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                <span className="flex items-center gap-1">
                  {statusIcons[subcontractor.status] || <Clock className="w-3 h-3" />}
                  {t(subcontractor.status)}
                </span>
              </Badge>
              {subcontractor.team_name && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Building2 className="w-3 h-3 mr-1" />
                  {subcontractor.team_name}
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
              <DropdownMenuItem onClick={() => onEdit(subcontractor)} className="text-white hover:bg-slate-800">
                <Edit className="w-4 h-4 mr-2" />
                {t('editSubcontractor')}
              </DropdownMenuItem>
              {(subcontractor.status === 'PENDIENTE_ONBOARDING' || subcontractor.status === 'invited') && subcontractor.email && (
                <DropdownMenuItem onClick={() => onSendOnboardingLink(subcontractor)} className="text-white hover:bg-slate-800">
                  <Mail className="w-4 h-4 mr-2" />
                  {subcontractor.onboarding_link ? t('resendOnboardingLink') : t('sendOnboardingLink')}
                </DropdownMenuItem>
              )}
              {subcontractor.status !== 'ARCHIVADO' && (
                <DropdownMenuItem onClick={() => onArchive(subcontractor.id)} className="text-white hover:bg-slate-800">
                  <Archive className="w-4 h-4 mr-2" />
                  {t('archive')}
                </DropdownMenuItem>
              )}
              {subcontractor.status === 'ARCHIVADO' && (
                <DropdownMenuItem onClick={() => onRestore(subcontractor.id)} className="text-white hover:bg-slate-800">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('restoreToOnboarding')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(subcontractor.id)} className="text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deletePermanently')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {subcontractor.email && (
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="truncate">{subcontractor.email}</span>
            </div>
          )}
          {!subcontractor.email && (subcontractor.status === 'PENDIENTE_ONBOARDING' || subcontractor.status === 'invited') && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-400 text-xs">
                ⚠️ {t('noEmailCannotSendLink')}
              </AlertDescription>
            </Alert>
          )}
          {subcontractor.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{subcontractor.phone}</span>
            </div>
          )}
          {subcontractor.onboarding_link && (
            <div className="flex items-center gap-2 text-slate-300">
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <a href={subcontractor.onboarding_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                {t('onboardingLink')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className={`w-4 h-4 ${subcontractor.w9_completed ? 'text-green-500' : 'text-orange-500'}`} />
            <span>W-9: {subcontractor.w9_completed ? t('completed') : t('pending')}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className={`w-4 h-4 ${subcontractor.agreement_signed ? 'text-green-500' : 'text-orange-500'}`} />
            <span>{t('agreement')}: {subcontractor.agreement_signed ? t('signed') : t('pending')}</span>
          </div>
          {subcontractor.last_invitation_sent && (
            <div className="text-xs text-slate-500 mt-2">
              {t('lastLinkSent')}: {format(new Date(subcontractor.last_invitation_sent), 'MMM dd, yyyy HH:mm')}
            </div>
          )}
        </div>
        {canActivate && (
          <Button
            onClick={() => onActivate(subcontractor)}
            className="mt-4 w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
          >
            <Check className="w-4 h-4 mr-2" />
            {t('activateSubcontractor')}
          </Button>
        )}
        {!hasW9AndAgreement && (subcontractor.status === 'PENDIENTE_ONBOARDING' || subcontractor.status === 'invited') && (
            <Alert className="mt-4 bg-yellow-500/10 border-yellow-500/30">
              <AlertDescription className="text-yellow-400 text-xs flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {t('awaitingW9Agreement')}
              </AlertDescription>
            </Alert>
          )}
      </CardContent>
    </Card>
  );
};


export default function Subcontractors() { // Renamed from Empleados
  const { t, language } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState(null); // Renamed from editingEmployee
  const [isPendingEdit, setIsPendingEdit] = useState(false); // For PendingEmployee entity
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // Default to 'active'
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastSyncTime, setLastSyncTime] = React.useState(0);

  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedSubcontractorForAI, setSelectedSubcontractorForAI] = useState(null); // Renamed from selectedEmployeeForAI

  const [showInactive, setShowInactive] = useState(false); // Toggle for showing inactive subcontractors

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    staleTime: Infinity
  });

  // Fetch `User` entities - these are the fully registered, active/archived/terminated subcontractors
  const { data: subcontractors = [], isLoading } = useQuery({
    queryKey: ['subcontractors'], // Renamed from employees
    queryFn: async () => {
      try {
        return await base44.entities.User.list('full_name');
      } catch (error) {
        console.error('Error loading subcontractors:', error);
        return [];
      }
    },
    staleTime: 60000,
    retry: 1
  });

  // Fetch `PendingEmployee` entities - these are for onboarding and W-9 review
  const { data: onboardingSubcontractors = [], isLoading: isOnboardingLoading } = useQuery({ // Renamed from pendingEmployees
    queryKey: ['onboardingSubcontractors'], // Renamed from pendingEmployees
    queryFn: async () => {
      try {
        return await base44.entities.PendingEmployee.list('-created_date');
      } catch (error) {
        console.error('Error loading onboarding subcontractors:', error);
        return [];
      }
    },
    staleTime: 60000,
    retry: 1
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allRecognitions = [] } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list('-date'),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allCertifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date'),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allDrivingLogs = [] } = useQuery({
    queryKey: ['drivingLogs'],
    queryFn: () => base44.entities.DrivingLog.list('-date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  // This mutation is re-purposed or removed based on the new flow.
  // Given the outline, user creation is driven by the onboarding link.
  // This mutation would only apply if there's a need to manually create `User` records with `PENDIENTE_ONBOARDING` status.
  // For now, I will modify it to create/update `User` with `employment_status: 'PENDIENTE_ONBOARDING'` if they don't exist
  // based on `onboardingSubcontractors` that have `email` but no corresponding `User` record.
  const autoCreateUsersMutation = useMutation({
    mutationFn: async () => {
      const subcontractorsWithEmail = onboardingSubcontractors.filter(e => e.email);
      const existingUserEmails = new Set(subcontractors.map(e => e.email));
      const created = [];

      for (const pending of subcontractorsWithEmail) {
        if (existingUserEmails.has(pending.email)) continue; // User already exists

        let fullName = pending.full_name || `${pending.first_name || ''} ${pending.last_name || ''}`.trim() || 'Subcontractor';

        try {
          await base44.entities.User.create({
            email: pending.email,
            full_name: fullName,
            first_name: pending.first_name || '',
            last_name: pending.last_name || '',
            role: 'user', // Default role
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
            employment_status: 'PENDIENTE_ONBOARDING' // Initial status for auto-created users
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
        queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      }
    },
    onError: (error) => {
      console.log('Auto-create users error (silent):', error.message);
    }
  });


  // This mutation is now crucial for promoting `PENDIENTE_ONBOARDING` to `ACTIVO` in the `User` entity
  const syncUserDataMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      // Identify `PendingEmployee` records that have completed W-9/Agreement and are not yet 'ACTIVO' in User
      const completedOnboarding = onboardingSubcontractors.filter(p =>
        (p.status === 'PENDIENTE_ONBOARDING' || p.status === 'invited' || p.status === 'active') &&
        p.email &&
        p.w9_completed &&
        p.agreement_signed
      );

      for (const pending of completedOnboarding) {
        const existingUser = subcontractors.find(u => u.email === pending.email);

        const newUserData = {
          full_name: pending.full_name || `${pending.first_name || ''} ${pending.last_name || ''}`.trim(),
          first_name: pending.first_name || '',
          last_name: pending.last_name || '',
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
          employment_status: 'ACTIVO' // Set to ACTIVO after onboarding completion
        };

        if (existingUser) {
          // Check if any data fields are different or if status needs promotion
          let needsUpdate = false;
          for (const key in newUserData) {
            if (newUserData[key] !== existingUser[key]) {
              needsUpdate = true;
              break;
            }
          }
          if (existingUser.employment_status !== 'ACTIVO') {
            needsUpdate = true; // Always update to ACTIVO if completed onboarding
          }

          if (needsUpdate) {
            updates.push(
              base44.entities.User.update(existingUser.id, newUserData)
            );
          }
        } else {
          // If a user doesn't exist but PendingEmployee completed onboarding, create it
          updates.push(
            base44.entities.User.create({ ...newUserData, email: pending.email, role: 'user' })
          );
        }

        // Also update the PendingEmployee's status if it's not already 'ACTIVO'
        if (pending.status !== 'ACTIVO') {
          updates.push(
            base44.entities.PendingEmployee.update(pending.id, { status: 'ACTIVO' })
          );
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
        queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });
        queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
        toast({ title: t('success'), description: t('subcontractorDataSynced'), duration: 3000 });
      }
      setLastSyncTime(Date.now());
    },
    onError: (error) => {
      console.log('Sync user data error (silent):', error.message);
      toast({ title: t('error'), description: t('failedToSyncSubcontractorData') + `: ${error.message}`, variant: 'destructive' });
      setLastSyncTime(Date.now());
    }
  });

  // Auto-create users if PendingEmployee exists but no User entity exists (initial population)
  React.useEffect(() => {
    if (!isLoading && !isOnboardingLoading && onboardingSubcontractors.length > 0) {
      const timeoutId = setTimeout(() => {
        if (!autoCreateUsersMutation.isPending && !autoCreateUsersMutation.isSuccess && !autoCreateUsersMutation.isError) {
           autoCreateUsersMutation.mutate();
        }
      }, 2000); // Debounce to allow initial data load

      return () => clearTimeout(timeoutId);
    }
  }, [onboardingSubcontractors.length, isLoading, isOnboardingLoading, autoCreateUsersMutation]);

  // Auto-sync data and promote to ACTIVO if W-9/Agreement are completed
  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    const minSyncInterval = 120000; // 2 minutes

    // Only run if there are potential candidates for promotion
    const hasCandidates = onboardingSubcontractors.some(p =>
      (p.status === 'PENDIENTE_ONBOARDING' || p.status === 'invited' || p.status === 'active') &&
      p.email &&
      p.w9_completed &&
      p.agreement_signed
    );

    if (!isLoading && !isOnboardingLoading && hasCandidates) {
      if (timeSinceLastSync > minSyncInterval) {
        const timeoutId = setTimeout(() => {
          if (!syncUserDataMutation.isPending) { // Prevent multiple simultaneous syncs
            syncUserDataMutation.mutate();
          }
        }, 5000); // Debounce before syncing

        return () => clearTimeout(timeoutId);
      }
    }
  }, [subcontractors.length, onboardingSubcontractors.length, isLoading, isOnboardingLoading, lastSyncTime, syncUserDataMutation]);


  const deleteOnboardingSubcontractorMutation = useMutation({ // Renamed from deletePendingMutation
    mutationFn: (id) => base44.entities.PendingEmployee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });
      toast({ title: t('success'), description: t('subcontractorDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToDeleteSubcontractor') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  const archiveOnboardingSubcontractorMutation = useMutation({ // Renamed from archivePendingMutation
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'ARCHIVADO' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });
      toast({ title: t('success'), description: t('subcontractorArchived') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToArchiveSubcontractor') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  const restoreOnboardingSubcontractorMutation = useMutation({ // Renamed from restorePendingMutation
    mutationFn: (id) => base44.entities.PendingEmployee.update(id, { status: 'PENDIENTE_ONBOARDING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });
      toast({ title: t('success'), description: t('subcontractorRestoredToOnboarding') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToRestoreSubcontractor') + `: ${error.message}`, variant: 'destructive' });
    },
  });

  // Handles sending the unique onboarding link
  const sendOnboardingLinkMutation = useMutation({
    mutationFn: async (subcontractorData) => {
      if (!subcontractorData.email) throw new Error(t('cannotSendLinkWithoutEmail'));

      const appUrl = window.location.origin;
      const fullName = `${subcontractorData.first_name || ''} ${subcontractorData.last_name || ''}`.trim() || subcontractorData.full_name || 'Subcontractor';

      // Ensure an onboarding link exists or generate a new one
      let onboardingLink = subcontractorData.onboarding_link;
      if (!onboardingLink) {
        // This is a placeholder. In a real scenario, base44 would generate a unique token
        // and a corresponding URL that leads to an onboarding page.
        // For now, we simulate a generic link + ID.
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        onboardingLink = `${appUrl}/onboarding?token=${subcontractorData.id}-${token}`; // Example dynamic link
        // Update the PendingEmployee record with this new link
        await base44.entities.PendingEmployee.update(subcontractorData.id, { onboarding_link: onboardingLink });
        queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] }); // Refresh to show new link
      }

      // Send automated welcome email with the onboarding link
      try {
        const emailBody = language === 'es'
          ? `Hola ${subcontractorData.first_name || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma de gestión.\n\nPara iniciar tu proceso de onboarding y completar tu perfil (incluyendo W-9 y Acuerdo de Subcontratista), por favor usa el siguiente enlace:\n${onboardingLink}\n\n⚠️ IMPORTANTE: Usa el email ${subcontractorData.email} para registrarte.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\n¡Bienvenido al equipo!\nMCI Team`
          : `Hello ${subcontractorData.first_name || fullName},\n\nWelcome to MCI Connect!\n\nYou have been invited to join our management platform.\n\nTo start your onboarding process and complete your profile (including W-9 and Subcontractor Agreement), please use the following link:\n${onboardingLink}\n\n⚠️ IMPORTANT: Use the email ${subcontractorData.email} to register.\n\nIf you have any questions, don't hesitate to contact us.\n\nWelcome to the team!\nMCI Team`;

        await base44.integrations.Core.SendEmail({
          to: subcontractorData.email,
          subject: language === 'es' ? '¡Bienvenido a MCI Connect - Enlace de Onboarding!' : 'Welcome to MCI Connect - Onboarding Link!',
          body: emailBody,
          from_name: 'MCI Connect'
        });
      } catch (error) {
        console.error('Failed to send onboarding email:', error);
      }

      // Update PendingEmployee status and invitation counts
      const now = new Date().toISOString();
      await base44.entities.PendingEmployee.update(subcontractorData.id, {
        status: 'PENDIENTE_ONBOARDING', // Explicitly set if it was 'pending' or 'invited' before
        last_invitation_sent: now,
        invitation_count: (subcontractorData.invitation_count || 0) + 1
      });

      return { subcontractorData, appUrl, fullName };
    },
    onSuccess: ({ subcontractorData }) => {
      queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });

      toast({
        title: t('success'),
        description: t('onboardingLinkSent') + ` ${subcontractorData.email}`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToSendOnboardingLink') + `: ${error.message}`, variant: 'destructive' });
    }
  });


  // Mutation to promote `PendingEmployee` to `ACTIVO` in the `User` entity
  const activateSubcontractorMutation = useMutation({
    mutationFn: async (subcontractorToActivate) => {
      if (!subcontractorToActivate.w9_completed || !subcontractorToActivate.agreement_signed) {
        throw new Error(t('w9AgreementRequiredForActivation'));
      }

      // 1. Update PendingEmployee status to ACTIVO
      await base44.entities.PendingEmployee.update(subcontractorToActivate.id, { status: 'ACTIVO' });

      // 2. Find or create User entity and set status to ACTIVO
      const existingUser = subcontractors.find(u => u.email === subcontractorToActivate.email);

      const userData = {
        email: subcontractorToActivate.email,
        full_name: subcontractorToActivate.full_name || `${subcontractorToActivate.first_name || ''} ${subcontractorToActivate.last_name || ''}`.trim(),
        first_name: subcontractorToActivate.first_name || '',
        last_name: subcontractorToActivate.last_name || '',
        role: 'user', // Default role
        phone: subcontractorToActivate.phone || '',
        position: subcontractorToActivate.position || '',
        department: subcontractorToActivate.department || '',
        address: subcontractorToActivate.address || '',
        dob: subcontractorToActivate.dob || '',
        ssn_tax_id: subcontractorToActivate.ssn_tax_id || '',
        tshirt_size: subcontractorToActivate.tshirt_size || '',
        team_id: subcontractorToActivate.team_id || '',
        team_name: subcontractorToActivate.team_name || '',
        direct_manager_name: subcontractorToActivate.direct_manager_name || '',
        employment_status: 'ACTIVO'
      };

      if (existingUser) {
        await base44.entities.User.update(existingUser.id, userData);
      } else {
        await base44.entities.User.create(userData);
      }
      return subcontractorToActivate;
    },
    onSuccess: (subcontractorToActivate) => {
      queryClient.invalidateQueries({ queryKey: ['onboardingSubcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      toast({
        title: t('success'),
        description: t('subcontractorActivated') + ` ${subcontractorToActivate.full_name || subcontractorToActivate.email}`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToActivateSubcontractor') + `: ${error.message}`, variant: 'destructive' });
    }
  });


  const restoreTerminatedSubcontractorMutation = useMutation({ // Renamed from restoreDeletedEmployeeMutation
    mutationFn: async (subcontractorId) => {
      return { subcontractorId };
    },
    onSuccess: (data) => {
      const subcontractor = subcontractors.find(e => e.id === data.subcontractorId);
      if (!subcontractor) return;

      alert(`⚠️ ${t('restoreAccessFor')} ${subcontractor.full_name}:\n\n1. ${t('openDashboardInBrowser')}\n2. ${t('goToDataUser')}\n3. ${t('searchFor')} ${subcontractor.email}\n4. ${t('clickEdit')}\n5. ${t('changeEmploymentStatusFromTerminatedToActive')}\n6. ${t('saveChanges')}\n\n✅ ${t('subcontractorCanAccessAppAgain')}`);

      window.open('https://app.base44.com/dashboard/data/User', '_blank');
    }
  });

  const handleEditOnboarding = (subcontractor) => { // Renamed from handleEditPending
    setEditingSubcontractor(subcontractor);
    setIsPendingEdit(true); // Signifies editing a PendingEmployee record
    setShowDialog(true);
  };

  const handleEditActive = (subcontractor) => { // Renamed from handleEditActive
    setEditingSubcontractor(subcontractor);
    setIsPendingEdit(false); // Signifies editing a User record
    setShowDialog(true);
  };

  const handleCloseForm = () => {
    setShowDialog(false);
    setEditingSubcontractor(null);
    setIsPendingEdit(false);
  };

  const handleResendOnboardingLink = (subcontractor) => { // Renamed from handleResendInvite
    sendOnboardingLinkMutation.mutate(subcontractor);
  };

  const handleRestoreTerminated = (subcontractor) => { // Renamed from handleRestoreDeleted
    if (window.confirm(t('confirmRestoreSubcontractorAccess', { fullName: subcontractor.full_name }))) {
      restoreTerminatedSubcontractorMutation.mutate(subcontractor.id);
    }
  };

  const handleViewAIInsights = (subcontractor) => { // Renamed from handleViewAIInsights
    setSelectedSubcontractorForAI(subcontractor);
    setShowAIInsights(true);
  };

  const getDisplayName = (subcontractor) => { // Renamed from getDisplayName
    if (subcontractor.first_name || subcontractor.last_name) {
      const fullName = `${subcontractor.first_name || ''} ${subcontractor.last_name || ''}`.trim();
      if (fullName) return fullName;
    }

    if (subcontractor.full_name && !subcontractor.full_name.includes('@') && !subcontractor.full_name.includes('.')) {
      return subcontractor.full_name;
    }

    if (subcontractor.email) {
      const emailName = subcontractor.email.split('@')[0];
      return emailName
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    return t('unknownSubcontractor');
  };

  const needsNameConfiguration = (subcontractor) => { // Renamed from needsNameConfiguration
    return !subcontractor.first_name || !subcontractor.last_name;
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const activeSubcontractors = subcontractors.filter(e => {
        const status = e.employment_status;
        return (status === 'ACTIVO') && e.email; // Only sync truly active ones
      });

      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const existingDirectoryMap = new Map(existingDirectory.map(d => [d.employee_email, d]));

      for (const sub of activeSubcontractors) { // Renamed from emp
        const existing = existingDirectoryMap.get(sub.email);

        const directoryData = {
          employee_email: sub.email,
          full_name: sub.full_name || '',
          position: sub.position || '',
          department: sub.department || '',
          phone: sub.phone || '',
          profile_photo_url: sub.profile_photo_url || '',
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
          if (existing.status !== 'active') needsUpdate = true;

          if (needsUpdate) {
            await base44.entities.EmployeeDirectory.update(existing.id, directoryData);
          }
        } else {
          await base44.entities.EmployeeDirectory.create(directoryData);
        }
      }

      // Deactivate those in directory but not in current active subcontractors
      const currentActiveEmails = new Set(activeSubcontractors.map(e => e.email));
      const toDeactivate = existingDirectory.filter(d =>
        !currentActiveEmails.has(d.employee_email) && d.status === 'active'
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

  const handleManualSync = () => {
    syncMutation.mutate();
  };

  // --- FILTERING LOGIC ---
  // Search filter applies to both User and PendingEmployee entities
  const searchFilteredUsers = subcontractors.filter(sub =>
    getDisplayName(sub).toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchFilteredOnboardingSubcontractors = onboardingSubcontractors.filter(sub => {
    const fullName = sub.full_name || `${sub.first_name || ''} ${sub.last_name || ''}`.trim();
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });


  // Tab-specific filters
  // ACTIVO tab: `User` entities with employment_status 'ACTIVO'
  const displayedActiveSubcontractors = searchFilteredUsers.filter(sub => {
    const isActivelyWorking = sub.employment_status === 'ACTIVO';
    if (showInactive) {
      // If showInactive is true, display 'ACTIVO', 'inactive' (from directory sync, not a User status directly)
      // For User entity, 'inactive' status usually means `employment_status` is not 'ACTIVO', 'ARCHIVADO', 'TERMINADO' explicitly
      // Or based on directory status if that's where 'inactive' is stored.
      // For now, if showInactive, we show all not TERMINADO or ARCHIVADO.
      return sub.employment_status !== 'TERMINADO' && sub.employment_status !== 'ARCHIVADO';
    } else {
      return isActivelyWorking;
    }
  });

  // ARCHIVED tab: `User` entities with employment_status 'ARCHIVADO'
  const displayedArchivedSubcontractors = searchFilteredUsers.filter(sub => sub.employment_status === 'ARCHIVADO');

  // REQUIERE REVISIÓN (W-9) tab: `PendingEmployee` entities with status 'PENDIENTE_ONBOARDING'
  const displayedOnboardingReviewSubcontractors = searchFilteredOnboardingSubcontractors.filter(sub => sub.status === 'PENDIENTE_ONBOARDING');

  // TERMINADO tab: `User` entities with employment_status 'TERMINADO'
  const displayedTerminatedSubcontractors = searchFilteredUsers.filter(sub => sub.employment_status === 'TERMINADO');

  // Re-calculate counts for tabs
  const activeCount = displayedActiveSubcontractors.length;
  const archivedCount = displayedArchivedSubcontractors.length;
  const onboardingReviewCount = displayedOnboardingReviewSubcontractors.length;
  const terminatedCount = displayedTerminatedSubcontractors.length;
  // ------------------------------------------------------------------

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{t('subcontractorManagement')}</h1> {/* Updated text */}
              <p className="text-slate-600 mt-1">{t('manageYourSubcontractors')}</p> {/* Updated text */}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* Toggle for showing inactive subcontractors only relevant for 'active' tab */}
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
                    {t('showInactiveSubcontractors')} {/* Updated text */}
                  </label>
                </div>
              )}

              <Button
                onClick={handleManualSync}
                variant="outline"
                disabled={syncMutation.isPending}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Users className="w-4 h-4 mr-2" />
                {syncMutation.isPending ? t('syncing') + '...' : t('manualSync')}
              </Button>
              <Button onClick={() => { setEditingSubcontractor(null); setIsPendingEdit(true); setShowDialog(true); }} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/20">
                <Plus className="w-5 h-5 mr-2" />
                {t('addSubcontractor')} {/* Updated text */}
              </Button>
            </div>
          </div>

          {onboardingReviewCount > 0 && (
            <Alert className="mb-6 bg-orange-500/10 border-orange-500/30">
              <AlertDescription className="text-orange-400">
                ⚠️ {t('youHaveXSubcontractorsPendingOnboarding', { count: onboardingReviewCount })} {/* Updated text */}
              </AlertDescription>
            </Alert>
          )}

          {terminatedCount > 0 && (
            <Alert className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-400">
                ⚠️ {t('youHaveXTerminatedSubcontractors', { count: terminatedCount })} {/* Updated text */}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
              <Input
                placeholder={t('searchSubcontractors')} {/* Updated text */}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('active')} ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="onboarding_review" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('onboardingReview')} ({onboardingReviewCount})
              {onboardingReviewCount > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs">{onboardingReviewCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              {t('archived')} ({archivedCount})
            </TabsTrigger>
            <TabsTrigger value="terminated" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <span className="flex items-center gap-2">
                {t('terminated')} ({terminatedCount})
                {terminatedCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{terminatedCount}</Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedActiveSubcontractors.map((subcontractor) => {
                const displayName = getDisplayName(subcontractor);
                const needsConfig = needsNameConfiguration(subcontractor);
                const isInactive = subcontractor.employment_status !== 'ACTIVO'; // Check if not 'ACTIVO'

                const cardClassName = isInactive
                  ? 'opacity-60 bg-slate-100 border-slate-300'
                  : 'bg-white/90 backdrop-blur-sm border-slate-200';
                const textClassName = isInactive ? 'text-slate-500' : 'text-slate-900';

                return (
                  <Card key={subcontractor.id} className={`${cardClassName} shadow-lg hover:shadow-xl transition-all duration-300 group`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {subcontractor.profile_photo_url ? (
                          <img
                            src={subcontractor.profile_photo_url}
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
                                {t('inactive')}
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm ${isInactive ? 'text-slate-500' : 'text-cyan-700'} truncate`}>{subcontractor.position || t('noPosition')}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {subcontractor.department && (
                              <Badge variant="outline" className={`text-xs ${isInactive ? 'border-slate-300 text-slate-500' : 'border-slate-300 text-slate-700'}`}>
                                {subcontractor.department}
                              </Badge>
                            )}
                            {subcontractor.team_name && (
                              <Badge className={`text-xs ${isInactive ? 'bg-purple-500/10 text-purple-500 border-purple-200' : 'bg-purple-500/20 text-purple-700 border-purple-300'}`}>
                                <Building2 className="w-3 h-3 mr-1" />
                                {subcontractor.team_name}
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
                              <Link to={createPageUrl(`SubcontractorProfile?id=${subcontractor.id}`)} className="flex items-center cursor-pointer text-slate-700 hover:bg-slate-100">
                                <ChevronRight className="w-4 h-4 mr-2" />
                                {t('viewProfile')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditActive(subcontractor)} className="text-slate-700 hover:bg-slate-100">
                              <Edit className="w-4 h-4 mr-2" />
                              {t('editSubcontractor')}
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
                          <p className="text-xs text-amber-700 font-medium">⚠️ {t('inactiveSubcontractor')}</p>
                        </div>
                      )}

                      <div className="space-y-1 text-sm">
                        <div className={`flex items-center gap-2 ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{subcontractor.email}</span>
                        </div>
                        {subcontractor.phone && (
                          <div className={`flex items-center gap-2 ${isInactive ? 'text-slate-500' : 'text-slate-700'}`}>
                            <Phone className="w-3 h-3" />
                            <span>{subcontractor.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link to={createPageUrl(`SubcontractorProfile?id=${subcontractor.id}`)}>
                          <Button variant="outline" size="sm" className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700">
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewProfile')}
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAIInsights(subcontractor)}
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
            {displayedActiveSubcontractors.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noActiveSubcontractorsFound')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="onboarding_review">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedOnboardingReviewSubcontractors.map((subcontractor) => (
                  <OnboardingReviewCard // Using the new card component
                    key={subcontractor.id}
                    subcontractor={subcontractor}
                    onSendOnboardingLink={handleResendOnboardingLink}
                    onEdit={handleEditOnboarding}
                    onDelete={(id) => {
                      if (window.confirm(t('confirmDeleteSubcontractorPermanently'))) {
                        deleteOnboardingSubcontractorMutation.mutate(id);
                      }
                    }}
                    onArchive={(id) => {
                      if (window.confirm(t('confirmArchiveSubcontractor'))) {
                        archiveOnboardingSubcontractorMutation.mutate(id);
                      }
                    }}
                    canActivate={subcontractor.w9_completed && subcontractor.agreement_signed}
                    onActivate={(sub) => activateSubcontractorMutation.mutate(sub)}
                  />
                ))}
            </div>
            {displayedOnboardingReviewSubcontractors.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noSubcontractorsRequireOnboardingReview')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedArchivedSubcontractors.map((subcontractor) => ( // Using User entities
                <Card key={subcontractor.id} className="glass-card shadow-xl border-slate-700 opacity-70">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {subcontractor.profile_photo_url ? (
                        <img
                          src={subcontractor.profile_photo_url}
                          alt={getDisplayName(subcontractor)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-slate-500/30 grayscale"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {getDisplayName(subcontractor)[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        <h3 className="font-bold text-slate-400">{getDisplayName(subcontractor)}</h3>
                        <p className="text-sm text-slate-500">{subcontractor.position || t('noPosition')}</p>
                        <Badge className="mt-2 bg-slate-500/20 text-slate-400 border-slate-500/30">
                          <Archive className="w-3 h-3 mr-1" />
                          {t('archived')}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-800">
                          <DropdownMenuItem onClick={() => handleEditActive(subcontractor)} className="text-white hover:bg-slate-800">
                            <Edit className="w-4 h-4 mr-2" />
                            {t('editSubcontractor')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            if (window.confirm(t('confirmRestoreSubcontractorToActive'))) {
                                base44.entities.User.update(subcontractor.id, { employment_status: 'ACTIVO' })
                                  .then(() => queryClient.invalidateQueries({ queryKey: ['subcontractors'] }))
                                  .then(() => toast({ title: t('success'), description: t('subcontractorRestoredToActive') }));
                              }
                            }} className="text-white hover:bg-slate-800">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('restoreToActive')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            if (window.confirm(t('confirmTerminateSubcontractor'))) {
                                base44.entities.User.update(subcontractor.id, { employment_status: 'TERMINADO' })
                                  .then(() => queryClient.invalidateQueries({ queryKey: ['subcontractors'] }))
                                  .then(() => toast({ title: t('success'), description: t('subcontractorTerminated') }));
                            }
                          }} className="text-red-400 hover:bg-red-500/10">
                            <UserX className="w-4 h-4 mr-2" />
                            {t('terminateSubcontractor')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{subcontractor.email}</span>
                      </div>
                      {subcontractor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{subcontractor.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {displayedArchivedSubcontractors.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noArchivedSubcontractors')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminated">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedTerminatedSubcontractors.map((subcontractor) => (
                <Card key={subcontractor.id} className="glass-card shadow-xl border-red-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {subcontractor.profile_photo_url ? (
                        <img
                          src={subcontractor.profile_photo_url}
                          alt={subcontractor.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-red-500/30 grayscale"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {subcontractor.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        <h3 className="font-bold text-slate-400 line-through">{subcontractor.full_name}</h3>
                        <p className="text-sm text-slate-500">{subcontractor.position || t('noPosition')}</p>
                        <Badge className="mt-2 bg-red-500/20 text-red-400 border-red-500/30">
                          <UserX className="w-3 h-3 mr-1" />
                          {t('terminatedAndBlocked')} {/* Updated text */}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{subcontractor.email}</span>
                      </div>
                      {subcontractor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{subcontractor.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 mb-3">
                        ⚠️ {t('allDataTerminatedSubcontractorBlocked')} {/* Updated text */}
                      </p>
                      <Button
                        onClick={() => handleRestoreTerminated(subcontractor)}
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
            {displayedTerminatedSubcontractors.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">{t('noTerminatedSubcontractors')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog for adding/editing ONBOARDING subcontractor */}
        {showDialog && editingSubcontractor && isPendingEdit && (
          <Dialog open={showDialog} onOpenChange={handleCloseForm}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {t('subcontractor')} - {editingSubcontractor.first_name} {editingSubcontractor.last_name}
                </DialogTitle>
              </DialogHeader>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SubcontractorOnboardingForm // Renamed form
                    subcontractor={editingSubcontractor}
                    onClose={handleCloseForm}
                  />
                </div>

                <div>
                  <OnboardingTracker employee={editingSubcontractor} /> {/* Keep 'employee' prop for now */}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog for adding new ONBOARDING subcontractor (no editingSubcontractor) OR editing ACTIVE subcontractor */}
        {showDialog && (!editingSubcontractor || !isPendingEdit) && (
          <Dialog open={showDialog} onOpenChange={handleCloseForm}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingSubcontractor ? t('editSubcontractor') : t('addNewSubcontractor')}
                </DialogTitle>
              </DialogHeader>
              {isPendingEdit ? (
                <SubcontractorOnboardingForm // Renamed form
                  subcontractor={editingSubcontractor}
                  onClose={handleCloseForm}
                />
              ) : (
                <ActiveSubcontractorForm // Renamed form
                  subcontractor={editingSubcontractor}
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
                AI Performance Insights - {selectedSubcontractorForAI && getDisplayName(selectedSubcontractorForAI)}
              </DialogTitle>
            </DialogHeader>

            {selectedSubcontractorForAI && (
              <div className="py-4">
                <AIPerformanceAnalyzer
                  employee={selectedSubcontractorForAI} // Keep 'employee' prop for now
                  timeEntries={allTimeEntries.filter(e => e.employee_email === selectedSubcontractorForAI.email)}
                  jobs={allJobs}
                  expenses={allExpenses.filter(e => e.employee_email === selectedSubcontractorForAI.email)}
                  drivingLogs={allDrivingLogs.filter(l => l.employee_email === selectedSubcontractorForAI.email)}
                  certifications={allCertifications.filter(c => c.employee_email === selectedSubcontractorForAI.email)}
                  recognitions={allRecognitions.filter(r => r.employee_email === selectedSubcontractorForAI.email)}
                  allEmployees={subcontractors} // Use the general subcontractors list
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
