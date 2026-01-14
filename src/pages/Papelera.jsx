import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trash2, RotateCcw, ArrowLeft, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";

export default function Papelera() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { language } = useLanguage();
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch deleted quotes
  const { data: deletedQuotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['deleted-quotes'],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({ deleted_at: { $ne: null } }, '-deleted_at', 100);
      return quotes || [];
    },
    staleTime: 30000,
  });

  // Fetch deleted invoices
  const { data: deletedInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['deleted-invoices'],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({ deleted_at: { $ne: null } }, '-deleted_at', 100);
      return invoices || [];
    },
    staleTime: 30000,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (items) => {
      const results = [];
      for (const item of items) {
        if (item.type === 'quote') {
          await base44.entities.Quote.update(item.id, { deleted_at: null, deleted_by: null });
        } else {
          await base44.entities.Invoice.update(item.id, { deleted_at: null, deleted_by: null });
        }
        results.push(item);
      }
      return results;
    },
    onSuccess: (restoredItems) => {
      queryClient.invalidateQueries({ queryKey: ['deleted-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast({
        title: language === 'es' ? 'Restaurados' : 'Restored',
        description: `${restoredItems.length} ${language === 'es' ? 'documento(s) restaurado(s)' : 'document(s) restored'}`,
        variant: 'success'
      });
      setSelectedItems([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Permanently delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        if (item.type === 'quote') {
          await base44.entities.Quote.delete(item.id);
        } else {
          await base44.entities.Invoice.delete(item.id);
        }
      }
      return items;
    },
    onSuccess: (deletedItems) => {
      queryClient.invalidateQueries({ queryKey: ['deleted-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-invoices'] });
      
      toast({
        title: language === 'es' ? 'Eliminados' : 'Deleted',
        description: `${deletedItems.length} ${language === 'es' ? 'documento(s) eliminado(s) permanentemente' : 'document(s) permanently deleted'}`,
        variant: 'success'
      });
      setSelectedItems([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const allDeletedItems = [
    ...deletedQuotes.map(q => ({ ...q, type: 'quote', document_type: 'Estimado' })),
    ...deletedInvoices.map(i => ({ ...i, type: 'invoice', document_type: 'Factura' }))
  ].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

  const handleSelectItem = (item) => {
    const isSelected = selectedItems.some(s => s.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(s => s.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === allDeletedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allDeletedItems);
    }
  };

  const formatDateDeleted = (deletedAt) => {
    try {
      const date = new Date(deletedAt);
      const now = new Date();
      const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (daysAgo > 20) {
        return `${daysAgo} ${language === 'es' ? 'días atrás' : 'days ago'} ⚠️`;
      }
      return format(date, language === 'es' ? 'dd MMM yyyy' : 'MMM dd, yyyy');
    } catch {
      return deletedAt;
    }
  };

  const isLoading = quotesLoading || invoicesLoading;
  const isEmpty = allDeletedItems.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Estimados'))}
            className="mb-4 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Volver' : 'Back'}
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {language === 'es' ? 'Papelera' : 'Trash'}
            </h1>
          </div>
          
          <p className="text-slate-600 text-sm">
            {language === 'es' 
              ? 'Los documentos se eliminan permanentemente después de 30 días'
              : 'Documents are permanently deleted after 30 days'}
          </p>
        </div>

        {isEmpty ? (
          <Card className="border-2 border-dashed border-slate-300 p-8 text-center">
            <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">
              {language === 'es' ? 'Papelera vacía' : 'Trash is empty'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Bulk Actions */}
            {allDeletedItems.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={selectedItems.length === allDeletedItems.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-sm text-slate-600">
                  {selectedItems.length > 0
                    ? `${selectedItems.length} ${language === 'es' ? 'seleccionado(s)' : 'selected'}`
                    : language === 'es' ? 'Seleccionar todo' : 'Select all'}
                </span>
                
                {selectedItems.length > 0 && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreMutation.mutate(selectedItems)}
                      disabled={restoreMutation.isPending}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Restaurar' : 'Restore'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(language === 'es' ? '¿Eliminar permanentemente?' : 'Delete permanently?')) {
                          permanentDeleteMutation.mutate(selectedItems);
                        }
                      }}
                      disabled={permanentDeleteMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Eliminar' : 'Delete'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Items Grid */}
            <div className="grid gap-3">
              {allDeletedItems.map((item) => {
                const isSelected = selectedItems.some(s => s.id === item.id);
                const daysAgo = Math.floor((new Date() - new Date(item.deleted_at)) / (1000 * 60 * 60 * 24));
                const isWarning = daysAgo > 20;

                return (
                  <Card
                    key={item.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border border-slate-200 hover:shadow-md'
                    } ${isWarning ? 'border-orange-200' : ''}`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded cursor-pointer mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.document_type}
                          </Badge>
                          {item.type === 'quote' && (
                            <span className="font-bold text-slate-900">{item.quote_number}</span>
                          )}
                          {item.type === 'invoice' && (
                            <span className="font-bold text-slate-900">{item.invoice_number}</span>
                          )}
                          {isWarning && (
                            <div className="flex items-center gap-1 text-orange-600 text-xs ml-auto">
                              <AlertCircle className="w-4 h-4" />
                              {language === 'es' ? 'Por eliminarse' : 'Will be deleted'}
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">{language === 'es' ? 'Cliente' : 'Customer'}</p>
                            <p className="text-sm font-medium text-slate-900">{item.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">{language === 'es' ? 'Trabajo' : 'Job'}</p>
                            <p className="text-sm font-medium text-slate-900">{item.job_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">{language === 'es' ? 'Monto' : 'Amount'}</p>
                            <p className="text-sm font-bold text-slate-900">${item.total?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">{language === 'es' ? 'Eliminado' : 'Deleted'}</p>
                            <p className={`text-sm font-medium ${isWarning ? 'text-orange-600' : 'text-slate-600'}`}>
                              {daysAgo} {language === 'es' ? 'días' : 'days'} ago
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreMutation.mutate([item]);
                          }}
                          disabled={restoreMutation.isPending}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(language === 'es' ? '¿Eliminar permanentemente?' : 'Delete permanently?')) {
                              permanentDeleteMutation.mutate([item]);
                            }
                          }}
                          disabled={permanentDeleteMutation.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}