/**
 * MobileHeader — native-like mobile top bar
 * • Root pages → brand logo + notification bell + hamburger
 * • Child pages → back button + page title + notification bell
 * • Settings/menu → bottom-sheet (no dropdown)
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Moon, Sun, Maximize2, Settings, X, ChevronRight,
  Search, Bell
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import NotificationBell from '@/components/notifications/NotificationBell';

// Pages that are "root" tabs — show logo, no back button
const ROOT_PATHS = [
  '/Dashboard', '/TimeTracking', '/MisGastos', '/Field',
  '/Chat', '/Calendario', '/NewsFeed', '/Capacitacion',
  '/MisProyectos', '/MisHoras', '/Manejo', '/PerDiem',
  '/HorasManejo', '/EmployeeProfile', '/MyPayroll',
];

function isRootPage(pathname) {
  return ROOT_PATHS.some(p => pathname === p || pathname === p + '/');
}

// Derive a readable page title from the path
const PAGE_TITLES = {
  '/Trabajos': 'Jobs', '/Estimados': 'Quotes', '/Facturas': 'Invoices',
  '/Clientes': 'Customers', '/Gastos': 'Expenses', '/Horarios': 'Approvals',
  '/Nomina': 'Payroll', '/Empleados': 'Employees', '/Teams': 'Teams',
  '/Inventario': 'Inventory', '/Formularios': 'Forms', '/Items': 'Catalog',
  '/Contabilidad': 'Accounting', '/Configuracion': 'Settings',
  '/CompanyInfo': 'Company Info', '/NotificationCenter': 'Notifications',
  '/TimeOffRequests': 'Time Off', '/Goals': 'Goals', '/Recognitions': 'Recognitions',
  '/Reports': 'Reports', '/ReportingHub': 'Analytics', '/Directory': 'Directory',
  '/KnowledgeLibrary': 'Library', '/ComplianceHub': 'Compliance',
  '/JobDetails': 'Job Details', '/CustomerDetails': 'Customer',
  '/VerEstimado': 'Quote', '/VerFactura': 'Invoice', '/CrearEstimado': 'New Quote',
  '/CrearFactura': 'New Invoice', '/EditarEstimado': 'Edit Quote',
};

function getPageTitle(pathname) {
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  return PAGE_TITLES[base] || base.replace('/', '').replace(/([A-Z])/g, ' $1').trim();
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
              zIndex: 9998, backdropFilter: 'blur(2px)'
            }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            data-bottom-sheet="true"
            data-state="open"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
              background: 'white', borderRadius: '20px 20px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            }}
            className="dark:bg-slate-900"
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MobileHeader({ user, onOpenSidebar, onOpenSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const isRoot = isRootPage(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  // Determine if we can go back (check per-tab nav stack)
  const getTabKey = () => {
    const path = location.pathname;
    if (['/TimeTracking', '/MisHoras', '/Horarios'].some(p => path.startsWith(p))) return 'time';
    if (['/MisGastos', '/Gastos'].some(p => path.startsWith(p))) return 'expenses';
    if (['/Field', '/Measurement', '/MisProyectos'].some(p => path.startsWith(p))) return 'field';
    if (['/Chat'].some(p => path.startsWith(p))) return 'more';
    return 'home';
  };

  const handleBack = () => {
    const tab = getTabKey();
    const key = `nav_stack_${tab}`;
    const stack = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (stack.length > 1) {
      stack.pop();
      sessionStorage.setItem(key, JSON.stringify(stack));
      navigate(stack[stack.length - 1], { replace: true });
    } else {
      navigate(-1);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const menuItems = [
    { label: 'Search', icon: Search, action: () => { setSheetOpen(false); onOpenSearch?.(); } },
    { label: theme === 'light' ? 'Dark Mode' : 'Light Mode', icon: theme === 'light' ? Moon : Sun, action: () => { toggleTheme(); setSheetOpen(false); } },
    { label: 'Settings', icon: Settings, action: () => { setSheetOpen(false); navigate(createPageUrl('Configuracion')); } },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="md:hidden flex-shrink-0"
        style={{
          height: 56,
          position: 'relative',
          background: 'linear-gradient(135deg, #E8F1FA 0%, #F0F6FD 100%)',
          borderBottom: '1px solid rgba(80,125,180,0.12)',
          display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8,
          gap: 8,
          zIndex: 50,
        }}
      >
        {/* Left: back button OR hamburger */}
        {!isRoot ? (
          <button
            onClick={handleBack}
            aria-label="Go back"
            data-back-button="true"
            data-navigation-back="true"
            data-ios-back-button="true"
            style={{
              minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center',
              justifyContent: 'flex-start', paddingLeft: 4, flexShrink: 0,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <ArrowLeft className="w-5 h-5 text-[#1E3A8A] dark:text-white" />
          </button>
        ) : (
          <button
            onClick={onOpenSidebar}
            aria-label="Open menu"
            style={{
              minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 18 }}>
              <span style={{ height: 2, borderRadius: 1, background: '#1E3A8A', display: 'block' }} />
              <span style={{ height: 2, borderRadius: 1, background: '#1E3A8A', width: '75%', display: 'block' }} />
              <span style={{ height: 2, borderRadius: 1, background: '#1E3A8A', display: 'block' }} />
            </div>
          </button>
        )}

        {/* Center: logo on root, page title on child */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {isRoot ? (
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
              alt="MCI Connect"
              style={{ height: 38, width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
            />
          ) : (
            <motion.h1
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 15, fontWeight: 700, color: '#1E3A8A',
                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
              className="dark:text-white"
            >
              {pageTitle}
            </motion.h1>
          )}
        </div>

        {/* Right: notification bell + menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <NotificationBell user={user} />
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="More options"
            aria-haspopup="dialog"
            style={{
              minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 16 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#1E3A8A', display: 'block', margin: '0 auto' }} />
              ))}
            </div>
          </button>
        </div>
      </motion.header>

      {/* Bottom sheet menu — replaces dropdown */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div style={{ padding: '8px 0 16px' }}>
          <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Quick Actions
            </p>
          </div>
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              data-bottom-sheet-item="true"
              style={{
                width: '100%', minHeight: 56, display: 'flex', alignItems: 'center',
                gap: 16, padding: '0 20px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              className="hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#EBF2FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <item.icon className="w-5 h-5 text-[#507DB4]" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#1e293b', flex: 1 }} className="dark:text-white">
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}