import React from 'react';
import { useIsMobile } from './MobileUtils';

/**
 * MOBILE WRAPPER COMPONENTS
 * Componentes que adaptan su layout automáticamente según el tamaño de pantalla
 */

// Contenedor de página optimizado para móvil
export const MobilePageContainer = ({ children, className = '' }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      ${isMobile ? 'p-3 pb-20' : 'p-4 md:p-8'}
      min-h-screen
      bg-[#F1F5F9] dark:bg-[#181818]
      ${className}
    `}>
      <div className={`
        ${isMobile ? 'max-w-full' : 'max-w-7xl mx-auto'}
      `}>
        {children}
      </div>
    </div>
  );
};

// Header adaptativo
export const MobilePageHeader = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions,
  theme = 'connect' // 'connect' or 'field'
}) => {
  const isMobile = useIsMobile();
  
  const gradients = {
    connect: 'from-blue-600 to-blue-500',
    field: 'from-orange-600 to-yellow-500',
  };
  
  return (
    <div className={`${isMobile ? 'mb-4' : 'mb-6 md:mb-8'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'}`}>
        <div className="flex items-center gap-3">
          {Icon && !isMobile && (
            <div className={`p-2.5 sm:p-3 bg-gradient-to-br ${gradients[theme]} rounded-xl sm:rounded-2xl shadow-md`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
          )}
          <div>
            <h1 className={`
              font-bold text-slate-900 dark:text-white
              ${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'}
            `}>
              {title}
            </h1>
            {subtitle && (
              <p className={`
                text-slate-600 dark:text-slate-400 mt-1
                ${isMobile ? 'text-xs' : 'text-sm'}
              `}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// Grid adaptativo con mejor control
export const MobileGrid = ({ 
  children, 
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };
  
  return (
    <div className={`
      grid
      grid-cols-${cols.xs}
      sm:grid-cols-${cols.sm}
      md:grid-cols-${cols.md}
      ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Card optimizado para móvil
export const MobileCard = ({ children, className = '', padding = 'default', onClick }) => {
  const isMobile = useIsMobile();
  
  const paddingClasses = {
    none: 'p-0',
    sm: isMobile ? 'p-3' : 'p-4',
    default: isMobile ? 'p-4' : 'p-5 md:p-6',
    lg: isMobile ? 'p-5' : 'p-6 md:p-8',
  };
  
  return (
    <div 
      className={`
        bg-white dark:bg-[#282828]
        ${isMobile ? 'rounded-lg' : 'rounded-xl'}
        ${isMobile ? 'shadow-sm' : 'shadow-md'}
        border border-slate-200 dark:border-slate-700
        ${paddingClasses[padding]}
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Button adaptativo
export const MobileButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  theme = 'connect',
  className = '',
  ...props 
}) => {
  const isMobile = useIsMobile();
  
  const variants = {
    connect: {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white',
      secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white',
      outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400',
    },
    field: {
      primary: 'bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
      outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10',
    },
  };
  
  const sizes = {
    sm: isMobile ? 'px-3 py-1.5 text-xs min-h-[36px]' : 'px-4 py-2 text-sm min-h-[40px]',
    md: isMobile ? 'px-4 py-2 text-sm min-h-[44px]' : 'px-5 py-2.5 text-base min-h-[44px]',
    lg: isMobile ? 'px-5 py-2.5 text-base min-h-[48px]' : 'px-6 py-3 text-lg min-h-[52px]',
  };
  
  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-manipulation
        active:scale-95
        ${variants[theme][variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Input optimizado para móvil
export const MobileInput = ({ className = '', ...props }) => {
  const isMobile = useIsMobile();
  
  return (
    <input
      className={`
        w-full
        ${isMobile ? 'px-3 py-2.5 text-base' : 'px-4 py-3 text-base'}
        ${isMobile ? 'rounded-lg' : 'rounded-xl'}
        border border-slate-300 dark:border-slate-700
        bg-white dark:bg-slate-800
        text-slate-900 dark:text-white
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        transition-all
        min-h-[44px]
        touch-manipulation
        ${className}
      `}
      {...props}
    />
  );
};

// Badge adaptativo
export const MobileBadge = ({ children, variant = 'default', className = '' }) => {
  const isMobile = useIsMobile();
  
  const variants = {
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  
  return (
    <span className={`
      ${variants[variant]}
      ${isMobile ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}
      rounded-full
      font-medium
      inline-flex items-center
      ${className}
    `}>
      {children}
    </span>
  );
};

// Dialog móvil optimizado (full-screen en móvil)
export const MobileDialog = ({ isOpen, onClose, title, children, footer }) => {
  const isMobile = useIsMobile();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`
        relative z-10
        bg-white dark:bg-slate-900
        ${isMobile 
          ? 'w-full h-[90vh] rounded-t-2xl' 
          : 'max-w-lg w-full mx-4 rounded-xl max-h-[85vh]'
        }
        shadow-2xl
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Lista optimizada para móvil (con virtual scrolling mental)
export const MobileList = ({ items, renderItem, emptyMessage = 'No items' }) => {
  const isMobile = useIsMobile();
  
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className={`space-y-${isMobile ? '2' : '3'}`}>
      {items.map((item, index) => (
        <div key={item.id || index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

// Stats Grid para móvil
export const MobileStatsGrid = ({ stats, theme = 'connect' }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      grid
      ${stats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}
      ${isMobile ? 'gap-2' : 'gap-4'}
    `}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            bg-gradient-to-br
            ${theme === 'field' 
              ? 'from-slate-700/50 to-slate-800/50 border-slate-600/50' 
              : 'from-blue-50/40 to-blue-100/30 border-blue-200/40'
            }
            border
            ${isMobile ? 'rounded-lg p-3' : 'rounded-xl p-4 md:p-5'}
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`
                ${isMobile ? 'text-xs' : 'text-sm'}
                ${theme === 'field' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}
                mb-1
              `}>
                {stat.label}
              </p>
              <p className={`
                ${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'}
                font-bold
                ${theme === 'field' ? 'text-white' : 'text-slate-900 dark:text-white'}
              `}>
                {stat.value}
              </p>
            </div>
            {stat.icon && (
              <div className={isMobile ? 'opacity-30' : 'opacity-50'}>
                <stat.icon className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-slate-400`} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Form Field para móvil
export const MobileFormField = ({ label, children, error, required }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={isMobile ? 'mb-3' : 'mb-4'}>
      <label className={`
        block
        ${isMobile ? 'text-sm mb-1.5' : 'text-sm mb-2'}
        font-medium
        text-slate-700 dark:text-slate-300
      `}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className={`
          ${isMobile ? 'text-xs mt-1' : 'text-sm mt-1.5'}
          text-red-600 dark:text-red-400
        `}>
          {error}
        </p>
      )}
    </div>
  );
};

// Tabs optimizados para móvil (scroll horizontal)
export const MobileTabs = ({ tabs, activeTab, onTabChange }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      ${isMobile ? 'overflow-x-auto -mx-3 px-3' : ''}
      mb-4 md:mb-6
    `}>
      <div className={`
        flex
        ${isMobile ? 'gap-2 min-w-max' : 'gap-3 flex-wrap'}
        ${isMobile ? '' : 'bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700'}
      `}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              ${isMobile ? 'px-4 py-2 rounded-lg text-sm' : 'px-6 py-2.5 rounded-lg text-base'}
              font-medium
              transition-all duration-200
              whitespace-nowrap
              flex items-center gap-2
              min-h-[44px]
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }
            `}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'}
                rounded-full
                ${activeTab === tab.id 
                  ? 'bg-white/20' 
                  : 'bg-slate-300 dark:bg-slate-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Empty State optimizado
export const MobileEmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  theme = 'connect'
}) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      text-center
      ${isMobile ? 'py-8 px-4' : 'py-12 px-6'}
      bg-white dark:bg-slate-800
      ${isMobile ? 'rounded-lg' : 'rounded-2xl'}
      border border-slate-200 dark:border-slate-700
    `}>
      {Icon && (
        <div className={`
          mx-auto
          ${theme === 'field' 
            ? 'bg-orange-500/10' 
            : 'bg-blue-500/10'
          }
          ${isMobile ? 'w-12 h-12 rounded-lg mb-3' : 'w-16 h-16 rounded-2xl mb-4'}
          flex items-center justify-center
        `}>
          <Icon className={`
            ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}
            ${theme === 'field' ? 'text-orange-500' : 'text-blue-500'}
          `} />
        </div>
      )}
      <h3 className={`
        font-bold
        ${theme === 'field' ? 'text-white' : 'text-slate-900 dark:text-white'}
        ${isMobile ? 'text-base mb-1' : 'text-lg md:text-xl mb-2'}
      `}>
        {title}
      </h3>
      <p className={`
        ${theme === 'field' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}
        ${isMobile ? 'text-xs mb-3' : 'text-sm md:text-base mb-4'}
      `}>
        {description}
      </p>
      {action && (
        <div className={isMobile ? 'mt-3' : 'mt-4'}>
          {action}
        </div>
      )}
    </div>
  );
};

// Section con título móvil-optimizado
export const MobileSection = ({ title, action, children, theme = 'connect' }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={isMobile ? 'mb-6' : 'mb-8'}>
      <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`
          font-bold
          ${theme === 'field' ? 'text-white' : 'text-slate-900 dark:text-white'}
          ${isMobile ? 'text-lg' : 'text-xl md:text-2xl'}
        `}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
};