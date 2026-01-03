import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/toast';

const categoryLabels = {
  walls: 'Walls',
  glass: 'Glass',
  millwork: 'Millwork',
  doors: 'Doors',
  hardware: 'Hardware',
  acoustics: 'Acoustics',
  electrical: 'Electrical',
  hvac: 'HVAC',
  safety: 'Safety',
  tools: 'Tools',
  materials: 'Materials',
  best_practices: 'Best Practices',
  troubleshooting: 'Troubleshooting',
  other: 'Other'
};

export default function KnowledgeSubmit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'other',
    system_specific: '',
    tags: ''
  });

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      let fileUrl = null;
      
      // Upload file if provided
      if (file) {
        setUploading(true);
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
        setUploading(false);
      }

      // Create article
      const article = await base44.entities.KnowledgeArticle.create({
        title: data.title,
        description: data.description,
        content: data.content,
        category: data.category,
        system_specific: data.system_specific || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
        file_url: fileUrl,
        status: 'pending',
        submitted_by: currentUser.email,
        submitted_by_name: currentUser.full_name,
        submitted_at: new Date().toISOString()
      });

      return article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-knowledge-submissions'] });
      toast.success('Content submitted! Awaiting approval.');
      navigate(createPageUrl('KnowledgeLibrary'));
    },
    onError: (error) => {
      toast.error('Error submitting content: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Title and description are required');
      return;
    }

    submitMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('KnowledgeLibrary')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Submit Knowledge Content
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Share installation guides, best practices, or technical tips
          </p>
        </div>

        <Card className="shadow-lg bg-white dark:bg-[#282828]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <FileText className="w-5 h-5" />
              Content Details
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Installing Falkbuilt Wall Systems"
                  required
                />
              </div>

              <div>
                <Label>Short Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of the content (2-3 sentences)"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label>Category *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md bg-white dark:bg-slate-800"
                  required
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>System-Specific (Optional)</Label>
                <Input
                  value={formData.system_specific}
                  onChange={(e) => setFormData({ ...formData, system_specific: e.target.value })}
                  placeholder="e.g., Falkbuilt, Dirtt, NanaWall"
                />
              </div>

              <div>
                <Label>Full Content (Optional)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed instructions, tips, or notes (supports markdown)"
                  rows={8}
                />
              </div>

              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., installation, measurement, cutting"
                />
              </div>

              <div>
                <Label>Upload PDF/Document (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {file ? file.name : 'Click to upload file'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">PDF, Word, or Image</p>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Submission Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Content will be reviewed by management before publishing</li>
                      <li>Ensure all information is accurate and verified</li>
                      <li>No proprietary or confidential information</li>
                      <li>Focus on practical, actionable knowledge</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('KnowledgeLibrary'))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending || uploading}
                  className="flex-1 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
                >
                  {submitMutation.isPending || uploading ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}