import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileArchive, Folder, File } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ZipAnalyzer() {
  const [zipContent, setZipContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileTree, setFileTree] = useState(null);

  const analyzeZip = async (file) => {
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const response = await base44.functions.invoke('analyzeZip', { file_url });
      
      if (response.data.files) {
        setFileTree(response.data.files);
        setZipContent(response.data);
      } else {
        alert('Error al analizar el ZIP');
      }
    } catch (error) {
      console.error('Error analyzing ZIP:', error);
      alert('Error al analizar el ZIP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeKB = file.size / 1024;

    if (file.name.endsWith('.zip')) {
      analyzeZip(file);
    } else if (fileSizeKB >= 1 && fileSizeKB <= 15000) {
      analyzeRegularFile(file);
    } else {
      alert(`Archivo muy grande (${fileSizeKB.toFixed(0)}KB). Límite: 1KB - 15MB`);
    }
  };

  const analyzeRegularFile = async (file) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        let content;
        const isBinary = file.type.includes('pdf') || 
                        file.type.includes('image') || 
                        file.type.includes('zip') ||
                        file.type.includes('application/octet-stream');
        
        if (isBinary) {
          content = `[Archivo binario: ${file.type || 'tipo desconocido'}]\nTamaño: ${formatSize(file.size)}`;
        } else {
          content = e.target.result;
        }
        
        setFileTree([{
          path: file.name,
          name: file.name,
          dir: false,
          size: file.size,
          content: content
        }]);
        setZipContent({ single_file: true });
        setLoading(false);
      };
      
      reader.onerror = () => {
        alert('Error al leer el archivo');
        setLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo');
      setLoading(false);
    }
  };



  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileArchive className="w-8 h-8 text-blue-600" />
            Analizador de ZIP
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Sube un archivo ZIP o archivos individuales (1KB - 15MB)
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subir Archivo ZIP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="zip-upload"
              />
              <label htmlFor="zip-upload">
                <Button asChild disabled={loading}>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {loading ? 'Analizando...' : 'Seleccionar Archivo'}
                  </span>
                </Button>
              </label>
              {fileTree && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {fileTree.length} archivos encontrados
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {fileTree && (
          <Card>
            <CardHeader>
              <CardTitle>{zipContent?.single_file ? 'Contenido del Archivo' : 'Contenido del ZIP'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {fileTree.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.dir ? (
                          <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-mono truncate">
                          {item.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-slate-500">
                          {formatSize(item.size)}
                        </span>
                      </div>
                    </div>
                    {item.content && (
                      <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto max-h-96 font-mono">
                        {item.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  💡 <strong>Para compartir con el asistente:</strong> Copia esta información y pégala en el chat.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}