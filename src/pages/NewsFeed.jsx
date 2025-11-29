import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Megaphone, Heart, Plus, Upload, Cake, PartyPopper, Wand2 } from "lucide-react";
import AIContentGenerator from "../components/ai/AIContentGenerator";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, isSameMonth } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { notifyAnnouncement } from "../components/notifications/notificationHelpers";

export default function NewsFeed() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isCreating, setCreating] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', image_url: '', priority: 'normal' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date'),
    initialData: [],
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Get birthday celebrations
  const today = new Date();
  const birthdaysToday = allEmployees.filter(emp => {
    if (!emp.dob) return false;
    const birthday = new Date(emp.dob);
    return isSameDay(new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate()), today);
  });

  const birthdaysThisMonth = allEmployees.filter(emp => {
    if (!emp.dob) return false;
    const birthday = new Date(emp.dob);
    return isSameMonth(birthday, today) && !birthdaysToday.some(b => b.id === emp.id);
  }).sort((a, b) => {
    const dateA = new Date(a.dob);
    const dateB = new Date(b.dob);
    return dateA.getDate() - dateB.getDate();
  });

  const createMutation = useMutation({
    mutationFn: async (postData) => {
      const newPostResult = await base44.entities.Post.create({
        ...postData,
        author_email: user.email,
        author_name: user.full_name,
      });
      
      // Send notifications to all employees if priority is important or urgent
      if ((postData.priority === 'important' || postData.priority === 'urgent') && allEmployees.length > 0) {
        try {
          // Send notification to each employee
          const notificationPromises = allEmployees.map(employee => 
            notifyAnnouncement({
              recipientEmail: employee.email,
              recipientName: employee.full_name,
              announcementTitle: postData.title,
              authorName: user.full_name,
              priority: postData.priority,
              announcementId: newPostResult.id
            }).catch(err => {
              console.error(`Failed to send notification to ${employee.email}:`, err);
              return null; // Continue even if one fails
            })
          );
          
          await Promise.all(notificationPromises);
        } catch (error) {
          console.error('Failed to send notifications:', error);
        }
      }
      
      return newPostResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setCreating(false);
      setNewPost({ title: '', content: '', image_url: '', priority: 'normal' });
      toast.success(t('success'));
    }
  });

  const likeMutation = useMutation({
    mutationFn: ({ postId, likes }) => base44.entities.Post.update(postId, { likes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleLike = (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.email);
    
    likeMutation.mutate({
      postId: post.id,
      likes: hasLiked ? likes.filter(email => email !== user.email) : [...likes, user.email]
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPost({ ...newPost, image_url: file_url });
    } catch (error) {
      toast.error(t('error'));
    }
    setUploadingImage(false);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={t('announcements')}
          description={t('companyNews')}
          icon={Megaphone}
          actions={
            isAdmin && !isCreating && (
              <div className="flex gap-2">
                <Button onClick={() => setShowAIGenerator(true)} variant="outline" size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg">
                  <Wand2 className="w-5 h-5 mr-2" />
                  AI Generate
                </Button>
                <Button onClick={() => setCreating(true)} size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('newAnnouncement')}
                </Button>
              </div>
            )
          }
        />

        {/* Birthday Celebrations */}
        {(birthdaysToday.length > 0 || birthdaysThisMonth.length > 0) && (
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200 shadow-xl mb-6 overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Cake className="w-6 h-6 text-pink-500" />
                🎉 {t('celebrations')}
              </h3>

              {birthdaysToday.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-pink-700 mb-2 flex items-center gap-2">
                    <PartyPopper className="w-5 h-5" />
                    {t('birthdayToday')}
                  </h4>
                  <div className="space-y-2">
                    {birthdaysToday.map(emp => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-pink-200">
                        {emp.profile_photo_url ? (
                          <img src={emp.profile_photo_url} alt={emp.full_name} className="w-12 h-12 rounded-full border-2 border-pink-400" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {emp.full_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{emp.full_name}</p>
                          <p className="text-sm text-pink-600">🎂 Happy Birthday!</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {birthdaysThisMonth.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-700 mb-2">{t('upcomingBirthdays')}</h4>
                  <div className="grid gap-2">
                    {birthdaysThisMonth.map(emp => {
                      const birthday = new Date(emp.dob);
                      return (
                        <div key={emp.id} className="flex items-center gap-3 p-2 bg-white/70 rounded-lg">
                          {emp.profile_photo_url ? (
                            <img src={emp.profile_photo_url} alt={emp.full_name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {emp.full_name?.[0]}
                            </div>
                          )}
                          <p className="text-sm text-slate-900 flex-1">{emp.full_name}</p>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                            {format(birthday, 'MMM d')}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {isCreating && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200 mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Input
                  placeholder={t('title')}
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="text-lg font-semibold bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
                <Textarea
                  placeholder={t('content')}
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="min-h-[120px] bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload').click()}
                    disabled={uploadingImage}
                    className="bg-white border-slate-300 text-slate-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingImage ? t('loading') : t('upload')}
                  </Button>

                  <select
                    value={newPost.priority}
                    onChange={(e) => setNewPost({ ...newPost, priority: e.target.value })}
                    className="px-3 py-2 border rounded-lg bg-white border-slate-300 text-slate-900"
                  >
                    <option value="normal">{t('normal')}</option>
                    <option value="important">{t('important')}</option>
                    <option value="urgent">{t('urgent')}</option>
                  </select>
                </div>

                {newPost.image_url && (
                  <img src={newPost.image_url} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                )}

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => {
                    setCreating(false);
                    setNewPost({ title: '', content: '', image_url: '', priority: 'normal' });
                  }} className="bg-white border-slate-300 text-slate-700">
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate(newPost)}
                    disabled={!newPost.title || !newPost.content || createMutation.isPending}
                    className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
                  >
                    {createMutation.isPending ? t('saving') : t('save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {posts.map(post => {
            const likes = post.likes || [];
            const hasLiked = likes.includes(user?.email);
            const priorityColors = {
              normal: 'bg-blue-100 text-blue-700 border-blue-300',
              important: 'bg-amber-100 text-amber-700 border-amber-300',
              urgent: 'bg-red-100 text-red-700 border-red-300'
            };

            return (
              <Card key={post.id} className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{post.title}</h2>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{post.author_name}</span>
                        <span>•</span>
                        <span>{format(new Date(post.created_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <Badge className={priorityColors[post.priority]}>
                      {t(post.priority)}
                    </Badge>
                  </div>

                  <p className="text-slate-700 whitespace-pre-wrap mb-4">{post.content}</p>

                  {post.image_url && (
                    <img src={post.image_url} alt={post.title} className="w-full rounded-lg mb-4 max-h-96 object-cover" />
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post)}
                      className={`${hasLiked ? 'text-[#3B9FF3]' : 'text-slate-600'} hover:text-[#3B9FF3] hover:bg-blue-50`}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                      {likes.length}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {posts.length === 0 && !isLoading && (
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
              <CardContent className="p-12 text-center">
                <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">{t('noAnnouncements')}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <AIContentGenerator
          open={showAIGenerator}
          onOpenChange={setShowAIGenerator}
          type="announcement"
          onContentGenerated={(content) => {
            setNewPost({
              title: content.title,
              content: content.content,
              image_url: content.image_url || '',
              priority: content.priority
            });
            setCreating(true);
          }}
        />
      </div>
    </div>
  );
}