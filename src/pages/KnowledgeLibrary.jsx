import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Search, 
  Filter, 
  FileText, 
  ThumbsUp, 
  Eye,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/toast';

const categoryLabels = {
  solid_wall_systems: 'Solid Wall Systems',
  glass_wall_systems: 'Glass Wall Systems',
  doors: 'Doors',
  timber_lvl: 'Timber / LVL',
  millwork: 'Millwork',
  carpet: 'Carpet',
  general_installation: 'General Installation',
  field_tips: 'Field Tips'
};

const categoryColors = {
  solid_wall_systems: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  glass_wall_systems: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  doors: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  timber_lvl: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  millwork: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  carpet: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  general_installation: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  field_tips: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
};

const contentTypeLabels = {
  installation_guide: 'Installation Guide',
  system_overview: 'System Overview',
  field_tip: 'Field Tip'
};

export default function KnowledgeLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const userRole = (currentUser?.role || 'employee').toLowerCase();
  const canApprove = userRole === 'admin' || userRole === 'ceo' || userRole === 'manager';

  // Fetch approved articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledge-articles'],
    queryFn: () => base44.entities.KnowledgeArticle.filter({ status: 'approved' }, '-helpful_count')
  });

  // Fetch user's pending submissions
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-knowledge-submissions', currentUser?.email],
    queryFn: () => base44.entities.KnowledgeArticle.filter({ 
      submitted_by: currentUser?.email 
    }, '-created_date'),
    enabled: !!currentUser?.email
  });

  // Mark as helpful
  const helpfulMutation = useMutation({
    mutationFn: async (articleId) => {
      const article = articles.find(a => a.id === articleId);
      await base44.entities.KnowledgeArticle.update(articleId, {
        helpful_count: (article.helpful_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success('Thank you for your feedback!');
    }
  });

  // Increment view count
  const incrementViewMutation = useMutation({
    mutationFn: async (articleId) => {
      const article = articles.find(a => a.id === articleId);
      await base44.entities.KnowledgeArticle.update(articleId, {
        view_count: (article.view_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    }
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const pendingCount = mySubmissions.filter(s => s.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                Installation Library
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2 ml-[60px]">
                Installation guides, system documentation, and field expertise
              </p>
            </div>
            
            <div className="flex gap-2">
              <Link to={createPageUrl('KnowledgeSubmit')}>
                <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Content
                  {pendingCount > 0 && (
                    <Badge className="ml-2 bg-amber-500 text-white">{pendingCount}</Badge>
                  )}
                </Button>
              </Link>
              
              {canApprove && (
                <Link to={createPageUrl('KnowledgeAdmin')}>
                  <Button variant="outline">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Review Queue
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 shadow-lg bg-white dark:bg-[#282828]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search articles, guides, tips..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-md bg-white dark:bg-slate-800 min-w-[200px]"
              >
                <option value="all">All Categories</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading knowledge base...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'No articles found matching your criteria' 
                  : 'No approved content yet. Be the first to submit!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card 
                key={article.id} 
                className="hover:shadow-xl transition-shadow cursor-pointer bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700"
                onClick={() => {
                  incrementViewMutation.mutate(article.id);
                  if (article.file_url) {
                    window.open(article.file_url, '_blank');
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={`text-xs ${categoryColors[article.category] || categoryColors.general_installation}`}>
                      {categoryLabels[article.category] || 'General'}
                    </Badge>
                    {article.model && (
                      <Badge variant="outline" className="text-xs font-semibold">
                        {article.model}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {contentTypeLabels[article.content_type] || article.content_type}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {article.description}
                  </p>
                  
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {article.helpful_count || 0}
                      </span>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        helpfulMutation.mutate(article.id);
                      }}
                      className="text-xs"
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* My Submissions */}
        {mySubmissions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">My Submissions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySubmissions.map((submission) => (
                <Card key={submission.id} className="bg-white dark:bg-[#282828]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-900 dark:text-white">{submission.title}</p>
                      <Badge className={`text-xs ${
                        submission.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {submission.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {submission.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {submission.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {submission.status}
                      </Badge>
                    </div>
                    
                    {submission.status === 'rejected' && submission.rejection_reason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Reason: {submission.rejection_reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}