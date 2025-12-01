import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { PenTool, Check, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteSignature({ quote, onUpdate }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const saveSignatureMutation = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL('image/png');
      
      return base44.entities.Quote.update(quote.id, {
        customer_signature: signatureData,
        signed_date: new Date().toISOString(),
        status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(language === 'es' ? 'Firma guardada' : 'Signature saved');
      setOpen(false);
    }
  });

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const initCanvas = () => {
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }, 100);
  };

  // If already signed, show signature
  if (quote.customer_signature) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {language === 'es' ? 'Firmado por el cliente' : 'Signed by customer'}
          </span>
          <span className="text-xs text-green-600 dark:text-green-500">
            {quote.signed_date && format(new Date(quote.signed_date), 'MMM d, yyyy HH:mm', { 
              locale: language === 'es' ? es : undefined 
            })}
          </span>
        </div>
        <img 
          src={quote.customer_signature} 
          alt="Signature" 
          className="max-h-20 bg-white rounded border"
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) initCanvas(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50">
          <PenTool className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Firma Digital' : 'Digital Signature'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {language === 'es' ? 'Firma del Cliente' : 'Customer Signature'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">
            {language === 'es' 
              ? 'El cliente puede firmar aquí para aprobar el estimado.' 
              : 'Customer can sign here to approve the quote.'}
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-2">
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              className="w-full bg-white rounded cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearCanvas}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Limpiar' : 'Clear'}
            </Button>
            <Button
              onClick={() => saveSignatureMutation.mutate()}
              disabled={saveSignatureMutation.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              {saveSignatureMutation.isPending 
                ? (language === 'es' ? 'Guardando...' : 'Saving...') 
                : (language === 'es' ? 'Guardar Firma' : 'Save Signature')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}