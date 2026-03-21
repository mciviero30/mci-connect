
import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shuffle, Save, User, Sparkles, Loader2 } from 'lucide-react';
import CustomAvatar from './CustomAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const DEFAULT_CONFIG = {
  skin: 'medium',
  hair: 'short',
  hair_color: 'brown',
  eyes: 'normal',
  mouth: 'smile',
  glasses: false,
  facial_hair: 'none',
  accessory: 'none'
};

export default function AvatarCreator({ open, onOpenChange, currentConfig }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const [config, setConfig] = useState(currentConfig || DEFAULT_CONFIG);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (avatarConfig) => base44.auth.updateMe({ avatar_config: avatarConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      onOpenChange(false);
      alert('✅ Avatar guardado exitosamente!');
    }
  });

  const randomize = () => {
    const skins = ['light', 'tan', 'medium', 'dark', 'pale'];
    const hairs = ['short', 'medium', 'long', 'curly', 'bald', 'buzz'];
    const hairColors = ['black', 'brown', 'blonde', 'red', 'gray', 'blue', 'purple'];
    const eyes = ['normal', 'happy', 'wide', 'tired', 'wink'];
    const mouths = ['smile', 'happy', 'neutral', 'laugh', 'surprised'];
    const facialHairs = ['none', 'beard', 'mustache', 'goatee'];
    const accessories = ['none', 'hat', 'cap', 'headphones'];

    setConfig({
      skin: skins[Math.floor(Math.random() * skins.length)],
      hair: hairs[Math.floor(Math.random() * hairs.length)],
      hair_color: hairColors[Math.floor(Math.random() * hairColors.length)],
      eyes: eyes[Math.floor(Math.random() * eyes.length)],
      mouth: mouths[Math.floor(Math.random() * mouths.length)],
      glasses: Math.random() > 0.7,
      facial_hair: facialHairs[Math.floor(Math.random() * facialHairs.length)],
      accessory: accessories[Math.floor(Math.random() * accessories.length)]
    });
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Por favor describe cómo quieres tu avatar');
      return;
    }

    setGeneratingAI(true);
    try {
      const prompt = `Based on this description: "${aiPrompt}", and considering the person's name is ${user?.full_name || 'User'}, create an avatar configuration.
      
      Return a JSON object with these exact properties:
      - skin: one of ["light", "tan", "medium", "dark", "pale"]
      - hair: one of ["short", "medium", "long", "curly", "bald", "buzz"]
      - hair_color: one of ["black", "brown", "blonde", "red", "gray", "blue", "purple"]
      - eyes: one of ["normal", "happy", "wide", "tired", "wink"]
      - mouth: one of ["smile", "happy", "neutral", "laugh", "surprised"]
      - glasses: boolean
      - facial_hair: one of ["none", "beard", "mustache", "goatee"]
      - accessory: one of ["none", "hat", "cap", "headphones"]
      
      Be creative and match the description as closely as possible.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            skin: { type: "string", enum: ["light", "tan", "medium", "dark", "pale"] },
            hair: { type: "string", enum: ["short", "medium", "long", "curly", "bald", "buzz"] },
            hair_color: { type: "string", enum: ["black", "brown", "blonde", "red", "gray", "blue", "purple"] },
            eyes: { type: "string", enum: ["normal", "happy", "wide", "tired", "wink"] },
            mouth: { type: "string", enum: ["smile", "happy", "neutral", "laugh", "surprised"] },
            glasses: { type: "boolean" },
            facial_hair: { type: "string", enum: ["none", "beard", "mustache", "goatee"] },
            accessory: { type: "string", enum: ["none", "hat", "cap", "headphones"] }
          }
        }
      });

      setConfig(result);
      setAiPrompt('');
      alert('✅ Avatar creado con AI!');
    } catch (error) {
      alert('Error generando avatar con AI: ' + error.message);
    }
    setGeneratingAI(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <User className="w-5 h-5 text-[#3B9FF3]" />
            Foto y Avatar AI
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200">
            <CustomAvatar config={config} size="xl" />
            <p className="text-sm text-slate-600 mt-4 mb-2 font-medium">Foto Original</p>
            <Button 
              onClick={randomize} 
              variant="outline" 
              className="mt-2 bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Cambiar Foto
            </Button>
          </div>

          {/* AI Controls & Presets */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Genera Avatar con AI (o Mejóralo)</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Describe tus características y el AI creará tu avatar
                    </p>
                  </div>
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ej: Hombre latino con barba, pelo corto negro, lentes..."
                    className="bg-white border-slate-300 text-slate-900"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && aiPrompt.trim() && !generatingAI) {
                        generateWithAI();
                      }
                    }}
                  />
                  <Button 
                    onClick={generateWithAI} 
                    disabled={generatingAI || !aiPrompt.trim()}
                    className="w-full bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando avatar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar Avatar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Presets Section - Changed from yellow to blue/slate */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                  ✨ Elige un preset para aplicar un estilo completo instantáneamente
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'curly', hair_color: 'black', facial_hair: 'beard'})}
                  >
                    🦸 Cyberpunk Noir
                    <span className="block text-[10px] text-slate-500">Futuristic neon-lit aesthetic</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'long', hair_color: 'blonde', mouth: 'happy', eyes: 'happy'})}
                  >
                    ⚔️ Fantasy Warrior
                    <span className="block text-[10px] text-slate-500">Epic fantasy RPG style</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'curly', hair_color: 'brown', eyes: 'wide', mouth: 'smile'})}
                  >
                    🎨 Vintage Cartoon
                    <span className="block text-[10px] text-slate-500">Classic 1950s animation</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, glasses: true, hair: 'short', hair_color: 'black', facial_hair: 'none'})}
                  >
                    🔬 Sci-Fi Explorer
                    <span className="block text-[10px] text-slate-500">Space age futuristic</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'short', hair_color: 'black', facial_hair: 'goatee', eyes: 'normal'})}
                  >
                    🎬 Film Noir
                    <span className="block text-[10px] text-slate-500">Classic black & white detective</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'medium', hair_color: 'purple', eyes: 'happy', mouth: 'laugh'})}
                  >
                    🌸 Kawaii Cute
                    <span className="block text-[10px] text-slate-500">Super cute Japanese style</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'short', hair_color: 'brown', eyes: 'normal', mouth: 'smile'})}
                  >
                    ✨ Neon Pop Art
                    <span className="block text-[10px] text-slate-500">Bold colors and pop art</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-auto py-2 border-slate-300 hover:bg-slate-100 hover:border-blue-400"
                    onClick={() => setConfig({...DEFAULT_CONFIG, hair: 'long', hair_color: 'brown', eyes: 'normal', mouth: 'neutral'})}
                  >
                    🎨 Soft Watercolor
                    <span className="block text-[10px] text-slate-500">Artistic painted style</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2 text-sm">✨ Potenciado por AI</h4>
              <p className="text-xs text-slate-600 mb-3">
                Describe tu apariencia y el AI creará un avatar personalizado que se parece a ti
              </p>
              <div className="space-y-1 text-xs text-slate-500">
                <p>💡 <strong>Ejemplos:</strong></p>
                <p>• "Mujer latina, pelo largo café, ojos felices"</p>
                <p>• "Hombre con barba, pelo corto negro, lentes"</p>
                <p>• "Persona con gorra, pelo rizado, sonrisa grande"</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Puedes probar diferentes descripciones o usar el botón "Aleatorio" para explorar opciones
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-white border-slate-300 text-slate-700">
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate(config)} 
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar Avatar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
