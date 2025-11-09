import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Trash2, FileSpreadsheet, Download, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuoteXLSXImporter from "../components/quotes/QuoteXLSXImporter";

export default function Estimados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showImporter, setShowImporter] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quoteDeleted'));
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (quote) => {
      const newQuote = {
        ...quote,
        quote_number: `${quote.quote_number}-COPY-${Date.now()}`,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: '',
      };
      delete newQuote.id;
      delete newQuote.created_date;
      delete newQuote.updated_date;
      delete newQuote.created_by;
      
      return base44.entities.Quote.create(newQuote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? '✅ Estimado duplicado' : '✅ Quote duplicated');
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  const exportToExcel = () => {
    if (filteredQuotes.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para exportar' : '⚠️ No data to export');
      return;
    }

    const headers = [
      'Número',
      'Cliente',
      'Email',
      'Teléfono',
      'Proyecto',
      'Dirección',
      'Fecha',
      'Válido Hasta',
      'Subtotal',
      'Impuesto %',
      'Impuesto',
      'Total',
      'Estado',
      'Notas'
    ];

    const rows = filteredQuotes.map(quote => [
      quote.quote_number || '',
      quote.customer_name || '',
      quote.customer_email || '',
      quote.customer_phone || '',
      quote.job_name || '',
      quote.job_address || '',
      quote.quote_date || '',
      quote.valid_until || '',
      quote.subtotal || 0,
      quote.tax_rate || 0,
      quote.tax_amount || 0,
      quote.total || 0,
      quote.status || '',
      (quote.notes || '').replace(/\n/g, ' ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estimados-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('✅ ' + (language === 'es' ? 'Archivo descargado' : 'File downloaded'));
  };

  const getDaysInStatus = (quote) => {
    const statusDate = quote.updated_date || quote.created_date;
    const daysDiff = Math.floor((new Date() - new Date(statusDate)) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.job_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const drafts = filteredQuotes.filter(q => q.status === 'draft');
  const sent = filteredQuotes.filter(q => q.status === 'sent');
  const converted = filteredQuotes.filter(q => q.status === 'converted_to_invoice');
  const totalValue = filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    converted_to_invoice: "bg-purple-50 text-purple-700 border-purple-200"
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: language === 'es' ? 'Borrador' : 'Draft',
      sent: language === 'es' ? 'Enviado' : 'Sent',
      approved: language === 'es' ? 'Aprobado' : 'Approved',
      rejected: language === 'es' ? 'Rechazado' : 'Rejected',
      converted_to_invoice: language === 'es' ? 'Convertido' : 'Converted'
    };
    return labels[status] || status;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('quotes')}
          description={`${filteredQuotes.length} ${t('total').toLowerCase()}`}
          icon={FileText}
          actions={
            isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={exportToExcel}
                  variant="outline"
                  size="lg" 
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={filteredQuotes.length === 0}
                >
                  <Download className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Exportar Excel' : 'Export Excel'}
                </Button>
                <Button 
                  onClick={() => setShowImporter(true)}
                  variant="outline"
                  size="lg" 
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Importar Excel' : 'Import Excel'}
                </Button>
                <Link to={createPageUrl("CrearEstimado")}>
                  <Button size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 hover:from-[#2A8FE3] hover:to-blue-700 text-white shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('newQuote')}
                  </Button>
                </Link>
              </div>
            )
          }
        />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('drafts')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{drafts.length}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-2xl">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('sent')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{sent.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('converted')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{converted.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-2xl">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#3B9FF3] to-blue-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-50">{t('totalValue')}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-6">
          <CardContent className="p-4">
            <Input
              placeholder={t('search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredQuotes.map(quote => {
            const daysInStatus = getDaysInStatus(quote);
            
            return (
              <Card key={quote.id} className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-xl text-slate-900">{quote.customer_name}</h3>
                        <Badge className={statusColors[quote.status] || statusColors.draft}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-slate-600 border-slate-300">
                          {daysInStatus === 0 
                            ? (language === 'es' ? 'Hoy' : 'Today')
                            : daysInStatus === 1
                              ? (language === 'es' ? 'Hace 1 día' : '1 day ago')
                              : (language === 'es' ? `Hace ${daysInStatus} días` : `${daysInStatus} days ago`)
                          }
                        </Badge>
                      </div>
                      <p className="text-slate-600 font-medium mb-1">{quote.job_name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{quote.quote_number}</span>
                        <span>•</span>
                        <span>{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</span>
                        {quote.valid_until && (
                          <>
                            <span>•</span>
                            <span>{t('validUntil')}: {format(new Date(quote.valid_until), 'MMM dd, yyyy')}</span>
                          </>
                        )}
                        {quote.team_name && (
                          <>
                            <span>•</span>
                            <span className="text-[#3B9FF3]">Team: {quote.team_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#3B9FF3]">
                          ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {quote.estimated_hours && (
                          <p className="text-sm text-slate-500">{quote.estimated_hours}h {language === 'es' ? 'estimadas' : 'estimated'}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(language === 'es' ? '¿Duplicar este estimado?' : 'Duplicate this quote?')) {
                                duplicateMutation.mutate(quote);
                              }
                            }}
                            className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                            title={language === 'es' ? 'Duplicar' : 'Duplicate'}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <Link to={createPageUrl(`VerEstimado?id=${quote.id}`)}>
                          <Button variant="outline" size="icon" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(t('confirmDeleteQuote'))) {
                                deleteMutation.mutate(quote.id);
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredQuotes.length === 0 && !isLoading && (
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">{t('noQuotes')}</h3>
                {isAdmin && (
                  <Link to={createPageUrl("CrearEstimado")}>
                    <Button className="mt-4 bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('newQuote')}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Import Dialog */}
        <Dialog open={showImporter} onOpenChange={setShowImporter}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900">
                {language === 'es' ? 'Importar Estimados desde Excel' : 'Import Quotes from Excel'}
              </DialogTitle>
            </DialogHeader>
            <QuoteXLSXImporter onComplete={() => setShowImporter(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}