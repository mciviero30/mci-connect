import React from 'react';
import { Card } from '@/components/ui/card';
import { Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CompanyInfo() {
  // URL de la página web de la compañía - PERSONALIZAR AQUÍ
  const COMPANY_WEBSITE_URL = "https://www.example.com"; // ⚠️ CAMBIAR ESTA URL POR LA URL REAL DE LA COMPAÑÍA

  const openInNewTab = () => {
    window.open(COMPANY_WEBSITE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Company Info</h1>
                <p className="text-slate-600 text-sm">Explore our company website and resources</p>
              </div>
            </div>
            <Button
              onClick={openInNewTab}
              variant="outline"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>

      {/* WebView Container */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <Card className="h-full w-full max-w-7xl mx-auto overflow-hidden shadow-xl border-slate-200">
          <iframe
            src={COMPANY_WEBSITE_URL}
            title="Company Website"
            className="w-full h-full border-0"
            style={{
              minHeight: '600px'
            }}
            // Security attributes
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
          />
        </Card>
      </div>

      {/* Info Footer */}
      <div className="flex-shrink-0 p-4 bg-blue-50 border-t border-blue-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Globe className="w-4 h-4" />
            <span>You are viewing the company website within MCI Connect</span>
          </div>
        </div>
      </div>
    </div>
  );
}