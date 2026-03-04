import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../components/shared/PageHeader";
import { Target, Award, Clock, TrendingUp, CheckCircle, Star } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { buildUserQuery } from "@/components/utils/userResolution";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function MiScorecard() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_email: user.email }, '-date', 100),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['myRecognitions', user?.email],
    queryFn: () => base44.entities.Recognition.filter({ employee_email: user.email }, '-date'),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: user.email }, '-expiration_date'),
    enabled: !!user?.email,
    initialData: []
  });

  const myScorecard = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const overtimeHours = timeEntries.filter(t => t.hour_type === 'overtime').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const approvedHours = timeEntries.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    
    const totalPoints = recognitions.reduce((sum, r) => sum + (r.points || 0), 0);
    const recognitionsCount = recognitions.length;
    
    const activeCerts = certifications.filter(c => c.status === 'active').length;
    const expiringCerts = certifications.filter(c => c.status === 'expiring_soon').length;
    
    const attendanceRate = timeEntries.length > 0 ? ((approvedHours / totalHours) * 100) : 100;
    
    const overallScore = (attendanceRate * 0.3) + (Math.min(totalPoints / 10, 100) * 0.4) + (activeCerts * 10 * 0.3);
    
    return {
      totalHours,
      overtimeHours,
      approvedHours,
      attendanceRate,
      totalPoints,
      recognitionsCount,
      activeCerts,
      expiringCerts,
      overallScore
    };
  }, [timeEntries, recognitions, certifications]);

  const radarData = [
    { category: language === 'es' ? 'Asistencia' : 'Attendance', score: myScorecard.attendanceRate },
    { category: language === 'es' ? 'Puntos' : 'Points', score: Math.min((myScorecard.totalPoints / 10) * 10, 100) },
    { category: language === 'es' ? 'Certs' : 'Certs', score: myScorecard.activeCerts * 20 },
    { category: language === 'es' ? 'Horas' : 'Hours', score: Math.min((myScorecard.totalHours / 200) * 100, 100) },
    { category: language === 'es' ? 'Reconocimientos' : 'Recognition', score: Math.min(myScorecard.recognitionsCount * 10, 100) }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? "Mi Scorecard" : "My Scorecard"}
          description={language === 'es' ? "Tu desempeño personal" : "Your personal performance"}
          icon={Target}
        />

        {/* Overall Score */}
        <Card className="mb-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <Star className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <p className="text-7xl font-bold mb-2">{myScorecard.overallScore.toFixed(0)}</p>
            <p className="text-purple-100 text-lg">{language === 'es' ? 'Score General' : 'Overall Score'}</p>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 shadow-lg border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-700">{language === 'es' ? 'Asistencia' : 'Attendance'}</p>
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{myScorecard.attendanceRate.toFixed(0)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 shadow-lg border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700">{language === 'es' ? 'Puntos' : 'Points'}</p>
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{myScorecard.totalPoints}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 shadow-lg border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-purple-700">{language === 'es' ? 'Certs' : 'Certs'}</p>
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">{myScorecard.activeCerts}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 shadow-lg border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-amber-700">{language === 'es' ? 'Horas Totales' : 'Total Hours'}</p>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-900">{myScorecard.totalHours.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart */}
        <Card className="mb-8 bg-white/90 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              {language === 'es' ? 'Tu Perfil de Desempeño' : 'Your Performance Profile'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                <Radar name={language === 'es' ? 'Tu Score' : 'Your Score'} dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recognition History */}
        <Card className="bg-white/90 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              {language === 'es' ? 'Mis Reconocimientos Recientes' : 'My Recent Recognitions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recognitions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{language === 'es' ? 'No tienes reconocimientos aún' : 'No recognitions yet'}</p>
            ) : (
              <div className="space-y-3">
                {recognitions.slice(0, 5).map(rec => (
                  <div key={rec.id} className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                    <div className="text-3xl">🏆</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{rec.title}</p>
                      <p className="text-sm text-slate-600">{rec.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600">+{rec.points} pts</p>
                      <p className="text-xs text-slate-500">{new Date(rec.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}