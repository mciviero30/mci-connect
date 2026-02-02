import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckSquare, Square, Camera, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function TaskChecklistEditor({ checklist = [], onChange, taskId, jobId }) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    onChange([...checklist, { text: newItem.trim(), checked: false, completed: false }]);
    setNewItem('');
  };

  const handleToggleItem = (index) => {
    // PASO 4: Instant haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);
    const updated = [...checklist];
    updated[index].checked = !updated[index].checked;
    updated[index].completed = updated[index].checked; // Sync both fields
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

  const completedCount = checklist.filter(item => item.checked || item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  // PASO 4: Expanded item state (for photo/comment)
  const [expandedItem, setExpandedItem] = useState(null);
  const [itemComments, setItemComments] = useState({});

  return (
    <div className="space-y-3">
      {/* PASO 4: Checklist Items - Enhanced with photo/comment support */}
      <div className="space-y-2">
        {checklist.map((item, idx) => {
          const isExpanded = expandedItem === idx;
          const isComplete = item.checked || item.completed;
          
          return (
            <div 
              key={idx}
              className={`border-2 rounded-xl overflow-hidden transition-all ${
                isComplete 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Main item row */}
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => handleToggleItem(idx)}
                  className="flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform"
                >
                  {isComplete ? (
                    <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center shadow-lg">
                      <CheckSquare className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-slate-700 border-2 border-slate-600 rounded-lg hover:border-slate-500 transition-colors" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateText(idx, e.target.value)}
                    className={`w-full bg-transparent border-none text-sm focus:outline-none focus:ring-0 font-medium ${
                      isComplete ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-white'
                    }`}
                    placeholder="Checklist item..."
                  />
                </div>

                {/* PASO 4: Quick actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : idx)}
                    className={`p-2 rounded-lg transition-all min-w-[36px] min-h-[36px] touch-manipulation ${
                      isExpanded ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Add photo or comment"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all min-w-[36px] min-h-[36px] touch-manipulation"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PASO 4: Expanded section for photo/comment */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-3 bg-slate-900/50 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Quick note</label>
                    <Textarea
                      value={itemComments[idx] || ''}
                      onChange={(e) => setItemComments({...itemComments, [idx]: e.target.value})}
                      placeholder="Add note about this item..."
                      className="bg-slate-800 border-slate-700 text-white text-sm min-h-[60px]"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Trigger camera for this item
                        alert('Photo capture coming soon');
                      }}
                      className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Photo
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        if (itemComments[idx]?.trim()) {
                          // Save comment to item
                          const updated = [...checklist];
                          updated[idx].comment = itemComments[idx].trim();
                          onChange(updated);
                          setItemComments({...itemComments, [idx]: ''});
                        }
                        setExpandedItem(null);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PASO 4: Add new item - larger touch target */}
      <div className="flex gap-2 pt-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add new item..."
          className="bg-slate-800 border-slate-700 text-white text-sm min-h-[44px]"
          onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button
          onClick={handleAddItem}
          disabled={!newItem.trim()}
          className="bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}