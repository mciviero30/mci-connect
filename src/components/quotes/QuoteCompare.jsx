import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { GitCompare, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function QuoteCompare({ currentQuote }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [compareQuoteId, setCompareQuoteId] = useState("");

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotesForCompare'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
    enabled: open
  });

  const compareQuote = quotes.find(q => q.id === compareQuoteId);

  const getDifference = (val1, val2) => {
    if (!val1 && !val2) return { diff: 0, percent: 0 };
    if (!val1) return { diff: val2, percent: 100 };
    if (!val2) return { diff: -val1, percent: -100 };
    const diff = val2 - val1;
    const percent = ((diff / val1) * 100);
    return { diff, percent };
  };

  const totalDiff = compareQuote ? getDifference(currentQuote.total, compareQuote.total) : null;
  const itemsDiff = compareQuote ? getDifference(currentQuote.items?.length, compareQuote.items?.length) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
          <GitCompare className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Comparar' : 'Compare'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {language === 'es' ? 'Comparar Estimados' : 'Compare Quotes'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quote Selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <p className="text-sm text-cyan-600 font-medium">{language === 'es' ? 'Actual' : 'Current'}</p>
              <p className="font-bold text-slate-900 dark:text-white">{currentQuote.quote_number}</p>
              <p className="text-sm text-slate-500">{currentQuote.customer_name}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <Select value={compareQuoteId} onValueChange={setCompareQuoteId}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar estimado...' : 'Select quote...'} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 max-h-60">
                  {quotes.filter(q => q.id !== currentQuote.id).map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quote_number} - {q.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison */}
          {compareQuote && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-500 mb-1">{language === 'es' ? 'Diferencia Total' : 'Total Difference'}</p>
                  <div className="flex items-center justify-center gap-2">
                    {totalDiff.diff > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : totalDiff.diff < 0 ? (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    ) : (
                      <Minus className="w-5 h-5 text-slate-400" />
                    )}
                    <span className={`text-xl font-bold ${
                      totalDiff.diff > 0 ? 'text-green-600' : totalDiff.diff < 0 ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {totalDiff.diff >= 0 ? '+' : ''}${totalDiff.diff.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    ({totalDiff.percent >= 0 ? '+' : ''}{totalDiff.percent.toFixed(1)}%)
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-500 mb-1">{language === 'es' ? 'Items' : 'Items'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentQuote.items?.length || 0} → {compareQuote.items?.length || 0}
                  </p>
                  <p className="text-xs text-slate-400">
                    {itemsDiff.diff > 0 ? '+' : ''}{itemsDiff.diff} {language === 'es' ? 'items' : 'items'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-500 mb-1">{language === 'es' ? 'Impuesto' : 'Tax Rate'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentQuote.tax_rate || 0}% → {compareQuote.tax_rate || 0}%
                  </p>
                </div>
              </div>

              {/* Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-cyan-200 rounded-lg p-4">
                  <h4 className="font-semibold text-cyan-700 mb-3">{currentQuote.quote_number}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'es' ? 'Subtotal' : 'Subtotal'}</span>
                      <span className="font-medium">${currentQuote.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'es' ? 'Impuesto' : 'Tax'}</span>
                      <span className="font-medium">${currentQuote.tax_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">{language === 'es' ? 'Total' : 'Total'}</span>
                      <span className="font-bold text-cyan-600">${currentQuote.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-700 mb-3">{compareQuote.quote_number}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'es' ? 'Subtotal' : 'Subtotal'}</span>
                      <span className="font-medium">${compareQuote.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'es' ? 'Impuesto' : 'Tax'}</span>
                      <span className="font-medium">${compareQuote.tax_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">{language === 'es' ? 'Total' : 'Total'}</span>
                      <span className="font-bold">${compareQuote.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!compareQuote && (
            <div className="text-center py-8 text-slate-500">
              <GitCompare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'es' ? 'Selecciona un estimado para comparar' : 'Select a quote to compare'}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}