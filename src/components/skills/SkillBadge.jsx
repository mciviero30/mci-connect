import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

const PROFICIENCY_COLORS = {
  beginner: 'bg-slate-100 text-slate-700 border-slate-300',
  intermediate: 'bg-blue-100 text-blue-700 border-blue-300',
  advanced: 'bg-purple-100 text-purple-700 border-purple-300',
  expert: 'bg-amber-100 text-amber-700 border-amber-300',
};

const PROFICIENCY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export default function SkillBadge({ skill, showValidation = true, size = 'default' }) {
  const level = skill.validated_level || skill.proficiency_level;
  const isValidated = skill.validated;
  
  return (
    <div className={`inline-flex items-center gap-1.5 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
      <Badge className={`${PROFICIENCY_COLORS[level]} border ${size === 'small' ? 'px-1.5 py-0.5 text-[10px]' : ''}`}>
        {skill.skill_name}
        <span className="ml-1 opacity-70">• {PROFICIENCY_LABELS[level]}</span>
      </Badge>
      {showValidation && (
        isValidated ? (
          <CheckCircle2 className={`text-green-500 ${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`} />
        ) : (
          <Clock className={`text-slate-400 ${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`} />
        )
      )}
    </div>
  );
}

export { PROFICIENCY_COLORS, PROFICIENCY_LABELS };