import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Search, Download, CheckCircle, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { AGREEMENTS } from '@/components/core/agreementsConfig';

export default function AgreementSignatures() {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['allAgreementSignatures'],
    queryFn: () => base44.entities.AgreementSignature.list('-created_date', 500),
    initialData: [],
  });

  // Filter signatures
  const filteredSignatures = signatures.filter(sig => {
    const matchesSearch = !searchTerm || 
      sig.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sig.employee_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || sig.agreement_type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Get agreement config
  const getAgreementConfig = (type) => {
    return AGREEMENTS[type];
  };

  const handlePrint = (signature) => {
    const agreement = getAgreementConfig(signature.agreement_type);
    if (!agreement) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${agreement.title[language]}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            .signature-box { margin-top: 40px; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; }
            .signature-field { margin: 10px 0; }
            .signature-value { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${agreement.title[language]}</h1>
          <div>${agreement.body[language].replace(/\n/g, '<br>')}</div>
          <div class="signature-box">
            <h2>Signature Details</h2>
            <div class="signature-field">
              <strong>Employee:</strong> ${signature.employee_name} (${signature.employee_email})
            </div>
            <div class="signature-field">
              <strong>Signature:</strong> <span class="signature-value">${signature.signature_name}</span>
            </div>
            <div class="signature-field">
              <strong>Date:</strong> ${format(new Date(signature.accepted_at), 'MMMM d, yyyy h:mm a')}
            </div>
            <div class="signature-field">
              <strong>Version:</strong> ${signature.version}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const stats = {
    total: signatures.length,
    manager: signatures.filter(s => s.agreement_type === 'manager_variable_comp').length,
    foreman: signatures.filter(s => s.agreement_type === 'foreman_variable_comp').length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Firmas de Acuerdos' : 'Agreement Signatures'}
          description={language === 'es' ? 'Gestiona y revisa las firmas de acuerdos de compensación' : 'Manage and review compensation agreement signatures'}
          icon={FileText}
          stats={[
            { label: language === 'es' ? 'Total Firmas' : 'Total Signatures', value: stats.total, icon: CheckCircle },
            { label: 'Manager/Supervisor', value: stats.manager, icon: User },
            { label: 'Foreman', value: stats.foreman, icon: User },
          ]}
        />

        {/* Filters */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar por nombre o email...' : 'Search by name or email...'}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'es' ? 'Todos los Acuerdos' : 'All Agreements'}
                  </SelectItem>
                  <SelectItem value="manager_variable_comp">Manager/Supervisor</SelectItem>
                  <SelectItem value="foreman_variable_comp">Foreman</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Signatures List */}
        {isLoading ? (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">{language === 'es' ? 'Cargando...' : 'Loading...'}</p>
            </CardContent>
          </Card>
        ) : filteredSignatures.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {language === 'es' ? 'No se encontraron firmas' : 'No signatures found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSignatures.map((signature) => {
              const agreement = getAgreementConfig(signature.agreement_type);
              
              return (
                <Card key={signature.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {signature.employee_name}
                          </CardTitle>
                          <p className="text-sm text-slate-500">{signature.employee_email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(signature)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Imprimir' : 'Print'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          {language === 'es' ? 'Tipo de Acuerdo' : 'Agreement Type'}
                        </p>
                        <Badge className="bg-blue-100 text-blue-800">
                          {agreement?.title[language] || signature.agreement_type}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          {language === 'es' ? 'Fecha de Firma' : 'Signature Date'}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {format(new Date(signature.accepted_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          {language === 'es' ? 'Versión' : 'Version'}
                        </p>
                        <Badge variant="outline">{signature.version}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">
                        {language === 'es' ? 'Firma' : 'Signature'}
                      </p>
                      <p className="font-semibold text-lg italic">{signature.signature_name}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}