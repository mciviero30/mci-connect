
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
  ChevronDown,
  ExternalLink,
  Upload // Added Upload icon
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
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import MobileOptimizations from "@/components/shared/MobileOptimizations";
import AIAssistant from "@/components/ai/AIAssistant";
import CustomAvatar from "@/components/avatar/CustomAvatar";
import NotificationService from "@/components/notifications/NotificationService";
import { OfflineProvider } from "@/components/offline/OfflineManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-slate-200">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-700" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-700" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

// REMOVED: AppSelector Component - No longer needed

const LayoutContent = ({ children, currentPageName }) => {
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const sidebarContentRef = useRef(null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // CRITICAL: Auto-activate user on first login - FIXED: Added proper dependencies and guard
  useEffect(() => {
    if (!user) return;
    if (user.employment_status !== 'pending_registration') return;

    const autoActivateUser = async () => {
      try {
        console.log('🔄 Auto-activating user on first login:', user.email);
        
        // Update User entity to 'active'
        await base44.auth.updateMe({ 
          employment_status: 'active' 
        });
        
        // Update PendingEmployee entity if exists
        try {
          const pendingEmployees = await base44.entities.PendingEmployee.filter({ 
            email: user.email 
          });
          
          if (pendingEmployees.length > 0) {
            const pendingEmployee = pendingEmployees[0];
            await base44.entities.PendingEmployee.update(pendingEmployee.id, {
              status: 'active',
              registered_date: new Date().toISOString()
            });
          }
        } catch (pendingError) {
          console.log('Note: PendingEmployee update failed (might not exist):', pendingError.message);
        }
        
        console.log('✅ User auto-activated successfully');
        
        // Refresh user data after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('❌ Error auto-activating user:', error);
      }
    };

    autoActivateUser();
  }, [user?.id, user?.employment_status]);

  // Only load pending expenses count when needed
  const { data: pendingExpenses } = useQuery({
    queryKey: ['pendingExpensesCount', user?.email],
    queryFn: async () => {
      if (!user) return 0;
      if (user.role === 'admin') {
        const expenses = await base44.entities.Expense.filter({ status: 'pending' }, '', 100); // Limit
        return expenses.length;
      } else {
        const expenses = await base44.entities.Expense.filter({
          employee_email: user.email,
          status: 'pending'
        }, '', 20); // Limit
        return expenses.length;
      }
    },
    enabled: !!user,
    initialData: 0,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: false, // Don't auto-refetch
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on focus
  });

  // Restore scroll position when the component mounts or location changes
  useEffect(() => {
    const sidebar = sidebarContentRef.current;
    if (sidebar) {
      const savedPosition = sessionStorage.getItem('sidebarScrollPosition');
      if (savedPosition) {
        sidebar.scrollTop = parseInt(savedPosition, 10);
      }
    }
  }, [location.pathname]); // Dependency on location.pathname ensures it attempts to restore on navigation

  // Save scroll position when the sidebar content is scrolled
  useEffect(() => {
    const sidebar = sidebarContentRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      sessionStorage.setItem('sidebarScrollPosition', sidebar.scrollTop.toString());
    };

    sidebar.addEventListener('scroll', handleScroll);
    return () => sidebar.removeEventListener('scroll', handleScroll); // Clean up event listener
  }, []); // Empty dependency array ensures this effect runs once on mount and cleans up on unmount


  const adminNavigation = [
    {
      section: 'MAIN',
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      ]
    },
    {
      section: 'OPERATIONS',
      items: [
        { title: 'Jobs', url: createPageUrl("Trabajos"), icon: Briefcase },
        { title: 'Inventory', url: createPageUrl("Inventario"), icon: Package, indent: true },
        { title: 'Job Analysis', url: createPageUrl("JobPerformanceAnalysis"), icon: BarChart3, indent: true },
        { title: 'Calendar', url: createPageUrl("Calendario"), icon: CalendarDays },
      ]
    },
    {
      section: 'TIME & ATTENDANCE',
      items: [
        { title: 'Time Tracking', url: createPageUrl("Horarios"), icon: Clock },
        { title: 'Time Off Requests', url: createPageUrl("TimeOffRequests"), icon: CalendarClock, indent: true },
        { title: 'Mileage', url: createPageUrl("MileageApproval"), icon: Car, indent: true },
      ]
    },
    {
      section: 'PEOPLE & HR',
      items: [
        { title: 'Employees', url: createPageUrl("Empleados"), icon: Users },
        { title: 'Teams', url: createPageUrl("Teams"), icon: MapPin, indent: true },
        { title: 'Payroll', url: createPageUrl("Nomina"), icon: Banknote, indent: true },
        { title: 'Performance', url: createPageUrl("PerformanceManagement"), icon: Award, indent: true },
        { title: 'Bonuses', url: createPageUrl("BonusConfiguration"), icon: Award, indent: true },
      ]
    },
    {
      section: 'FINANCE & ACCOUNTING',
      items: [
        { title: 'Accounting', url: createPageUrl("Contabilidad"), icon: DollarSign },
        { title: 'Customers', url: createPageUrl("Clientes"), icon: Users, indent: true },
        { title: 'Quotes', url: createPageUrl("Estimados"), icon: FileText, indent: true },
        { title: 'Quote Importer', url: createPageUrl("QuoteImporter"), icon: Upload, indent: true, badge: '📦' },
        { title: 'Invoices', url: createPageUrl("Facturas"), icon: FileCheck, indent: true },
        { title: 'Expenses', url: createPageUrl("Gastos"), icon: Receipt, indent: true },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet, indent: true },
        { title: 'Items Catalog', url: createPageUrl("Items"), icon: Package, indent: true },
      ]
    },
    {
      section: 'ANALYTICS & REPORTING',
      items: [
        { title: 'Reports', url: createPageUrl("Reportes"), icon: BarChart3 },
      ]
    },
    {
      section: 'COMMUNICATION',
      items: [
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
      ]
    },
    {
      section: 'RESOURCES',
      items: [
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
      ]
    },
    {
      section: '🤖 TOOLS & AI',
      items: [
        { title: 'AI Documents', url: createPageUrl("DocumentosAI"), icon: Sparkles, badge: '✨' },
        { title: 'AI Expenses Audit', url: createPageUrl('AIExpensesAudit'), icon: Sparkles, badge: '✨' },
        { title: 'Budget Forecasting', url: createPageUrl('BudgetForecasting'), icon: TrendingUp, badge: '✨' },
        { title: 'Clean Data', url: createPageUrl("AdminCleanup"), icon: Trash2 },
        { title: 'Testing Checklist', url: createPageUrl("TestingChecklist"), icon: ClipboardList },
      ]
    }
  ];

  const employeeNavigation = [
    {
      section: 'MAIN',
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("MyProfile"), icon: User },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
      ]
    },
    {
      section: 'TIME & EXPENSES',
      items: [
        { title: 'My Hours', url: createPageUrl("MisHoras"), icon: Clock },
        { title: 'Driving Hours', url: createPageUrl("HorasManejo"), icon: Clock },
        { title: 'Mileage', url: createPageUrl("Manejo"), icon: Car },
        { title: 'My Expenses', url: createPageUrl("MisGastos"), icon: Receipt },
        { title: 'Per Diem', url: createPageUrl("PerDiem"), icon: Banknote },
        { title: 'My Payroll', url: createPageUrl("MyPayroll"), icon: Banknote },
      ]
    },
    {
      section: 'COMMUNICATION',
      items: [
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
      ]
    },
    {
      section: 'RESOURCES',
      items: [
        { title: 'Training', url: createPageUrl("Capacitacion"), icon: GraduationCap },
        { title: 'Forms', url: createPageUrl("Formularios"), icon: ClipboardList },
        { title: 'Company Info', url: createPageUrl("CompanyInfo"), icon: Globe },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center max-w-md p-8 rounded-3xl shadow-2xl bg-white border border-slate-200">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">MCI Connect</h1>
          <p className="text-slate-600 mb-4">{t('error')}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#3B9FF3] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            {t('reload')}
          </Button>
        </div>
      </div>
    );
  }

  // BLOCK DELETED EMPLOYEES FROM ACCESSING THE APP
  if (user && user.employment_status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center max-w-md p-8 rounded-3xl shadow-2xl bg-white border border-red-200">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <UserX className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-red-600 mb-4">Your account has been deactivated.</p>
          <p className="text-slate-500 text-sm mb-6">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => base44.auth.logout()} className="bg-red-500 hover:bg-red-600 text-white">
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }

  const navigation = user?.role === 'admin' ? adminNavigation : employeeNavigation;
  const isAdmin = user?.role === 'admin';

  // Get the profile image based on user preference
  const getProfileImage = () => {
    if (!user) return null;
    
    // If user prefers avatar and has one, use it
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
    // Otherwise use photo if available
    if (user.profile_photo_url) {
      return user.profile_photo_url;
    }
    
    return null;
  };

  const profileImage = getProfileImage();

  return (
    <SidebarProvider>
      <MobileOptimizations />
      <NotificationService user={user}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-white">
          <style>{`
            :root {
              --background: 248 250 252;
              --foreground: 15 23 42;
              --card: 255 255 255;
              --card-foreground: 15 23 42;
              --popover: 255 255 255;
              --popover-foreground: 15 23 42;
              --primary: 59 159 243;
              --primary-foreground: 255 255 255;
              --secondary: 30 144 255;
              --secondary-foreground: 255 255 255;
              --muted: 241 245 249;
              --muted-foreground: 100 116 139;
              --accent: 59 159 243;
              --accent-foreground: 255 255 255;
              --destructive: 239 68 68;
              --destructive-foreground: 255 255 255;
              --success: 34 197 94;
              --success-foreground: 255 255 255;
              --warning: 251 191 36;
              --warning-foreground: 15 23 42;
              --border: 226 232 240;
              --input: 241 245 249;
              --ring: 59 159 243;
              --radius: 1rem;
              --sidebar-background: 255 255 255;
              --sidebar-foreground: 15 23 42;
              --sidebar-border: 226 232 240;
            }
            
            /* Prompt #75: High contrast text colors (removed pink/low contrast) */
            .bg-background { background-color: rgb(var(--background)); }
            .text-foreground { color: rgb(var(--foreground)); }
            .bg-card { background-color: rgb(var(--card)); }
            .text-card-foreground { color: rgb(var(--card-foreground)); }
            .bg-primary { background-color: rgb(var(--primary)); }
            .text-primary-foreground { color: rgb(var(--primary-foreground)); }
            .border-border { border-color: rgb(var(--border)); }
            .text-muted-foreground { color: rgb(var(--muted-foreground)); }
            .bg-muted { background-color: rgb(var(--muted)); }
            
            /* Ensure all text has sufficient contrast */
            .text-slate-600 { color: rgb(71, 85, 105) !important; }
            .text-slate-700 { color: rgb(51, 65, 85) !important; }
            .text-slate-900 { color: rgb(15, 23, 42) !important; }
            
            /* Remove all pink/rose colors globally (Prompt #75) */
            .text-pink-600, .text-pink-700, .text-pink-800,
            .text-rose-600, .text-rose-700, .text-rose-800 {
              color: rgb(51, 65, 85) !important; /* slate-700 */
            }
            .bg-pink-50, .bg-pink-100, .bg-rose-50, .bg-rose-100 {
              background-color: rgb(241, 245, 249) !important; /* slate-100 */
            }
            
            [data-sidebar] {
              background-color: rgb(255, 255, 255) !important;
              color: rgb(15, 23, 42) !important;
              border: none !important;
            }

            [data-sidebar="sidebar"] {
              background: rgb(255, 255, 255) !important;
              border-right: 1px solid rgb(226, 232, 240) !important;
              border-left: none !important;
              border-top: none !important;
              border-bottom: none !important;
              display: flex !important;
              flex-direction: column !important;
              height: 100vh !important;
              position: sticky !important;
              top: 0 !important;
            }

            /* Sidebar content scrollable independently - OPTIMIZED FOR iOS */
            .sidebar-scroll-content {
              overflow-y: auto !important;
              overflow-x: hidden !important;
              flex: 1 !important;
              scroll-behavior: auto !important;
              -webkit-overflow-scrolling: touch !important;
              overscroll-behavior: contain !important;
            }

            /* Hide scrollbar but keep functionality */
            .sidebar-scroll-content::-webkit-scrollbar {
              width: 6px;
            }
            
            .sidebar-scroll-content::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .sidebar-scroll-content::-webkit-scrollbar-thumb {
              background: rgba(59, 159, 243, 0.3);
              border-radius: 3px;
            }
            
.sidebar-scroll-content::-webkit-scrollbar-thumb:hover {
              background: rgba(59, 159, 243, 0.5);
            }
            
            .glass-card {
              background: rgba(255, 255, 255, 0.9) !important;
              backdrop-filter: blur(20px) !important;
              border-color: rgba(226, 232, 240, 0.8) !important;
            }

            /* Mobile and iPad optimizations */
            @media (max-width: 1024px) {
              * {
                -webkit-tap-highlight-color: transparent;
                -webkit-overflow-scrolling: touch;
              }
              
              body {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              
              /* Ensure scrollable areas work on iOS */
              .overflow-y-auto,
              [class*="overflow-"] {
                -webkit-overflow-scrolling: touch !important;
                overscroll-behavior: contain !important;
              }
            }
          `}</style>

          <Sidebar className="border-none bg-white" style={{background: 'rgb(255, 255, 255)', borderRight: '1px solid rgb(226, 232, 240)'}}>
            {/* UPDATED: Simple Header without AppSelector */}
            <SidebarHeader className="p-4 border-b flex-shrink-0 bg-white" style={{borderColor: 'rgb(226, 232, 240)'}}>
              <div className="flex items-center gap-3">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                  alt="MCI Connect"
                  className="w-11 h-11 rounded-lg flex-shrink-0"
                />
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900 text-lg">MCI Connect</h2>
                  <p className="text-xs text-[#3B9FF3]">
                    {language === 'es' ? 'Sistema de Gestión' : 'Management System'}
                  </p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent 
              ref={sidebarContentRef} 
              className="p-3 sidebar-scroll-content bg-white"
              data-scrollable="true"
            >
              {navigation.map((section, idx) => (
                <SidebarGroup key={idx}>
                  <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mb-1">
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
                              className={`transition-all duration-200 rounded-2xl mb-1 border-none ${
                                item.indent ? 'ml-8' : ''
                              } ${
                                isActive
                                  ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg shadow-blue-500/20'
                                  : item.indent
                                  ? 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                  : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              <Link to={item.url} className="flex items-center gap-3 px-4 py-3 relative">
                                <item.icon className="w-5 h-5" />
                                <span className={`font-medium flex-1 ${item.indent ? 'text-sm' : ''}`}>{item.title}</span>
                                {showBadge && (
                                  <Badge className="bg-[#3B9FF3] text-white text-xs px-2 shadow-lg shadow-blue-500/20">
                                    {pendingExpenses}
                                  </Badge>
                                )}
                                {item.badge && (
                                  <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs px-2 py-1 rounded-full shadow-lg shadow-purple-500/30 font-semibold tracking-wide">
                                    {item.badge}
                                  </Badge>
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

            <SidebarFooter className="border-t p-4 flex-shrink-0 bg-white" style={{borderColor: 'rgb(226, 232, 240)'}}>
              <div className="mb-3 px-2 flex items-center gap-2">
                <Select value={language} onValueChange={changeLanguage}>
                  <SelectTrigger className="h-9 bg-slate-100 border-slate-300 text-slate-900 flex-1">
                    <Languages className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="en" className="text-slate-900 hover:bg-slate-100">🇺🇸 English</SelectItem>
                    <SelectItem value="es" className="text-slate-900 hover:bg-slate-100">🇪🇸 Español</SelectItem>
                  </SelectContent>
                </Select>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-200"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <span className="text-white font-semibold text-sm">
                        {user?.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.role === 'admin' ? t('admin') : t('user')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Link to={createPageUrl("Configuracion")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title={t('settings')}>
                    <Settings className="w-4 h-4 text-slate-600 hover:text-[#3B9FF3]" />
                  </Link>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title={t('logout')}
                  >
                    <LogOut className="w-4 h-4 text-slate-600 hover:text-[#3B9FF3]" />
                  </button>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <header className="backdrop-blur-xl bg-white/80 border-b border-slate-200 px-6 py-4 md:hidden shadow-sm flex-shrink-0">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
                  <Menu className="w-5 h-5 text-slate-700" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                    alt="MCI Connect"
                    className="w-6 h-6"
                  />
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">MCI Connect</h1>
                    {isAdmin && <p className="text-[10px] text-[#3B9FF3] leading-none">Management System</p>}
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white" data-scrollable="true">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPageName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* AI Assistant - Available on all pages */}
            <AIAssistant currentPage={currentPageName} />
          </main>
        </div>
      </NotificationService>
    </SidebarProvider>
  );
};

export default function Layout({ children, currentPageName }) {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <OfflineProvider>
            <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
          </OfflineProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}
