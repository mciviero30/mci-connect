import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Sparkles, Loader2, RefreshCw, Check, Upload } from 'lucide-react';

// Style presets - simplified v2
const STYLE_PRESETS = [
  { id: 'cartoon', name: '🎨 Cartoon', description: 'Pixar/Disney', prompt: 'High-quality vector illustration style (Pixar/Disney character art), vibrant colors, smooth polished look, clean white circular background' },
  { id: 'realistic', name: '📸 Realista', description: 'Fotográfico', prompt: 'Hyper-realistic digital portrait, photographic quality, natural lighting, professional photography style' },
  { id: 'anime', name: '⭐ Anime', description: 'Japonés', prompt: 'Japanese anime/manga art style, expressive eyes, clean linework, vibrant colors, cel-shaded appearance' },
  { id: 'professional', name: '💼 Pro', description: 'LinkedIn', prompt: 'Professional corporate headshot style, LinkedIn-quality, clean business aesthetic, neutral tones' },
  { id: 'watercolor', name: '🎨 Acuarela', description: 'Artístico', prompt: 'Soft watercolor painting style, gentle flowing colors, artistic brush strokes, pastel and muted tones' },
  { id: 'cyberpunk', name: '🌃 Cyber', description: 'Neon', prompt: 'Cyberpunk aesthetic with neon accents, futuristic tech elements, dark moody atmosphere with vibrant neon lighting' },
];

export default function PhotoAvatarManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarDescription, setAvatarDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.auth.updateMe({ 
        profile_photo_url: file_url,
        preferred_profile_image: 'photo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('❌ Formato no soportado. Por favor usa JPG, PNG o WEBP.');
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('❌ Error al subir la foto');
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const generateAvatar = async () => {
    if (!user?.profile_photo_url) {
      alert('❌ Primero debes subir una foto');
      return;
    }

    setGeneratingAvatar(true);
    try {
      const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
      const descriptionText = avatarDescription.trim() 
        ? `\n\nUSER NOTES: "${avatarDescription}"\nConsider these notes but prioritize what you see in the actual photo.`
        : '';

      const prompt = `Create a highly accurate professional avatar portrait from this photo.${descriptionText}

STYLE: ${style?.prompt || STYLE_PRESETS[0].prompt}

CRITICAL REQUIREMENTS:
- Study the ACTUAL photo carefully - don't make assumptions
- If person is BALD/SHAVED HEAD - show it accurately, NO HAIR on top
- Facial hair: match the EXACT style, length, color and coverage
- Face shape: match the EXACT proportions
- Skin tone: match the EXACT shade
- Clothing: replicate visible clothing accurately
- Expression: match the natural expression
- The avatar must look like THIS SPECIFIC PERSON
- Front-facing view, head and upper shoulders visible`;

      const result = await base44.integrations.Core.GenerateImage({
        prompt,
        file_urls: [user.profile_photo_url]
      });

      await base44.auth.updateMe({ avatar_image_url: result.url });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      alert('✅ Avatar generado exitosamente!');
    } catch (error) {
      console.error('Error generating avatar:', error);
      alert('❌ Error generando avatar. Intenta de nuevo.');
    }
    setGeneratingAvatar(false);
  };

  const switchToPhoto = async () => {
    await base44.auth.updateMe({ preferred_profile_image: 'photo' });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  const switchToAvatar = async () => {
    if (!user?.avatar_image_url) {
      alert('❌ Primero debes generar un avatar');
      return;
    }
    await base44.auth.updateMe({ preferred_profile_image: 'avatar' });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  const usingAvatar = user?.preferred_profile_image === 'avatar' && user?.avatar_image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Camera className="w-5 h-5 text-blue-600" />
            Foto y Avatar AI
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Photo */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex flex-col items-center">
                {user?.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt="Foto"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-4xl">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-3">Foto Original</p>
              </div>
              
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <Button
                onClick={() => document.getElementById('photo-upload').click()}
                disabled={uploadingPhoto || generatingAvatar}
                variant="outline"
                className="w-full mt-4"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Cambiar Foto
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column - Avatar Generator */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-center">
                  Genera Avatar con AI {user?.avatar_image_url && '(o Mejóralo)'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-1">
                  Describe tus características y el AI creará tu avatar
                </p>
              </div>

              <Textarea
                value={avatarDescription}
                onChange={(e) => setAvatarDescription(e.target.value)}
                placeholder="Ej: Hombre latino con barba, pelo corto negro, lentes..."
                className="h-16 mt-4 bg-white dark:bg-slate-800 text-sm"
              />

              <Button
                onClick={generateAvatar}
                disabled={generatingAvatar || uploadingPhoto || !user?.profile_photo_url}
                className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {generatingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando... (30-60 seg)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Avatar
                  </>
                )}
              </Button>
            </div>

            {/* Style Presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                ✨ Elige un preset para aplicar un estilo completo instantáneamente
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2 rounded-lg border-2 transition-all text-left ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 dark:text-white">{style.name}</span>
                      {selectedStyle === style.id && <Check className="w-3 h-3 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Description */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                ✨ Potenciado por AI
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                Describe tu apariencia y el AI creará un avatar personalizado que se parece a ti
              </p>
              <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-500">
                <p>💡 Ejemplos:</p>
                <p className="ml-2">• "Mujer latina, pelo largo café, ojos felices"</p>
                <p className="ml-2">• "Hombre con barba, pelo corto negro, lentes"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Choose Profile Image - Only show if both exist */}
        {user?.profile_photo_url && user?.avatar_image_url && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Elige tu imagen de perfil:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={switchToPhoto}
                variant={!usingAvatar ? "default" : "outline"}
                className={!usingAvatar ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              >
                <Camera className="w-4 h-4 mr-2" />
                Usar Foto
                {!usingAvatar && <Check className="w-4 h-4 ml-2" />}
              </Button>
              <Button
                onClick={switchToAvatar}
                variant={usingAvatar ? "default" : "outline"}
                className={usingAvatar ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Usar Avatar
                {usingAvatar && <Check className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}