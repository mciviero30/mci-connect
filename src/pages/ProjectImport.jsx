import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileArchive, FileText, Image, Table, File, 
  Check, X, Clock, Download, Eye, Package, AlertTriangle,
  Shield, Hash, HardDrive, Calendar
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProjectImport() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: uploadedFiles = [], isLoading } = useQuery({
    queryKey: ['uploadedFiles'],
    queryFn: () => base44.entities.UploadedFile.list('-created_date', 100),
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, notes }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('notes', notes);

      setUploadProgress({ status: 'uploading', percent: 0 });

      const response = await base44.functions.invoke('uploadFile', formData);
      
      setUploadProgress({ status: 'success', percent: 100 });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
      setSelectedFile(null);
      setNotes('');
      setTimeout(() => setUploadProgress(null), 2000);
    },
    onError: (error) => {
      setUploadProgress({ status: 'error', message: error.message });
    }
  });

  const indexZipMutation = useMutation({
    mutationFn: (file_id) => base44.functions.invoke('indexZipContents', { file_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (file_id) => {
      const response = await base44.functions.invoke('downloadUploadedFile', { file_id });
      return response.data;
    }
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      console.log('File dropped:', file.name, file.size, file.type);
      
      if (file.size === 0) {
        alert('File appears to be empty (0 bytes). Please check the file and try again.');
        return;
      }
      
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('File selected:', file.name, file.size, file.type);
      
      if (file.size === 0) {
        alert('File appears to be empty (0 bytes). Please check the file and try again.');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, category, notes });
  };

  const handleDownload = async (fileRecord) => {
    try {
      const blob = await downloadMutation.mutateAsync(fileRecord.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileRecord.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'codebase_zip': return <FileArchive className="w-4 h-4" />;
      case 'docs': return <FileText className="w-4 h-4" />;
      case 'images': return <Image className="w-4 h-4" />;
      case 'spreadsheets': return <Table className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'uploaded':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Uploaded</Badge>;
      case 'indexed':
        return <Badge className="bg-green-500 gap-1"><Check className="w-3 h-3" /> Indexed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!user || (user.role !== 'admin' && !user.position?.toLowerCase().includes('ceo') && !user.position?.toLowerCase().includes('administrator'))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only administrators can access the project import tool.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8" />
          Project Import & File Upload
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload ZIP packages, documents, and reference files (Admin Only)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Allowed: .zip, .pdf, .png, .jpg, .csv, .xlsx, .json, .txt, .md (Max 100MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your file here, or
              </p>
              <Input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".zip,.pdf,.png,.jpg,.jpeg,.csv,.xlsx,.json,.txt,.md"
              />
              <Label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </Label>
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatBytes(selectedFile.size)}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="codebase_zip">Codebase ZIP</SelectItem>
                    <SelectItem value="docs">Documents</SelectItem>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this file..."
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
            </Button>

            {uploadProgress && (
              <Alert className={uploadProgress.status === 'error' ? 'border-red-500' : 'border-green-500'}>
                <AlertDescription>
                  {uploadProgress.status === 'uploading' && 'Uploading file...'}
                  {uploadProgress.status === 'success' && '✓ File uploaded successfully!'}
                  {uploadProgress.status === 'error' && `✗ ${uploadProgress.message}`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">Automatic Validation</p>
                <p className="text-muted-foreground text-xs">
                  File type, size, and path safety checks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium">SHA256 Hash</p>
                <p className="text-muted-foreground text-xs">
                  Verify file integrity
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Zip Slip Protection</p>
                <p className="text-muted-foreground text-xs">
                  Blocks dangerous paths (../, absolute paths)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>Recent uploads and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : uploadedFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No files uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(file.category)}
                        <span className="font-medium">{file.original_name}</span>
                        {getStatusBadge(file.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatBytes(file.size_bytes)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(file.created_date).toLocaleDateString()}
                        </div>
                        {file.zip_file_count && (
                          <div className="flex items-center gap-1">
                            <FileArchive className="w-3 h-3" />
                            {file.zip_file_count} files
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {file.sha256?.substring(0, 8)}...
                        </div>
                      </div>

                      {file.notes && (
                        <p className="text-xs text-muted-foreground italic">{file.notes}</p>
                      )}

                      {file.error_message && (
                        <Alert className="mt-2 border-red-500">
                          <AlertDescription className="text-xs">
                            {file.error_message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {file.original_name.endsWith('.zip') && file.status === 'uploaded' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => indexZipMutation.mutate(file.id)}
                          disabled={indexZipMutation.isPending}
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {file.zip_index_json && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>ZIP Contents: {file.original_name}</DialogTitle>
                            </DialogHeader>
                            <ZipContentsViewer indexData={JSON.parse(file.zip_index_json)} />
                          </DialogContent>
                        </Dialog>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                        disabled={downloadMutation.isPending}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ZipContentsViewer({ indexData }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = indexData.files?.filter(f => 
    f.path.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Files</p>
          <p className="text-xl font-bold">{indexData.files?.length || 0}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-muted-foreground">Uncompressed Size</p>
          <p className="text-xl font-bold">{formatBytes(indexData.total_uncompressed_size || 0)}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-xl font-bold">{indexData.truncated ? 'Truncated' : 'Complete'}</p>
        </div>
      </div>

      <Input
        placeholder="Search files..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ScrollArea className="h-[400px] border rounded-lg p-4">
        <div className="space-y-1">
          {filteredFiles.map((file, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs py-1 hover:bg-gray-50 px-2 rounded">
              <span className="font-mono truncate flex-1">{file.path}</span>
              <span className="text-muted-foreground ml-4">{formatBytes(file.size)}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {indexData.truncated && (
        <Alert>
          <AlertDescription className="text-xs">
            This index was truncated. Showing first {indexData.indexed_count} files.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}