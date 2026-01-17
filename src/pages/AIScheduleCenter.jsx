import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Calendar, Users } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import AIScheduleOptimizer from '@/components/ai/AIScheduleOptimizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIScheduleCenter() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-ai'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-ai'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-for-ai'],
    queryFn: () => base44.entities.JobAssignment.list('-date', 200),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="AI Schedule Center"
          description="AI-powered schedule optimization and resource allocation"
          icon={Sparkles}
        />

        <Tabs defaultValue="optimizer" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl">
            <TabsTrigger value="optimizer" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Optimizer
            </TabsTrigger>
            <TabsTrigger value="resources" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Resource Allocation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optimizer">
            <AIScheduleOptimizer 
              jobs={jobs}
              employees={employees}
              assignments={assignments}
            />
          </TabsContent>

          <TabsContent value="resources">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Resource Allocation Coming Soon</h3>
              <p className="text-slate-500 dark:text-slate-400">
                AI-powered team matching and skill-based assignment recommendations
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}