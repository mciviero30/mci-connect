import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Award, TrendingUp, Sparkles, Users } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import RecognitionFeed from '../components/recognition/RecognitionFeed';
import TopRecognitionsWidget from '../components/recognition/TopRecognitionsWidget';
import GiveKudosDialog from '../components/recognition/GiveKudosDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Recognitions() {
  const [showKudosDialog, setShowKudosDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Recognition & Kudos"
          description="Celebrate great work and recognize your colleagues"
          icon={Award}
          actions={
            <Button
              onClick={() => setShowKudosDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Give Kudos
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Total Recognitions</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalRecognitions}</p>
                </div>
                <Award className="w-12 h-12 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Total Points</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalPoints}</p>
                </div>
                <Sparkles className="w-12 h-12 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">People Giving</p>
                  <p className="text-3xl font-bold text-white mt-2">{uniqueGivers}</p>
                </div>
                <Users className="w-12 h-12 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm">People Recognized</p>
                  <p className="text-3xl font-bold text-white mt-2">{uniqueReceivers}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recognition Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#3B9FF3]" />
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
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-700 sticky top-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#3B9FF3]" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopRecognitionsWidget limit={10} />
              </CardContent>
            </Card>
          </div>
        </div>

        <GiveKudosDialog open={showKudosDialog} onOpenChange={setShowKudosDialog} />
      </div>
    </div>
  );
}