import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Briefcase, Users, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * I7 - Recently Viewed Quick Access
 * Tracks last 10 viewed items (jobs, customers, invoices)
 * Provides quick dropdown navigation
 */

const STORAGE_KEY = 'mci_recently_viewed';
const MAX_ITEMS = 10;

const ITEM_ICONS = {
  job: Briefcase,
  customer: Users,
  invoice: FileText,
  quote: FileText,
};

export function trackRecentlyViewed(type, id, name) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items = stored ? JSON.parse(stored) : [];

    // Remove duplicate if exists
    const filtered = items.filter(item => !(item.type === type && item.id === id));

    // Add to front
    const newItems = [
      { type, id, name, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  } catch (error) { /* intentionally silenced */ }

}

export default function RecentlyViewed() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setItems(JSON.parse(stored));
        }
      } catch (error) { /* intentionally silenced */ }

    };

    loadItems();

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', loadItems);
    return () => window.removeEventListener('storage', loadItems);
  }, []);

  if (items.length === 0) {
    return null;
  }

  const getItemUrl = (item) => {
    switch (item.type) {
      case 'job':
        return createPageUrl('JobDetails') + `?id=${item.id}`;
      case 'customer':
        return createPageUrl('CustomerDetails') + `?id=${item.id}`;
      case 'invoice':
        return createPageUrl('VerFactura') + `?id=${item.id}`;
      case 'quote':
        return createPageUrl('VerEstimado') + `?id=${item.id}`;
      default:
        return '#';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          <span className="hidden md:inline">Recent</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Recently Viewed</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item, idx) => {
          const Icon = ITEM_ICONS[item.type] || FileText;
          return (
            <DropdownMenuItem key={idx} asChild>
              <Link to={getItemUrl(item)} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{item.type}</p>
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}