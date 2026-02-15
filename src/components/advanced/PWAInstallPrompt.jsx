import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced PWA Install Prompt
 * Beautiful install experience for iOS/Android
 */

export const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Don't show if already dismissed
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed && !standalone) {
        setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt if applicable
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt && !isIOS) return;

    if (installPrompt) {
      // Android/Desktop install
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
    }
    
    // For iOS, just show instructions
    if (isIOS) {
      setShowPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50"
      >
        <Card className="bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] border-none shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">Install MCI Connect</h3>
                {isIOS ? (
                  <p className="text-sm text-white/90 mb-3">
                    Tap <span className="font-bold">Share</span> → <span className="font-bold">Add to Home Screen</span>
                  </p>
                ) : (
                  <p className="text-sm text-white/90 mb-3">
                    Install the app for faster access and offline support
                  </p>
                )}
                
                <div className="flex gap-2">
                  {!isIOS && (
                    <Button
                      onClick={handleInstall}
                      size="sm"
                      className="bg-white text-[#507DB4] hover:bg-white/90"
                    >
                      Install
                    </Button>
                  )}
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    Not now
                  </Button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};