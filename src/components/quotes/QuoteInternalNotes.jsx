import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { MessageSquare, Send, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteInternalNotes({ quoteId, notes = [] }) {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const quote = await base44.entities.Quote.get(quoteId);
      const updatedNotes = [
        ...(quote.internal_notes || []),
        {
          author: user.email,
          author_name: user.full_name,
          content: newNote,
          created_at: new Date().toISOString()
        }
      ];
      return base44.entities.Quote.update(quoteId, { internal_notes: updatedNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      setNewNote("");
      toast.success(language === 'es' ? 'Nota agregada' : 'Note added');
    }
  });

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        {language === 'es' ? 'Notas Internas' : 'Internal Notes'}
      </h4>

      {/* Notes List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            {language === 'es' ? 'No hay notas internas' : 'No internal notes'}
          </p>
        ) : (
          notes.map((note, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                  {note.author_name}
                </span>
                <span className="text-xs text-slate-400">
                  {format(new Date(note.created_at), 'MMM d, HH:mm', { 
                    locale: language === 'es' ? es : undefined 
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Note */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={language === 'es' ? 'Agregar nota interna...' : 'Add internal note...'}
          className="flex-1 h-20 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
        />
        <Button
          onClick={() => addNoteMutation.mutate()}
          disabled={!newNote.trim() || addNoteMutation.isPending}
          className="self-end bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}