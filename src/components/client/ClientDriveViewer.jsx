import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { File, Image, FileText, Download, ExternalLink, Loader2, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function ClientDriveViewer({ job }) {
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['client-drive-files', job?.drive_folder_id],
    queryFn: () => base44.functions.invoke('listDriveFiles', { folder_id: job.drive_folder_id }),
    enabled: !!job?.drive_folder_id,
    refetchInterval: 60000,
  });

  const files = filesData?.data?.files || [];

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('image')) return Image;
    if (mimeType?.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (!job?.drive_folder_id) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Cargando archivos...</p>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay archivos disponibles aún</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file) => {
        const FileIcon = getFileIcon(file.mimeType);
        return (
          <Card key={file.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {file.thumbnailLink && file.mimeType?.includes('image') ? (
                  <img 
                    src={file.thumbnailLink} 
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-slate-900 truncate">{file.name}</h5>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    {formatFileSize(file.size) && <span>{formatFileSize(file.size)}</span>}
                    {formatFileSize(file.size) && <span>•</span>}
                    <span>{format(new Date(file.modifiedTime), 'dd MMM yyyy')}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(file.webViewLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}