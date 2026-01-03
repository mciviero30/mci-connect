import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lightbulb, Upload, X, Tag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';

export default function CreateKnowledge() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldKnowledge.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pending-knowledge'] });
      toast.success('Tip submitted for approval!');
      navigate(createPageUrl('FieldKnowledge'));
    },
    onError: (error) => {
      toast.error('Failed to submit: ' + error.message);
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setPhotos([...photos, ...urls]);
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      photos,
      author_email: user.email,
      author_name: user.full_name,
      approval_status: 'pending',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('FieldKnowledge'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <PageHeader
          title="Share Field Knowledge"
          description="Help the team by sharing tips and lessons learned"
          icon={Lightbulb}
        />

        <Card className="p-6">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Installing Falkbuilt Glass Walls"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="installation">Installation</option>
                <option value="safety">Safety</option>
                <option value="tools">Tools</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="best_practices">Best Practices</option>
                <option value="materials">Materials</option>
                <option value="customer_service">Customer Service</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Explain the tip, best practice, or lesson learned..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tags (for easier search)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. falkbuilt, glass, walls"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} variant="outline">
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button onClick={() => setTags(tags.filter((_, i) => i !== idx))}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Photos (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={uploading}
              />
              <label htmlFor="photo-upload">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Click to upload photos</p>
                    </>
                  )}
                </div>
              </label>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('FieldKnowledge'))}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isLoading}
              className="flex-1 soft-blue-gradient"
            >
              {createMutation.isLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}