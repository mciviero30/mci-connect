import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Filter,
  ThumbsUp,
  Eye,
  Tag,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';

export default function FieldKnowledge() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: knowledge = [], isLoading } = useQuery({
    queryKey: ['field-knowledge-approved'],
    queryFn: () => base44.entities.FieldKnowledge.filter({ 
      approval_status: 'approved' 
    }, '-created_date'),
  });

  const { data: myPending = [] } = useQuery({
    queryKey: ['my-pending-knowledge', user?.email],
    queryFn: () => base44.entities.FieldKnowledge.filter({ 
      author_email: user?.email,
      approval_status: 'pending'
    }),
    enabled: !!user?.email,
  });

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'installation', label: 'Installation' },
    { value: 'safety', label: 'Safety' },
    { value: 'tools', label: 'Tools' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'best_practices', label: 'Best Practices' },
    { value: 'materials', label: 'Materials' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'other', label: 'Other' },
  ];

  const filteredKnowledge = knowledge.filter(k => {
    const matchesSearch = k.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          k.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          k.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || k.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Field Knowledge"
          description="Installation tips, best practices, and lessons learned"
          icon={Lightbulb}
        />

        {/* My Pending */}
        {myPending.length > 0 && (
          <Card className="p-4 mb-6 border-2 border-amber-500/30 bg-amber-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  You have {myPending.length} tip{myPending.length > 1 ? 's' : ''} pending approval
                </p>
                <p className="text-sm text-amber-700">
                  Once approved, they'll be visible to the entire team
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search tips, tags, keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <Button
            onClick={() => navigate(createPageUrl('CreateKnowledge'))}
            className="soft-blue-gradient shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Share Tip
          </Button>
        </div>

        {/* Knowledge Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading knowledge...</p>
          </div>
        ) : filteredKnowledge.length === 0 ? (
          <Card className="p-12 text-center">
            <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No knowledge tips found</p>
            <p className="text-sm text-slate-500">Be the first to share your field expertise!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredKnowledge.map((item) => (
              <Card
                key={item.id}
                className="p-5 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(createPageUrl('ViewKnowledge') + `?id=${item.id}`)}
              >
                {item.photos?.[0] && (
                  <img
                    src={item.photos[0]}
                    alt={item.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {item.content?.substring(0, 120)}...
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} className="soft-slate-gradient text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t">
                  <span>{item.author_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {item.helpful_count || 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}