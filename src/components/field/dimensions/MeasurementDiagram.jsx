import React from 'react';
import { Info } from 'lucide-react';

export default function MeasurementDiagram({ type }) {
  const diagrams = {
    'FF-FF': {
      title: 'Finish Face to Finish Face',
      svg: (
        <svg viewBox="0 0 200 80" className="w-full h-20">
          <rect x="10" y="10" width="30" height="60" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <rect x="160" y="10" width="30" height="60" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line x1="40" y1="40" x2="160" y2="40" stroke="#FFB800" strokeWidth="3" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
          <text x="100" y="30" fontSize="12" fill="#FFB800" textAnchor="middle" fontWeight="bold">FF → FF</text>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#FFB800" />
            </marker>
          </defs>
        </svg>
      ),
      description: 'Measurement from finish surface to finish surface'
    },
    'FF-CL': {
      title: 'Finish Face to Center Line',
      svg: (
        <svg viewBox="0 0 200 80" className="w-full h-20">
          <rect x="10" y="10" width="30" height="60" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line x1="160" y1="10" x2="160" y2="70" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="40" y1="40" x2="160" y2="40" stroke="#FFB800" strokeWidth="3" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
          <text x="100" y="30" fontSize="12" fill="#FFB800" textAnchor="middle" fontWeight="bold">FF → CL</text>
        </svg>
      ),
      description: 'Measurement from finish surface to center line'
    },
    'CL-FF': {
      title: 'Center Line to Finish Face',
      svg: (
        <svg viewBox="0 0 200 80" className="w-full h-20">
          <line x1="40" y1="10" x2="40" y2="70" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
          <rect x="160" y="10" width="30" height="60" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line x1="40" y1="40" x2="160" y2="40" stroke="#FFB800" strokeWidth="3" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
          <text x="100" y="30" fontSize="12" fill="#FFB800" textAnchor="middle" fontWeight="bold">CL → FF</text>
        </svg>
      ),
      description: 'Measurement from center line to finish surface'
    },
    'CL-CL': {
      title: 'Center Line to Center Line',
      svg: (
        <svg viewBox="0 0 200 80" className="w-full h-20">
          <line x1="40" y1="10" x2="40" y2="70" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="160" y1="10" x2="160" y2="70" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="40" y1="40" x2="160" y2="40" stroke="#FFB800" strokeWidth="3" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
          <text x="100" y="30" fontSize="12" fill="#FFB800" textAnchor="middle" fontWeight="bold">CL → CL</text>
        </svg>
      ),
      description: 'Measurement from center line to center line'
    },
    'BM-C': {
      title: 'Bench Mark to Ceiling',
      svg: (
        <svg viewBox="0 0 200 100" className="w-full h-24">
          <line x1="20" y1="60" x2="180" y2="60" stroke="#FFB800" strokeWidth="3" strokeDasharray="8,4" />
          <text x="100" y="55" fontSize="10" fill="#FFB800" textAnchor="middle" fontWeight="bold">BENCH MARK</text>
          <rect x="20" y="10" width="160" height="10" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line x1="100" y1="20" x2="100" y2="60" stroke="#10b981" strokeWidth="3" markerEnd="url(#greenarrow)" markerStart="url(#greenarrow)" />
          <text x="110" y="40" fontSize="12" fill="#10b981" fontWeight="bold">BM → C</text>
          <defs>
            <marker id="greenarrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
            </marker>
          </defs>
        </svg>
      ),
      description: 'Measurement from bench mark laser line to ceiling'
    },
    'BM-F': {
      title: 'Bench Mark to Floor',
      svg: (
        <svg viewBox="0 0 200 100" className="w-full h-24">
          <line x1="20" y1="40" x2="180" y2="40" stroke="#FFB800" strokeWidth="3" strokeDasharray="8,4" />
          <text x="100" y="35" fontSize="10" fill="#FFB800" textAnchor="middle" fontWeight="bold">BENCH MARK</text>
          <rect x="20" y="80" width="160" height="10" fill="#64748b" stroke="#475569" strokeWidth="2" />
          <line x1="100" y1="40" x2="100" y2="80" stroke="#ef4444" strokeWidth="3" markerEnd="url(#redarrow)" markerStart="url(#redarrow)" />
          <text x="110" y="60" fontSize="12" fill="#ef4444" fontWeight="bold">BM → F</text>
          <defs>
            <marker id="redarrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
      ),
      description: 'Measurement from bench mark laser line to floor'
    },
    'F-C': {
      title: 'Floor to Ceiling',
      svg: (
        <svg viewBox="0 0 200 100" className="w-full h-24">
          <rect x="20" y="10" width="160" height="10" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <rect x="20" y="80" width="160" height="10" fill="#64748b" stroke="#475569" strokeWidth="2" />
          <line x1="100" y1="20" x2="100" y2="80" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#bluearrow)" markerStart="url(#bluearrow)" />
          <text x="110" y="50" fontSize="12" fill="#3b82f6" fontWeight="bold">F → C</text>
          <defs>
            <marker id="bluearrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#3b82f6" />
            </marker>
          </defs>
        </svg>
      ),
      description: 'Full height measurement from floor to ceiling'
    },
    'BM-ONLY': {
      title: 'Bench Mark Reference Only',
      svg: (
        <svg viewBox="0 0 200 80" className="w-full h-20">
          <line x1="20" y1="40" x2="180" y2="40" stroke="#FFB800" strokeWidth="4" strokeDasharray="10,5" />
          <text x="100" y="35" fontSize="12" fill="#FFB800" textAnchor="middle" fontWeight="bold">BENCH MARK</text>
          <circle cx="30" cy="40" r="5" fill="#FFB800" />
          <circle cx="100" cy="40" r="5" fill="#FFB800" />
          <circle cx="170" cy="40" r="5" fill="#FFB800" />
          <text x="100" y="60" fontSize="10" fill="#64748b" textAnchor="middle">Laser Reference Line</text>
        </svg>
      ),
      description: 'Bench mark laser reference line only - no measurements'
    }
  };

  const diagram = diagrams[type];
  if (!diagram) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-blue-900 dark:text-blue-100 text-sm">{diagram.title}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">{diagram.description}</div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
        {diagram.svg}
      </div>
    </div>
  );
}