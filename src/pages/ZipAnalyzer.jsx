import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileArchive, Folder, File, Download } from 'lucide-react';
import JSZip from 'jszip';

export default function ZipAnalyzer() {
  const [zipContent, setZipContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileTree, setFileTree] = useState(null);

  const analyzeZip = async (file) => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      // Build file tree
      const tree = {};
      const files = [];
      
      content.forEach((relativePath, zipEntry) => {
        files.push({
          path: relativePath,
          name: zipEntry.name,
          dir: zipEntry.dir,
          size: zipEntry._data?.uncompressedSize || 0
        });
      });
      
      setFileTree(files);
      setZipContent(content);
      
    } catch (error) {
      console.error('Error analyzing ZIP:', error);
      alert('Error al analizar el ZIP');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      analyzeZip(file);
    } else {
      alert('Por favor sube un archivo ZIP');
    }
  };

  const downloadFileContent = async (path) => {
    if (!zipContent) return;
    
    try {
      const fileContent = await zipContent.file(path).async('text');
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
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
            Sube tu archivo ZIP para ver su contenido y estructura
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
                accept=".zip"
                onChange={handleFileUpload}
                className="hidden"
                id="zip-upload"
              />
              <label htmlFor="zip-upload">
                <Button asChild disabled={loading}>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {loading ? 'Analizando...' : 'Seleccionar ZIP'}
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
              <CardTitle>Contenido del ZIP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {fileTree.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
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
                      {!item.dir && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFileContent(item.path)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  💡 <strong>Para compartir con el asistente:</strong> Copia esta información y pégala en el chat para que pueda ver la estructura de tu ZIP.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}