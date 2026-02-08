import React, { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

const TIMEOUT_DURATION = 60 * 60 * 1000; // 60 minutes
const WARNING_BEFORE = 5 * 60 * 1000; // 5 minutes before timeout

export default function SessionTimeoutManager() {
  const { language } = useLanguage();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownRef = useRef(null);

  const logout = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningTimeoutRef.current);
    clearInterval(countdownRef.current);
    base44.auth.logout();
  }, []);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    clearTimeout(timeoutRef.current);
    clearTimeout(warningTimeoutRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setSecondsLeft(300);

    // Set warning timeout (55 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(300);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_DURATION - WARNING_BEFORE);

    // Set auto-logout timeout (60 minutes)
    timeoutRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_DURATION);
  }, [logout]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Initialize timer
    resetTimer();

    // Activity events that reset timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(warningTimeoutRef.current);
      clearInterval(countdownRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, showWarning]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            {language === 'es' ? 'Sesión por Expirar' : 'Session Expiring Soon'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es'
              ? 'Tu sesión expirará pronto por inactividad. ¿Quieres continuar?'
              : 'Your session will expire soon due to inactivity. Do you want to continue?'}
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-6">
          <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {language === 'es' ? 'Tiempo restante' : 'Time remaining'}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={logout}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Cerrar Sesión' : 'Logout Now'}
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            {language === 'es' ? 'Continuar Sesión' : 'Stay Logged In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}