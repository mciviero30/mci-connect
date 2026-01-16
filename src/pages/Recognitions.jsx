import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Award, TrendingUp, Sparkles, Users, Wand2 } from 'lucide-react';
import AIContentGenerator from '../components/ai/AIContentGenerator';
import PageHeader from '../components/shared/PageHeader';
import RecognitionFeed from '../components/recognition/RecognitionFeed';
import TopRecognitionsWidget from '../components/recognition/TopRecognitionsWidget';
import GiveKudosDialog from '../components/recognition/GiveKudosDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Recognitions() {
  const [showKudosDialog, setShowKudosDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGeneratedContent, setAIGeneratedContent] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: allRecognitions = [] } = useQuery({
    queryKey: ['allRecognitions'],
    queryFn: () => base44.entities.Recognition.list('-created_date', 500),
    staleTime: 60000,
    initialData: [],
  });

  // Calculate stats
  const totalRecognitions = allRecognitions.length;
  const totalPoints = allRecognitions.reduce((sum, rec) => sum + (rec.points || 0), 0);
  const uniqueGivers = new Set(allRecognitions.map(r => r.given_by_email)).size;
  const uniqueReceivers = new Set(allRecognitions.map(r => r.employee_email)).size;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Recognition & Kudos"
          description="Celebrate great work and recognize your colleagues"
          icon={Award}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAIGenerator(true)}
                variant="outline"
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button
                onClick={() => setShowKudosDialog(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Give Kudos
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Total Recognitions</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{totalRecognitions}</p>
                </div>
                <Award className="w-12 h-12 text-[#507DB4] dark:text-[#6B9DD8] opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Total Points</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{totalPoints}</p>
                </div>
                <Sparkles className="w-12 h-12 text-[#507DB4] dark:text-[#6B9DD8] opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">People Giving</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{uniqueGivers}</p>
                </div>
                <Users className="w-12 h-12 text-[#507DB4] dark:text-[#6B9DD8] opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">People Recognized</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{uniqueReceivers}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-[#507DB4] dark:text-[#6B9DD8] opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recognition Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                  Recent Recognitions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecognitionFeed limit={20} showTitle={false} />
              </CardContent>
            </Card>
          </div>

          {/* Top Recognitions */}
          <div>
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm sticky top-8">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopRecognitionsWidget limit={10} />
              </CardContent>
            </Card>
          </div>
        </div>

        <GiveKudosDialog 
          open={showKudosDialog} 
          onOpenChange={(open) => {
            setShowKudosDialog(open);
            if (!open) setAIGeneratedContent(null);
          }}
          prefillData={aiGeneratedContent}
        />

        <AIContentGenerator
          open={showAIGenerator}
          onOpenChange={setShowAIGenerator}
          type="recognition"
          employees={allEmployees.filter(e => e.employment_status !== 'deleted')}
          onContentGenerated={(content) => {
            setAIGeneratedContent({
              employee_email: content.employee_email,
              message: content.message,
              recognition_type: content.recognition_type,
              points: content.points
            });
            setShowKudosDialog(true);
          }}
        />
      </div>
    </div>
  );
}