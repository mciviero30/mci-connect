import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function MentionInput({ 
  value, 
  onChange, 
  onSubmit, 
  employees = [],
  placeholder,
  className 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);

    // Detect @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      setSuggestions(employees);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else if (lastAtIndex !== -1) {
      // Typing after @
      const searchTerm = textBeforeCursor.slice(lastAtIndex + 1).toLowerCase();
      const filtered = employees.filter(emp => 
        emp.full_name?.toLowerCase().includes(searchTerm) ||
        emp.email?.toLowerCase().includes(searchTerm)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (employee) => {
    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${employee.full_name} ` + 
      textAfterCursor;
    
    onChange(newText);
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
          {suggestions.map((emp, idx) => (
            <button
              key={emp.email}
              onClick={() => insertMention(emp)}
              className={`w-full p-3 text-left flex items-center gap-3 transition-colors ${
                idx === selectedIndex 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {emp.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{emp.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position || emp.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}