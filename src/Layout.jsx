import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Trash2,
  TrendingUp,
  Sparkles,
  Wallet,
  Globe,
  Target,
  Brain,
  Zap,
  Shield,
  Bell,
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { LanguageProvider, useLanguage } from "@/components/i18n/LanguageContext";
import { PermissionsProvider } from "@/components/permissions/PermissionsContext";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import MobileOptimizations from "@/components/shared/MobileOptimizations";
import AIAssistant from "@/components/ai/AIAssistant";
import CustomAvatar from "@/components/avatar/CustomAvatar";
import NotificationService from "@/components/notifications/NotificationService";
import NotificationEngine from "@/components/notifications/NotificationEngine";
import { OfflineProvider } from "@/components/offline/OfflineManager";
import CertificationMonitor from "@/components/certifications/CertificationMonitor";
import DeadlineMonitor from "@/components/notifications/DeadlineMonitor";
import RealTimeNotifications from "@/components/notifications/RealTimeNotifications";

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

const LayoutContent = ({ children, currentPageName }) => {
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const sidebarContentRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Check if user is a client member (for redirect to ClientPortal)
  const { data: clientMemberships = [] } = useQuery({
    queryKey: ['client-memberships-check', user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email && user?.role !== 'admin',
  });

  const isClientOnly = clientMemberships.length > 0 && user?.role !== 'admin';

  // Check onboarding completion
  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms', user?.email],
    queryFn: () => base44.entities.OnboardingForm.filter({ employee_email: user?.email }),
    enabled: !!user?.email && !isClientOnly && user?.employment_status !== 'deleted',
    initialData: []
  });

  const onboardingCompleted = user?.onboarding_completed || onboardingForms.length >= 3;
  const isOnboardingPage = currentPageName === 'OnboardingWizard';

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!user || isClientOnly || user.role === 'admin' || user.employment_status === 'deleted') return;
    if (isOnboardingPage) return;
    
    if (!onboardingCompleted && onboardingForms.length < 3) {
      window.location.href = createPageUrl('OnboardingWizard');
    }
  }, [user, onboardingCompleted, isOnboardingPage, onboardingForms, isClientOnly]);

  useEffect(() => {
    if (!user) return;
    if (user.employment_status !== 'invited') return;

    const autoActivateUser = async () => {
      try {
        console.log('🔄 Auto-activating invited user:', user.email);
        
        await base44.auth.updateMe({ 
          employment_status: 'active',
          hire_date: user.hire_date || new Date().toISOString().split('T')[0]
        });
        
        console.log('✅ User activated successfully');
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('❌ Error auto-activating user:', error);
      }
    };

    autoActivateUser();
  }, [user?.id, user?.employment_status]);

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
    staleTime: 60000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const sidebar = sidebarContentRef.current;
    if (sidebar) {
      const savedPosition = sessionStorage.getItem('sidebarScrollPosition');
      if (savedPosition) {
        sidebar.scrollTop = parseInt(savedPosition, 10);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const sidebar = sidebarContentRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      sessionStorage.setItem('sidebarScrollPosition', sidebar.scrollTop.toString());
    };

    sidebar.addEventListener('scroll', handleScroll);
    return () => sidebar.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect client-only users to ClientPortal
  useEffect(() => {
    if (isClientOnly && currentPageName !== 'ClientPortal') {
      window.location.href = createPageUrl('ClientPortal');
    }
  }, [isClientOnly, currentPageName]);

  // Permission-based navigation
  const getNavigationForUser = () => {
    const position = user?.position;
    const department = user?.department;
    const isAdmin = user?.role === 'admin';

    // Full access: CEO, administrator, admin role, managers, and HR
    const hasFullAccess = isAdmin || position === 'CEO' || position === 'administrator' || position === 'manager' || department === 'HR';

    if (hasFullAccess) {
      return adminNavigation;
    }

    return employeeNavigation;
  };

  const adminNavigation = [
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
                  { title: 'Skill Matrix', url: createPageUrl("SkillMatrix"), icon: Award },
                  { title: 'Performance', url: createPageUrl("PerformanceManagement"), icon: Award },
                  { title: 'Goals & OKRs', url: createPageUrl("Goals"), icon: Target },
                                { title: 'Team Goals', url: createPageUrl("TeamGoals"), icon: Users },
                  { title: 'Bonuses', url: createPageUrl("BonusConfiguration"), icon: Award },
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
      section: 'DASHBOARDS & INSIGHTS',
      items: [
        { title: 'Financial Dashboard', url: createPageUrl('FinancialDashboard'), icon: DollarSign },
                      { title: 'Analytics Dashboard', url: createPageUrl('AnalyticsDashboard'), icon: BarChart3 },
                      { title: 'Jobs Advanced', url: createPageUrl('JobsAdvanced'), icon: Target },
                      { title: 'HR Advanced', url: createPageUrl('HRAdvancedDashboard'), icon: Shield },
                      { title: 'AI Automation', url: createPageUrl('AIAutomationDashboard'), icon: Brain },
      ]
    },
    {
      section: 'REPORTS & AI',
      items: [
        { title: 'Analytics Hub', url: createPageUrl("ReportingHub"), icon: BarChart3 },
        { title: 'Reports', url: createPageUrl("Reportes"), icon: BarChart3 },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet },
        { title: 'Budget Forecast', url: createPageUrl('BudgetForecasting'), icon: TrendingUp },
                      { title: 'AI Invoice Gen', url: createPageUrl("AIInvoiceGenerator"), icon: Sparkles },
                      { title: 'AI Documents', url: createPageUrl("DocumentosAI"), icon: Sparkles },
                      { title: 'AI Expenses', url: createPageUrl('AIExpensesAudit'), icon: Sparkles },
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
    },
    {
      section: 'ADMIN',
      items: [
        { title: 'Role Management', url: createPageUrl("RoleManagement"), icon: Shield },
        { title: 'Clean Data', url: createPageUrl("AdminCleanup"), icon: Trash2 },
        { title: 'Testing', url: createPageUrl("TestingChecklist"), icon: ClipboardList },
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
          section: 'GENERAL',
          items: [
            { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
            { title: 'My Profile', url: createPageUrl("MyProfile"), icon: User },
            { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
            { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
            { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
            { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
            { title: 'MCI Field', url: createPageUrl("Field"), icon: MapPin },
          ]
        },
    {
      section: 'MY TIME & PAY',
      items: [
        { title: 'My Hours', url: createPageUrl("MisHoras"), icon: Clock },
        { title: 'Driving', url: createPageUrl("HorasManejo"), icon: Clock },
        { title: 'Mileage', url: createPageUrl("Manejo"), icon: Car },
        { title: 'My Expenses', url: createPageUrl("MisGastos"), icon: Receipt },
        { title: 'Per Diem', url: createPageUrl("PerDiem"), icon: Banknote },
        { title: 'My Payroll', url: createPageUrl("MyPayroll"), icon: Banknote },
      ]
    },
    {
      section: 'MY PERFORMANCE',
      items: [
        { title: 'My Scorecard', url: createPageUrl("MiScorecard"), icon: Target },
                      { title: 'My Goals', url: createPageUrl("Goals"), icon: Target },
                      { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase },
                      { title: 'AI Assistant', url: createPageUrl("AIAssistantPersonal"), icon: Brain },
      ]
    },
    {
      section: 'RESOURCES',
      items: [
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
        { title: 'Notifications', url: createPageUrl("NotificationCenter"), icon: Bell },
        { title: 'Activity Feed', url: createPageUrl("ActivityFeed"), icon: Zap },
      ]
    }
    ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#181818]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-medium text-slate-900 dark:text-white">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#181818]">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-[#282828] backdrop-blur-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20 p-1">
                            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">MCI Connect</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{t('error')}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
            {t('reload')}
          </Button>
        </div>
      </div>
    );
  }

  if (user && user.employment_status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#181818]">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-[#282828] backdrop-blur-xl border border-red-200 dark:border-red-900/30">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <UserX className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-red-600 dark:text-red-400 mb-4">Your account has been deactivated.</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => base44.auth.logout()} className="bg-red-500 hover:bg-red-600 text-white">
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }

  const navigation = getNavigationForUser();
  const isAdmin = user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'administrator';

  // If client only, render ClientPortal directly without sidebar
  if (isClientOnly) {
    return children;
  }

  const getProfileImage = () => {
    if (!user) return null;
    
    // Check preferred image first
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
    // Then check profile_photo_url
    if (user.profile_photo_url) {
      return user.profile_photo_url;
    }
    
    // Fallback to avatar if exists
    if (user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
    return null;
  };

  const profileImage = getProfileImage();

  return (
    <SidebarProvider>
      <MobileOptimizations />
      <NotificationService user={user}>
        <NotificationEngine user={user} />
      </NotificationService>

      {user && (
        <>
          <CertificationMonitor userEmail={user.email} />
          <DeadlineMonitor userEmail={user.email} />
          <RealTimeNotifications userEmail={user.email} />
        </>
      )}
        
      <div className="min-h-screen flex w-full bg-[#FAFAFA] dark:bg-[#181818]">
        <style>{`
          /* ============================================ */
          /* GLOBAL THEME SYSTEM - PROFESSIONAL COLORS   */
          /* ============================================ */
          
          /* Professional Blue Primary */
          :root {
            --color-primary: #2563EB;
            --color-primary-hover: #1D4ED8;
            --color-primary-light: #60A5FA;
          }
          
          /* Custom scrollbars */
          .sidebar-scroll-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-track {
            background: rgba(37, 99, 235, 0.05);
            border-radius: 3px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-thumb {
            background: rgba(37, 99, 235, 0.3);
            border-radius: 3px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-thumb:hover {
            background: rgba(37, 99, 235, 0.5);
          }

          *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          *::-webkit-scrollbar-track {
            background: rgba(37, 99, 235, 0.05);
          }
          
          *::-webkit-scrollbar-thumb {
            background: rgba(37, 99, 235, 0.2);
            border-radius: 4px;
          }
          
          *::-webkit-scrollbar-thumb:hover {
            background: rgba(37, 99, 235, 0.4);
          }

          @media (max-width: 1024px) {
            * {
              -webkit-tap-highlight-color: transparent;
            }
          }
        `}</style>

        <Sidebar className="border-none">
          <SidebarHeader className="p-4 flex-shrink-0 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 p-0.5">
                                    <img
                                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                                      alt="MCI Connect"
                                      className="w-full h-full rounded-md"
                                    />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">MCI Connect</h2>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {language === 'es' ? 'Sistema de Gestión' : 'Management System'}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent 
            ref={sidebarContentRef} 
            className="p-3 sidebar-scroll-content overflow-y-auto overflow-x-hidden flex-1 scroll-smooth"
            data-scrollable="true"
          >
            {navigation.map((section, idx) => (
              <SidebarGroup key={idx} className="mb-4">
                <SidebarGroupLabel className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-3 py-2 mb-1">
                  {section.section}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      const showBadge = (item.title === 'Expenses' || item.title === 'My Expenses') && pendingExpenses > 0;

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`transition-all duration-300 rounded-xl mb-0.5 border-none ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2 relative group">
                              <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                                isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                              }`} />
                              <span className="font-medium text-sm">
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
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
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
          </SidebarContent>

          <SidebarFooter className="p-4 flex-shrink-0 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
            <div className="mb-3 px-2 flex items-center gap-2">
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="h-9 flex-1 backdrop-blur-sm bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Languages className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="en" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">🇺🇸 English</SelectItem>
                  <SelectItem value="es" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded-xl p-3 backdrop-blur-sm border bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center border-2 border-blue-400/30">
                    <span className="text-white font-bold text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs truncate text-blue-600 dark:text-blue-400">
                    {user?.role === 'admin' ? t('admin') : t('user')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link to={createPageUrl("Configuracion")} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" title={t('settings')}>
                  <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" />
                </Link>
                <button
                  onClick={() => base44.auth.logout()}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" />
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="backdrop-blur-xl px-3 py-2 md:hidden flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 max-w-screen-xl mx-auto">
              <SidebarTrigger className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
                <Menu className="w-4 h-4 text-slate-900 dark:text-white" />
              </SidebarTrigger>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                  alt="MCI Connect"
                  className="w-5 h-5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white truncate">MCI Connect</h1>
                  {isAdmin && <p className="text-[8px] text-blue-600 dark:text-blue-400 leading-tight">Management System</p>}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-[#181818]" data-scrollable="true">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                <div className="h-full w-full max-w-screen-2xl mx-auto px-safe md:p-0 p-0">
                  {children}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <AIAssistant currentPage={currentPageName} />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default function Layout({ children, currentPageName }) {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <PermissionsProvider>
            <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
          </PermissionsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}