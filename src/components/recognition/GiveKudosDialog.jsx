import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Award, Send, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { getDisplayName } from '@/components/utils/nameHelpers';

const RECOGNITION_CATEGORIES = [
  { value: 'teamwork', label: 'Teamwork', icon: '🤝', color: 'from-blue-500 to-cyan-500', points: 10, defaultMessage: 'Thank you for being such a great team player! Your collaboration and support make our team stronger.' },
  { value: 'innovation', label: 'Innovation', icon: '💡', color: 'from-purple-500 to-pink-500', points: 15, defaultMessage: 'Your creative thinking and innovative ideas are truly inspiring. Thank you for pushing boundaries!' },
  { value: 'customer_service', label: 'Customer Service', icon: '⭐', color: 'from-yellow-500 to-orange-500', points: 10, defaultMessage: 'Your dedication to customer satisfaction is outstanding. Thank you for representing us so well!' },
  { value: 'leadership', label: 'Leadership', icon: '👑', color: 'from-indigo-500 to-purple-500', points: 15, defaultMessage: 'Your leadership skills inspire everyone around you. Thank you for guiding the team to success!' },
  { value: 'quality_work', label: 'Quality Work', icon: '✨', color: 'from-green-500 to-emerald-500', points: 10, defaultMessage: 'The quality of your work is exceptional. Thank you for your attention to detail and excellence!' },
  { value: 'problem_solving', label: 'Problem Solving', icon: '🎯', color: 'from-red-500 to-pink-500', points: 12, defaultMessage: 'Your ability to solve problems quickly and effectively is amazing. Thank you for finding solutions!' },
  { value: 'going_extra_mile', label: 'Going the Extra Mile', icon: '🚀', color: 'from-orange-500 to-red-500', points: 15, defaultMessage: 'You consistently go above and beyond expectations. Thank you for your dedication and extra effort!' },
  { value: 'mentorship', label: 'Mentorship', icon: '🎓', color: 'from-teal-500 to-cyan-500', points: 12, defaultMessage: 'Your guidance and mentorship help others grow. Thank you for sharing your knowledge and experience!' },
  { value: 'safety_excellence', label: 'Safety Excellence', icon: '🛡️', color: 'from-green-500 to-lime-500', points: 10, defaultMessage: 'Your commitment to safety keeps everyone protected. Thank you for prioritizing our well-being!' },
  { value: 'positive_attitude', label: 'Positive Attitude', icon: '😊', color: 'from-yellow-500 to-amber-500', points: 8, defaultMessage: 'Your positive energy brightens the workplace. Thank you for bringing joy to the team!' },
];

