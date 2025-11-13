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
  Zap,
  Brain,
  Target,
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
import NotificationEngine from "@/components/notifications/NotificationEngine";
import { OfflineProvider } from "@/components/offline/OfflineManager";

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-white/90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-white/90" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

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

  useEffect(() => {
    if (!user) return;
    if (user.employment_status !== 'pending_registration') return;

    const autoActivateUser = async () => {
      try {
        console.log('🔄 Auto-activating user on first login:', user.email);
        
        await base44.auth.updateMe({ 
          employment_status: 'active' 
        });
        
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
        { title: 'Job Analysis', url: createPageUrl("JobPerformanceAnalysis"), icon: BarChart3 },
        { title: 'Jobs Advanced', url: createPageUrl("JobsAdvanced"), icon: Zap, badge: '✨' },
        { title: 'Inventory', url: createPageUrl("Inventario"), icon: Package },
      ]
    },
    {
      section: 'FINANCE',
      items: [
        { title: 'Accounting', url: createPageUrl("Contabilidad"), icon: DollarSign },
        { title: 'Financial Dashboard', url: createPageUrl("FinancialDashboard"), icon: Wallet, badge: '✨' },
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
        { title: 'HR Advanced', url: createPageUrl("HRAdvancedDashboard"), icon: Target, badge: '✨' },
        { title: 'Bonuses', url: createPageUrl("BonusConfiguration"), icon: Award },
      ]
    },
    {
      section: 'TIME & PAYROLL',
      items: [
        { title: 'Time Tracking', url: createPageUrl("Horarios"), icon: Clock },
        { title: 'Time Off', url: createPageUrl("TimeOffRequests"), icon: CalendarClock },
        { title: 'Mileage', url: createPageUrl("MileageApproval"), icon: Car },
        { title: 'Payroll', url: createPageUrl("Nomina"), icon: Banknote },
      ]
    },
    {
      section: 'REPORTS & AI',
      items: [
        { title: 'Reports', url: createPageUrl("Reportes"), icon: BarChart3 },
        { title: 'Analytics', url: createPageUrl("AnalyticsDashboard"), icon: TrendingUp, badge: '✨' },
        { title: 'Cash Flow', url: createPageUrl("CashFlowReport"), icon: Wallet },
        { title: 'Budget Forecast', url: createPageUrl('BudgetForecasting'), icon: TrendingUp, badge: '✨' },
        { title: 'AI Automation', url: createPageUrl("AIAutomationDashboard"), icon: Brain, badge: '✨' },
        { title: 'AI Invoice Gen', url: createPageUrl("AIInvoiceGenerator"), icon: Sparkles, badge: '✨' },
        { title: 'AI Documents', url: createPageUrl("DocumentosAI"), icon: Sparkles, badge: '✨' },
        { title: 'AI Expenses', url: createPageUrl('AIExpensesAudit'), icon: Sparkles, badge: '✨' },
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
      section: 'ADMIN',
      items: [
        { title: 'Clean Data', url: createPageUrl("AdminCleanup"), icon: Trash2 },
        { title: 'Testing', url: createPageUrl("TestingChecklist"), icon: ClipboardList },
      ]
    }
  ];

  const employeeNavigation = [
    {
      section: 'GENERAL',
      items: [
        { title: 'Dashboard', url: createPageUrl("Dashboard"), icon: LayoutDashboard },
        { title: 'My Profile', url: createPageUrl("MyProfile"), icon: User },
        { title: 'My Scorecard', url: createPageUrl("MiScorecard"), icon: Award, badge: '✨' },
        { title: 'Directory', url: createPageUrl("Directory"), icon: Users },
        { title: 'Chat', url: createPageUrl("Chat"), icon: MessageSquare },
        { title: 'Announcements', url: createPageUrl("NewsFeed"), icon: Megaphone },
        { title: 'Recognitions', url: createPageUrl("Recognitions"), icon: Award },
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
      section: 'MY PROJECTS',
      items: [
        { title: 'My Jobs', url: createPageUrl("MisProyectos"), icon: Briefcase, badge: '✨' },
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center max-w-md p-8 rounded-3xl shadow-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">MCI Connect</h1>
          <p className="text-slate-300 mb-4">{t('error')}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#3B9FF3] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            {t('reload')}
          </Button>
        </div>
      </div>
    );
  }

  if (user && user.employment_status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center max-w-md p-8 rounded-3xl shadow-2xl bg-slate-800/50 backdrop-blur-xl border border-red-500/30">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <UserX className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-red-400 mb-4">Your account has been deactivated.</p>
          <p className="text-slate-400 text-sm mb-6">
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

  const getProfileImage = () => {
    if (!user) return null;
    
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
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
        <NotificationEngine user={user} />
      </NotificationService>
        
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <style>{`
          :root {
            --sidebar-gradient-from: 15 23 42;
            --sidebar-gradient-via: 30 41 59;
            --sidebar-gradient-to: 51 65 85;
          }
          
          /* Modern dark theme for entire app */
          body {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%) !important;
          }
          
          [data-sidebar="sidebar"] {
            background: linear-gradient(180deg, 
              rgb(15, 23, 42) 0%, 
              rgb(30, 41, 59) 50%, 
              rgb(51, 65, 85) 100%) !important;
            border-right: 1px solid rgba(71, 85, 105, 0.3) !important;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1) !important;
          }

          .sidebar-scroll-content {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            flex: 1 !important;
            scroll-behavior: smooth !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .sidebar-scroll-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-thumb {
            background: rgba(59, 159, 243, 0.4);
            border-radius: 3px;
          }
          
          .sidebar-scroll-content::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 159, 243, 0.6);
          }

          /* Custom scrollbar for main content */
          *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          *::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          
          *::-webkit-scrollbar-thumb {
            background: rgba(59, 159, 243, 0.3);
            border-radius: 4px;
          }
          
          *::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 159, 243, 0.5);
          }

          @media (max-width: 1024px) {
            * {
              -webkit-tap-highlight-color: transparent;
            }
          }
        `}</style>

        <Sidebar className="border-none">
          <SidebarHeader className="p-4 border-b border-white/10 flex-shrink-0 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3B9FF3] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                  alt="MCI Connect"
                  className="w-8 h-8 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-white text-lg tracking-tight">MCI Connect</h2>
                <p className="text-xs text-blue-300 font-medium">
                  {language === 'es' ? 'Sistema de Gestión' : 'Management System'}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent 
            ref={sidebarContentRef} 
            className="p-3 sidebar-scroll-content"
            data-scrollable="true"
          >
            {navigation.map((section, idx) => (
              <SidebarGroup key={idx} className="mb-4">
                <SidebarGroupLabel className="text-[10px] font-bold text-blue-300/80 uppercase tracking-wider px-3 py-2 mb-1">
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
                                ? 'bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'hover:bg-white/10 text-slate-300 hover:text-white backdrop-blur-sm'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2 relative group">
                              <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-blue-300'}`} />
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

          <SidebarFooter className="border-t border-white/10 p-4 flex-shrink-0 backdrop-blur-sm">
            <div className="mb-3 px-2 flex items-center gap-2">
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white flex-1 backdrop-blur-sm hover:bg-white/20">
                  <Languages className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="en" className="text-white hover:bg-slate-700">🇺🇸 English</SelectItem>
                  <SelectItem value="es" className="text-white hover:bg-slate-700">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50 shadow-lg"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-blue-400/30">
                    <span className="text-white font-bold text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-blue-300 truncate">
                    {user?.role === 'admin' ? t('admin') : t('user')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link to={createPageUrl("Configuracion")} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title={t('settings')}>
                  <Settings className="w-4 h-4 text-blue-300 hover:text-white" />
                </Link>
                <button
                  onClick={() => base44.auth.logout()}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4 text-blue-300 hover:text-white" />
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 px-6 py-4 md:hidden shadow-lg flex-shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                <Menu className="w-5 h-5 text-white" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                  alt="MCI Connect"
                  className="w-6 h-6"
                />
                <div>
                  <h1 className="text-lg font-bold text-white leading-none">MCI Connect</h1>
                  {isAdmin && <p className="text-[10px] text-blue-300 leading-none">Management System</p>}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-scrollable="true">
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
          <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}