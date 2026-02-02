import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MEASUREMENT_TYPES, MEASUREMENT_CATEGORIES, MEASUREMENT_HELP } from './measurementTypes';
import { HelpCircle } from 'lucide-react';

export default function MeasurementTypeSelector({ value, onChange, category = null }) {
  const [showHelp, setShowHelp] = useState(false);

  // Filter types by category if specified
  const availableTypes = category
    ? Object.entries(MEASUREMENT_TYPES).filter(([_, type]) => type.category === category)
    : Object.entries(MEASUREMENT_TYPES);

  const selectedType = MEASUREMENT_TYPES[value];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-white">Measurement Type</label>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            title="View measurement abbreviations"
          >
            <HelpCircle className="w-4 h-4 text-orange-400" />
          </button>
        </div>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="min-h-[56px] bg-slate-800 border-slate-700 text-white font-medium rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {Object.entries(MEASUREMENT_CATEGORIES).map(([catKey, catData]) => {
              const typesInCategory = Object.entries(MEASUREMENT_TYPES).filter(
                ([_, type]) => type.category === catKey
              );
              
              if (typesInCategory.length === 0) return null;

              return (
                <div key={catKey} className="py-2">
                  <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase">
                    {catData.icon} {catData.name}
                  </div>
                  {typesInCategory.map(([typeKey, typeData]) => (
                    <SelectItem
                      key={typeKey}
                      value={typeKey}
                      className="text-white hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeData.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-bold">{typeKey}</span>
                          <span className="text-xs text-slate-400">{typeData.label}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>

        {selectedType && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
            <p className="text-sm text-slate-300">
              <span className="font-bold text-white">{value}</span>
              <br />
              <span className="text-xs text-slate-500">{selectedType.label}</span>
              <br />
              <span className="text-xs text-slate-400 mt-1 block">{selectedType.description}</span>
            </p>
          </div>
        )}
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Measurement Abbreviations Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {Object.entries(MEASUREMENT_CATEGORIES).map(([catKey, catData]) => {
              const typesInCategory = Object.entries(MEASUREMENT_TYPES).filter(
                ([_, type]) => type.category === catKey
              );
              
              return (
                <div key={catKey}>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {catData.icon} {catData.name}
                  </h3>
                  <p className="text-sm text-slate-300 mb-3">{catData.description}</p>
                  <div className="space-y-2">
                    {typesInCategory.map(([typeKey, typeData]) => (
                      <div key={typeKey} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{typeData.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-white">{typeKey}</div>
                            <div className="text-sm text-white">{typeData.label}</div>
                            <div className="text-xs text-slate-400 mt-1">{typeData.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
              <h4 className="font-bold text-orange-300 mb-2">Quick Reference</h4>
              <div className="text-sm text-orange-100 space-y-1">
                <p>• <strong>FF</strong> = Finish Face (final surface)</p>
                <p>• <strong>CL</strong> = Centerline (middle/center)</p>
                <p>• <strong>BM</strong> = Bench Mark (fixed reference)</p>
                <p>• <strong>↔️</strong> = Horizontal measurement</p>
                <p>• <strong>↕️</strong> = Vertical measurement</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}