export default function GiveKudosDialog({ open, onOpenChange, prefillData = null }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
  });

  // Apply prefill data from AI generator
  React.useEffect(() => {
    if (prefillData && open && !hasAppliedPrefill) {
      if (prefillData.employee_email) {
        const emp = employees.find(e => e.email === prefillData.employee_email);
        if (emp) setSelectedEmployee(emp);
      }
      if (prefillData.message) setMessage(prefillData.message);
      if (prefillData.recognition_type) {
        // Map AI types to our categories
        const typeMapping = {
          'teamwork': 'teamwork',
          'excellence': 'quality_work',
          'innovation': 'innovation',
          'leadership': 'leadership',
          'customer_service': 'customer_service',
          'safety': 'safety_excellence',
          'mentor': 'mentorship',
          'problem_solving': 'problem_solving',
          'going_extra_mile': 'going_extra_mile',
          'positive_attitude': 'positive_attitude'
        };
        const mappedType = typeMapping[prefillData.recognition_type] || 'quality_work';
        setSelectedCategory(mappedType);
      }
      setHasAppliedPrefill(true);
    }
  }, [prefillData, open, employees, hasAppliedPrefill]);

  const createRecognitionMutation = useMutation({
    mutationFn: async (recognitionData) => {
      return base44.entities.Recognition.create(recognitionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['recentRecognitions'] });
      queryClient.invalidateQueries({ queryKey: ['topRecognitions'] });
      toast.success('🎉 Kudos sent successfully!');
      handleClose();
    },
    onError: () => {
      toast.error('Failed to send kudos');
    }
  });

  const handleClose = () => {
    setSelectedEmployee(null);
    setSelectedCategory('');
    setMessage('');
    setSearchTerm('');
    setHasAppliedPrefill(false);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!selectedEmployee || !selectedCategory) {
      toast.error('Please select an employee and category');
      return;
    }

    const category = RECOGNITION_CATEGORIES.find(c => c.value === selectedCategory);
    const finalMessage = message.trim() || category.defaultMessage;
    
    createRecognitionMutation.mutate({
      employee_email: selectedEmployee.email,
      employee_name: selectedEmployee.full_name,
      recognition_type: selectedCategory,
      title: category.label,
      message: finalMessage,
      given_by_email: currentUser.email,
      given_by_name: currentUser.full_name,
      points: category.points,
      is_public: true,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredEmployees = employees.filter(emp => {
    if (emp.email === currentUser?.email) return false;
    if (emp.employment_status === 'deleted') return false;
    const name = getDisplayName(emp).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const selectedCategoryData = RECOGNITION_CATEGORIES.find(c => c.value === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl">
              <Award className="w-8 h-8" />
            </div>
            Give Kudos
          </DialogTitle>
          <p className="text-slate-300 mt-2">Recognize a colleague for their great work!</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Select Employee */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">
              Select Employee
            </label>
            {!selectedEmployee ? (
              <>
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mb-3"
                />
                <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  {filteredEmployees.slice(0, 10).map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearchTerm('');
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
                    >
                      {emp.profile_photo_url ? (
                        <img src={emp.profile_photo_url} alt={emp.full_name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{getDisplayName(emp)[0]}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{getDisplayName(emp)}</p>
                        <p className="text-xs text-slate-400">{emp.position || emp.department}</p>
                      </div>
                    </button>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <p className="text-slate-400 text-center py-4">No employees found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border-2 border-[#3B9FF3]">
                {selectedEmployee.profile_photo_url ? (
                  <img src={selectedEmployee.profile_photo_url} alt={selectedEmployee.full_name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{getDisplayName(selectedEmployee)[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-white">{getDisplayName(selectedEmployee)}</p>
                  <p className="text-sm text-slate-400">{selectedEmployee.position || selectedEmployee.department}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployee(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Select Category */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-3 block">
              Recognition Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RECOGNITION_CATEGORIES.map(category => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    // Auto-fill message if empty or if it's a default message from another category
                    const isDefaultMessage = RECOGNITION_CATEGORIES.some(c => c.defaultMessage === message);
                    if (!message || isDefaultMessage) {
                      setMessage(category.defaultMessage);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedCategory === category.value
                      ? `bg-gradient-to-br ${category.color} border-white shadow-lg scale-105`
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <p className={`font-semibold text-sm ${selectedCategory === category.value ? 'text-white' : 'text-slate-200'}`}>
                    {category.label}
                  </p>
                  <Badge className={`mt-2 ${selectedCategory === category.value ? 'bg-white/20 text-white' : 'bg-slate-600 text-slate-200'}`}>
                    +{category.points} pts
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Your Message
              <span className="text-xs font-normal text-slate-500">(optional - auto-generated)</span>
            </label>
            <Textarea
              placeholder="Share why this person deserves recognition..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white min-h-[100px] placeholder:text-slate-500"
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">{message.length}/500 characters</p>
          </div>

          {/* Summary */}
          {selectedEmployee && selectedCategory && (
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
              <p className="text-sm text-slate-300 mb-2">Preview:</p>
              <p className="text-white font-semibold">
                {getDisplayName(selectedEmployee)} will receive +{selectedCategoryData?.points} points for {selectedCategoryData?.label}!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedEmployee || !selectedCategory || createRecognitionMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {createRecognitionMutation.isPending ? 'Sending...' : 'Send Kudos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}