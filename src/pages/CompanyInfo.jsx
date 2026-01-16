import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, ExternalLink, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CompanyInfo() {
  // ⚠️ CONFIGURACIÓN: URL configurada para MCI
  const COMPANY_WEBSITE_URL = "https://mci-us.com";

  const [showConfig, setShowConfig] = useState(!COMPANY_WEBSITE_URL);
  const [customUrl, setCustomUrl] = useState(COMPANY_WEBSITE_URL);
  const [iframeError, setIframeError] = useState(false);
  const [urlError, setUrlError] = useState('');

  const openInNewTab = () => {
    const urlToOpen = customUrl || COMPANY_WEBSITE_URL;
    if (urlToOpen) {
      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    }
  };

  const isValidUrl = (url) => {
    if (!url || url.trim() === '') return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUrlSubmit = () => {
    if (!customUrl || customUrl.trim() === '') {
      setUrlError('Por favor ingresa una URL');
      return;
    }

    if (!isValidUrl(customUrl)) {
      setUrlError('Por favor ingresa una URL válida (debe comenzar con http:// o https://)');
      return;
    }

    setUrlError('');
    setShowConfig(false);
    setIframeError(false);
  };

  const handleUrlChange = (e) => {
    setCustomUrl(e.target.value);
    setUrlError('');
  };

  const getHostname = (url) => {
    if (!url) return 'Company website';
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Si no hay URL configurada, mostrar pantalla de configuración
  if (!COMPANY_WEBSITE_URL && !customUrl) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Company Info</h1>
              <p className="text-slate-600 text-sm">Configure your company website</p>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-10 h-10 text-[#3B9FF3]" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuración Requerida</h2>
                <p className="text-slate-600">
                  Para mostrar tu página web aquí, necesitas configurar la URL
                </p>
              </div>

              <Alert className="mb-6 bg-amber-50 border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-900 font-bold">Opción 1: Configuración Temporal</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Ingresa la URL abajo para probar (se perderá al recargar la página):
                </AlertDescription>
              </Alert>

              <div className="space-y-4 mb-8">
                <div>
                  <Label className="text-slate-700 mb-2 block">URL de tu página web</Label>
                  <Input
                    type="text"
                    value={customUrl}
                    onChange={handleUrlChange}
                    placeholder="https://www.tuempresa.com"
                    className={`bg-white border-slate-300 text-slate-900 text-lg ${urlError ? 'border-red-500' : ''}`}
                  />
                  {urlError && (
                    <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {urlError}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-2">
                    Ejemplos: https://www.google.com, https://www.tuempresa.com
                  </p>
                </div>
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!customUrl}
                  className="w-full bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg"
                  size="lg"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Cargar Página Web
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Settings className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900 font-bold">Opción 2: Configuración Permanente</AlertTitle>
                <AlertDescription className="text-blue-800 space-y-2">
                  <p>Para configurar la URL permanentemente:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Abre el archivo <code className="bg-blue-100 px-2 py-1 rounded">pages/CompanyInfo.js</code></li>
                    <li>En la línea 11, cambia:
                      <pre className="bg-blue-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                        const COMPANY_WEBSITE_URL = "https://www.tuempresa.com";
                      </pre>
                    </li>
                    <li>Guarda el archivo</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const urlToLoad = customUrl || COMPANY_WEBSITE_URL;

  return (
    <div className="h-full flex flex-col bg-[#F1F5F9] dark:bg-[#181818]">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-[#282828] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-2xl shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Company Info</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {getHostname(urlToLoad)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!COMPANY_WEBSITE_URL && (
                <Button
                  onClick={() => setShowConfig(true)}
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Cambiar URL
                </Button>
              )}
              <Button
                onClick={openInNewTab}
                variant="outline"
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Nueva Pestaña
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Config Dialog */}
      {showConfig && (
        <div className="flex-shrink-0 p-4 bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 mb-2">Configuración Temporal</h3>
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={customUrl}
                    onChange={handleUrlChange}
                    placeholder="https://www.tuempresa.com"
                    className={`bg-white text-slate-900 ${urlError ? 'border-red-500' : 'border-amber-300'}`}
                  />
                  {urlError && (
                    <p className="text-red-600 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {urlError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUrlSubmit}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Cargar
                    </Button>
                    <Button
                      onClick={() => {
                        setShowConfig(false);
                        setUrlError('');
                      }}
                      variant="outline"
                      className="bg-white border-amber-300 text-amber-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {iframeError && (
        <div className="flex-shrink-0 p-4 bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto">
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-bold">Error al Cargar la Página</AlertTitle>
              <AlertDescription className="text-red-800">
                <p>La página web no se pudo cargar. Posibles razones:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>La URL es incorrecta</li>
                  <li>La página no permite ser mostrada en un iframe (X-Frame-Options)</li>
                  <li>Problemas de conexión</li>
                </ul>
                <Button
                  onClick={openInNewTab}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Intentar Abrir en Nueva Pestaña
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* WebView Container */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <Card className="h-full w-full max-w-7xl mx-auto overflow-hidden shadow-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-[#282828]">
          <iframe
            src={urlToLoad}
            title="Company Website"
            className="w-full h-full border-0"
            style={{
              minHeight: '600px'
            }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
            onError={() => setIframeError(true)}
            onLoad={() => setIframeError(false)}
          />
        </Card>
      </div>

      {/* Info Footer */}
      <div className="flex-shrink-0 p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Globe className="w-4 h-4" />
              <span>Navegando: {urlToLoad}</span>
            </div>
            {!COMPANY_WEBSITE_URL && (
              <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                Configuración Temporal
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}