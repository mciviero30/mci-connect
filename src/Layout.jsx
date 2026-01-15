import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Rocket,
  BookOpen,
  AlertTriangle,
  Maximize2,
  ArrowLeft,
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
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { LanguageProvider, useLanguage } from "@/components/i18n/LanguageContext";
import { PermissionsProvider } from "@/components/permissions/PermissionsContext";
import { UIProvider, useUI } from "@/components/contexts/FieldModeContext";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import MobileOptimizations from "@/components/shared/MobileOptimizations";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import { SyncQueueProvider } from "@/components/pwa/SyncQueueManager";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import EnhancedOfflineSync from "@/components/offline/EnhancedOfflineSync";
import AIAssistant from "@/components/ai/AIAssistant";
import NotificationService from "@/components/notifications/NotificationService";
import NotificationEngine from "@/components/notifications/NotificationEngine";
import UniversalNotificationEngine from "@/components/notifications/UniversalNotificationEngine";
import CustomerNotificationEngine from "@/components/notifications/CustomerNotificationEngine";
import NotificationBell from "@/components/notifications/NotificationBell";
import UniversalPushManager from "@/components/notifications/IOSPushManager";
import ProfileSyncManager from "@/components/sync/ProfileSyncManager";
import { migratePendingToUser, normalizeEmail } from "@/components/utils/profileMerge";
import BottomNav from "@/components/navigation/BottomNav";
import AgreementGate from "@/components/agreements/AgreementGate";
import TaxProfileGate from "@/components/tax/TaxProfileGate";
import FocusModeIndicator from "@/components/shared/FocusModeIndicator";
import { hasFullAccess, getNavigationForRole } from "@/components/core/roleRules";

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
  const { isFieldMode, isFocusMode, toggleFocusMode, shouldHideSidebar } = useUI();
  const sidebarContentRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  


  // Use auth user directly
  const displayUser = user;

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

  // REMOVED: Global theme mutation - Field uses scoped dark class via data-attribute
  // Field pages apply dark mode via data-field-mode attribute, not global dark class

  const { data: clientMemberships = [] } = useQuery({
    queryKey: ['client-memberships-check', user?.email, user?.role],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email && user?.role !== 'admin',
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isClientOnly = clientMemberships.length > 0 && user?.role !== 'admin';

  // ROUTE-BASED CHECK (reliable on refresh, unlike currentPageName)
  const isOnboardingRoute = location.pathname.includes('/Onboarding');
  
  // DEFINITIVE ONBOARDING GATE: Use ONLY the completion flag
  // NEVER count forms or use stale queries (prevents loop)
  const shouldBlockForOnboarding = user && 
    !isClientOnly && 
    user.role !== 'admin' && 
    user.employment_status !== 'deleted' &&
    user.onboarding_completed === false;  // Strict false check - undefined/null users pass through

  // Navigation arrays - MUST be defined before useMemo
  const adminNavigation = [
    {
      section: 'STRATEGY',
      icon: Target,
      items: [
        { title: 'Executive Dashboard', url: createPageUrl("ExecutiveDashboard"), icon: TrendingUp },
        { title: 'Control Tower', url: createPageUrl("ExecutiveControlTower"), icon: Shield },
        { title: 'Analytics Hub', url: createPageUrl("ReportingHub"), icon: BarChart3 },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet },
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'Bank Sync', url: createPageUrl("BankSync"), icon: Building2 },
        { title: 'Reconciliation', url: createPageUrl("PaymentReconciliation"), icon: CheckCircle2 },
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
      section: 'LEARNING & REFERENCE',
      icon: BookOpen,
      items: [
        { title: 'Training Modules', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Installation Library', url: createPageUrl("KnowledgeLibrary"), icon: BookOpen },
      ]
    },
    {
      section: 'COMPLIANCE',
      icon: Shield,
      items: [
        { title: 'System Readiness', url: createPageUrl("SystemReadiness"), icon: Rocket },
        { title: 'Go-Live Playbook', url: createPageUrl("GoLivePlaybook"), icon: Rocket },
        { title: 'Operational Modes Doc', url: createPageUrl("OperationalModesDoc"), icon: BookOpen },
        { title: 'Approvals Hub', url: createPageUrl("ApprovalsHub"), icon: CheckCircle2 },
        { title: 'Compliance Hub', url: createPageUrl("ComplianceHub"), icon: Shield },
        { title: 'Change Orders', url: createPageUrl("ChangeOrders"), icon: FileText },
        { title: 'Safety Incidents', url: createPageUrl("SafetyIncidents"), icon: Shield },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
        { title: 'Notifications', url: createPageUrl("NotificationCenter"), icon: Bell },
        { title: 'Role Management', url: createPageUrl("RoleManagement"), icon: Shield },
        { title: 'Agreement Signatures', url: createPageUrl("AgreementSignatures"), icon: FileText },
        { title: 'Commission Agreements', url: createPageUrl("CommissionAgreements"), icon: DollarSign },
        { title: 'Commission Review', url: createPageUrl("CommissionReview"), icon: TrendingUp },
        { title: 'Commission Reports', url: createPageUrl("CommissionReports"), icon: BarChart3 },
        { title: 'Commission Totals (Gusto)', url: createPageUrl("CommissionTotalsGusto"), icon: Banknote },
        { title: 'Audit Trail', url: createPageUrl("AuditTrail"), icon: Shield },
        { title: 'System Health', url: createPageUrl("SystemHealthCheck"), icon: Zap },
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
        { title: 'Manager Dashboard', url: createPageUrl("ManagerDashboard"), icon: TrendingUp },
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'Commission Agreements', url: createPageUrl("CommissionAgreements"), icon: DollarSign },
        { title: 'Commission Reports', url: createPageUrl("CommissionReports"), icon: BarChart3 },
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
        { title: 'Training Modules', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Installation Library', url: createPageUrl("KnowledgeLibrary"), icon: BookOpen },
        { title: 'My Scorecard', url: createPageUrl("MiScorecard"), icon: Target },
        { title: 'My Goals', url: createPageUrl("Goals"), icon: Target },
        { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
      ]
    }
  ];

  // Check if we're on a Field page
  const isFieldPage = location.pathname.includes('/Field');

  // Prevent Layout from triggering Field remounts
  const wasFieldPage = useRef(false);

  // REMOVED: Migration moved to background - doesn't block UI
  // Migration happens asynchronously via ProfileSyncManager after login

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

  // Field page state management - MUST be before early returns
  useEffect(() => {
    if (isFieldPage) {
      // Mark Field as active to prevent provider re-initialization
      if (!wasFieldPage.current) {
        sessionStorage.setItem('field_active', 'true');
        wasFieldPage.current = true;
      }
    } else if (wasFieldPage.current) {
      // Only clear when actually leaving Field
      sessionStorage.removeItem('field_active');
      wasFieldPage.current = false;
    }
  }, [isFieldPage]);

  // UNIFIED ROLE SYSTEM - Single source of truth
  const isAdmin = hasFullAccess(displayUser || user);

  // Memoize navigation to prevent recalculation - MUST be before early returns
  const navigation = useMemo(() => {
    const navType = getNavigationForRole(displayUser || user);
    return navType === 'admin' ? adminNavigation : employeeNavigation;
  }, [displayUser, user]);

  // Profile image computation
  const profileImage = useMemo(() => {
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
  }, [displayUser, user]);

  const imageKey = (displayUser || user)?.profile_last_updated || (displayUser || user)?.id;



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

  // DECLARATIVE GATE 1: Block for onboarding (no navigation)
  if (shouldBlockForOnboarding && !isOnboardingRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <ClipboardList className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Onboarding Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please complete your onboarding before accessing the app.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('OnboardingWizard'))}
            className="soft-blue-gradient text-white shadow-lg"
          >
            Complete Onboarding
          </Button>
        </div>
      </div>
    );
  }

  // DECLARATIVE GATE 2: Deleted users
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

  // DECLARATIVE GATE 3: Client-only users -> render ClientPortal directly
  if (isClientOnly && currentPageName !== 'ClientPortal') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Client Access</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Redirecting to your project portal...
          </p>
          <Link to={createPageUrl('ClientPortal')}>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
              Go to Client Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* <ServiceWorkerRegistration /> */}
      <MobileOptimizations />
      <SyncQueueProvider>
        <OfflineIndicator />
        {/* <NotificationService user={user}>
          <NotificationEngine user={user} />
        </NotificationService> */}

      {/* {user && user.employment_status !== 'deleted' && !shouldBlockForOnboarding && (
        <ErrorBoundary fallback={<div />}>
          <UniversalNotificationEngine user={user} />
          <CustomerNotificationEngine user={user} />
          <UniversalPushManager user={user} />
        </ErrorBoundary>
      )} */}

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

        {/* <ProfileSyncManager user={user} /> */}

        {/* CRITICAL: Sidebar hidden in Field Mode OR Focus Mode */}
        {!shouldHideSidebar && !isFieldPage && (
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
            data-sidebar-scroll="true"
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
                  <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="es" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      Español
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded-2xl p-3 border bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {profileImage ? (
                  <img
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
        )}
        
        <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden ${shouldHideSidebar ? 'w-full' : ''}`}>
          {/* Mobile Header: Hidden when sidebar is hidden (Field/Focus Mode) */}
          {!shouldHideSidebar && (
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
                {!shouldHideSidebar && (
                  <SidebarTrigger className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 flex-shrink-0 min-w-[40px] min-h-[40px]">
                    <Menu className="w-5 h-5 text-[#1E3A8A]" />
                  </SidebarTrigger>
                )}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {!isFieldMode && !isFocusMode && (
                    <button
                      onClick={toggleFocusMode}
                      className="p-2 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 min-w-[40px] min-h-[40px]"
                      title="Focus Mode"
                    >
                      <Maximize2 className="w-5 h-5 text-[#1E3A8A]" />
                    </button>
                  )}
                  <NotificationBell user={user} />
                </div>
              </div>
            </motion.header>
          )}

          {/* Focus Mode Toggle - Desktop (not shown in Field Mode) - COMPACT */}
          {!shouldHideSidebar && !isFocusMode && (
            <div className="hidden md:flex absolute top-2 right-2 z-40">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFocusMode}
                className="w-8 h-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all"
                title="Focus Mode (⌘+K)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Focus Mode Indicator & Exit - Unified Component */}
          {isFocusMode && !isFieldMode && (
            <FocusModeIndicator isActive={true} onExit={toggleFocusMode} />
          )}

          <div data-main-content className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F5F9] dark:bg-[#181818]" style={{ 
            WebkitOverflowScrolling: 'touch', 
            touchAction: 'pan-y',
            overscrollBehaviorY: 'contain'
          }}>
            <div className="min-h-full w-full max-w-screen-2xl mx-auto px-safe md:p-0 p-0 pb-20 md:pb-0">
              {children}
            </div>
          </div>

          <AIAssistant currentPage={currentPageName} />
          <EnhancedOfflineSync />

          {/* Bottom Navigation: Hidden in Field/Focus Mode */}
          {!shouldHideSidebar && (
            <BottomNav user={user} pendingExpenses={pendingExpenses} navigation={navigation} />
          )}
        </main>
      </div>
      </SyncQueueProvider>
    </SidebarProvider>
  );
};

          export default function Layout({ children, currentPageName }) {
          const { data: user, isLoading, error } = useQuery({
          queryKey: CURRENT_USER_QUERY_KEY,
          queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        // Handle 401 - redirect to login without breaking app
        if (err?.status === 401 || err?.message?.includes('401')) {
          // Prevent infinite redirect loops - redirect only once per session
          const hasRedirected = sessionStorage.getItem('auth_redirect_pending');
          if (!hasRedirected) {
            sessionStorage.setItem('auth_redirect_pending', 'true');
            base44.auth.redirectToLogin();
          }
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 0, // Always fresh - no cache
    gcTime: Infinity,
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window focused
    refetchInterval: false,
  });

  // DISABLED: beforeunload handler causes issues on login flow
  // useEffect(() => {
  //   const handleBeforeUnload = (e) => {
  //     e.preventDefault();
  //     e.returnValue = '';
  //   };
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  // }, []);

  // HARD LOADING GUARD - Prevent gates from running during boot
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // No user and not loading - don't render gates
  if (!user && !isLoading) {
    return null;
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <LanguageProvider>
          {user && (
            <PermissionsProvider>
              <AgreementGate>
                <TaxProfileGate>
                  <UIProvider>
                    <LayoutContent currentPageName={currentPageName} user={user} isLoading={isLoading} error={error}>
                      {children}
                    </LayoutContent>
                  </UIProvider>
                </TaxProfileGate>
              </AgreementGate>
            </PermissionsProvider>
          )}
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}