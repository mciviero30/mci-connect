import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSubscription, useEventListener } from "@/components/hooks/useMemoryLeakPrevention";
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
                    Compass,
                    Link2,
                    Ruler,
                    ChevronRight,
                    RefreshCw,
                    Heart,
                    FileSpreadsheet,
                    Upload,
                    Search,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import BackgroundSyncManager from "@/components/mobile/BackgroundSyncManager";
import InstallPrompt from "@/components/mobile/InstallPrompt";
import NetworkSpeedIndicator from "@/components/mobile/NetworkSpeedIndicator";
import AIAssistant from "@/components/ai/AIAssistant";
import NotificationService from "@/components/notifications/NotificationService";
import NotificationEngine from "@/components/notifications/NotificationEngine";
import UniversalNotificationEngine from "@/components/notifications/UniversalNotificationEngine";
import CustomerNotificationEngine from "@/components/notifications/CustomerNotificationEngine";
import NotificationBell from "@/components/notifications/NotificationBell";
import UniversalPushManager from "@/components/notifications/IOSPushManager";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import ProfileSyncManager from "@/components/sync/ProfileSyncManager";
import { migratePendingToUser, normalizeEmail } from "@/components/utils/profileMerge";
import BottomNav from "@/components/navigation/BottomNav";
import AgreementGate from "@/components/agreements/AgreementGate";
import TaxProfileGate from "@/components/tax/TaxProfileGate";
import InvitationGate from "@/components/security/InvitationGate";
import TwoFactorGate from "@/components/security/TwoFactorGate";
import EmployeeDirectoryGuard from "@/components/security/EmployeeDirectoryGuard";
import FocusModeIndicator from "@/components/shared/FocusModeIndicator";
import SessionTimeoutManager from "@/components/security/SessionTimeoutManager";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import { hasFullAccess, getNavigationForRole } from "@/components/core/roleRules";
import { Hammer } from "lucide-react";
import OfflineBanner from "@/components/resilience/OfflineBanner";
import { clearAllFieldData } from "@/components/field/services/FieldCleanupService";
import GlobalSearch from "@/components/search/GlobalSearch";
import ActiveSessionBanner from "@/components/time-tracking/ActiveSessionBanner";
import KeyboardShortcuts from "@/components/navigation/KeyboardShortcuts";

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

