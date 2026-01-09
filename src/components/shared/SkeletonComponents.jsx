import React from 'react';

/**
 * SKELETON COMPONENTS - Latencia Perceptiva = 0ms
 * 
 * Skeletons que imitan EXACTAMENTE el layout final
 * Continuidad visual sin cambios bruscos
 */

// Base Skeleton con shimmer
const Skeleton = ({ className = '', width, height }) => (
  <div
    className={`bg-slate-200 dark:bg-slate-700 animate-pulse ${className}`}
    style={{ 
      width: width || '100%', 
      height: height || '100%',
      backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.2s infinite',
    }}
  />
);

// Card Skeleton
export const SkeletonCard = ({ rows = 3, showImage = false }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 shadow-sm">
    <div className="flex items-start gap-4">
      {showImage && (
        <Skeleton className="rounded-lg flex-shrink-0" width="80px" height="80px" />
      )}
      <div className="flex-1 space-y-3">
        <Skeleton className="rounded h-5" width="70%" />
        {[...Array(rows)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="rounded h-4" 
            width={i === rows - 1 ? '40%' : '100%'} 
          />
        ))}
      </div>
    </div>
  </div>
);

// List Item Skeleton
export const SkeletonListItem = () => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-3">
    <Skeleton className="rounded-full flex-shrink-0" width="40px" height="40px" />
    <div className="flex-1 space-y-2">
      <Skeleton className="rounded h-4" width="60%" />
      <Skeleton className="rounded h-3" width="40%" />
    </div>
    <Skeleton className="rounded-full" width="20px" height="20px" />
  </div>
);

// Stats Widget Skeleton
export const SkeletonStatsWidget = () => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="rounded h-4" width="100px" />
      <Skeleton className="rounded-lg" width="40px" height="40px" />
    </div>
    <Skeleton className="rounded h-8 mb-2" width="120px" />
    <Skeleton className="rounded h-3" width="80px" />
  </div>
);

// Dashboard Skeleton
export const SkeletonDashboard = () => (
  <div className="p-4 sm:p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="rounded h-8 mb-2" width="200px" />
        <Skeleton className="rounded h-4" width="150px" />
      </div>
      <Skeleton className="rounded-lg" width="120px" height="44px" />
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonStatsWidget key={i} />
      ))}
    </div>
    
    {/* Content Cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard rows={5} />
      <SkeletonCard rows={5} />
    </div>
  </div>
);

// Field Project Skeleton
export const SkeletonFieldProject = () => (
  <div data-field-mode="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 dark pb-20">
    {/* Header Skeleton */}
    <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center gap-3">
      <Skeleton className="rounded-lg" width="44px" height="44px" />
      <div className="flex-1 space-y-2">
        <Skeleton className="rounded h-6" width="60%" />
        <Skeleton className="rounded h-4" width="40%" />
      </div>
      <Skeleton className="rounded-full" width="24px" height="24px" />
    </div>
    
    {/* Progress Summary Skeleton */}
    <div className="p-4 space-y-3">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="rounded h-3" width="80%" />
              <Skeleton className="rounded h-8" width="60%" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Tasks Skeleton */}
      <div className="space-y-2 mt-4">
        <Skeleton className="rounded h-5 mb-3" width="120px" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
            <Skeleton className="rounded-full" width="32px" height="32px" />
            <div className="flex-1 space-y-2">
              <Skeleton className="rounded h-4" width="70%" />
              <Skeleton className="rounded h-3" width="50%" />
            </div>
            <Skeleton className="rounded-full" width="60px" height="24px" />
          </div>
        ))}
      </div>
      
      {/* Dimensions Section Skeleton */}
      <div className="space-y-2 mt-6">
        <Skeleton className="rounded h-5 mb-3" width="140px" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
              <Skeleton className="rounded h-3 mb-2" width="50%" />
              <Skeleton className="rounded h-6" width="80px" />
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Bottom Action Rail - ALWAYS VISIBLE, NO SKELETON */}
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-black border-t-2 border-slate-700 shadow-2xl pb-safe">
      <div className="flex items-center justify-around px-1 py-2">
        {['Photo', 'Audio', 'Task', 'Measure', 'Incident'].map((label, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] max-w-[100px]">
            <Skeleton className="rounded-lg" width="24px" height="24px" />
            <Skeleton className="rounded h-2" width="50px" />
          </div>
        ))}
      </div>
    </div>
    
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

// Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
    {/* Header */}
    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4">
      <div className="flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="rounded h-4" width={i === 0 ? '30%' : '20%'} />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    {[...Array(rows)].map((_, rowIdx) => (
      <div key={rowIdx} className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, colIdx) => (
            <Skeleton key={colIdx} className="rounded h-4" width={colIdx === 0 ? '30%' : '20%'} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Form Skeleton
export const SkeletonForm = ({ fields = 5 }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
    {[...Array(fields)].map((_, i) => (
      <div key={i}>
        <Skeleton className="rounded h-4 mb-2" width="100px" />
        <Skeleton className="rounded-lg h-11" />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton className="rounded-lg h-11 flex-1" />
      <Skeleton className="rounded-lg h-11 flex-1" />
    </div>
  </div>
);

// Job List Skeleton
export const SkeletonJobList = ({ count = 5 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="rounded h-6" width="60%" />
            <Skeleton className="rounded h-4" width="40%" />
          </div>
          <Skeleton className="rounded-full" width="80px" height="28px" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} className="rounded h-4" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Expense List Skeleton
export const SkeletonExpenseList = ({ count = 5 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-4">
        <Skeleton className="rounded-lg flex-shrink-0" width="60px" height="60px" />
        <div className="flex-1 space-y-2">
          <Skeleton className="rounded h-4" width="50%" />
          <Skeleton className="rounded h-3" width="30%" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="rounded-lg" width="80px" height="36px" />
          <Skeleton className="rounded-lg" width="80px" height="36px" />
        </div>
      </div>
    ))}
  </div>
);

// Quote/Invoice List Skeleton
export const SkeletonDocumentList = ({ count = 5 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="rounded h-5" width="150px" />
            <Skeleton className="rounded h-4" width="200px" />
          </div>
          <Skeleton className="rounded-full" width="70px" height="24px" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
          <Skeleton className="rounded h-7" width="100px" />
          <Skeleton className="rounded-lg" width="100px" height="36px" />
        </div>
      </div>
    ))}
  </div>
);

// Avatar Skeleton
export const SkeletonAvatar = ({ size = 40 }) => (
  <Skeleton 
    className="rounded-full flex-shrink-0" 
    width={`${size}px`} 
    height={`${size}px`} 
  />
);

// Button Skeleton
export const SkeletonButton = ({ width = '120px' }) => (
  <Skeleton className="rounded-lg" width={width} height="44px" />
);

// Inline Loader - Subtle, Non-Blocking
export const InlineLoader = ({ text = 'Loading' }) => (
  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
    <div className="w-4 h-4 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin" />
    <span className="font-medium">{text}...</span>
  </div>
);

// Section Skeleton - For panel/tab switches
export const SkeletonSection = ({ rows = 3 }) => (
  <div className="space-y-3 p-4">
    {[...Array(rows)].map((_, i) => (
      <Skeleton key={i} className="rounded h-16" />
    ))}
  </div>
);

// Add global shimmer animation
if (typeof document !== 'undefined' && !document.getElementById('skeleton-shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-shimmer-style';
  style.innerHTML = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}