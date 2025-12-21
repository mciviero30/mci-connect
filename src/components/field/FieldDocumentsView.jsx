import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  Upload, 
  Folder, 
  FileText, 
  FileImage, 
  File,
  Trash2,
  Download,
  Star,
  MoreVertical,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const fileIcons = {
  pdf: FileText,
  image: FileImage,
  default: File,
};

export default function FieldDocumentsView({ jobId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', file_url: '', description: '' });
  const [newFolderName, setNewFolderName] = useState('');

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['field-documents', jobId],
    queryFn: () => base44.entities.Document.filter({ job_id: jobId }, '-created_date'),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['field-folders', jobId],
    queryFn: () => base44.entities.DocumentFolder.filter({ job_id: jobId }, 'name'),
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-documents', jobId] });
      setShowUpload(false);
      setNewDoc({ name: '', file_url: '', description: '' });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-folders', jobId] });
      setShowNewFolder(false);
      setNewFolderName('');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-documents', jobId] });
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, starred }) => base44.entities.Document.update(id, { starred: !starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-documents', jobId] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extension = file.name.split('.').pop().toLowerCase();
      const fileType = ['jpg', 'jpeg', 'png', 'gif'].includes(extension) ? 'image' :
                       extension === 'pdf' ? 'pdf' :
                       ['xlsx', 'xls'].includes(extension) ? 'excel' :
                       ['doc', 'docx'].includes(extension) ? 'word' : 'other';
      
      setNewDoc({ 
        ...newDoc, 
        file_url, 
        name: newDoc.name || file.name.split('.')[0],
        file_type: fileType,
        file_extension: extension,
        file_size: file.size,
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const handleCreateDocument = () => {
    if (!newDoc.file_url || !newDoc.name) return;
    createDocMutation.mutate({
      job_id: jobId,
      folder_id: currentFolder,
      ...newDoc,
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName) return;
    createFolderMutation.mutate({
      job_id: jobId,
      name: newFolderName,
      parent_folder_id: currentFolder,
    });
  };

  // Filter by current folder
  const currentFolders = folders.filter(f => f.parent_folder_id === currentFolder);
  const currentDocs = documents.filter(d => d.folder_id === currentFolder);

  const getFileIcon = (doc) => {
    const IconComponent = fileIcons[doc.file_type] || fileIcons.default;
    return IconComponent;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl">
          <h1 className="text-2xl font-bold text-black" style={{ fontSize: '1.575rem' }}>Documents</h1>
        </div>
        <div className="flex-1"></div>
        <div>
          {currentFolder && (
            <button 
              onClick={() => setCurrentFolder(null)}
              className="text-sm text-slate-400 hover:text-white mt-1"
            >
              ← Back to root
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowNewFolder(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Folders */}
      {currentFolders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Carpetas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currentFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className="flex flex-col items-center p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-amber-500/50 transition-all"
              >
                <Folder className="w-10 h-10 text-amber-400 mb-2" />
                <span className="text-sm text-white truncate w-full text-center">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {currentDocs.length === 0 && currentFolders.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-2xl p-12 text-center shadow-lg">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No documents</h3>
          <p className="text-slate-400 mb-4">Upload documents to share with the team</p>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      ) : currentDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Files</h3>
          <div className="space-y-2">
            {currentDocs.map((doc) => {
              const FileIcon = getFileIcon(doc);
              return (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <FileIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{doc.name}</h4>
                        {doc.starred && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                      </div>
                      <p className="text-sm text-slate-400">
                        {doc.file_extension?.toUpperCase()} • {format(new Date(doc.created_date), 'dd MMM yyyy')}
                        {doc.upload_by_name && ` • ${doc.upload_by_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleStarMutation.mutate({ id: doc.id, starred: doc.starred })}
                      className="text-slate-400 hover:text-amber-400"
                    >
                      <Star className={`w-4 h-4 ${doc.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem 
                          onClick={() => deleteDocMutation.mutate(doc.id)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">File</Label>
              <div className="mt-1.5">
                {newDoc.file_url ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <FileText className="w-8 h-8 text-[#FFB800]" />
                    <span className="text-slate-900 dark:text-white">{newDoc.name}</span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-[#FFB800] transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {uploading ? 'Uploading...' : 'Click to upload file'}
                    </span>
                    <input 
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input 
                value={newDoc.name}
                onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                placeholder="Document name"
                className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDocument}
                disabled={!newDoc.file_url || !newDoc.name || createDocMutation.isPending}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                {createDocMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Folder Name</Label>
              <Input 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Specifications"
                className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewFolder(false)} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolderName || createFolderMutation.isPending}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}