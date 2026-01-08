import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OperationalModesDoc() {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generateOperationalModesPDF');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MCI_Connect_Operational_Modes.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Error al generar PDF: ' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Modos Operacionales</h1>
              <p className="text-slate-600">MCI Connect Specification v1.0</p>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Documentos Disponibles</h2>
            
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2">📋 Operational Modes Specification</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Define los 6 modos operacionales de MCI Connect: Field, Produce, Finance, 
                  Workforce, Admin y Observe. Incluye usuarios, estados mentales, acciones 
                  permitidas y prohibidas.
                </p>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloading ? 'Generando...' : 'Descargar PDF'}
                </Button>
              </div>

              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <h3 className="font-bold text-green-900 mb-2">✅ Production Readiness Certification</h3>
                <p className="text-sm text-green-700 mb-3">
                  Certificación completa de MCI Field para producción. Validación de estabilidad,
                  integridad de datos, manejo de ciclo de vida y confianza del operador.
                </p>
                <p className="text-xs text-green-600 italic">
                  Ubicación: components/field/docs/PRODUCTION_READINESS_CERTIFICATION.md
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">📊 Full Product Audit</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Auditoría completa de MCI Connect vs. Procore, Fieldwire, Buildertrend.
                  Análisis de competitividad, escalabilidad y recomendaciones priorizadas.
                </p>
                <p className="text-xs text-blue-600 italic">
                  Ubicación: components/docs/MCI_CONNECT_FULL_PRODUCT_AUDIT.md
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-amber-900 mb-2">💡 Resumen Ejecutivo</h3>
            <ul className="text-sm text-amber-800 space-y-2">
              <li>✅ <strong>Field Mode:</strong> Certificado producción (10/10) - Mejor de la industria</li>
              <li>✅ <strong>Plataforma:</strong> Lista para producción (8.3/10) - Competitiva Tier 1</li>
              <li>✅ <strong>Diferenciadores:</strong> 8 características únicas vs. competidores</li>
              <li>⚠️ <strong>Escalabilidad:</strong> Necesita paginación antes de 100+ empleados (7h)</li>
              <li>✅ <strong>Recomendación:</strong> Implementar ahora + iterar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}