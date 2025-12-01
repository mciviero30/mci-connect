import React from 'react';

export default function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] bg-white dark:bg-[#282828] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {users[0]} {users.length > 1 ? `+${users.length - 1}` : ''} {users.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      </div>
    </div>
  );
}