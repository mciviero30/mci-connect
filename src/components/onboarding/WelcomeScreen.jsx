import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PartyPopper, CheckCircle2, MapPin, Briefcase, 
  Users, Clock, ArrowRight, Sparkles 
} from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function WelcomeScreen({ user, onComplete }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      // Mark welcome screen as shown
      await base44.auth.updateMe({ welcome_screen_shown: true });
      onComplete();
    } catch (error) {
      console.error('Failed to mark welcome as shown:', error);
      onComplete(); // Continue anyway
    }
  };

  const profileImage = user.preferred_profile_image === 'avatar' && user.avatar_image_url
    ? user.avatar_image_url
    : user.profile_photo_url || user.avatar_image_url;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="bg-white dark:bg-slate-800 shadow-2xl border-0 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="relative"
              >
                <PartyPopper className="w-20 h-20 text-white mx-auto mb-4" />
              </motion.div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {language === 'es' ? '¡Bienvenido!' : 'Welcome!'}
              </h1>
              <p className="text-blue-100 text-lg">
                {user.full_name || user.email}
              </p>
            </div>

            {/* Content */}
            <div className="p-8 flex-1 flex flex-col">
              {/* Profile Quick View */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 mb-6">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-white dark:ring-slate-700 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-4 ring-white dark:ring-slate-700 shadow-lg">
                    <span className="text-white font-bold text-2xl">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                    {language === 'es' ? 'Tu Perfil MCI Connect' : 'Your MCI Connect Profile'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.position && (
                      <Badge className="bg-blue-100 text-blue-700 border-0">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {user.position}
                      </Badge>
                    )}
                    {user.team_name && (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        <MapPin className="w-3 h-3 mr-1" />
                        {user.team_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* What's Ready */}
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  {language === 'es' ? '✅ Todo está listo para ti:' : '✅ Everything is ready for you:'}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {language === 'es' ? 'Tu perfil está configurado' : 'Your profile is set up'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {language === 'es' ? 'Estás en el directorio del equipo' : 'You\'re in the team directory'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {language === 'es' ? 'Puedes usar tiempo, chat, y todas las funciones' : 'You can use time tracking, chat, and all features'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 mb-6 flex-shrink-0">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {language === 'es' ? 'Primeros pasos:' : 'Quick Start:'}
                </h4>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">1.</span>
                    {language === 'es' ? 'Revisa tu información en "Mi Perfil"' : 'Review your info in "My Profile"'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">2.</span>
                    {language === 'es' ? 'Explora el Dashboard para ver tus tareas' : 'Check the Dashboard for your tasks'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">3.</span>
                    {language === 'es' ? 'Usa "Mis Horas" para registrar tiempo' : 'Use "My Hours" to log time'}
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg h-12"
                >
                  {completing ? (
                    language === 'es' ? 'Cargando...' : 'Loading...'
                  ) : (
                    <>
                      {language === 'es' ? 'Empezar' : 'Get Started'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={async () => {
                    await handleComplete();
                    navigate(createPageUrl('MyProfile'));
                  }}
                  variant="outline"
                  disabled={completing}
                  className="flex-1 h-12 border-slate-300 dark:border-slate-600"
                >
                  {language === 'es' ? 'Ver Mi Perfil' : 'View My Profile'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}