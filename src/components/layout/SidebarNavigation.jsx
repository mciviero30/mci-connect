import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const SidebarNavigation = React.memo(function SidebarNavigation({ 
  navigation, 
  location, 
  pendingExpenses, 
  sidebarContentRef,
  setOpenMobile 
}) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [expandedParents, setExpandedParents] = React.useState(new Set());
  const itemRefs = React.useRef([]);
  
  // Flatten all navigation items for keyboard navigation
  const allItems = React.useMemo(() => {
    const flat = [];
    navigation.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          flat.push(item);
          item.children.forEach(child => flat.push(child));
        } else {
          flat.push(item);
        }
      });
    });
    return flat;
  }, [navigation]);

  // Find which section contains the active page
  const activeSectionIndex = React.useMemo(() => {
    const index = navigation.findIndex(section => 
      section.items.some(item => {
        if (item.children) {
          return item.children.some(child => location.pathname === child.url);
        }
        return location.pathname === item.url;
      })
    );
    return index >= 0 ? String(index) : undefined;
  }, [navigation, location.pathname]);

  // Auto-expand parent if any child is active
  React.useEffect(() => {
    const newExpanded = new Set();
    navigation.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          if (item.children.some(child => location.pathname === child.url)) {
            newExpanded.add(item.title);
          }
        }
      });
    });
    setExpandedParents(newExpanded);
  }, [location.pathname, navigation]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e) => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tagName) || activeElement?.isContentEditable) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const selectedItem = allItems[focusedIndex];
      if (selectedItem?.url) {
        const sidebar = sidebarContentRef.current;
        if (sidebar) {
          sessionStorage.setItem('sidebarScrollPosition', sidebar.scrollTop.toString());
        }
        window.location.href = selectedItem.url;
        setOpenMobile(false);
      }
    }
  }, [allItems, focusedIndex, setOpenMobile, sidebarContentRef]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  React.useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < allItems.length) {
      const element = itemRefs.current[focusedIndex];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        element.focus({ preventScroll: true });
      }
    }
  }, [focusedIndex, allItems.length]);
  
  let itemIndex = 0;
  
  return (
    <Accordion type="single" collapsible defaultValue={activeSectionIndex} className="w-full">
      {navigation.map((section, idx) => {
        const sectionId = String(idx);
        
        return (
          <AccordionItem key={idx} value={sectionId} className="border-none mb-2">
            <AccordionTrigger className="text-[10px] font-bold tracking-wider bg-[#EBF2FF] dark:bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2 text-[#507DB4] dark:text-slate-300 border border-[#507DB4]/10 dark:border-slate-700 hover:no-underline hover:bg-[#507DB4]/10 transition-colors">
              <div className="flex items-center gap-2">
                {section.icon && <section.icon className="w-3.5 h-3.5" />}
                {section.section}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-2">
              <SidebarMenu>
                {section.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedParents.has(item.title);
                  const currentItemIndex = itemIndex++;

                  if (hasChildren) {
                    return (
                      <div key={item.title}>
                        <button
                          onClick={() => {
                            setExpandedParents(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(item.title)) {
                                newSet.delete(item.title);
                              } else {
                                newSet.add(item.title);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-slate-600 dark:text-slate-400 hover:bg-[#507DB4]/10 dark:hover:bg-[#507DB4]/20 transition-all"
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0 text-[#FF8C00]" style={{ 
                            filter: 'drop-shadow(0 0 8px rgba(255, 140, 0, 0.3))'
                          }} />
                          <span className="font-medium text-sm flex-1 text-left bg-gradient-to-r from-[#FF8C00] to-[#FFB347] bg-clip-text text-transparent font-bold">
                            {item.title}
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="space-y-1 pl-6">
                            {item.children.map((child) => {
                              const isActive = location.pathname === child.url;
                              const childItemIndex = itemIndex++;

                              return (
                                <SidebarMenuItem key={child.title}>
                                  <SidebarMenuButton
                                    asChild
                                    className={`transition-all duration-200 rounded-lg mb-1 border-none ${
                                      isActive
                                        ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                                        : 'hover:bg-[#507DB4]/15 dark:hover:bg-[#507DB4]/25 text-slate-600 dark:text-slate-400 hover:text-[#507DB4] dark:hover:text-[#6B9DD8] hover:translate-x-1 hover:shadow-sm'
                                    }`}
                                  >
                                    <Link 
                                      ref={el => itemRefs.current[childItemIndex] = el}
                                      to={child.url} 
                                      onClick={() => setOpenMobile(false)} 
                                      className={`flex items-center gap-3 px-3 py-2.5 relative group outline-none ${
                                        focusedIndex === childItemIndex ? 'ring-2 ring-[#507DB4] ring-offset-2' : ''
                                      }`}
                                      data-sidebar-item
                                      tabIndex={0}>
                                      <child.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                                        isActive ? 'text-white' : 'text-[#FF8C00]'
                                      }`} style={{ 
                                        filter: isActive ? 'none' : 'drop-shadow(0 0 8px rgba(255, 140, 0, 0.3))'
                                      }} />
                                      <span className={`font-medium text-sm ${
                                        isActive ? '' : 'bg-gradient-to-r from-[#FF8C00] to-[#FFB347] bg-clip-text text-transparent'
                                      }`}>
                                        {child.title}
                                      </span>
                                      {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-sm" />
                                      )}
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const isActive = location.pathname === item.url;
                    const showBadge = (item.title === 'Expenses' || item.title === 'My Expenses') && pendingExpenses > 0;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-200 rounded-lg mb-1 border-none ${
                            isActive
                              ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md'
                              : 'hover:bg-[#507DB4]/15 dark:hover:bg-[#507DB4]/25 text-slate-600 dark:text-slate-400 hover:text-[#507DB4] dark:hover:text-[#6B9DD8] hover:translate-x-1 hover:shadow-sm'
                          }`}
                        >
                          <Link 
                            ref={el => itemRefs.current[currentItemIndex] = el}
                            to={item.url} 
                            onClick={() => setOpenMobile(false)} 
                            className={`flex items-center gap-3 px-3 py-2.5 relative group outline-none ${
                              focusedIndex === currentItemIndex ? 'ring-2 ring-[#507DB4] ring-offset-2' : ''
                            }`}
                            data-sidebar-item
                            tabIndex={0}>
                            <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 text-slate-500 dark:text-slate-400`} />
                            <span className="font-medium text-sm">
                              {item.title}
                            </span>
                            {showBadge && (
                              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 shadow-lg shadow-red-500/30 animate-pulse">
                                {pendingExpenses}
                              </Badge>
                            )}
                            {item.badge && (
                              <span className="text-xs">{item.badge}</span>
                            )}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-sm" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                })}
              </SidebarMenu>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
});

export default SidebarNavigation;