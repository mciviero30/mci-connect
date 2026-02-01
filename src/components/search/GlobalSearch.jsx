import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FileText, FileCheck, Briefcase, Users, User, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Search across entities
  const { data: results, isLoading } = useQuery({
    queryKey: ['globalSearch', query],
    queryFn: async () => {
      if (query.length < 2) return { quotes: [], invoices: [], jobs: [], customers: [], employees: [] };

      const searchLower = query.toLowerCase();

      // Parallel fetch
      const [quotes, invoices, jobs, customers, employees] = await Promise.all([
        base44.entities.Quote.filter({ deleted_at: null }, '-created_date', 20),
        base44.entities.Invoice.filter({ deleted_at: null }, '-created_date', 20),
        base44.entities.Job.list('-created_date', 20),
        base44.entities.Customer.list('-created_date', 20),
        base44.entities.EmployeeDirectory.list('-created_date', 20)
      ]);

      // Filter results
      return {
        quotes: quotes.filter(q => 
          q.quote_number?.toLowerCase().includes(searchLower) ||
          q.customer_name?.toLowerCase().includes(searchLower) ||
          q.job_name?.toLowerCase().includes(searchLower)
        ).slice(0, 5),
        invoices: invoices.filter(i => 
          i.invoice_number?.toLowerCase().includes(searchLower) ||
          i.customer_name?.toLowerCase().includes(searchLower) ||
          i.job_name?.toLowerCase().includes(searchLower)
        ).slice(0, 5),
        jobs: jobs.filter(j => 
          j.name?.toLowerCase().includes(searchLower) ||
          j.job_number?.toLowerCase().includes(searchLower) ||
          j.customer_name?.toLowerCase().includes(searchLower)
        ).slice(0, 5),
        customers: customers.filter(c => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.first_name?.toLowerCase().includes(searchLower) ||
          c.last_name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.company?.toLowerCase().includes(searchLower)
        ).slice(0, 5),
        employees: employees.filter(e => 
          e.full_name?.toLowerCase().includes(searchLower) ||
          e.employee_email?.toLowerCase().includes(searchLower)
        ).slice(0, 5)
      };
    },
    enabled: query.length >= 2 && open,
    staleTime: 30000
  });

  // Flatten results for navigation
  const allResults = React.useMemo(() => {
    if (!results) return [];
    
    return [
      ...results.quotes.map(q => ({ type: 'quote', data: q, url: createPageUrl(`VerEstimado?id=${q.id}`) })),
      ...results.invoices.map(i => ({ type: 'invoice', data: i, url: createPageUrl(`VerFactura?id=${i.id}`) })),
      ...results.jobs.map(j => ({ type: 'job', data: j, url: createPageUrl(`JobDetails?id=${j.id}`) })),
      ...results.customers.map(c => ({ type: 'customer', data: c, url: createPageUrl(`CustomerDetails?id=${c.id}`) })),
      ...results.employees.map(e => ({ type: 'employee', data: e, url: createPageUrl(`EmployeeProfile?email=${e.employee_email}`) }))
    ];
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allResults[activeIndex]) {
        e.preventDefault();
        navigate(allResults[activeIndex].url);
        onOpenChange(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeIndex, allResults, navigate, onOpenChange]);

  // Auto-focus input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setActiveIndex(0);
    } else {
      setQuery('');
    }
  }, [open]);

  const getIcon = (type) => {
    switch (type) {
      case 'quote': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'invoice': return <FileCheck className="w-4 h-4 text-green-500" />;
      case 'job': return <Briefcase className="w-4 h-4 text-purple-500" />;
      case 'customer': return <Users className="w-4 h-4 text-orange-500" />;
      case 'employee': return <User className="w-4 h-4 text-cyan-500" />;
      default: return null;
    }
  };

  const getLabel = (type) => {
    const labels = {
      quote: language === 'es' ? 'Estimado' : 'Quote',
      invoice: language === 'es' ? 'Factura' : 'Invoice',
      job: language === 'es' ? 'Trabajo' : 'Job',
      customer: language === 'es' ? 'Cliente' : 'Customer',
      employee: language === 'es' ? 'Empleado' : 'Employee'
    };
    return labels[type];
  };

  const getTitle = (result) => {
    switch (result.type) {
      case 'quote': return result.data.quote_number || result.data.customer_name;
      case 'invoice': return result.data.invoice_number || result.data.customer_name;
      case 'job': return result.data.name || result.data.job_number;
      case 'customer': return result.data.name || `${result.data.first_name} ${result.data.last_name}` || result.data.email;
      case 'employee': return result.data.full_name;
      default: return '';
    }
  };

  const getSubtitle = (result) => {
    switch (result.type) {
      case 'quote': return result.data.customer_name;
      case 'invoice': return result.data.customer_name;
      case 'job': return result.data.customer_name;
      case 'customer': return result.data.company || result.data.email;
      case 'employee': return result.data.position || result.data.employee_email;
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'es' ? 'Buscar quotes, facturas, trabajos, clientes...' : 'Search quotes, invoices, jobs, customers...'}
              className="pl-10 pr-4 h-12 border-0 focus-visible:ring-0 text-base"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              {language === 'es' ? 'Escribe al menos 2 caracteres para buscar...' : 'Type at least 2 characters to search...'}
            </div>
          ) : allResults.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              {language === 'es' ? 'No se encontraron resultados' : 'No results found'}
            </div>
          ) : (
            <div className="py-2">
              {allResults.map((result, idx) => (
                <button
                  key={`${result.type}-${result.data.id}`}
                  onClick={() => {
                    navigate(result.url);
                    onOpenChange(false);
                    setQuery('');
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                    idx === activeIndex
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {getIcon(result.type)}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getLabel(result.type)}
                      </Badge>
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {getTitle(result)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {getSubtitle(result)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{language === 'es' ? 'Navega con ↑↓' : 'Navigate with ↑↓'}</span>
            <span>{language === 'es' ? 'Enter para abrir' : 'Enter to open'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}