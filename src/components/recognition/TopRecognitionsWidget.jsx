import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, Crown } from 'lucide-react';
import { getDisplayName } from '@/components/utils/nameHelpers';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TopRecognitionsWidget({ limit = 5 }) {
  const { data: recognitions = [], isLoading } = useQuery({
    queryKey: ['topRecognitions', limit],
    queryFn: async () => {
      const allRecognitions = await base44.entities.Recognition.list('-created_date', 200);
      
      // Group by employee and sum points
      const employeeScores = {};
      allRecognitions.forEach(rec => {
        if (!employeeScores[rec.employee_email]) {
          employeeScores[rec.employee_email] = {
            email: rec.employee_email,
            name: rec.employee_name,
            totalPoints: 0,
            recognitionCount: 0
          };
        }
        employeeScores[rec.employee_email].totalPoints += rec.points || 0;
        employeeScores[rec.employee_email].recognitionCount += 1;
      });

      // Convert to array and sort
      const topEmployees = Object.values(employeeScores)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);

      return topEmployees;
    },
    staleTime: 60000,
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    staleTime: 300000,
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recognitions.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <Award className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">No recognitions yet. Be the first to give kudos!</p>
      </div>
    );
  }

  const rankColors = [
    'from-yellow-500 to-amber-500', // Gold
    'from-slate-400 to-slate-500', // Silver
    'from-orange-600 to-orange-700', // Bronze
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500'
  ];

  const rankIcons = ['👑', '🥈', '🥉', '⭐', '⭐'];

  return (
    <div className="space-y-3">
      {recognitions.map((employee, index) => {
        const employeeData = employees.find(e => e.email === employee.email);
        const rank = index + 1;
        const color = rankColors[Math.min(index, 4)];
        const icon = rankIcons[Math.min(index, 4)];

        return (
          <Link key={employee.email} to={createPageUrl(`EmployeeProfile?id=${employeeData?.id}`)}>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 transition-all cursor-pointer group">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    {rank <= 3 ? (
                      <span className="text-2xl">{icon}</span>
                    ) : (
                      <span className="text-lg">#{rank}</span>
                    )}
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {employee.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white text-xs">
                        {employee.totalPoints} pts
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {employee.recognitionCount} {employee.recognitionCount === 1 ? 'kudos' : 'kudos'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Photo */}
                  {employeeData?.profile_photo_url ? (
                    <img
                      src={employeeData.profile_photo_url}
                      alt={employee.name}
                      className="w-10 h-10 rounded-full border-2 border-slate-600 group-hover:border-[#3B9FF3] transition-all"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center border-2 border-slate-600 group-hover:border-[#3B9FF3] transition-all">
                      <span className="text-white font-bold text-sm">
                        {employee.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}