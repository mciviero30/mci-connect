import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Command, Search, Plus, Calendar, Users, Briefcase, FileText } from 'lucide-react';

/**
 * Keyboard Shortcuts Manager
 * Cmd+K / Ctrl+K: Global Search
 * ? : Show shortcuts help
 */

export default function KeyboardShortcuts({ onOpenGlobalSearch }) {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const lastKeyRef = useRef('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in input/textarea
      const activeElement = document.activeElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(activeElement?.tagName) || 
                      activeElement?.isContentEditable;

      // Cmd+K / Ctrl+K: Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenGlobalSearch();
        return;
      }

      // ?: Show shortcuts help
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Esc: Close modals
      if (e.key === 'Escape') {
        setShowHelp(false);
      }

      // Quick navigation shortcuts (only when not typing)
      if (!isTyping) {
        // g+d: Go to Dashboard
        if (e.key === 'd' && lastKeyRef.current === 'g') {
          e.preventDefault();
          navigate(createPageUrl('Dashboard'));
          lastKeyRef.current = '';
        }
        // g+q: Go to Quotes
        else if (e.key === 'q' && lastKeyRef.current === 'g') {
          e.preventDefault();
          navigate(createPageUrl('Estimados'));
          lastKeyRef.current = '';
        }
        // g+i: Go to Invoices
        else if (e.key === 'i' && lastKeyRef.current === 'g') {
          e.preventDefault();
          navigate(createPageUrl('Facturas'));
          lastKeyRef.current = '';
        }
        // g+j: Go to Jobs
        else if (e.key === 'j' && lastKeyRef.current === 'g') {
          e.preventDefault();
          navigate(createPageUrl('Trabajos'));
          lastKeyRef.current = '';
        }
        // g+c: Go to Customers
        else if (e.key === 'c' && lastKeyRef.current === 'g') {
          e.preventDefault();
          navigate(createPageUrl('Clientes'));
          lastKeyRef.current = '';
        }
        // Track 'g' key for sequences
        else if (e.key === 'g') {
          lastKeyRef.current = 'g';
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => { lastKeyRef.current = ''; }, 1000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigate, onOpenGlobalSearch]);

  const shortcuts = [
    { 
      keys: ['⌘ K', 'Ctrl K'], 
      description: language === 'es' ? 'Búsqueda Global' : 'Global Search',
      icon: Search
    },
    { 
      keys: ['?'], 
      description: language === 'es' ? 'Ver Atajos' : 'Show Shortcuts',
      icon: Command
    },
    { 
      keys: ['g', 'd'], 
      description: language === 'es' ? 'Ir a Dashboard' : 'Go to Dashboard'
    },
    { 
      keys: ['g', 'q'], 
      description: language === 'es' ? 'Ir a Estimados' : 'Go to Quotes',
      icon: FileText
    },
    { 
      keys: ['g', 'i'], 
      description: language === 'es' ? 'Ir a Facturas' : 'Go to Invoices',
      icon: FileCheck
    },
    { 
      keys: ['g', 'j'], 
      description: language === 'es' ? 'Ir a Trabajos' : 'Go to Jobs',
      icon: Briefcase
    },
    { 
      keys: ['g', 'c'], 
      description: language === 'es' ? 'Ir a Clientes' : 'Go to Customers',
      icon: Users
    },
    { 
      keys: ['Esc'], 
      description: language === 'es' ? 'Cerrar Modal' : 'Close Modal'
    }
  ];

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Command className="w-5 h-5 text-[#507DB4]" />
            {language === 'es' ? 'Atajos de Teclado' : 'Keyboard Shortcuts'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                {shortcut.icon && <shortcut.icon className="w-4 h-4 text-slate-400" />}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {shortcut.description}
                </span>
              </div>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-400 mx-1">then</span>}
                    <Badge variant="outline" className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800">
                      {key}
                    </Badge>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {language === 'es' 
              ? 'Presiona ? en cualquier momento para ver estos atajos'
              : 'Press ? anytime to see these shortcuts'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}