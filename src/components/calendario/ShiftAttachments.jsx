import React, { useState } from 'react';
import { Paperclip, Upload, File, Image, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';

const FILE_ICONS = {
  image: Image,
  pdf: FileText,
  default: File,
};

const getFileType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'default';
};

export default function ShiftAttachments({ 
  attachments = [], 
  onChange,
  language = 'en'
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      onChange([
        ...attachments,
        {
          id: `file_${Date.now()}`,
          name: file.name,
          url: file_url,
          size: file.size,
          type: getFileType(file.name)
        }
      ]);
      
      toast.success(language === 'es' ? 'Archivo subido' : 'File uploaded');
    } catch (error) {
      toast.error(language === 'es' ? 'Error al subir archivo' : 'Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-[#3B9FF3]" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {language === 'es' ? 'Archivos Adjuntos' : 'Attachments'}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          ({attachments.length})
        </span>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {attachments.map(file => {
          const Icon = FILE_ICONS[file.type] || FILE_ICONS.default;
          
          return (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatSize(file.size)}
                </p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B9FF3] hover:text-blue-600"
              >
                <Download className="w-4 h-4" />
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(file.id)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Upload button */}
      <div>
        <input
          type="file"
          onChange={handleUpload}
          className="hidden"
          id="shift-file-upload"
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('shift-file-upload')?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {language === 'es' ? 'Subiendo...' : 'Uploading...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Subir Archivo' : 'Upload File'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}