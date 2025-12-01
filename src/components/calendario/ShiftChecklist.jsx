import React, { useState } from 'react';
import { CheckSquare, Plus, Square, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ShiftChecklist({ 
  items = [], 
  onChange,
  language = 'en'
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([
      ...items,
      { id: `item_${Date.now()}`, text: newItem.trim(), completed: false }
    ]);
    setNewItem('');
  };

  const toggleItem = (id) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeItem = (id) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    onChange(reordered);
  };

  const completedCount = items.filter(i => i.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#3B9FF3]" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {language === 'es' ? 'Lista de Tareas' : 'Checklist'}
          </span>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="checklist">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        snapshot.isDragging 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 shadow-lg' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="cursor-grab">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="flex-shrink-0"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-5 h-5 text-green-500" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${
                        item.completed 
                          ? 'line-through text-slate-400 dark:text-slate-500' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={language === 'es' ? 'Nueva tarea...' : 'New task...'}
          className="bg-white dark:bg-slate-800 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <Button
          size="sm"
          onClick={addItem}
          disabled={!newItem.trim()}
          className="bg-[#3B9FF3] h-9"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}