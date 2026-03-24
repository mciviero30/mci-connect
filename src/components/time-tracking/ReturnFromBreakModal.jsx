import React from 'react';
import { ArrowLeft, ArrowLeftRight, StopCircle } from 'lucide-react';

export default function ReturnFromBreakModal({ onReturn, onSwitchJob, onEndShift, jobName, language = 'en' }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onReturn} />
      <div className="relative w-full bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {language === 'es' ? 'Volver del descanso' : 'Return from break'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {language === 'es' ? '¿Qué quieres hacer?' : 'Please select what you\'d like to do next'}
        </p>

        <div className="space-y-3">
          {/* Return to same job */}
          <button
            onClick={onReturn}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {language === 'es' ? 'Regresar al Trabajo' : 'Return to Job'}
              </p>
              <p className="text-sm text-slate-500 truncate max-w-[240px]">{jobName}</p>
            </div>
          </button>

          {/* Switch Job */}
          <button
            onClick={onSwitchJob}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {language === 'es' ? 'Cambiar Trabajo' : 'Switch Job'}
              </p>
              <p className="text-sm text-slate-500">
                {language === 'es' ? 'Cierra este turno e inicia uno nuevo' : 'Close this shift and start a new one'}
              </p>
            </div>
          </button>
        </div>

        {/* End shift — below as subtle link */}
        <button
          onClick={onEndShift}
          className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
        >
          <StopCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {language === 'es' ? 'Terminar Turno' : 'End Shift'}
          </span>
        </button>
      </div>
    </div>
  );
}