const SidebarNavigation = React.memo(function SidebarNavigation({ navigation, location, pendingExpenses, sidebarContentRef }) {
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [expandedParents, setExpandedParents] = React.useState(new Set());
  const itemRefs = React.useRef([]);
  
  // Flatten all navigation items for keyboard navigation
  const allItems = React.useMemo(() => {
    const flat = [];
    navigation.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          flat.push(item);
          item.children.forEach(child => flat.push(child));
        } else {
          flat.push(item);
        }
      });
    });
    return flat;
  }, [navigation]);

  // Find which section contains the active page
  const activeSectionIndex = React.useMemo(() => {
    const index = navigation.findIndex(section => 
      section.items.some(item => {
        if (item.children) {
          return item.children.some(child => location.pathname === child.url);
        }
        return location.pathname === item.url;
      })
    );
    return index >= 0 ? String(index) : undefined;
  }, [navigation, location.pathname]);

  // Auto-expand parent if any child is active
  React.useEffect(() => {
    const newExpanded = new Set();
    navigation.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          if (item.children.some(child => location.pathname === child.url)) {
            newExpanded.add(item.title);
          }
        }
      });
    });
    setExpandedParents(newExpanded);
  }, [location.pathname, navigation]);

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
    <Accordion type="single" collapsible defaultValue={activeSectionIndex} className="w-full">
      {navigation.map((section, idx) => {
        const sectionId = String(idx);
        
        return (
          <AccordionItem key={idx} value={sectionId} className="border-none mb-2">
            <AccordionTrigger className="text-[9px] font-bold tracking-wider bg-[#EBF2FF] dark:bg-slate-800 rounded px-2 py-1 flex items-center gap-1.5 text-[#507DB4] dark:text-slate-300 border border-[#507DB4]/10 dark:border-slate-700 hover:no-underline hover:bg-[#507DB4]/10 transition-colors">
              <div className="flex items-center gap-1">
                {section.icon && <section.icon className="w-2.5 h-2.5" />}
                {section.section}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-1">
              <SidebarMenu>
                {section.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedParents.has(item.title);
                  const currentItemIndex = itemIndex++;

                  if (hasChildren) {
                    return (
                      <div key={item.title}>
                        <button
                          onClick={() => {
                            setExpandedParents(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(item.title)) {
                                newSet.delete(item.title);
                              } else {
                                newSet.add(item.title);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded mb-0.5 text-slate-600 dark:text-slate-400 hover:bg-[#507DB4]/10 dark:hover:bg-[#507DB4]/20 transition-all"
                        >
                          <item.icon className="w-3 h-3 flex-shrink-0 text-[#FF8C00]" style={{ 
                            filter: 'drop-shadow(0 0 6px rgba(255, 140, 0, 0.3))'
                          }} />
                          <span className="font-medium text-[10px] flex-1 text-left bg-gradient-to-r from-[#FF8C00] to-[#FFB347] bg-clip-text text-transparent font-bold">
                            {item.title}
                          </span>
                          <ChevronRight className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="space-y-0.5 pl-4">
                            {item.children.map((child) => {
                              const isActive = location.pathname === child.url;
                              const childItemIndex = itemIndex++;

                              return (
                                <SidebarMenuItem key={child.title}>
                                  <SidebarMenuButton
                                    asChild
                                    className={`transition-all duration-200 rounded mb-0.5 border-none ${
                                      isActive
                                        ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                                        : 'hover:bg-[#507DB4]/15 dark:hover:bg-[#507DB4]/25 text-slate-600 dark:text-slate-400 hover:text-[#507DB4] dark:hover:text-[#6B9DD8] hover:translate-x-0.5 hover:shadow-sm'
                                    }`}
                                  >
                                    <Link 
                                      ref={el => itemRefs.current[childItemIndex] = el}
                                      to={child.url} 
                                      onClick={() => setOpenMobile(false)} 
                                      className={`flex items-center gap-2 px-2 py-1.5 relative group outline-none ${
                                        focusedIndex === childItemIndex ? 'ring-1 ring-[#507DB4] ring-offset-1' : ''
                                      }`}
                                      data-sidebar-item
                                      tabIndex={0}>
                                      <child.icon className={`w-3 h-3 flex-shrink-0 transition-transform group-hover:scale-105 ${
                                        isActive ? 'text-white' : 'text-[#FF8C00]'
                                      }`} style={{ 
                                        filter: isActive ? 'none' : 'drop-shadow(0 0 6px rgba(255, 140, 0, 0.3))'
                                      }} />
                                      <span className={`font-medium text-[10px] ${
                                        isActive ? '' : 'bg-gradient-to-r from-[#FF8C00] to-[#FFB347] bg-clip-text text-transparent'
                                      }`}>
                                        {child.title}
                                      </span>
                                      {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-r-full shadow-sm" />
                                      )}
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const isActive = location.pathname === item.url;
                    const showBadge = (item.title === 'Expenses' || item.title === 'My Expenses') && pendingExpenses > 0;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-200 rounded mb-0.5 border-none ${
                            isActive
                              ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                              : 'hover:bg-[#507DB4]/15 dark:hover:bg-[#507DB4]/25 text-slate-600 dark:text-slate-400 hover:text-[#507DB4] dark:hover:text-[#6B9DD8] hover:translate-x-0.5 hover:shadow-sm'
                          }`}
                        >
                          <Link 
                            ref={el => itemRefs.current[currentItemIndex] = el}
                            to={item.url} 
                            onClick={() => setOpenMobile(false)} 
                            className={`flex items-center gap-2 px-2 py-1.5 relative group outline-none ${
                              focusedIndex === currentItemIndex ? 'ring-1 ring-[#507DB4] ring-offset-1' : ''
                            }`}
                            data-sidebar-item
                            tabIndex={0}>
                            <item.icon className={`w-3 h-3 flex-shrink-0 transition-transform group-hover:scale-105 text-slate-500 dark:text-slate-400`} />
                            <span className="font-medium text-[10px]">
                              {item.title}
                            </span>
                            {showBadge && (
                              <Badge className="bg-red-500 text-white text-[8px] px-1 py-0 shadow-lg shadow-red-500/30 animate-pulse">
                                {pendingExpenses}
                              </Badge>
                            )}
                            {item.badge && (
                              <span className="text-[9px]">{item.badge}</span>
                            )}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-r-full shadow-sm" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                })}
              </SidebarMenu>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
    );
    });

    // Wrapper to ensure useUI is called within UIProvider
const LayoutContentWrapper = ({ children, currentPageName, user, isLoading, error }) => {
  // This component is guaranteed to be inside UIProvider
  const { isFieldMode, isFocusMode, toggleFocusMode, shouldHideSidebar } = useUI();
  
  return (
    <LayoutContent 
      children={children}
      currentPageName={currentPageName}
      user={user}
      isLoading={isLoading}
      error={error}
      isFieldMode={isFieldMode}
      isFocusMode={isFocusMode}
      toggleFocusMode={toggleFocusMode}
      shouldHideSidebar={shouldHideSidebar}
    />
  );
};

const LayoutContent = ({ children, currentPageName, user, isLoading, error, isFieldMode, isFocusMode, toggleFocusMode, shouldHideSidebar }) => {

  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, changeLanguage, t } = useLanguage();
  const sidebarContentRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showEmployeeQuickMenu, setShowEmployeeQuickMenu] = useState(false);

  // LAYER 3 FALLBACK: Auto-sync EmployeeDirectory if missing
  React.useEffect(() => {
    if (!user || user.employment_status === 'deleted') return;

    const checkAndSyncDirectory = async () => {
      try {
        const existing = await base44.entities.EmployeeDirectory.filter({ 
          employee_email: user.email 
        });

        if (existing.length === 0) {
          // Missing EmployeeDirectory - create it
          const { syncUserToEmployeeDirectory } = await import('@/functions/syncUserToEmployeeDirectory');
          await syncUserToEmployeeDirectory({ user_id: user.id });
        }
      } catch (error) {
        console.error('Layout fallback sync failed:', error);
      }
    };

    checkAndSyncDirectory();
  }, [user?.id]);
  


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
  // CRITICAL: Exempt admin, CEO, and demo from onboarding requirement
  const isAdminOrCEO = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'demo' || user?.position === 'CEO';
  const shouldBlockForOnboarding = user && 
    !isClientOnly && 
    !isAdminOrCEO &&
    user.employment_status !== 'deleted' &&
    user.onboarding_completed === false;  // Strict false check - undefined/null users pass through

  // CEO Setup Gate: If CEO hasn't completed setup, show CEOSetup page
  const ceoSetupIncomplete = user?.role === 'ceo' && user?.ceo_setup_completed !== true;
  const isCEOSetupRoute = location.pathname.includes('/CEOSetup');
  const shouldBlockForCEOSetup = ceoSetupIncomplete && !isCEOSetupRoute;

  // Navigation arrays - MUST be defined before useMemo
  // Navigation arrays - MUST be defined before useMemo
  const adminNavigation = [
    {
      section: 'STRATEGY',
      icon: Target,
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'Executive Dashboard', url: createPageUrl("ExecutiveDashboard"), icon: TrendingUp },
        { title: 'Control Tower', url: createPageUrl("ExecutiveControlTower"), icon: Shield },
        { title: 'Analytics Hub', url: createPageUrl("ReportingHub"), icon: BarChart3 },
        { title: 'Advanced Analytics', url: createPageUrl("AdvancedAnalytics"), icon: Zap },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet },
        { title: 'Aging Report', url: createPageUrl("AgingReport"), icon: TrendingUp },
        { title: 'Team Utilization', url: createPageUrl("TeamUtilizationReport"), icon: Users },
        { title: 'Client Profitability', url: createPageUrl("ClientProfitabilityReport"), icon: DollarSign },
      ]
    },
    {
      section: 'OPERATIONS',
      icon: Briefcase,
      items: [
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        { title: 'Project Timeline', url: createPageUrl("JobTimeline"), icon: TrendingUp },
        {
          title: 'MCI Field',
          icon: MapPin,
          children: [
            { title: 'Field', url: createPageUrl("Field"), icon: MapPin },
            { title: 'Measurement', url: createPageUrl("Measurement"), icon: Ruler }
          ]
        },
        { title: 'Live GPS Tracking', url: createPageUrl("LiveGPSTracking"), icon: Compass },
        { title: 'Inventory', url: createPageUrl("Inventario"), icon: Package },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
        { title: 'Job Analysis', url: createPageUrl("JobPerformanceAnalysis"), icon: BarChart3 },
        { title: 'AI Schedule Center', url: createPageUrl("AIScheduleCenter"), icon: Target },
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
        { title: 'Recurring Invoices', url: createPageUrl("RecurringInvoices"), icon: RefreshCw },
        { title: 'Expenses', url: createPageUrl("Gastos"), icon: Receipt },
        { title: 'Items Catalog', url: createPageUrl("Items"), icon: Package },
        { title: 'QuickBooks Export', url: createPageUrl("QuickBooksExport"), icon: FileSpreadsheet },
        { title: 'Budget Forecast', url: createPageUrl('BudgetForecasting'), icon: TrendingUp },
        { title: 'T&M Invoice Builder', url: createPageUrl('TMInvoiceBuilder'), icon: Clock },
        { title: 'Bank Sync', url: createPageUrl("BankSync"), icon: Building2 },
        { title: 'Reconciliation', url: createPageUrl("PaymentReconciliation"), icon: CheckCircle2 },
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
        { title: 'Payroll Import', url: createPageUrl('PayrollImportLedger_v2'), icon: Upload },
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
      section: 'COMPLIANCE & DOCS',
      icon: Shield,
      items: [
        { title: 'Approvals Hub', url: createPageUrl("ApprovalsHub"), icon: CheckCircle2 },
        { title: 'Compliance Hub', url: createPageUrl("ComplianceHub"), icon: Shield },
        { title: 'Safety Incidents', url: createPageUrl("SafetyIncidents"), icon: Shield },
        { title: 'E-Signatures', url: createPageUrl("DocumentSignatures"), icon: FileText },
        { title: 'Agreement Signatures', url: createPageUrl("AgreementSignatures"), icon: FileText },
        { title: 'Work Authorizations', url: createPageUrl("WorkAuthorizations"), icon: Shield },
        { title: 'Change Orders', url: createPageUrl("ChangeOrders"), icon: FileText },
        { title: 'RFIs', url: createPageUrl("RFIs"), icon: FileText },
        { title: 'Submittals', url: createPageUrl("Submittals"), icon: FileCheck },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Audit Trail', url: createPageUrl("AuditTrail"), icon: Shield },
        { title: 'Role Management', url: createPageUrl("RoleManagement"), icon: Shield },
        { title: '2FA Security', url: createPageUrl("TwoFactorSettings"), icon: Shield },
      ]
    },
    {
      section: 'COMMISSIONS',
      icon: DollarSign,
      items: [
        { title: 'Commission Agreements', url: createPageUrl("CommissionAgreements"), icon: DollarSign },
        { title: 'Commission Review', url: createPageUrl("CommissionReview"), icon: TrendingUp },
        { title: 'Commission Reports', url: createPageUrl("CommissionReports"), icon: BarChart3 },
        { title: 'Margin vs Commission', url: createPageUrl("MarginCommissionAnalyzer"), icon: TrendingUp },
        { title: 'What-If Simulator', url: createPageUrl("CommissionSimulator"), icon: Target },
        { title: 'Commission Totals (Gusto)', url: createPageUrl("CommissionTotalsGusto"), icon: Banknote },
      ]
    },
    {
      section: 'SYSTEM',
      icon: Zap,
      items: [
        { title: 'Integrations Status', url: createPageUrl("IntegrationsStatus"), icon: Link2 },
        { title: 'System Health', url: createPageUrl("SystemHealthCheck"), icon: Zap },
        { title: 'System Diagnostics', url: createPageUrl("SystemDiagnostics"), icon: Zap },
        { title: 'Notifications', url: createPageUrl("NotificationCenter"), icon: Bell },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Client Approvals', url: createPageUrl("ClientApprovals"), icon: CheckCircle2 },
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
        {
          title: 'MCI Field',
          icon: MapPin,
          children: [
            { title: 'Field', url: createPageUrl("Field"), icon: MapPin },
            { title: 'Measurement', url: createPageUrl("Measurement"), icon: Ruler }
          ]
        },
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

  const demoNavigation = [
    {
      section: 'DEMO SANDBOX',
      icon: LayoutDashboard,
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      ]
    },
    {
      section: 'EXPLORE FEATURES',
      icon: Briefcase,
      items: [
        { title: 'Quotes', url: createPageUrl("Estimados"), icon: FileText },
        { title: 'Invoices', url: createPageUrl("Facturas"), icon: FileCheck },
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        { title: 'Customers', url: createPageUrl("Clientes"), icon: Users },
        { title: 'Items Catalog', url: createPageUrl("Items"), icon: Package },
      ]
    },
    {
      section: 'DEMO INFO',
      icon: User,
      items: [
        { title: 'My Profile', url: createPageUrl("MyProfile"), icon: User },
      ]
    }
  ];

  // adminNavigation_PEOPLE removed (unused)

  // FASE 3: Supervisor Navigation
  const supervisorNavigation = [
    {
      section: 'SUPERVISOR',
      icon: Shield,
      items: [
        { title: 'Supervisor Dashboard', url: createPageUrl("SupervisorDashboard"), icon: TrendingUp },
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("EmployeeProfile"), icon: User },
      ]
    },
    {
      section: 'TEAM MANAGEMENT',
      icon: Users,
      items: [
        { title: 'Time Approvals', url: createPageUrl("Horarios"), icon: Clock },
        { title: 'Expense Approvals', url: createPageUrl("Gastos"), icon: Receipt },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
      ]
    },
    {
      section: 'JOBS',
      icon: Briefcase,
      items: [
        { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase },
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        {
          title: 'MCI Field',
          icon: MapPin,
          children: [
            { title: 'Field', url: createPageUrl("Field"), icon: MapPin },
            { title: 'Measurement', url: createPageUrl("Measurement"), icon: Ruler }
          ]
        },
      ]
    },
    {
      section: 'RESOURCES',
      icon: BookOpen,
      items: [
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
      ]
    }
  ];

  // FASE 3: Foreman Navigation
  const foremanNavigation = [
    {
      section: 'FOREMAN',
      icon: Hammer,
      items: [
        { title: 'Foreman Dashboard', url: createPageUrl("ForemanDashboard"), icon: Hammer },
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("EmployeeProfile"), icon: User },
      ]
    },
    {
      section: 'JOB SITES',
      icon: MapPin,
      items: [
        { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase },
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        {
          title: 'MCI Field',
          icon: MapPin,
          children: [
            { title: 'Field', url: createPageUrl("Field"), icon: MapPin },
            { title: 'Measurement', url: createPageUrl("Measurement"), icon: Ruler }
          ]
        },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
      ]
    },
    {
      section: 'MY WORK',
      icon: Clock,
      items: [
        { title: 'My Hours', url: createPageUrl("MisHoras"), icon: Clock },
        { title: 'My Expenses', url: createPageUrl("MisGastos"), icon: Receipt },
        { title: 'Mileage', url: createPageUrl("Manejo"), icon: Car },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
      ]
    },
    {
      section: 'RESOURCES',
      icon: BookOpen,
      items: [
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
      ]
    }
  ];

  const employeeNavigation = [
    {
      section: 'HOME',
      icon: LayoutDashboard,
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("EmployeeProfile"), icon: User },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
      ]
    },
    {
      section: 'FIELD WORK',
      icon: MapPin,
      items: [
        {
          title: 'MCI Field',
          icon: MapPin,
          children: [
            { title: 'Field', url: createPageUrl("Field"), icon: MapPin },
            { title: 'Measurement', url: createPageUrl("Measurement"), icon: Ruler }
          ]
        },
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
      section: 'MY BENEFITS',
      icon: Heart,
      items: [
        { title: 'Benefits Hub', url: createPageUrl("EmployeeBenefits"), icon: Building2 },
        { title: 'Time Off', url: createPageUrl("TimeOffRequests"), icon: CalendarClock },
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
    queryKey: ['pendingExpensesCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      if (user.role === 'admin') {
        const expenses = await base44.entities.Expense.filter({ status: 'pending' }, '', 100);
        return expenses.length;
      } else {
        // SSOT: user_id preferred, email fallback
        const query = user.id
          ? { user_id: user.id, status: 'pending' }
          : { employee_email: user.email, status: 'pending' };
        const expenses = await base44.entities.Expense.filter(query, '', 20);
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

  // FASE 3: Memoize navigation with role-based routing
  const navigation = useMemo(() => {
    const effectiveUser = displayUser || user;

    // Demo users get full admin navigation to explore all features
    if (effectiveUser?.role === 'demo') {
      return adminNavigation;
    }

    // FASE 3: Role-based navigation
    const role = effectiveUser?.role;
    if (role === 'admin' || role === 'ceo') return adminNavigation;
    if (role === 'manager') return managerNavigation;
    if (role === 'supervisor') return supervisorNavigation;
    if (role === 'foreman') return foremanNavigation;
    
    return employeeNavigation;
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

  // DECLARATIVE GATE 0: CEO Setup (runs before onboarding)
  if (shouldBlockForCEOSetup) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Setup Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please complete the CEO setup to access the app.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('CEOSetup'))}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          >
            Complete Setup
          </Button>
        </div>
      </div>
    );
  }

  // DECLARATIVE GATE 1: Block for onboarding (no navigation)
  if (shouldBlockForOnboarding && !isOnboardingRoute) {
    console.log('[OnboardingGate] BLOCKING user - onboarding incomplete', {
      userEmail: user?.email,
      userRole: user?.role,
      onboardingCompleted: user?.onboarding_completed,
      isAdminOrCEO,
      isClientOnly
    });

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

  // DECLARATIVE GATE 4: Welcome Screen (first login for all users)
  const shouldShowWelcome = user && 
    !isClientOnly && 
    user.employment_status !== 'deleted' &&
    user.welcome_screen_shown !== true;

  if (shouldShowWelcome) {
    return (
      <WelcomeScreen 
        user={user} 
        onComplete={() => {
          // Force refresh to show main app
          queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
        }} 
      />
    );
  }

  return (
    <SidebarProvider>
      <ServiceWorkerRegistration />
      <BackgroundSyncManager />
      <InstallPrompt />
      <MobileOptimizations />
      <SyncQueueProvider>

      {user && user.employment_status !== 'deleted' && !shouldBlockForOnboarding && (
        <ErrorBoundary fallback={<div />}>
          <NotificationEngine user={user} />
          <UniversalNotificationEngine user={user} />
          <CustomerNotificationEngine user={user} />
          <UniversalPushManager user={user} />
          <SessionTimeoutManager />
        </ErrorBoundary>
      )}

      <OfflineBanner language={language} />
      
      <div className="min-h-screen flex w-full bg-[#F8FAFC] dark:bg-[#181818]">
        <style>{`
          /* ============================================ */
          /* PREMIUM SOFT UI SYSTEM - GENTLE & MODERN    */
          /* ============================================ */

          /* Mobile Touch Optimizations - All Devices */
          html {
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
            height: 100%;
            width: 100%;
          }

          body {
            height: 100%;
            width: 100%;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: auto;
            touch-action: auto;
          }

          #root {
            height: 100%;
            width: 100%;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: auto;
          }

          /* Allow text selection in inputs and content areas */
          input, textarea, [contenteditable] {
            -webkit-user-select: text;
            user-select: text;
            -webkit-user-callout: default;
            -webkit-touch-callout: default;
          }

          /* Prevent zoom on input focus for iOS */
          input, select, textarea {
            font-size: 16px !important;
            touch-action: auto;
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

          /* Universal tap highlight suppression */
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
          
          /* Allow callout for links and inputs */
          a, input, textarea, select {
            -webkit-touch-callout: default;
          }
        `}</style>

        {/* <ProfileSyncManager user={user} /> */}

        {/* CRITICAL: Sidebar hidden in Field Mode OR Focus Mode */}
        {!shouldHideSidebar && !isFieldPage && (
          <Sidebar className="border-r border-[#E0E7FF] dark:border-slate-800 shadow-lg bg-gradient-to-b from-[#F0F4FF] to-[#EBF2FF] dark:from-slate-900 dark:to-slate-900/50 [&_[data-sidebar=close-button]]:w-10 [&_[data-sidebar=close-button]]:h-10 [&_[data-sidebar=close-button]]:rounded-full [&_[data-sidebar=close-button]]:bg-white [&_[data-sidebar=close-button]]:dark:bg-slate-800 [&_[data-sidebar=close-button]]:shadow-md [&_[data-sidebar=close-button]]:border [&_[data-sidebar=close-button]]:border-slate-200 [&_[data-sidebar=close-button]]:dark:border-slate-700 [&_[data-sidebar=close-button]]:hover:bg-red-50 [&_[data-sidebar=close-button]]:dark:hover:bg-red-900/20 [&_[data-sidebar=close-button]]:hover:border-red-300 [&_[data-sidebar=close-button]]:dark:hover:border-red-700 [&_[data-sidebar=close-button]]:transition-all [&_[data-sidebar=close-button]_svg]:text-slate-600 [&_[data-sidebar=close-button]_svg]:dark:text-slate-400 [&_[data-sidebar=close-button]_svg]:hover:text-red-600 [&_[data-sidebar=close-button]_svg]:dark:hover:text-red-400">
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
            className="px-2"
          >
            <SidebarNavigation navigation={navigation} location={location} pendingExpenses={pendingExpenses} sidebarContentRef={sidebarContentRef} />
          </SidebarContent>

          <SidebarFooter className="p-2 flex-shrink-0 border-t border-[#E0E7FF] dark:border-slate-700/50 bg-gradient-to-br from-[#F8FAFF] to-[#F0F4FF] dark:from-slate-900 dark:to-slate-800/50">
            <div className="mb-1.5 px-1 flex items-center gap-1.5">
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="h-6 flex-1 bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 rounded">
                  <Languages className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded">
                  <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5 text-blue-600" />
                      <span className="text-[9px]">English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="es" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <div className="flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5 text-blue-600" />
                      <span className="text-[9px]">Español</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded p-1.5 border bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {profileImage ? (
                  <img
                    src={`${profileImage}?v=${imageKey}`}
                    alt={(displayUser || user)?.full_name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-[#1E3A8A]/30 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center ring-1 ring-[#507DB4]/30 shadow-sm">
                    <span className="text-white font-bold text-[10px]">
                      {(displayUser || user)?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[10px] truncate text-slate-900 dark:text-slate-100">
                    {(displayUser || user)?.full_name || (displayUser || user)?.email || 'User'}
                  </p>
                  <p className="text-[8px] truncate text-[#507DB4] dark:text-[#6B9DD8] font-medium">
                    {(displayUser || user)?.position || (user?.role === 'admin' ? t('admin') : t('user'))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Link to={createPageUrl("Configuracion")} className="p-1 rounded transition-all hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 hover:scale-110" title={t('settings')}>
                  <Settings className="w-3 h-3 text-[#507DB4] dark:text-[#6B9DD8]" />
                </Link>
                <button
                  onClick={async () => {
                    // B1 FIX: Clear all Field data before logout (user isolation)
                    await clearAllFieldData();
                    base44.auth.logout();
                  }}
                  className="p-1 rounded transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110"
                  title={t('logout')}
                >
                  <LogOut className="w-3 h-3 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
            </SidebarFooter>
          </Sidebar>
        )}
        
        <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden ${shouldHideSidebar ? 'w-full' : ''}`}>
          {/* Mobile Header: Unified header with logo - ALWAYS visible except Field/Focus Mode */}
          {!isFieldPage && !isFocusMode && (
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-0 md:hidden flex-shrink-0 h-14 relative"
              style={{
                background: 'linear-gradient(135deg, #E8F1FA 0%, #F0F6FD 100%)',
                backgroundImage: `
                  radial-gradient(circle at 20% 50%, rgba(150, 180, 220, 0.08) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(150, 180, 220, 0.06) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(150, 180, 220, 0.05) 0%, transparent 50%),
                  linear-gradient(135deg, #E8F1FA 0%, #F0F6FD 100%)
                `
              }}
              >
              <div className="absolute inset-0 flex items-center justify-center px-8 sm:px-12">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
                  alt="MCI Connect"
                  className="w-auto object-contain"
                  style={{ height: '120%' }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-1.5 z-10">
                {!shouldHideSidebar && (
                  <SidebarTrigger className="p-1 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 flex-shrink-0 min-w-[28px] min-h-[28px]">
                    <Menu className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  </SidebarTrigger>
                )}
                <div className="flex-shrink-0 flex items-center gap-0.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-lg transition-all hover:bg-white/40 dark:hover:bg-slate-800/40 min-w-[28px] min-h-[28px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                            <Menu className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <DropdownMenuItem 
                            onClick={() => setGlobalSearchOpen(true)}
                            className="text-[10px] py-1.5"
                          >
                            <Search className="w-3.5 h-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                            <span>Buscar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const newTheme = theme === 'light' ? 'dark' : 'light';
                              setTheme(newTheme);
                              if (newTheme === 'dark') {
                                document.documentElement.classList.add('dark');
                              } else {
                                document.documentElement.classList.remove('dark');
                              }
                              localStorage.setItem('theme', newTheme);
                            }}
                            className="text-[10px] py-1.5"
                          >
                            {theme === 'light' ? (
                              <>
                                <Moon className="w-3.5 h-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                                <span>Modo Oscuro</span>
                              </>
                            ) : (
                              <>
                                <Sun className="w-3.5 h-3.5 mr-2 text-yellow-400" />
                                <span>Modo Claro</span>
                              </>
                            )}
                          </DropdownMenuItem>
                          {!isFieldMode && !isFocusMode && (
                            <DropdownMenuItem 
                              onClick={toggleFocusMode}
                              className="text-[10px] py-1.5"
                            >
                              <Maximize2 className="w-3.5 h-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                              <span>Modo Enfoque</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => navigate(createPageUrl("Configuracion"))}
                            className="text-[10px] py-1.5"
                          >
                            <Settings className="w-3.5 h-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                            <span>Configuración</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ActiveSessionBanner />
                      <NotificationBell user={user} />
                    </div>
              </div>
            </motion.header>
          )}



          {/* Focus Mode Indicator & Exit - Unified Component */}
          {isFocusMode && !isFieldMode && (
            <FocusModeIndicator isActive={true} onExit={toggleFocusMode} />
          )}

          <div data-main-content className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F5F9] dark:bg-[#181818]" style={{ 
            WebkitOverflowScrolling: 'touch', 
            touchAction: 'auto',
            overscrollBehavior: 'auto'
          }}>
            <div className="min-h-full w-full max-w-screen-2xl mx-auto px-1 md:px-0 py-1 md:py-0 pb-16 md:pb-0">
              {children}
            </div>
          </div>

          <AIAssistant currentPage={currentPageName} />
          <EnhancedOfflineSync />

          {/* Bottom Navigation: Hidden ONLY in Field Mode (always visible in Focus Mode for navigation) */}
          {!isFieldPage && (
            <BottomNav user={user} pendingExpenses={pendingExpenses} navigation={navigation} />
          )}

          {/* Global Search & Keyboard Shortcuts */}
          <GlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
          <KeyboardShortcuts onOpenGlobalSearch={() => setGlobalSearchOpen(true)} />
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
              staleTime: Infinity, // STABLE - never auto-refetch
              gcTime: Infinity,
              refetchOnMount: false, // NEVER auto-refetch
              refetchOnWindowFocus: false, // NEVER auto-refetch
              refetchInterval: false,
            });

          // CRITICAL: ALL HOOKS BEFORE EARLY RETURNS
          // Only unregister service workers in development
          React.useEffect(() => {
            if (import.meta.env?.DEV && 'serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.unregister());
              });
            }
          }, []);

          // EARLY RETURNS - ONLY AFTER ALL HOOKS
          // HARD LOADING GUARD - Prevent gates from running during boot
          if (isLoading) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
                <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            );
          }

          // Error during auth check
          if (error && !user) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
                <div className="text-center max-w-md">
                  <p className="text-red-600 mb-4">Error de autenticación</p>
                  <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">{error?.message || 'No se pudo conectar. Por favor, recarga la página.'}</p>
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Recargar
                  </button>
                </div>
              </div>
            );
          }

          // No user and not loading - show login prompt
          if (!user && !isLoading) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
                <div className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">Redirigiendo a login...</p>
                </div>
              </div>
            );
          }



  return (
    <ToastProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <PermissionsProvider>
            <UIProvider>
              <InvitationGate user={user}>
                <TwoFactorGate user={user}>
                  <AgreementGate>
                    <TaxProfileGate>
                      <EmployeeDirectoryGuard user={user}>
                        <LayoutContentWrapper currentPageName={currentPageName} user={user} isLoading={isLoading} error={error}>
                          {children}
                        </LayoutContentWrapper>
                      </EmployeeDirectoryGuard>
                    </TaxProfileGate>
                  </AgreementGate>
                </TwoFactorGate>
              </InvitationGate>
            </UIProvider>
          </PermissionsProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </ToastProvider>
  );
  }