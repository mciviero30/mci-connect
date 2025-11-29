import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Sparkles, Wand2, Loader2, Check, RefreshCw, Image, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AIContentGenerator({ 
  open, 
  onOpenChange, 
  type = 'announcement', // 'announcement' or 'recognition'
  onContentGenerated,
  employees = []
}) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const suggestionsAnnouncement = [
    "Company update about new benefits",
    "Reminder about upcoming holiday schedule",
    "Congratulations on project completion",
    "Safety reminder for the team",
    "Welcome new team members",
    "Monthly team performance update",
    "Policy update announcement",
    "Team building event invitation"
  ];

  const suggestionsRecognition = [
    "Great teamwork on the project",
    "Going above and beyond for a client",
    "Helping a coworker succeed",
    "Outstanding customer service",
    "Meeting a tight deadline",
    "Innovative solution to a problem",
    "Mentoring new team members",
    "Exceptional work ethic"
  ];

  const suggestions = type === 'announcement' ? suggestionsAnnouncement : suggestionsRecognition;

  const generateContent = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const systemPrompt = type === 'announcement' 
        ? `You are an HR/Communications assistant for a construction/field services company called MCI. 
           Generate a professional but friendly company announcement based on the user's topic.
           Return JSON with: { "title": "...", "content": "...", "priority": "normal|important|urgent" }
           Keep the title concise (max 10 words). Content should be 2-4 paragraphs.
           Make it engaging and appropriate for a company news feed.`
        : `You are an HR assistant for a construction/field services company called MCI.
           Generate a heartfelt recognition/kudos message for an employee.
           Return JSON with: { "message": "...", "recognition_type": "teamwork|excellence|innovation|leadership|customer_service|safety|mentor", "points": 10-100 }
           The message should be personal, specific, and motivating. 1-2 paragraphs max.
           Points should reflect the significance: small gestures (10-25), good work (30-50), exceptional (60-100).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nUser's topic/description: ${prompt}`,
        response_json_schema: type === 'announcement' 
          ? {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                priority: { type: "string", enum: ["normal", "important", "urgent"] }
              },
              required: ["title", "content", "priority"]
            }
          : {
              type: "object",
              properties: {
                message: { type: "string" },
                recognition_type: { type: "string" },
                points: { type: "number" }
              },
              required: ["message", "recognition_type", "points"]
            }
      });

      setGeneratedContent(result);
    } catch (error) {
      console.error('Error generating content:', error);
    }
    setIsGenerating(false);
  };

  const generateAIImage = async () => {
    if (!generatedContent?.title) return;
    
    setIsGeneratingImage(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Professional corporate image for company announcement: "${generatedContent.title}". Modern, clean, professional style suitable for business communication. No text in image.`
      });
      if (result?.url) {
        setImageUrl(result.url);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
    setIsGeneratingImage(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setIsUploadingImage(false);
  };

  const handleUseContent = () => {
    if (generatedContent) {
      onContentGenerated({
        ...generatedContent,
        employee_email: selectedEmployee,
        image_url: imageUrl
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedContent(null);
    setSelectedEmployee('');
    setImageUrl('');
    onOpenChange(false);
  };

  const regenerate = () => {
    setGeneratedContent(null);
    generateContent();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            AI {type === 'announcement' ? 'Announcement' : 'Recognition'} Generator
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Describe what you want to communicate and AI will help you write it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Employee selector for recognition */}
          {type === 'recognition' && employees.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Who are you recognizing?
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              >
                <option value="">Select an employee...</option>
                {employees.map(emp => (
                  <option key={emp.email} value={emp.email}>
                    {emp.full_name || emp.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick suggestions */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Quick ideas (click to use)
            </label>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(suggestion)}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Describe your {type === 'announcement' ? 'announcement' : 'recognition'}
            </label>
            <Textarea
              placeholder={type === 'announcement' 
                ? "E.g., Announce that we're closing early on Friday for the holiday weekend..."
                : "E.g., John helped the new team member learn our systems quickly..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            />
          </div>

          {/* Generate button */}
          {!generatedContent && (
            <Button
              onClick={generateContent}
              disabled={!prompt.trim() || isGenerating || (type === 'recognition' && !selectedEmployee)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          )}

          {/* Generated content preview */}
          {generatedContent && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Generated</span>
                </div>
                
                {type === 'announcement' ? (
                  <>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      {generatedContent.title}
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
                      {generatedContent.content}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Priority:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        generatedContent.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        generatedContent.priority === 'important' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {generatedContent.priority}
                      </span>
                    </div>

                    {/* Image Section for Announcements */}
                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Add an image (optional)</p>
                      
                      {imageUrl ? (
                        <div className="relative">
                          <img src={imageUrl} alt="Announcement" className="w-full h-40 object-cover rounded-lg" />
                          <button
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateAIImage}
                            disabled={isGeneratingImage}
                            className="flex-1 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-400"
                          >
                            {isGeneratingImage ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            AI Image
                          </Button>
                          
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="ai-image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('ai-image-upload').click()}
                            disabled={isUploadingImage}
                            className="flex-1 border-slate-300 dark:border-slate-600"
                          >
                            {isUploadingImage ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Image className="w-4 h-4 mr-1" />
                            )}
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm mb-3">
                      {generatedContent.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                        {generatedContent.recognition_type}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        +{generatedContent.points} points
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={regenerate}
                  disabled={isGenerating}
                  className="flex-1 border-slate-300 dark:border-slate-600"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={handleUseContent}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use This
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}