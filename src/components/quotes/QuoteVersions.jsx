import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { GitBranch, Plus, Eye, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuoteVersions({ quote, asMenuItem = false }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Get all versions (quotes with same parent or this quote as parent)
  const { data: versions = [] } = useQuery({
    queryKey: ['quoteVersions', quote.id, quote.parent_quote_id],
    queryFn: async () => {
      const parentId = quote.parent_quote_id || quote.id;
      const allQuotes = await base44.entities.Quote.list();
      return allQuotes.filter(q => 
        q.id === parentId || 
        q.parent_quote_id === parentId ||
        (quote.parent_quote_id && q.parent_quote_id === quote.parent_quote_id)
      ).sort((a, b) => (a.version || 1) - (b.version || 1));
    },
    enabled: open
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const quotes = await base44.entities.Quote.list();
      const existingNumbers = quotes
        .map(q => q.quote_number)
        .filter(n => n?.startsWith('EST-'))
        .map(n => parseInt(n.replace('EST-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const quote_number = `EST-${String(nextNumber).padStart(5, '0')}`;

      const newVersion = {
        ...quote,
        quote_number,
        version: (quote.version || 1) + 1,
        parent_quote_id: quote.parent_quote_id || quote.id,
        status: 'draft',
        quote_date: format(new Date(), 'yyyy-MM-dd'),
        valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        customer_signature: null,
        signed_date: null,
      };
      
      delete newVersion.id;
      delete newVersion.created_date;
      delete newVersion.updated_date;
      delete newVersion.created_by;
      delete newVersion.invoice_id;

      return base44.entities.Quote.create(newVersion);
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quoteVersions'] });
      toast.success(language === 'es' ? `Versión ${newQuote.version} creada` : `Version ${newQuote.version} created`);
      setOpen(false);
    }
  });

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    converted_to_invoice: "bg-purple-100 text-purple-700"
  };

  if (asMenuItem) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div className="cursor-pointer text-white hover:bg-slate-800 flex items-center px-2 py-1.5 text-sm rounded-md">
            <GitBranch className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Versiones' : 'Versions'} (v{quote.version || 1})
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-slate-500" />
              {language === 'es' ? 'Versiones del Estimado' : 'Quote Versions'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Version List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {versions.map((v) => (
                <div 
                  key={v.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    v.id === quote.id 
                      ? 'bg-cyan-50 dark:bg-cyan-900/20 border-2 border-cyan-300' 
                      : 'bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                      v{v.version || 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {v.quote_number}
                        {v.id === quote.id && (
                          <span className="ml-2 text-xs text-cyan-600">
                            ({language === 'es' ? 'actual' : 'current'})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(v.quote_date), 'MMM d, yyyy', { 
                          locale: language === 'es' ? es : undefined 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[v.status]}>{v.status}</Badge>
                    {v.id !== quote.id && (
                      <Link to={createPageUrl(`VerEstimado?id=${v.id}`)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Create New Version */}
            {quote.status !== 'converted_to_invoice' && (
              <Button
                onClick={() => createVersionMutation.mutate()}
                disabled={createVersionMutation.isPending}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createVersionMutation.isPending 
                  ? (language === 'es' ? 'Creando...' : 'Creating...') 
                  : (language === 'es' ? 'Crear Nueva Versión' : 'Create New Version')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
          <GitBranch className="w-4 h-4 mr-2" />
          v{quote.version || 1}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-slate-500" />
            {language === 'es' ? 'Versiones del Estimado' : 'Quote Versions'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Version List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {versions.map((v) => (
              <div 
                key={v.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  v.id === quote.id 
                    ? 'bg-cyan-50 dark:bg-cyan-900/20 border-2 border-cyan-300' 
                    : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                    v{v.version || 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {v.quote_number}
                      {v.id === quote.id && (
                        <span className="ml-2 text-xs text-cyan-600">
                          ({language === 'es' ? 'actual' : 'current'})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(v.quote_date), 'MMM d, yyyy', { 
                        locale: language === 'es' ? es : undefined 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[v.status]}>{v.status}</Badge>
                  {v.id !== quote.id && (
                    <Link to={createPageUrl(`VerEstimado?id=${v.id}`)}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create New Version */}
          {quote.status !== 'converted_to_invoice' && (
            <Button
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createVersionMutation.isPending 
                ? (language === 'es' ? 'Creando...' : 'Creating...') 
                : (language === 'es' ? 'Crear Nueva Versión' : 'Create New Version')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}