import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, Image, FileText, Download, ExternalLink, Loader2, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/toast';

export default function DriveFileManager({ job }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['drive-files', job?.drive_folder_id],
    queryFn: () => base44.functions.invoke('listDriveFiles', { folder_id: job.drive_folder_id }),
    enabled: !!job?.drive_folder_id,
    refetchInterval: 30000,
  });

  const files = filesData?.data?.files || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_id', job.drive_folder_id);

      const response = await fetch('/api/functions/uploadToDrive', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Archivo subido a Google Drive');
      queryClient.invalidateQueries(['drive-files', job.drive_folder_id]);
    } catch (error) {
      toast.error('Error al subir archivo');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('image')) return Image;
    if (mimeType?.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (!job?.drive_folder_id) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">Carpeta de Google Drive no vinculada</p>
          <p className="text-sm text-slate-400">Crea una carpeta desde el formulario del proyecto</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Google Drive</h4>
              <p className="text-sm text-slate-500">Archivos compartidos con el cliente</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(job.drive_folder_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Drive
              </Button>
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button 
                  as="span"
                  disabled={uploading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Archivo
                    </>
                  )}
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          </CardContent>
        </Card>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay archivos en esta carpeta</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            return (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-slate-900 truncate">{file.name}</h5>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{format(new Date(file.modifiedTime), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.webViewLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}