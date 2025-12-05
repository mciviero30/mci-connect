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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-lg">
            <Camera className="w-5 h-5 text-blue-600" />
            Foto y Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Photo Section */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt="Foto"
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow">
                <span className="text-white font-bold text-xl">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Tu Foto</p>
              <p className="text-xs text-slate-500">JPG, PNG o WEBP</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload-v2"
            />
            <Button
              onClick={() => document.getElementById('photo-upload-v2').click()}
              disabled={uploadingPhoto || generatingAvatar}
              variant="outline"
              size="sm"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Style Selection */}
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Estilo de Avatar
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-2 rounded-lg border transition-all text-center ${
                    selectedStyle === style.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <span className="text-sm">{style.name.split(' ')[0]}</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Descripción (opcional)
            </p>
            <Textarea
              value={avatarDescription}
              onChange={(e) => setAvatarDescription(e.target.value)}
              placeholder="Ej: Hombre con barba, calvo, lentes..."
              className="h-14 bg-white dark:bg-slate-800 text-sm resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateAvatar}
            disabled={generatingAvatar || uploadingPhoto || !user?.profile_photo_url}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {generatingAvatar ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando... (30-60s)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar Avatar
              </>
            )}
          </Button>

          {/* Switch between photo and avatar */}
          {user?.profile_photo_url && user?.avatar_image_url && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-2 text-center">Usar como perfil:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={switchToPhoto}
                  variant={!usingAvatar ? "default" : "outline"}
                  size="sm"
                  className={!usingAvatar ? "bg-blue-600 text-white" : ""}
                >
                  <Camera className="w-3 h-3 mr-1" />
                  Foto
                  {!usingAvatar && <Check className="w-3 h-3 ml-1" />}
                </Button>
                <Button
                  onClick={switchToAvatar}
                  variant={usingAvatar ? "default" : "outline"}
                  size="sm"
                  className={usingAvatar ? "bg-purple-600 text-white" : ""}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Avatar
                  {usingAvatar && <Check className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}