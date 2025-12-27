import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Sparkles, Loader2, Check, Upload, X, UserCircle } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

// MCI Brand Styles
const MCI_BRAND_STYLES = [
  { id: 'mci_pro', name: 'MCI Professional', icon: '💼', prompt: 'Professional corporate MCI executive portrait, deep navy blue professional studio background, high-end cinematic lighting with subtle rim light, modern business attire, confident expression, clean professional photography style' },
  { id: 'mci_tech', name: 'MCI Tech', icon: '🖥️', prompt: 'Modern tech specialist avatar, clean futuristic corporate office with subtle blue neon accents, professional tech environment, sharp focus, contemporary corporate style' },
  { id: 'pixar', name: 'MCI Avatar', icon: '🎬', prompt: '3D animated character style (Pixar-inspired), friendly professional look, vibrant colors, smooth polished corporate appearance, white or soft blue background' },
  { id: 'artistic', name: 'Artístico', icon: '🎨', prompt: 'Abstract geometric portrait using MCI corporate blue palette (navy, slate, white), professional artistic style, modern corporate art' },
];

export default function PhotoAvatarManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { language } = useLanguage();

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('mci_pro');
  const [extraDetails, setExtraDetails] = useState('');

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 800, height: 800, facingMode: 'user' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("❌ Error: Cámara no disponible");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 800;
    canvas.height = 800;

    // Pre-processing filters for optimal AI input
    ctx.filter = 'brightness(1.08) contrast(1.12) saturate(1.1)';
    
    // Mirror the image for natural selfie look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 800, 800);
    
    canvas.toBlob(processAndUpload, 'image/jpeg', 0.95);
  };

  const processAndUpload = (blob) => {
    const file = new File([blob], "mci_profile.jpg", { type: "image/jpeg" });
    handleUpload(file);
    stopCamera();
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ 
        profile_photo_url: file_url,
        preferred_profile_image: 'photo',
        profile_last_updated: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.refetchQueries({ queryKey: ['currentUser'] });
      
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('❌ Error al subir la foto');
    }
    setLoading(false);
  };

  const generateAI = async () => {
    if (!user?.profile_photo_url) {
      alert('❌ Primero captura o sube una foto');
      return;
    }
    
    setLoading(true);
    try {
      const style = MCI_BRAND_STYLES.find(s => s.id === selectedStyle);
      
      const prompt = `MCI GLOBAL IDENTITY SYSTEM - Professional Corporate AI Portrait Generator

STYLE: ${style?.prompt}

${extraDetails ? `ADDITIONAL DETAILS: ${extraDetails}` : ''}

CRITICAL IDENTITY PRESERVATION REQUIREMENTS:
- DO NOT change the person's ethnicity, age, or core facial features
- Study the ACTUAL photo carefully - match what you see, not assumptions
- If person is BALD or has SHAVED HEAD - show it accurately, NO HAIR on top
- Facial hair: match the EXACT style, length, color and coverage from the photo
- Face shape: match the EXACT proportions and structure
- Skin tone: match the EXACT shade and undertone
- Eye color and shape: replicate accurately
- Expression: match the natural expression from the photo
- The avatar MUST look like THIS SPECIFIC PERSON
- Front-facing professional portrait view
- Head and upper shoulders visible
- 1:1 square ratio output
- High resolution suitable for professional use`;

      const result = await base44.integrations.Core.GenerateImage({
        prompt: prompt,
        existing_image_urls: [user.profile_photo_url.split('?')[0]]
      });

      await base44.auth.updateMe({ 
        avatar_image_url: result.url,
        preferred_profile_image: 'avatar',
        profile_last_updated: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.refetchQueries({ queryKey: ['currentUser'] });
      
      // Notify other tabs/windows and apps
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));
      
      alert('✅ Avatar generado exitosamente para MCI Connect!');
    } catch (error) {
      console.error('Error generating avatar:', error);
      alert('❌ Error generando avatar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  const switchToPhoto = async () => {
    await base44.auth.updateMe({ 
      preferred_profile_image: 'photo',
      profile_last_updated: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.refetchQueries({ queryKey: ['currentUser'] });
    
    // Notify other tabs/windows and apps
    localStorage.setItem('profile_updated', Date.now().toString());
    localStorage.setItem('profile_timestamp', new Date().toISOString());
    window.dispatchEvent(new Event('profileUpdated'));
  };

  const switchToAvatar = async () => {
    if (!user?.avatar_image_url) {
      alert('❌ Primero debes generar un avatar');
      return;
    }
    await base44.auth.updateMe({ 
      preferred_profile_image: 'avatar',
      profile_last_updated: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.refetchQueries({ queryKey: ['currentUser'] });
    
    // Notify other tabs/windows and apps
    localStorage.setItem('profile_updated', Date.now().toString());
    localStorage.setItem('profile_timestamp', new Date().toISOString());
    window.dispatchEvent(new Event('profileUpdated'));
  };

  const usingAvatar = user?.preferred_profile_image === 'avatar' && user?.avatar_image_url;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="p-0 overflow-hidden bg-white dark:bg-slate-950 border-none max-w-[400px] rounded-3xl [&>button]:hidden">
        
        {/* Header Corporativo MCI */}
        <div className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] p-8 flex flex-col items-center relative overflow-hidden">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
              queryClient.refetchQueries({ queryKey: ['currentUser'] });
              window.location.reload();
            }}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            title={language === 'es' ? 'Actualizar' : 'Refresh'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
          <div className="relative group z-10">
            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-2xl bg-slate-100">
              {user?.preferred_profile_image === 'avatar' && user?.avatar_image_url ? (
                <img 
                  src={user.avatar_image_url} 
                  className="w-full h-full object-cover"
                  alt="Avatar"
                />
              ) : user?.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url} 
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-5xl">
                    {user?.full_name?.[0]?.toUpperCase() || 'M'}
                  </span>
                </div>
              )}
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            )}
          </div>
          <h2 className="text-white font-bold mt-4 text-xl tracking-tight">
            {user?.full_name || 'Usuario MCI'}
          </h2>
          <p className="text-blue-200 text-xs uppercase tracking-widest font-semibold">
            Global ID System
          </p>
        </div>

        <div className="p-6">
          <Tabs defaultValue="capture" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="capture" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {language === 'es' ? 'Foto Real' : 'Real Photo'}
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {language === 'es' ? 'Avatar IA' : 'AI Avatar'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="capture" className="space-y-4">
              {showCamera ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square shadow-2xl">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <Button 
                      onClick={capturePhoto} 
                      className="bg-white text-[#1E3A8A] hover:bg-slate-100 rounded-full px-8 shadow-xl font-bold"
                    >
                      {language === 'es' ? 'CAPTURAR' : 'CAPTURE'}
                    </Button>
                    <Button 
                      onClick={stopCamera} 
                      variant="destructive" 
                      size="icon" 
                      className="rounded-full shadow-xl"
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-28 flex-col gap-2 border-2 border-slate-200 hover:border-[#1E3A8A] hover:bg-blue-50 transition-all rounded-2xl" 
                    onClick={startCamera}
                    disabled={loading}
                  >
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Camera className="text-[#1E3A8A]" size={24} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{language === 'es' ? 'Cámara' : 'Camera'}</span>
                  </Button>
                  
                  <label className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-[#1E3A8A] transition-all">
                    <div className="bg-slate-100 p-3 rounded-full">
                      <Upload className="text-slate-600" size={24} />
                    </div>
                    <span className="text-sm font-semibold mt-2 text-slate-700">{language === 'es' ? 'Archivo' : 'File'}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleUpload(e.target.files[0])}
                      disabled={loading}
                    />
                  </label>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                  {language === 'es' ? 'Estilo de Avatar' : 'Avatar Style'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MCI_BRAND_STYLES.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSelectedStyle(s.id)}
                      disabled={loading}
                      className={`p-3 rounded-xl text-left border-2 transition-all flex items-center gap-3 ${
                        selectedStyle === s.id 
                          ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-900/30' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                </p>
                <Textarea 
                  placeholder={language === 'es' ? 'Ej: Hombre con barba, calvo, lentes...' : 'Ex: Man with beard, bald, glasses...'} 
                  className="text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-[#1E3A8A] rounded-xl h-20 resize-none"
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={generateAI} 
                disabled={loading || !user?.profile_photo_url} 
                className="w-full h-12 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-5 h-5" />
                    {language === 'es' ? 'Generando Avatar...' : 'Generating Avatar...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 w-5 h-5" />
                    {language === 'es' ? 'GENERAR AVATAR' : 'GENERATE AVATAR'}
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Switch between photo and avatar */}
          {(user?.profile_photo_url || user?.avatar_image_url) && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center font-medium">
                {language === 'es' ? 'Usar como perfil:' : 'Use as profile:'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={switchToPhoto}
                  variant="outline"
                  size="sm"
                  className={`h-10 rounded-xl transition-all ${
                    !usingAvatar 
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] hover:bg-[#1E3A8A]/90' 
                      : 'border-slate-300 hover:border-blue-400'
                  }`}
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  {language === 'es' ? 'Foto' : 'Photo'}
                  {!usingAvatar && <Check className="w-4 h-4 ml-1.5" />}
                </Button>
                <Button
                  onClick={switchToAvatar}
                  variant="outline"
                  size="sm"
                  className={`h-10 rounded-xl transition-all ${
                    usingAvatar 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none hover:from-purple-700 hover:to-pink-700' 
                      : 'border-slate-300 hover:border-purple-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Avatar
                  {usingAvatar && <Check className="w-4 h-4 ml-1.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}