import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@/components/ui/select';
import { Bell, Languages, User, Settings, LogOut, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../i18n/LanguageContext';
import AppSwitcher from './AppSwitcher';
import { useQuery } from '@tanstack/react-query';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function GlobalHeader({ user, onNotificationsClick, unreadNotifications = 0 }) {
  const { language, changeLanguage, t } = useLanguage();

  const getProfileImage = () => {
    if (!user) return null;
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    if (user.profile_photo_url) {
      return user.profile_photo_url;
    }
    return null;
  };

  const profileImage = getProfileImage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: App Switcher + Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile sidebar trigger */}
          <div className="md:hidden">
            <SidebarTrigger>
              <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                <Menu className="w-5 h-5 text-slate-700" />
              </Button>
            </SidebarTrigger>
          </div>

          {/* App Switcher */}
          <AppSwitcher currentApp="mci-connect" />
        </div>

        {/* Right: Global Functions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language Selector */}
          <div className="hidden sm:block">
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="h-10 w-32 bg-white border-slate-300 text-slate-900 hover:bg-slate-50 transition-colors">
                <Languages className="w-4 h-4 mr-2 text-slate-600" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="en" className="text-slate-900 hover:bg-slate-100">
                  🇺🇸 English
                </SelectItem>
                <SelectItem value="es" className="text-slate-900 hover:bg-slate-100">
                  🇪🇸 Español
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Selector (Mobile - Icon Only) */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                  <Languages className="w-5 h-5 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => changeLanguage('en')} className="hover:bg-slate-100">
                  🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('es')} className="hover:bg-slate-100">
                  🇪🇸 Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 hover:bg-slate-100 transition-colors">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user?.full_name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 leading-none mt-0.5">
                    {user?.role === 'admin' ? t('admin') : t('user')}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl">
              <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
                {t('myProfile')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <Link to={createPageUrl('MyProfile')}>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-50">
                  <User className="w-4 h-4 mr-2 text-slate-600" />
                  {t('myProfile')}
                </DropdownMenuItem>
              </Link>

              <Link to={createPageUrl('Configuracion')}>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-50">
                  <Settings className="w-4 h-4 mr-2 text-slate-600" />
                  {t('settings')}
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => base44.auth.logout()}
                className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}