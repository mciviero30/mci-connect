import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../components/shared/PageHeader";
import { Award, Clock, TrendingUp, Star, Target, CheckCircle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function MiScorecard() {
  const { t, language } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: recognitions } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list(),
    initialData: []
  });

  const { data: certifications } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list(),
    initialData: []
  });

  const myScorecard = useMemo(() => {
    if (!user) return null;

    const myTimeEntries = timeEntries.filter(t => t.employee_email === user.email);
    const myRecognitions = recognitions.filter(r => r.employee_email === user.email);
    const myCertifications = certifications.filter(c => c.employee_email === user.email);

    const totalHours = myTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const overtimeHours = myTimeEntries.filter(t => t.hour_type === 'overtime').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const approvedHours = myTimeEntries.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const totalPoints = myRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);
    const recognitionsCount = myRecognitions.length;
    const activeCerts = myCertifications.filter(c => c.status === 'active').length;
    const expiringCerts = myCertifications.filter(c => c.status === 'expiring_soon').length;
    const attendanceRate = myTimeEntries.length > 0 ? ((approvedHours / totalHours) * 100) : 100;

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
  }, [user, timeEntries, recognitions, certifications]);

  const radarData = useMemo(() => {
    if (!myScorecard) return [];
    
    return [
      {
        metric: language === 'es' ? 'Asistencia' : 'Attendance',
        value: myScorecard.attendanceRate
      },
      {
        metric: language === 'es' ? 'Reconocimientos' : 'Recognition',
        value: Math.min((myScorecard.totalPoints / 50) * 100, 100)
      },
      {
        metric: language === 'es' ? 'Certificaciones' : 'Certifications',
        value: Math.min(myScorecard.activeCerts * 25, 100)
      },
      {
        metric: language === 'es' ? 'Horas Trabajadas' : 'Hours Worked',
        value: Math.min((myScorecard.totalHours / 100) * 100, 100)
      },
      {
        metric: language === 'es' ? 'Calidad' : 'Quality',
        value: myScorecard.recognitionsCount > 0 ? Math.min(myScorecard.recognitionsCount * 20, 100) : 50
      }
    ];
  }, [myScorecard, language]);

  if (!myScorecard) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Mi Scorecard de Desempeño" : "My Performance Scorecard"}
          description={language === 'es' ? "Tu rendimiento y logros" : "Your performance and achievements"}
          icon={Award}
        />

        {/* OVERALL SCORE */}
        <Card className="mb-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <Star className="w-16 h-16 mx-auto text-yellow-300" />
            </div>
            <p className="text-blue-100 text-lg mb-2">{language === 'es' ? 'Tu Score General' : 'Your Overall Score'}</p>
            <p className="text-6xl font-bold mb-4">{myScorecard.overallScore.toFixed(0)}</p>
            <div className="flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${i < Math.floor(myScorecard.overallScore / 20) ? 'text-yellow-300 fill-yellow-300' : 'text-blue-300'}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KEY METRICS */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-600 text-sm font-medium">
                  {language === 'es' ? 'Asistencia' : 'Attendance'}
                </p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{myScorecard.attendanceRate.toFixed(0)}%</p>
              <p className="text-xs text-slate-600 mt-1">
                {myScorecard.approvedHours.toFixed(0)}h {language === 'es' ? 'aprobadas' : 'approved'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-600 text-sm font-medium">
                  {language === 'es' ? 'Reconocimientos' : 'Recognition'}
                </p>
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{myScorecard.totalPoints}</p>
              <p className="text-xs text-slate-600 mt-1">
                {myScorecard.recognitionsCount} {language === 'es' ? 'veces' : 'times'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-600 text-sm font-medium">
                  {language === 'es' ? 'Certificaciones' : 'Certifications'}
                </p>
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{myScorecard.activeCerts}</p>
              <p className="text-xs text-slate-600 mt-1">
                {language === 'es' ? 'activas' : 'active'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DETAILED METRICS */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Horas de Trabajo' : 'Work Hours'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-slate-700">{language === 'es' ? 'Total Horas' : 'Total Hours'}</span>
                  <span className="font-bold text-blue-600">{myScorecard.totalHours.toFixed(0)}h</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <span className="text-slate-700">{language === 'es' ? 'Horas Overtime' : 'Overtime Hours'}</span>
                  <span className="font-bold text-amber-600">{myScorecard.overtimeHours.toFixed(0)}h</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-slate-700">{language === 'es' ? 'Horas Aprobadas' : 'Approved Hours'}</span>
                  <span className="font-bold text-green-600">{myScorecard.approvedHours.toFixed(0)}h</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                {language === 'es' ? 'Análisis de Rendimiento' : 'Performance Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name={language === 'es' ? 'Tu Rendimiento' : 'Your Performance'}
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* RECENT RECOGNITIONS */}
        {myScorecard.recognitionsCount > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                {language === 'es' ? 'Tus Reconocimientos Recientes' : 'Your Recent Recognitions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recognitions
                  .filter(r => r.employee_email === user?.email)
                  .slice(0, 5)
                  .map((recognition) => (
                    <div key={recognition.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{recognition.recognition_title}</p>
                          <p className="text-sm text-slate-600">{language === 'es' ? 'De' : 'From'}: {recognition.given_by_name}</p>
                        </div>
                        <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
                          +{recognition.points}
                        </span>
                      </div>
                      {recognition.message && (
                        <p className="text-sm text-slate-700 italic">"{recognition.message}"</p>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}