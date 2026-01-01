import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Clock,
  Receipt,
  LogOut,
  Menu,
  Briefcase,
  CalendarDays,
  MessageSquare,
  Banknote,
  Car,
  Megaphone,
  ClipboardList,
  GraduationCap,
  FileText,
  FileCheck,
  Languages,
  Moon,
  Sun,
  Settings,
  Building2,
  User,
  Award,
  UserX,
  BarChart3,
  Package,
  CalendarClock,
  MapPin,
  TrendingUp,
  Wallet,
  Globe,
  Target,
  Zap,
  Shield,
  Bell,
  CheckCircle2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { LanguageProvider, useLanguage } from "@/components/i18n/LanguageContext";
import { PermissionsProvider } from "@/components/permissions/PermissionsContext";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import MobileOptimizations from "@/components/shared/MobileOptimizations";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import { SyncQueueProvider } from "@/components/pwa/SyncQueueManager";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import AIAssistant from "@/components/ai/AIAssistant";
import NotificationService from "@/components/notifications/NotificationService";
import NotificationEngine from "@/components/notifications/NotificationEngine";
import UniversalNotificationEngine from "@/components/notifications/UniversalNotificationEngine";
import NotificationBell from "@/components/notifications/NotificationBell";
import UniversalPushManager from "@/components/notifications/IOSPushManager";
import ProfileSyncManager from "@/components/sync/ProfileSyncManager";
import useEmployeeProfile from "@/components/hooks/useEmployeeProfile";
import { migratePendingToUser, normalizeEmail } from "@/components/utils/profileMerge";
import BottomNav from "@/components/navigation/BottomNav";
import AgreementGate from "@/components/agreements/AgreementGate";

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    // Apply theme to HTML root element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      className="p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
    >
      {theme === 'light' ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-600 dark:text-slate-400" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-slate-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

const SidebarNavigation = ({ navigation, location, pendingExpenses, sidebarContentRef }) => {
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const itemRefs = React.useRef([]);
  
  // Flatten all navigation items for keyboard navigation
  const allItems = React.useMemo(() => {
    return navigation.flatMap(section => section.items);
  }, [navigation]);

  // Keyboard navigation with useCallback to prevent recreation
  const handleKeyDown = React.useCallback((e) => {
    // Ignore keyboard navigation when user is typing in inputs
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    if (
      ['input', 'textarea', 'select'].includes(tagName) ||
      activeElement?.isContentEditable
    ) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const selectedItem = allItems[focusedIndex];
      if (selectedItem?.url) {
        const sidebar = sidebarContentRef.current;
        if (sidebar) {
          sessionStorage.setItem('sidebarScrollPosition', sidebar.scrollTop.toString());
        }
        navigate(selectedItem.url);
        setOpenMobile(false);
      }
    }
  }, [allItems, focusedIndex, navigate, setOpenMobile, sidebarContentRef]);

  // Register keyboard listener (stable)
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Separate effect for visual focus (doesn't trigger API calls)
  React.useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < allItems.length) {
      const element = itemRefs.current[focusedIndex];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        element.focus({ preventScroll: true });
      }
    }
  }, [focusedIndex, allItems.length]);
  
  let itemIndex = 0;
  
  return (
    <>
      {navigation.map((section, idx) => (
        <SidebarGroup key={idx} className={idx === 0 ? "mb-6 mt-0 pt-0" : "mb-6"}>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-wider bg-[#EBF2FF] dark:from-slate-800 dark:to-slate-700 rounded-lg px-3 py-2 mb-2 flex items-center gap-2 text-[#507DB4] dark:text-slate-300 border border-[#507DB4]/10 dark:border-slate-700">
            {section.icon && <section.icon className="w-3.5 h-3.5" />}
            {section.section}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const isActive = location.pathname === item.url;
                const showBadge = (item.title === 'Expenses' || item.title === 'My Expenses') && pendingExpenses > 0;
                const currentItemIndex = itemIndex++;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`transition-all duration-200 rounded-lg mb-1 border-none ${
                        isActive
                          ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Link 
                        ref={el => itemRefs.current[currentItemIndex] = el}
                        to={item.url} 
                        onClick={() => setOpenMobile(false)} 
                        className={`flex items-center gap-3 px-3 py-2.5 relative group outline-none ${
                          focusedIndex === currentItemIndex ? 'ring-2 ring-[#507DB4] ring-offset-2' : ''
                        }`}
                        data-sidebar-item
                        tabIndex={0}>
                        <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-white' : (item.title === 'MCI Field' ? 'text-[#FF8C00]' : 'text-slate-500 dark:text-slate-400')
                        }`} style={item.title === 'MCI Field' && !isActive ? { 
                          filter: 'drop-shadow(0 0 8px rgba(255, 140, 0, 0.3))'
                        } : {}} />
                        <span className={`font-medium text-sm ${
                          item.title === 'MCI Field' && !isActive 
                            ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFB347] bg-clip-text text-transparent font-bold' 
                            : ''
                        }`}>
                          {item.title}
                        </span>
                        {showBadge && (
                          <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 shadow-lg shadow-red-500/30 animate-pulse">
                            {pendingExpenses}
                          </Badge>
                        )}
                        {item.badge && (
                          <span className="text-xs">{item.badge}</span>
                        )}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-sm" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};

const LayoutContent = ({ children, currentPageName, user, isLoading, error }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, changeLanguage, t } = useLanguage();
  const sidebarContentRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Check if we're on a Field page
  const isFieldPage = location.pathname.toLowerCase().includes('field');

  // Merge auth user with Employee entity data
  const { profile: displayUser } = useEmployeeProfile(user?.email, user);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTheme(savedTheme);
  }, []);

  // Sync theme state with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('theme') || 'light';
      setTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const { data: clientMemberships = [] } = useQuery({
    queryKey: ['client-memberships-check', user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email && user?.role !== 'admin',
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isClientOnly = clientMemberships.length > 0 && user?.role !== 'admin';

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms', user?.email],
    queryFn: () => base44.entities.OnboardingForm.filter({ employee_email: user?.email }),
    enabled: !!user?.email && !isClientOnly && user?.employment_status !== 'deleted',
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const onboardingCompleted = onboardingForms.length >= 3;
  const isOnboardingPage = currentPageName === 'OnboardingWizard';
  
  // Determine if user should be blocked for onboarding
  // CRITICAL: Check flag first (definitive), then fallback to count
  const shouldBlockForOnboarding = user && 
    !isClientOnly && 
    user.role !== 'admin' && 
    user.employment_status !== 'deleted' &&
    user.onboarding_completed !== true &&  // Definitive flag wins
    !onboardingCompleted;  // Count-based fallback

  // Soft redirect to onboarding - no full page reload
  useEffect(() => {
    if (isLoading || !user) return;
    if (isOnboardingPage) return;

    if (shouldBlockForOnboarding) {
      if (import.meta.env.DEV) {
        console.log('🚫 ONBOARDING REQUIRED: Redirecting to wizard');
      }
      navigate(createPageUrl('OnboardingWizard'), { replace: true });
    }
  }, [user, shouldBlockForOnboarding, isOnboardingPage, navigate, isLoading]);

  // Auto-activate invited users and cleanup pending records
  useEffect(() => {
    if (isLoading || !user) return;

    if (user.employment_status !== 'invited') {
      // Cleanup pending employee record for active users
      if (user.employment_status === 'active') {
        const cleanupFlag = sessionStorage.getItem(`cleanup_${user.id}`);
        if (cleanupFlag === 'done') return;

        base44.entities.PendingEmployee.list().then(allPendingEmployees => {
          const pendingEmployees = allPendingEmployees.filter(p => p.email?.toLowerCase() === user.email?.toLowerCase());
          if (pendingEmployees.length > 0) {
            if (import.meta.env.DEV) {
              console.log('🧹 Cleaning up pending employee record');
            }
            base44.entities.PendingEmployee.delete(pendingEmployees[0].id).then(() => {
              if (import.meta.env.DEV) {
                console.log('✅ Pending record cleaned up');
              }
              sessionStorage.setItem(`cleanup_${user.id}`, 'done');
            }).catch(err => {
              if (import.meta.env.DEV) {
                console.error('Error cleaning pending:', err);
              }
            });
          }
        }).catch(err => {
          if (import.meta.env.DEV) {
            console.error('Error fetching pending:', err);
          }
        });
      }
      return;
    }

    // Auto-activate invited users with safe merge
    const activationFlag = sessionStorage.getItem(`activation_${user.id}`);
    if (activationFlag === 'done') {
      if (import.meta.env.DEV) {
        console.log('✅ Activation already completed');
      }
      return;
    }
    if (activationFlag === 'processing') {
      if (import.meta.env.DEV) {
        console.log('⏳ Activation in progress, skipping');
      }
      return;
    }

    const autoActivateUser = async () => {
      try {
        sessionStorage.setItem(`activation_${user.id}`, 'processing');

        if (import.meta.env.DEV) {
          console.log('🔄 Auto-activating invited user:', user.email);
        }

        // SAFE MERGE: Migrate PendingEmployee → User with ZERO data loss
        let migratedData = {};
        let pendingRecord = null;
        
        try {
          const allPendingEmployees = await base44.entities.PendingEmployee.list();
          const pendingEmployees = allPendingEmployees.filter(
            p => normalizeEmail(p.email) === normalizeEmail(user.email)
          );
          
          if (pendingEmployees.length > 0) {
            pendingRecord = pendingEmployees[0];
            
            // Use profileMerge helper for COMPLETE migration
            migratedData = migratePendingToUser(user, pendingRecord);
            
            if (import.meta.env.DEV) {
              console.log('📋 Migrating PendingEmployee data:', Object.keys(migratedData).filter(k => !k.startsWith('_')));
            }
            
            // Mark as migrated BEFORE deleting (for audit trail)
            await base44.entities.PendingEmployee.update(pendingRecord.id, {
              migrated_at: new Date().toISOString(),
              migrated_to_user_id: user.id,
              migration_status: 'completed'
            });
            
            // Delete after successful migration
            await base44.entities.PendingEmployee.delete(pendingRecord.id);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error with pending employee migration:', error);
          }
        }

        let teamData = {};
        const finalTeamId = pendingData.team_id || user.team_id;
        if (finalTeamId && !pendingData.team_name && !user.team_name) {
          try {
            const teams = await base44.entities.Team.list();
            const userTeam = teams.find(t => t.id === finalTeamId);
            if (userTeam) teamData.team_name = userTeam.team_name;
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('Error fetching team:', error);
            }
          }
        }

        // Build final update payload
        const finalData = {
          employment_status: 'active',
          hire_date: user.hire_date || new Date().toISOString().split('T')[0],
          ...migratedData,
          ...teamData
        };

        // Always update (even if just status change)
        await base44.auth.updateMe(finalData);

        if (import.meta.env.DEV) {
          console.log('✅ User activated successfully');
        }
        sessionStorage.setItem(`activation_${user.id}`, 'done');

        // Invalidate queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['employeeProfile'] });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Error auto-activating user:', error);
        }
        sessionStorage.removeItem(`activation_${user.id}`);
      }
    };

    autoActivateUser();
  }, [user?.id, user?.employment_status, isLoading, queryClient]);

  const { data: pendingExpenses } = useQuery({
    queryKey: ['pendingExpensesCount', user?.email],
    queryFn: async () => {
      if (!user) return 0;
      if (user.role === 'admin') {
        const expenses = await base44.entities.Expense.filter({ status: 'pending' }, '', 100);
        return expenses.length;
      } else {
        const expenses = await base44.entities.Expense.filter({
          employee_email: user.email,
          status: 'pending'
        }, '', 20);
        return expenses.length;
      }
    },
    enabled: !!user,
    initialData: 0,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const sidebar = sidebarContentRef.current;
    if (sidebar) {
      const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
      
      if (savedScrollPosition) {
        // Restaurar posición exacta del scroll
        requestAnimationFrame(() => {
          sidebar.scrollTop = parseInt(savedScrollPosition, 10);
          sessionStorage.removeItem('sidebarScrollPosition');
        });
      }
    }
  }, [location.pathname]);



  // Soft redirect client-only users to ClientPortal
  useEffect(() => {
    if (isLoading || !user) return;
    if (isClientOnly && currentPageName !== 'ClientPortal') {
      navigate(createPageUrl('ClientPortal'), { replace: true });
    }
  }, [isClientOnly, currentPageName, navigate, isLoading, user]);

  // Permission-based navigation
  const getNavigationForUser = () => {
    const position = (displayUser?.position || user?.position || '').toLowerCase();
    const department = (displayUser?.department || user?.department || '').toLowerCase();
    const isAdmin = user?.role === 'admin';

    // Normalize position variants
    const isManager = position.includes('manager') || position.includes('supervisor');
    const isCEO = position.includes('ceo');
    const isAdministrator = position.includes('administrator') || position.includes('admin');
    const isHR = department === 'hr' || department === 'human resources';

    // Full access: CEO, administrator, admin role, managers, and HR
    const hasFullAccess = isAdmin || isCEO || isAdministrator || isManager || isHR;

    if (hasFullAccess) {
      return adminNavigation;
    }

    return employeeNavigation;
  };

  const adminNavigation = [
    {
      section: 'STRATEGY',
      icon: Target,
      items: [
        { title: 'Control Tower', url: createPageUrl("ExecutiveControlTower"), icon: Shield },
        { title: 'Analytics Hub', url: createPageUrl("ReportingHub"), icon: BarChart3 },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet },
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      ]
    },
    {
      section: 'OPERATIONS',
      icon: Briefcase,
      items: [
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        { title: 'MCI Field', url: createPageUrl("Field"), icon: MapPin },
        { title: 'Inventory', url: createPageUrl("Inventario"), icon: Package },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
        { title: 'Job Analysis', url: createPageUrl("JobPerformanceAnalysis"), icon: BarChart3 },
      ]
    },
    {
      section: 'FINANCE',
      icon: DollarSign,
      items: [
        { title: 'Accounting', url: createPageUrl("Contabilidad"), icon: DollarSign },
        { title: 'Customers', url: createPageUrl("Clientes"), icon: Users },
        { title: 'Quotes', url: createPageUrl("Estimados"), icon: FileText },
        { title: 'Invoices', url: createPageUrl("Facturas"), icon: FileCheck },
        { title: 'Expenses', url: createPageUrl("Gastos"), icon: Receipt },
        { title: 'Items Catalog', url: createPageUrl("Items"), icon: Package },
        { title: 'Budget Forecast', url: createPageUrl('BudgetForecasting'), icon: TrendingUp },
      ]
    },
    {
      section: 'WORKFORCE',
      icon: Users,
      items: [
        { title: 'Employees', url: createPageUrl("Empleados"), icon: Users },
        { title: 'Teams', url: createPageUrl("Teams"), icon: MapPin },
        { title: 'Performance', url: createPageUrl("PerformanceManagement"), icon: Award },
        { title: 'Skill Matrix', url: createPageUrl("SkillMatrix"), icon: Award },
        { title: 'Goals & OKRs', url: createPageUrl("Goals"), icon: Target },
        { title: 'Team Goals', url: createPageUrl("TeamGoals"), icon: Users },
        { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
        { title: 'Bonuses', url: createPageUrl("BonusConfiguration"), icon: Award },
      ]
    },
    {
      section: 'TIME & PAYROLL',
      icon: Clock,
      items: [
        { title: 'Time Tracking', url: createPageUrl("TimeTracking"), icon: Clock },
        { title: 'Approvals', url: createPageUrl("Horarios"), icon: Clock },
        { title: 'Mileage', url: createPageUrl("MileageApproval"), icon: Car },
        { title: 'Time Off', url: createPageUrl("TimeOffRequests"), icon: CalendarClock },
        { title: 'Payroll', url: createPageUrl("Nomina"), icon: Banknote },
        { title: 'Payroll Auto-Flow', url: createPageUrl('PayrollAutoFlow'), icon: Zap },
        { title: 'Time Reports', url: createPageUrl("TimeReports"), icon: BarChart3 },
      ]
    },
    {
      section: 'COMPLIANCE',
      icon: Shield,
      items: [
        { title: 'Approvals Hub', url: createPageUrl("ApprovalsHub"), icon: CheckCircle2 },
        { title: 'Compliance Hub', url: createPageUrl("ComplianceHub"), icon: Shield },
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
        { title: 'Notifications', url: createPageUrl("NotificationCenter"), icon: Bell },
        { title: 'Role Management', url: createPageUrl("RoleManagement"), icon: Shield },
        { title: 'Agreement Signatures', url: createPageUrl("AgreementSignatures"), icon: FileText },
        { title: 'Project Import', url: createPageUrl("ProjectImport"), icon: Package },
      ]
    },
    {
      section: 'CLIENT ACCESS',
      icon: User,
      items: [
        { title: 'Client Portal Manager', url: createPageUrl("ClientManagement"), icon: Users },
      ]
    }
  ];

  const managerNavigation = [
    {
      section: 'GENERAL',
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
      ]
    },
    {
      section: 'JOBS & PROJECTS',
      items: [
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        { title: 'MCI Field', url: createPageUrl("Field"), icon: MapPin },
        { title: 'Job Analysis', url: createPageUrl("JobPerformanceAnalysis"), icon: BarChart3 },
        { title: 'Inventory', url: createPageUrl("Inventario"), icon: Package },
      ]
    },
    {
      section: 'FINANCE',
      items: [
        { title: 'Accounting', url: createPageUrl("Contabilidad"), icon: DollarSign },
        { title: 'Customers', url: createPageUrl("Clientes"), icon: Users },
        { title: 'Quotes', url: createPageUrl("Estimados"), icon: FileText },
        { title: 'Invoices', url: createPageUrl("Facturas"), icon: FileCheck },
        { title: 'Expenses', url: createPageUrl("Gastos"), icon: Receipt },
        { title: 'Items Catalog', url: createPageUrl("Items"), icon: Package },
      ]
    },
    {
      section: 'PEOPLE',
      items: [
        { title: 'Employees', url: createPageUrl("Empleados"), icon: Users },
        { title: 'Teams', url: createPageUrl("Teams"), icon: MapPin },
        { title: 'Performance', url: createPageUrl("PerformanceManagement"), icon: Award },
        { title: 'Goals & OKRs', url: createPageUrl("Goals"), icon: Target },
        { title: 'Team Goals', url: createPageUrl("TeamGoals"), icon: Users },
      ]
    },
    {
      section: 'TIME & PAYROLL',
      items: [
        { title: 'Time Tracking', url: createPageUrl("TimeTracking"), icon: Clock },
        { title: 'Time Reports', url: createPageUrl("TimeReports"), icon: BarChart3 },
        { title: 'Approvals', url: createPageUrl("Horarios"), icon: Clock },
        { title: 'Time Off', url: createPageUrl("TimeOffRequests"), icon: CalendarClock },
        { title: 'Mileage', url: createPageUrl("MileageApproval"), icon: Car },
        { title: 'Payroll', url: createPageUrl("Nomina"), icon: Banknote },
      ]
    },
    {
      section: 'RESOURCES',
      items: [
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
        { title: 'Notifications', url: createPageUrl("NotificationCenter"), icon: Bell },
      ]
    }
  ];

  const employeeNavigation = [
    {
      section: 'HOME',
      icon: LayoutDashboard,
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("MyProfile"), icon: User },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
      ]
    },
    {
      section: 'FIELD WORK',
      icon: MapPin,
      items: [
        { title: 'MCI Field', url: createPageUrl("Field"), icon: MapPin },
        { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
      ]
    },
    {
      section: 'TIME & PAY',
      icon: Clock,
      items: [
        { title: 'My Hours', url: createPageUrl("MisHoras"), icon: Clock },
        { title: 'Mileage', url: createPageUrl("Manejo"), icon: Car },
        { title: 'Driving', url: createPageUrl("HorasManejo"), icon: Clock },
        { title: 'My Expenses', url: createPageUrl("MisGastos"), icon: Receipt },
        { title: 'Per Diem', url: createPageUrl("PerDiem"), icon: Banknote },
        { title: 'My Payroll', url: createPageUrl("MyPayroll"), icon: Banknote },
      ]
    },
    {
      section: 'MY GROWTH',
      icon: Target,
      items: [
        { title: 'Compliance Hub', url: createPageUrl("ComplianceHub"), icon: Shield },
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'My Scorecard', url: createPageUrl("MiScorecard"), icon: Target },
        { title: 'My Goals', url: createPageUrl("Goals"), icon: Target },
        { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30 p-1">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">MCI Connect</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{t('error')}</p>
          <Button onClick={() => window.location.reload()} className="soft-blue-gradient text-white shadow-lg">
            {t('reload')}
          </Button>
        </div>
      </div>
    );
  }

  if (user && user.employment_status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-red-500/30">
            <UserX className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-red-600 dark:text-red-400 mb-4">Your account has been deactivated.</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => base44.auth.logout()} className="soft-red-gradient text-white shadow-lg">
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }

  const navigation = getNavigationForUser();
  const position = (displayUser?.position || user?.position || '').toLowerCase();
  const isAdmin = user?.role === 'admin' || position.includes('ceo') || position.includes('administrator');

  // If client only, render ClientPortal directly without sidebar
  if (isClientOnly) {
    return children;
  }

  const getProfileImage = () => {
    const effectiveUser = displayUser || user;
    if (!effectiveUser) return null;
    
    // Check preferred image first
    if (effectiveUser.preferred_profile_image === 'avatar' && effectiveUser.avatar_image_url) {
      return effectiveUser.avatar_image_url;
    }
    
    // Then check profile_photo_url
    if (effectiveUser.profile_photo_url) {
      return effectiveUser.profile_photo_url;
    }
    
    // Fallback to avatar if exists
    if (effectiveUser.avatar_image_url) {
      return effectiveUser.avatar_image_url;
    }
    
    return null;
  };

  const profileImage = getProfileImage();
  const imageKey = (displayUser || user)?.profile_last_updated || (displayUser || user)?.id;

  return (
    <SidebarProvider>
      <ServiceWorkerRegistration />
      <MobileOptimizations />
      <SyncQueueProvider>
        <OfflineIndicator />
        <NotificationService user={user}>
          <NotificationEngine user={user} />
        </NotificationService>

      {user && user.employment_status !== 'deleted' && !shouldBlockForOnboarding && (
        <>
          <UniversalNotificationEngine user={user} />
          <UniversalPushManager user={user} />
        </>
      )}
        
      <div className="min-h-screen flex w-full bg-[#F8FAFC] dark:bg-[#181818]">
        <style>{`
          /* ============================================ */
          /* PREMIUM SOFT UI SYSTEM - GENTLE & MODERN    */
          /* ============================================ */

          /* Mobile Touch Optimizations - All Devices */
          html {
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            overscroll-behavior-y: contain;
            height: 100%;
          }

          body {
            -webkit-user-select: none;
            user-select: none;
            height: 100%;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
          }
          
          #root {
            height: 100%;
            overflow: auto;
          }

          /* Allow text selection in inputs and content areas */
          input, textarea, [contenteditable] {
            -webkit-user-select: text;
            user-select: text;
          }

          /* Prevent zoom on input focus for iOS */
          input, select, textarea {
            font-size: 16px !important;
          }

          /* Fix iOS Safari bottom bar issue */
          @supports (-webkit-touch-callout: none) {
            .min-h-screen {
              min-height: -webkit-fill-available;
            }
          }

          /* Corporate Blue Colors */
          :root {
            --color-primary: #1E3A8A;
            --color-primary-hover: #1E40AF;
            --color-primary-light: #3B82F6;
          }

          /* Glassmorphism Effects */
          .glass-effect {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .dark .glass-effect {
            background: rgba(30, 30, 30, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          /* Smooth Transitions */
          * {
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Custom scrollbars - Soft */
          .sidebar-scroll-content::-webkit-scrollbar {
            width: 6px;
          }

          .sidebar-scroll-content::-webkit-scrollbar-track {
            background: rgba(30, 58, 138, 0.05);
            border-radius: 3px;
          }

          .sidebar-scroll-content::-webkit-scrollbar-thumb {
            background: rgba(30, 58, 138, 0.2);
            border-radius: 3px;
          }

          .sidebar-scroll-content::-webkit-scrollbar-thumb:hover {
            background: rgba(30, 58, 138, 0.4);
          }

          *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          *::-webkit-scrollbar-track {
            background: rgba(30, 58, 138, 0.05);
          }

          *::-webkit-scrollbar-thumb {
            background: rgba(30, 58, 138, 0.15);
            border-radius: 4px;
          }

          *::-webkit-scrollbar-thumb:hover {
            background: rgba(30, 58, 138, 0.3);
          }

          @media (max-width: 1024px) {
            * {
              -webkit-tap-highlight-color: transparent;
            }
          }
        `}</style>

        <ProfileSyncManager user={user} />
      <Sidebar className="border-r border-[#E0E7FF] dark:border-slate-800 shadow-lg bg-gradient-to-b from-[#F0F4FF] to-[#EBF2FF] dark:from-slate-900 dark:to-slate-900/50">
          <SidebarHeader className="px-0 py-0 flex-shrink-0 overflow-hidden h-auto bg-transparent">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
              alt="MCI Connect"
              className="w-full h-full object-contain"
              style={{ 
                imageRendering: '-webkit-optimize-contrast'
              }}
            />
          </SidebarHeader>

          <SidebarContent 
            ref={sidebarContentRef} 
            className="px-3 pt-0 pb-3 sidebar-scroll-content overflow-y-auto overflow-x-hidden flex-1 scroll-smooth bg-transparent"
            data-scrollable="true"
          >
            <SidebarNavigation navigation={navigation} location={location} pendingExpenses={pendingExpenses} sidebarContentRef={sidebarContentRef} />
          </SidebarContent>

          <SidebarFooter className="p-4 flex-shrink-0 border-t border-[#E0E7FF] dark:border-slate-700/50 bg-gradient-to-br from-[#F8FAFF] to-[#F0F4FF] dark:from-slate-900 dark:to-slate-800/50">
            <div className="mb-3 px-2 flex items-center gap-2">
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="h-9 flex-1 bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 rounded-xl">
                  <Languages className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">🇺🇸 English</SelectItem>
                  <SelectItem value="es" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded-2xl p-3 border bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {profileImage ? (
                  <img
                    key={imageKey}
                    src={`${profileImage}?v=${imageKey}`}
                    alt={(displayUser || user)?.full_name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-[#1E3A8A]/30 shadow-md"
                  />
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center ring-2 ring-[#507DB4]/30 shadow-md">
                    <span className="text-white font-bold text-base">
                      {(displayUser || user)?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">
                    {(displayUser || user)?.full_name || (displayUser || user)?.email || 'User'}
                  </p>
                  <p className="text-xs truncate text-[#507DB4] dark:text-[#6B9DD8] font-medium">
                    {(displayUser || user)?.position || (user?.role === 'admin' ? t('admin') : t('user'))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link to={createPageUrl("Configuracion")} className="p-2 rounded-xl transition-all hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 hover:scale-110" title={t('settings')}>
                  <Settings className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
                </Link>
                <button
                  onClick={() => base44.auth.logout()}
                  className="p-2 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {!isFieldPage && (
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-0 md:hidden flex-shrink-0 h-28 relative overflow-hidden bg-gradient-to-b from-[#F0F4FF] to-[#EBF2FF] dark:from-slate-900 dark:to-slate-900/50"
              >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
                alt="MCI Connect"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                <SidebarTrigger className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 flex-shrink-0 min-w-[40px] min-h-[40px]">
                  <Menu className="w-5 h-5 text-[#1E3A8A]" />
                </SidebarTrigger>
                <div className="flex-shrink-0">
                  <NotificationBell user={user} />
                </div>
              </div>
            </motion.header>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F5F9] dark:bg-[#181818]" data-scrollable="true" style={{ 
            WebkitOverflowScrolling: 'touch', 
            touchAction: 'pan-y',
            overscrollBehaviorY: 'contain'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="min-h-full w-full"
              >
                <div className="min-h-full w-full max-w-screen-2xl mx-auto px-safe md:p-0 p-0 pb-20 md:pb-0">
                  {children}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <AIAssistant currentPage={currentPageName} />
          </main>

          {/* Bottom Navigation for Mobile */}
          <BottomNav user={user} pendingExpenses={pendingExpenses} navigation={navigation} />
          </div>
          </SyncQueueProvider>
          </SidebarProvider>
          );
          };

          export default function Layout({ children, currentPageName }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  return (
    <ToastProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <PermissionsProvider>
            <AgreementGate user={user}>
              <LayoutContent currentPageName={currentPageName} user={user} isLoading={isLoading} error={error}>
                {children}
              </LayoutContent>
            </AgreementGate>
          </PermissionsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}