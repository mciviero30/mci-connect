import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TaskChecklistEditor({ checklist = [], onChange }) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    onChange([...checklist, { text: newItem.trim(), completed: false }]);
    setNewItem('');
  };

  const handleToggleItem = (index) => {
    const updated = [...checklist];
    updated[index].completed = !updated[index].completed;
    onChange(updated);
  };

  const handleRemoveItem = (index) => {
    onChange(checklist.filter((_, i) => i !== index));
  };

  const handleUpdateText = (index, text) => {
    const updated = [...checklist];
    updated[index].text = text;
    onChange(updated);
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress Header */}
      {checklist.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">
            {completedCount} of {checklist.length} completed
          </span>
          <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.map((item, idx) => (
          <div 
            key={idx}
            className="flex items-center gap-2 group bg-slate-900/50 rounded-lg p-2"
          >
            <GripVertical className="w-4 h-4 text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              onClick={() => handleToggleItem(idx)}
              className="flex-shrink-0"
            >
              {item.completed ? (
                <CheckSquare className="w-5 h-5 text-green-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
              )}
            </button>
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleUpdateText(idx, e.target.value)}
              className={`flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 ${
                item.completed ? 'text-slate-500 line-through' : 'text-slate-200'
              }`}
            />
            <button
              onClick={() => handleRemoveItem(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item..."
          className="bg-slate-900 border-slate-700 text-white text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button
          size="icon"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
          className="bg-[#FFB800] hover:bg-[#E5A600] flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}