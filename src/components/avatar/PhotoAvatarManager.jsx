
import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Sparkles, Loader2, RefreshCw, Image as ImageIcon, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PhotoAvatarManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarDescription, setAvatarDescription] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [showImprovement, setShowImprovement] = useState(false);
  
  // New state for enhanced features
  const [avatarStyle, setAvatarStyle] = useState('cartoon');
  const [showCustomization, setShowCustomization] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [uploadingReference, setUploadingReference] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('none'); // New state for presets
  
  // Facial feature customization
  const [faceShape, setFaceShape] = useState('natural');
  const [eyeSize, setEyeSize] = useState(50);
  const [noseSize, setNoseSize] = useState(50);
  const [smileIntensity, setSmileIntensity] = useState(50);
  const [detailLevel, setDetailLevel] = useState(50);

  // Preset configurations
  const stylePresets = {
    none: {
      name: 'No Preset',
      description: 'Custom configuration',
      style: 'cartoon', // default base style
      settings: {}
    },
    cyberpunk: {
      name: '🌃 Cyberpunk Noir',
      description: 'Futuristic neon-lit aesthetic',
      style: 'realistic',
      settings: {
        detailLevel: 80,
        eyeSize: 55,
        stylePrompt: 'Cyberpunk aesthetic with neon accents, futuristic tech elements, dark moody atmosphere with vibrant neon lighting (pink, cyan, purple), high-tech urban style, sleek metallic details, holographic effects'
      }
    },
    fantasy: {
      name: '⚔️ Fantasy Warrior',
      description: 'Epic fantasy RPG style',
      style: 'anime',
      settings: {
        detailLevel: 75,
        eyeSize: 60,
        stylePrompt: 'Fantasy RPG character art, medieval warrior aesthetic, dramatic lighting, epic fantasy style with armor elements, mystical aura, heroic pose, rich fantasy colors (gold, deep blue, emerald), detailed fantasy attire'
      }
    },
    vintage: {
      name: '📺 Vintage Cartoon',
      description: 'Classic 1950s animation',
      style: 'cartoon',
      settings: {
        detailLevel: 40,
        smileIntensity: 65,
        stylePrompt: 'Classic 1950s vintage cartoon style, retro animation aesthetic, bold outlines, limited color palette (cream, red, teal, yellow), nostalgic feel, simplified shapes, classic cartoon charm, vintage advertising poster style'
      }
    },
    scifi: {
      name: '🚀 Sci-Fi Explorer',
      description: 'Space age futuristic',
      style: 'realistic',
      settings: {
        detailLevel: 70,
        stylePrompt: 'Futuristic sci-fi explorer aesthetic, space age design, sleek technology elements, chrome and metallic accents, cosmic background hints, modern sci-fi color scheme (silver, electric blue, white), clean futuristic look'
      }
    },
    comic: {
      name: '💥 Comic Book Hero',
      description: 'Bold comic book style',
      style: 'cartoon',
      settings: {
        detailLevel: 65,
        eyeSize: 58,
        stylePrompt: 'Dynamic comic book hero style, bold lines and vibrant colors, dramatic shading with halftone dots, action-ready pose, superhero aesthetic, bright primary colors, comic panel quality, Ben-Day dots texture'
      }
    },
    noir: {
      name: '🎩 Film Noir',
      description: 'Classic black & white detective',
      style: 'realistic',
      settings: {
        detailLevel: 85,
        smileIntensity: 35,
        stylePrompt: 'Film noir detective style, dramatic black and white with subtle tints, high contrast lighting, 1940s aesthetic, mysterious atmosphere, classic noir cinematography, dramatic shadows, vintage monochrome elegance'
      }
    },
    kawaii: {
      name: '🌸 Kawaii Cute',
      description: 'Super cute Japanese style',
      style: 'anime',
      settings: {
        detailLevel: 55,
        eyeSize: 75,
        smileIntensity: 80,
        stylePrompt: 'Kawaii Japanese cute style, adorable chibi-inspired, pastel color palette (pink, lavender, mint, peach), sparkles and cute elements, soft rounded shapes, extremely cute aesthetic, cheerful expression'
      }
    },
    steampunk: {
      name: '⚙️ Steampunk Victorian',
      description: 'Victorian era meets machinery',
      style: 'realistic',
      settings: {
        detailLevel: 80,
        stylePrompt: 'Steampunk Victorian aesthetic, brass gears and cogs elements, vintage industrial style, sepia and bronze tones, Victorian era fashion hints, mechanical details, antique leather textures, steam-powered elegance'
      }
    },
    neon: {
      name: '✨ Neon Pop Art',
      description: 'Bold colors and pop art',
      style: 'cartoon',
      settings: {
        detailLevel: 60,
        eyeSize: 55,
        stylePrompt: 'Vibrant neon pop art style, Andy Warhol inspired, bold electric colors (hot pink, lime green, electric blue, orange), high contrast, modern pop culture aesthetic, screen print effect, energetic and bold'
      }
    },
    watercolor: {
      name: '🎨 Soft Watercolor',
      description: 'Artistic painted style',
      style: 'watercolor',
      settings: {
        detailLevel: 45,
        smileIntensity: 55,
        stylePrompt: 'Soft watercolor painting style, gentle flowing colors, artistic brush strokes, pastel and muted tones, dreamy atmosphere, paper texture, artistic elegance, subtle color bleeding effects'
      }
    }
  };

  // Apply preset when selected
  const applyPreset = (presetKey) => {
    setSelectedPreset(presetKey);
    
    if (presetKey === 'none') return;
    
    const preset = stylePresets[presetKey];
    if (preset) {
      setAvatarStyle(preset.style);
      setShowCustomization(true); // Always show customization when a preset is applied

      // Apply settings
      if (preset.settings.detailLevel !== undefined) {
        setDetailLevel(preset.settings.detailLevel);
      } else {
        setDetailLevel(50); // Reset to default if not specified in preset
      }
      if (preset.settings.eyeSize !== undefined) {
        setEyeSize(preset.settings.eyeSize);
      } else {
        setEyeSize(50); // Reset to default if not specified in preset
      }
      if (preset.settings.smileIntensity !== undefined) {
        setSmileIntensity(preset.settings.smileIntensity);
      } else {
        setSmileIntensity(50); // Reset to default if not specified in preset
      }
      if (preset.settings.noseSize !== undefined) {
        setNoseSize(preset.settings.noseSize);
      } else {
        setNoseSize(50); // Reset to default if not specified in preset
      }
      // Face shape is not usually affected by style presets, leave as is or reset if needed
      // For now, let's keep it 'natural'
      setFaceShape('natural');
      
      setAvatarDescription(''); // Clear custom description when applying preset
      setReferenceImage(null); // Clear reference image
      setReferenceImageUrl(''); // Clear reference image URL
    }
  };

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
      alert('✅ Foto subida exitosamente');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      alert('❌ Error al subir foto: ' + error.message);
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.size, file.type);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('❌ Formato no soportado. Por favor usa JPG, PNG o WEBP.');
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      console.log('Uploading directly without compression...');
      await uploadPhotoMutation.mutateAsync(file);
      console.log('Upload successful!');
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleReferenceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('❌ Formato no soportado. Por favor usa JPG, PNG o WEBP.');
      e.target.value = '';
      return;
    }

    setUploadingReference(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReferenceImageUrl(file_url);
      setReferenceImage(file.name);
      alert('✅ Imagen de referencia subida');
      setSelectedPreset('none'); // Clear preset if reference image is uploaded
    } catch (error) {
      console.error('Error uploading reference:', error);
      alert('❌ Error al subir imagen de referencia');
    }
    setUploadingReference(false);
    e.target.value = '';
  };

  const getStylePrompt = () => {
    // If preset is selected and has a custom prompt, use it
    if (selectedPreset !== 'none' && stylePresets[selectedPreset]?.settings?.stylePrompt) {
      return stylePresets[selectedPreset].settings.stylePrompt;
    }
    
    // Otherwise use base style
    const styles = {
      cartoon: 'High-quality vector illustration style (Pixar/Disney character art), vibrant colors, smooth polished look, clean white circular background',
      realistic: 'Hyper-realistic digital portrait, photographic quality, natural lighting, professional photography style, subtle details, realistic skin texture, neutral background',
      anime: 'Japanese anime/manga art style, expressive eyes, clean linework, vibrant colors, cel-shaded appearance, dynamic and youthful aesthetic',
      pixelart: '32-bit pixel art style, retro gaming aesthetic, limited color palette, clean pixel work, nostalgic look, square background',
      professional: 'Professional corporate headshot style, LinkedIn-quality, clean business aesthetic, neutral tones, professional lighting, solid color background',
      minimalist: 'Minimalist line art style, simple clean lines, limited colors, modern aesthetic, abstract but recognizable, geometric shapes',
      watercolor: 'Watercolor painting style, soft edges, artistic brush strokes, gentle colors, artistic and creative look, paper texture background'
    };
    return styles[avatarStyle] || styles.cartoon;
  };

  const getCustomizationPrompt = () => {
    if (!showCustomization) return '';
    
    let prompt = '\n\nCUSTOMIZATION ADJUSTMENTS:\n';
    
    // Face shape
    const faceShapes = {
      natural: 'Keep natural face proportions from the photo',
      round: 'Make the face slightly more round and soft',
      oval: 'Make the face more oval-shaped and elongated',
      square: 'Make the jawline more square and defined',
      heart: 'Make the face heart-shaped with wider forehead'
    };
    prompt += `- Face shape: ${faceShapes[faceShape]}\n`;
    
    // Eye size
    if (eyeSize !== 50) {
      if (eyeSize > 60) prompt += '- Eyes: Make eyes noticeably larger and more expressive\n';
      else if (eyeSize < 40) prompt += '- Eyes: Make eyes smaller and more subtle\n';
    }
    
    // Nose size
    if (noseSize !== 50) {
      if (noseSize > 60) prompt += '- Nose: Make nose more prominent and defined\n';
      else if (noseSize < 40) prompt += '- Nose: Make nose smaller and more delicate\n';
    }
    
    // Smile intensity
    if (smileIntensity !== 50) {
      if (smileIntensity > 60) prompt += '- Expression: Add a bright, wide smile\n';
      else if (smileIntensity < 40) prompt += '- Expression: Keep expression neutral or subtle\n';
    }
    
    // Detail level
    if (detailLevel > 60) {
      prompt += '- Add rich details and textures, intricate shading\n';
    } else if (detailLevel < 40) {
      prompt += '- Keep it simple and clean with minimal details\n';
    }
    
    return prompt;
  };

  const generateAvatarFromPhoto = async (isImprovement = false) => {
    if (!user?.profile_photo_url) {
      alert('❌ Primero debes subir una foto');
      return;
    }

    if (isImprovement && !improvementFeedback.trim()) {
      alert('❌ Por favor describe qué quieres mejorar');
      return;
    }

    setGeneratingAvatar(true);
    try {
      let prompt = '';
      const fileUrls = [user.profile_photo_url];
      
      // Add reference image if provided
      if (referenceImageUrl && !isImprovement) {
        fileUrls.push(referenceImageUrl);
      }

      // Add preset context
      const presetContext = selectedPreset !== 'none' 
        ? `\n\nPRESET STYLE: ${stylePresets[selectedPreset].name}. Apply this specific aesthetic while maintaining accurate facial features from the photo.`
        : '';
      
      if (isImprovement && user.avatar_image_url) {
        prompt = `You are creating an improved avatar based on user feedback. Study the photo carefully.

USER FEEDBACK: "${improvementFeedback}"

STYLE: ${getStylePrompt()}${presetContext}

CRITICAL REQUIREMENTS:
- Study the ACTUAL photo - don't make assumptions
- If person is BALD/SHAVED HEAD - show it accurately, NO HAIR on top
- Facial hair: match the EXACT style, length, color and coverage from the photo
- Face shape: match the EXACT proportions - round/oval/square/long
- Skin tone: match the EXACT shade from the photo
- Clothing: replicate the EXACT clothing visible (color, style, details)
- Expression: match the natural expression from the photo
- Age appearance: match the apparent age

Apply the user's feedback while maintaining accuracy to the photo.`;
      } else {
        const descriptionText = avatarDescription.trim() 
          ? `\n\nUSER NOTES: "${avatarDescription}"\nConsider these notes but prioritize what you see in the actual photo.`
          : '';

        const referenceText = referenceImageUrl 
          ? `\n\nSTYLE REFERENCE: A reference image is provided. Use its artistic style, color palette, and aesthetic approach as inspiration, but apply it to the person in the main photo.`
          : '';

        prompt = `Create a highly accurate professional avatar portrait from this photo.${descriptionText}${referenceText}${presetContext}

STYLE REQUIREMENTS:
${getStylePrompt()}

${getCustomizationPrompt()}

CRITICAL ANALYSIS STEPS:
1. HAIR: Carefully examine the head
   - If BALD or SHAVED: Show smooth head with NO hair on top (maybe slight shadow/stubble if visible)
   - If hair exists: Match exact style, color, length, texture
   
2. FACIAL HAIR: Study precisely
   - Beard style: full/goatee/stubble/none
   - Coverage: cheeks, chin, neck, mustache
   - Color: exact shade (black/brown/gray/mixed)
   - Length: short/medium/long
   - Density: thick/thin/patchy

3. FACE STRUCTURE: Match proportions
   - Face shape: round/oval/square/rectangular/heart
   - Face width: narrow/average/wide
   - Jawline: sharp/soft/strong/subtle
   - Cheekbones: high/average/low
   - Forehead: large/average/small

4. EYES: Capture the look
   - Eye shape and size
   - Expression (tired/alert/happy/serious)
   - Eye color if visible

5. SKIN TONE: Match exactly
   - Light/tan/medium/olive/dark/deep
   - Natural undertones

6. CLOTHING: Replicate accurately
   - Type: hoodie/shirt/jacket
   - Color: exact shade
   - Details: zippers, strings, collar style

7. EXPRESSION & PERSONALITY:
   - Mouth position (smile/neutral/serious)
   - Overall demeanor
   - Natural expression

ABSOLUTELY CRITICAL:
- If the person is BALD - DO NOT ADD HAIR. Show the bald head accurately.
- Match facial hair EXACTLY as it appears - don't add or remove.
- Match face width and proportions EXACTLY - don't make thinner or wider.
- Match clothing color and style EXACTLY as visible.
- The avatar must look like THIS SPECIFIC PERSON in the chosen art style.
- Front-facing view, head and upper shoulders visible.

Generate a professional avatar that friends and family would instantly recognize.`;
      }

      const result = await base44.integrations.Core.GenerateImage({
        prompt,
        file_urls: fileUrls
      });

      await base44.auth.updateMe({ avatar_image_url: result.url });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      alert('✅ Avatar generado exitosamente!');
      setShowImprovement(true);
      setAvatarDescription('');
      setImprovementFeedback('');
    } catch (error) {
      console.error('Error generating avatar:', error);
      
      const errorMsg = error.message || '';
      if (errorMsg.includes('unsupported') || errorMsg.includes('format')) {
        alert('❌ No se pudo procesar la imagen.\n\n💡 Solución: Toma una captura de pantalla de tu foto y súbela de nuevo.');
      } else if (errorMsg.includes('timeout')) {
        alert('❌ Tiempo de espera agotado.\n\n💡 Intenta de nuevo en un momento.');
      } else if (errorMsg.includes('size') || errorMsg.includes('large')) {
        alert('❌ La imagen es muy grande.\n\n💡 Usa una imagen más pequeña o toma una captura de pantalla.');
      } else {
        alert('❌ Error generando avatar.\n\n💡 Recomendaciones:\n• Usa una foto clara y bien iluminada\n• Asegúrate que tu rostro sea visible\n• Toma una captura de pantalla si sigue fallando');
      }
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

  const currentImage = user?.preferred_profile_image === 'avatar' && user?.avatar_image_url
    ? user.avatar_image_url
    : user?.profile_photo_url;

  const usingAvatar = user?.preferred_profile_image === 'avatar' && user?.avatar_image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Camera className="w-5 h-5 text-[#3B9FF3]" />
            Foto y Avatar AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Image Preview */}
          <div className="flex flex-col items-center space-y-4">
            {currentImage ? (
              <div className="relative">
                <img
                  src={currentImage}
                  alt="Profile"
                  className="w-40 h-40 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  {usingAvatar ? (
                    <Badge className="bg-purple-500 text-white shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Avatar AI
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500 text-white shadow-lg">
                      <Camera className="w-3 h-3 mr-1" />
                      Foto Original
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#3B9FF3] to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-5xl">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          {/* Upload Photo */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">1. Sube tu Foto</h3>
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
              className="w-full bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white"
              size="lg"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {user?.profile_photo_url ? 'Cambiar Foto' : 'Subir Foto'}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              JPG, PNG, WEBP (máx 10MB)
            </p>
          </div>

          {/* Generate Avatar with AI */}
          {user?.profile_photo_url && (
            <>
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <h3 className="font-semibold text-slate-900">
                  2. Genera Avatar con AI {user?.avatar_image_url && '(o Mejóralo)'}
                </h3>
                
                {!user?.avatar_image_url || !showImprovement ? (
                  <Tabs defaultValue="presets" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                      <TabsTrigger value="presets">
                        ⭐ Presets
                      </TabsTrigger>
                      <TabsTrigger value="basic">Básico</TabsTrigger>
                      <TabsTrigger value="style">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Estilos
                      </TabsTrigger>
                      <TabsTrigger value="advanced">
                        <Sliders className="w-4 h-4 mr-2" />
                        Avanzado
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="presets" className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-900 font-medium mb-3">
                          ✨ Elige un preset para aplicar un estilo completo instantáneamente
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(stylePresets).map(([key, preset]) => {
                            if (key === 'none') return null;
                            return (
                              <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className={`p-3 rounded-lg border-2 transition-all text-left ${
                                  selectedPreset === key
                                    ? 'border-purple-500 bg-purple-100 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-purple-300'
                                }`}
                              >
                                <div className="font-semibold text-sm text-slate-900 mb-1">
                                  {preset.name}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {preset.description}
                                </div>
                                {selectedPreset === key && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                                    <Sparkles className="w-3 h-3" />
                                    Seleccionado
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        
                        {selectedPreset !== 'none' && (
                          <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                            <p className="text-xs text-slate-700">
                              <strong>Preset activo:</strong> {stylePresets[selectedPreset].name}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Estilo base: {stylePresets[selectedPreset].style} • Detalles optimizados
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => applyPreset('none')}
                              className="mt-2 text-xs h-7"
                            >
                              Limpiar preset
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="basic" className="space-y-3">
                      <Textarea
                        value={avatarDescription}
                        onChange={(e) => setAvatarDescription(e.target.value)}
                        placeholder="Opcional: Describe características que quieres resaltar&#10;Ej: Soy completamente calvo, barba completa café oscuro..."
                        className="h-20 bg-white border-slate-300"
                      />
                    </TabsContent>

                    <TabsContent value="style" className="space-y-4">
                      <div>
                        <Label className="text-slate-900 mb-2 block">Estilo de Avatar</Label>
                        <Select value={avatarStyle} onValueChange={(value) => {
                          setAvatarStyle(value);
                          setSelectedPreset('none'); // Clear preset if style is manually changed
                        }}>
                          <SelectTrigger className="w-full bg-white border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="cartoon">🎨 Cartoon (Pixar/Disney)</SelectItem>
                            <SelectItem value="realistic">📸 Realista Fotográfico</SelectItem>
                            <SelectItem value="anime">⭐ Anime/Manga</SelectItem>
                            <SelectItem value="pixelart">🎮 Pixel Art Retro</SelectItem>
                            <SelectItem value="professional">💼 Profesional (LinkedIn)</SelectItem>
                            <SelectItem value="minimalist">✨ Minimalista</SelectItem>
                            <SelectItem value="watercolor">🎨 Acuarela Artística</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-900 mb-2 font-medium">
                          🖼️ Imagen de Referencia de Estilo (Opcional)
                        </p>
                        <p className="text-xs text-slate-600 mb-3">
                          Sube una imagen para que el AI use su estilo artístico como inspiración
                        </p>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleReferenceUpload}
                          className="hidden"
                          id="reference-upload"
                        />
                        <Button
                          onClick={() => document.getElementById('reference-upload').click()}
                          disabled={uploadingReference}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {uploadingReference ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {referenceImage || 'Subir Referencia de Estilo'}
                            </>
                          )}
                        </Button>
                        {referenceImage && (
                          <div className="mt-2 flex items-center justify-between text-xs text-green-700 bg-green-50 p-2 rounded">
                            <span>✓ {referenceImage}</span>
                            <button
                              onClick={() => {
                                setReferenceImage(null);
                                setReferenceImageUrl('');
                                setSelectedPreset('none'); // Clear preset if reference image is cleared
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-900">Personalización Avanzada</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCustomization(!showCustomization)}
                            className="text-xs"
                          >
                            {showCustomization ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>

                        {showCustomization && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm text-slate-700">Forma del Rostro</Label>
                              <Select value={faceShape} onValueChange={(value) => {
                                setFaceShape(value);
                                setSelectedPreset('none'); // Clear preset if face shape is manually changed
                              }}>
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="natural">Natural (de la foto)</SelectItem>
                                  <SelectItem value="round">Redondo</SelectItem>
                                  <SelectItem value="oval">Ovalado</SelectItem>
                                  <SelectItem value="square">Cuadrado</SelectItem>
                                  <SelectItem value="heart">Corazón</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-sm text-slate-700">Tamaño de Ojos</Label>
                                <span className="text-xs text-slate-500">{eyeSize}%</span>
                              </div>
                              <Slider
                                value={[eyeSize]}
                                onValueChange={(v) => {
                                  setEyeSize(v[0]);
                                  setSelectedPreset('none'); // Clear preset if eye size is manually changed
                                }}
                                min={0}
                                max={100}
                                step={10}
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-sm text-slate-700">Tamaño de Nariz</Label>
                                <span className="text-xs text-slate-500">{noseSize}%</span>
                              </div>
                              <Slider
                                value={[noseSize]}
                                onValueChange={(v) => {
                                  setNoseSize(v[0]);
                                  setSelectedPreset('none'); // Clear preset if nose size is manually changed
                                }}
                                min={0}
                                max={100}
                                step={10}
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-sm text-slate-700">Intensidad de Sonrisa</Label>
                                <span className="text-xs text-slate-500">{smileIntensity}%</span>
                              </div>
                              <Slider
                                value={[smileIntensity]}
                                onValueChange={(v) => {
                                  setSmileIntensity(v[0]);
                                  setSelectedPreset('none'); // Clear preset if smile intensity is manually changed
                                }}
                                min={0}
                                max={100}
                                step={10}
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-sm text-slate-700">Nivel de Detalle</Label>
                                <span className="text-xs text-slate-500">{detailLevel}%</span>
                              </div>
                              <Slider
                                value={[detailLevel]}
                                onValueChange={(v) => {
                                  setDetailLevel(v[0]);
                                  setSelectedPreset('none'); // Clear preset if detail level is manually changed
                                }}
                                min={0}
                                max={100}
                                step={10}
                                className="mt-2"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                    <p className="text-sm text-purple-900 font-medium">
                      ¿No te parece? Describe qué quieres mejorar:
                    </p>
                    <Textarea
                      value={improvementFeedback}
                      onChange={(e) => setImprovementFeedback(e.target.value)}
                      placeholder="Ej: Mi cara es más delgada, no tengo pelo, mi barba es más corta..."
                      className="h-24 bg-white"
                    />
                    <Button
                      onClick={() => generateAvatarFromPhoto(true)}
                      disabled={generatingAvatar || !improvementFeedback.trim()}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      {generatingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mejorando... (30-60 seg)
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Mejorar Avatar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowImprovement(false);
                        setImprovementFeedback('');
                      }}
                      className="w-full text-sm text-slate-600"
                    >
                      Cancelar mejora
                    </Button>
                  </div>
                )}

                {(!user?.avatar_image_url || !showImprovement) && (
                  <Button
                    onClick={() => generateAvatarFromPhoto(false)}
                    disabled={generatingAvatar || uploadingPhoto}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    size="lg"
                  >
                    {generatingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando... (30-60 seg)
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {user?.avatar_image_url ? 'Regenerar Avatar' : 'Generar Avatar con AI'}
                      </>
                    )}
                  </Button>
                )}

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Los presets combinan estilos, colores y ajustes para resultados únicos. Úsalos como punto de partida y personaliza después.
                  </p>
                </div>
              </div>

              {user?.profile_photo_url && user?.avatar_image_url && (
                <div className="border-t border-slate-200 pt-6 space-y-3">
                  <h3 className="font-semibold text-slate-900">3. Elige Imagen de Perfil</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={switchToPhoto}
                      variant={!usingAvatar ? "default" : "outline"}
                      className={!usingAvatar ? "bg-blue-500 text-white" : ""}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Foto Original
                    </Button>
                    <Button
                      onClick={switchToAvatar}
                      variant={usingAvatar ? "default" : "outline"}
                      className={usingAvatar ? "bg-purple-500 text-white" : ""}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Avatar AI
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
