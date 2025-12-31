import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Smartphone, CheckCircle } from "lucide-react";

export default function WelcomeMessage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png"
                alt="MCI Connect"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              ¡Bienvenido a MCI Connect! 🎉
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Tu Nueva Plataforma de Gestión
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              ¿Qué es MCI Connect?
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              MCI Connect es tu centro de gestión todo-en-uno donde podrás registrar tus horas de trabajo, 
              gastos, ver tu calendario, comunicarte con el equipo y mucho más.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Próximos Pasos
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Revisa tu email</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Pronto recibirás una invitación en tu correo electrónico
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Haz clic en "Aceptar Invitación"</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Busca el email de Base44 (nuestro proveedor) y acepta la invitación
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Crea tu contraseña</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Completa tu perfil y ¡comienza a usar la plataforma!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex gap-3 items-start">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-300">
                  ¿No ves el email?
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Revisa tu carpeta de spam o contacta a tu supervisor
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ¿Tienes preguntas? Contacta a tu manager o al equipo de soporte
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}