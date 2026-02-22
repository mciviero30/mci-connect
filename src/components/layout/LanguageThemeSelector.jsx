import React from 'react';
import { Languages, Moon, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageThemeSelector({
  language,
  changeLanguage,
  theme,
  setTheme
}) {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="mb-3 px-2 flex items-center gap-2">
      <Select value={language} onValueChange={changeLanguage}>
        <SelectTrigger className="h-9 flex-1 bg-white dark:bg-slate-800 border-[#1E3A8A]/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-[#EBF2FF] dark:hover:bg-slate-700/50 rounded-xl">
          <Languages className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
          <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              English
            </div>
          </SelectItem>
          <SelectItem value="es" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Español
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleTheme} 
        className="p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 h-9 w-9"
      >
        {theme === 'light' ? (
          <Moon className="h-[1.2rem] w-[1.2rem] text-slate-600 dark:text-slate-400" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem] text-slate-400" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}