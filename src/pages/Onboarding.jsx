import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Upload,
  FileText,
  User,
  Shield,
  BookOpen,
  AlertCircle,
  Check,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SignaturePad = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    onSave(signatureData);
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair bg-white"
      />
      <div className="flex gap-2">
        <Button onClick={clear} variant="outline" size="sm">Clear</Button>
        <Button onClick={save} size="sm">Save Signature</Button>
      </div>
    </div>
  );
};

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['onboardingTasks', user?.email],
    queryFn: async () => {
      const existing = await base44.entities.OnboardingTask.filter({
        employee_email: user.email
      }, 'order');

      if (existing.length === 0) {
        // Initialize onboarding tasks
        const defaultTasks = [
          {
            task_type: 'profile_completion',
            task_title: 'Complete Your Profile',
            task_description: 'Fill out your personal information',
            order: 1,
            is_required: true
          },
          {
            task_type: 'emergency_contact',
            task_title: 'Emergency Contact',
            task_description: 'Provide emergency contact information',
            order: 2,
            is_required: true
          },
          {
            task_type: 'w4_form',
            task_title: 'Upload W-4 Form',
            task_description: 'Upload your completed W-4 tax form',
            order: 3,
            is_required: true
          },
          {
            task_type: 'i9_form',
            task_title: 'Upload I-9 Form',
            task_description: 'Upload your completed I-9 employment verification',
            order: 4,
            is_required: true
          },
          {
            task_type: 'direct_deposit',
            task_title: 'Direct Deposit Setup',
            task_description: 'Provide bank account information',
            order: 5,
            is_required: false
          },
          {
            task_type: 'handbook_signature',
            task_title: 'Sign Employee Handbook',
            task_description: 'Read and sign the MCI employee handbook',
            order: 6,
            is_required: true
          },
          {
            task_type: 'safety_training',
            task_title: 'Safety Training',
            task_description: 'Complete required safety training',
            order: 7,
            is_required: true
          },
          {
            task_type: 'system_training',
            task_title: 'System Training',
            task_description: 'Learn how to use MCI Connect',
            order: 8,
            is_required: false
          }
        ];

        const created = await Promise.all(
          defaultTasks.map(task =>
            base44.entities.OnboardingTask.create({
              ...task,
              employee_email: user.email,
              employee_name: user.full_name,
              status: 'pending'
            })
          )
        );

        return created;
      }

      return existing;
    },
    enabled: !!user?.email
  });

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const isComplete = completedTasks === totalTasks;

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => base44.entities.OnboardingTask.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingTasks'] });
    }
  });

  const handleFileUpload = async (taskId, file, taskType) => {
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.EmployeeDocument.create({
        employee_email: user.email,
        employee_name: user.full_name,
        document_type: taskType === 'w4_form' ? 'w4_form' : 'i9_form',
        document_name: file.name,
        file_url,
        uploaded_by_email: user.email,
        uploaded_by_name: user.full_name,
        status: 'active'
      });

      await updateTaskMutation.mutateAsync({
        taskId,
        data: {
          status: 'completed',
          completed_date: new Date().toISOString(),
          document_url: file_url
        }
      });

      alert('✅ Document uploaded successfully!');
    } catch (error) {
      alert('❌ Error uploading: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSignature = async (taskId, signatureData) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        data: {
          status: 'completed',
          completed_date: new Date().toISOString(),
          signature_data: signatureData
        }
      });
      alert('✅ Signature saved!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const finishOnboarding = async () => {
    try {
      await base44.auth.updateMe({
        onboarding_completed: true,
        onboarding_completed_date: new Date().toISOString()
      });
      window.location.href = '/';
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const currentTask = tasks[currentStep];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to MCI Connect! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Let's get you set up in just a few steps
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Onboarding Progress
              </span>
              <span className="text-sm font-bold text-blue-600">
                {completedTasks} / {totalTasks} completed
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Task List */}
        <div className="grid gap-4 mb-8">
          {tasks.map((task, index) => {
            const isActive = index === currentStep;
            const isCompleted = task.status === 'completed';
            const Icon = isCompleted ? CheckCircle2 : Circle;

            return (
              <Card
                key={task.id}
                className={`cursor-pointer transition-all ${
                  isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${isCompleted ? 'bg-green-50' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-6 h-6 ${
                          isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                      <div>
                        <CardTitle className="text-lg">{task.task_title}</CardTitle>
                        <CardDescription>{task.task_description}</CardDescription>
                      </div>
                    </div>
                    {task.is_required && (
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        Required
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Task Content (only show when active) */}
                {isActive && !isCompleted && (
                  <CardContent className="border-t pt-6">
                    {/* Profile Completion */}
                    {task.task_type === 'profile_completion' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Phone</Label>
                            <Input defaultValue={user.phone} />
                          </div>
                          <div>
                            <Label>Address</Label>
                            <Input defaultValue={user.address} />
                          </div>
                          <div>
                            <Label>Date of Birth</Label>
                            <Input type="date" defaultValue={user.dob} />
                          </div>
                          <div>
                            <Label>T-Shirt Size</Label>
                            <select className="w-full border rounded-md px-3 py-2">
                              <option>S</option>
                              <option>M</option>
                              <option>L</option>
                              <option>XL</option>
                              <option>XXL</option>
                            </select>
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              data: {
                                status: 'completed',
                                completed_date: new Date().toISOString()
                              }
                            })
                          }
                        >
                          Save & Continue
                        </Button>
                      </div>
                    )}

                    {/* Emergency Contact */}
                    {task.task_type === 'emergency_contact' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Contact Name</Label>
                            <Input placeholder="Full name" />
                          </div>
                          <div>
                            <Label>Relationship</Label>
                            <Input placeholder="e.g., Spouse, Parent" />
                          </div>
                          <div className="col-span-2">
                            <Label>Phone Number</Label>
                            <Input placeholder="(000) 000-0000" />
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              data: {
                                status: 'completed',
                                completed_date: new Date().toISOString()
                              }
                            })
                          }
                        >
                          Save & Continue
                        </Button>
                      </div>
                    )}

                    {/* Document Upload (W4, I9) */}
                    {(task.task_type === 'w4_form' || task.task_type === 'i9_form') && (
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            Please upload a completed and signed {task.task_type === 'w4_form' ? 'W-4' : 'I-9'} form (PDF, JPG, or PNG)
                          </AlertDescription>
                        </Alert>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleFileUpload(task.id, file, task.task_type);
                            }}
                            disabled={uploadingFile}
                            className="hidden"
                            id={`file-${task.id}`}
                          />
                          <label htmlFor={`file-${task.id}`} className="cursor-pointer">
                            <Button asChild disabled={uploadingFile}>
                              <span>
                                {uploadingFile ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Choose File
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Direct Deposit */}
                    {task.task_type === 'direct_deposit' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Bank Name</Label>
                            <Input placeholder="e.g., Chase" />
                          </div>
                          <div>
                            <Label>Account Type</Label>
                            <select className="w-full border rounded-md px-3 py-2">
                              <option>Checking</option>
                              <option>Savings</option>
                            </select>
                          </div>
                          <div>
                            <Label>Routing Number</Label>
                            <Input placeholder="9 digits" />
                          </div>
                          <div>
                            <Label>Account Number</Label>
                            <Input placeholder="Account number" />
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              data: {
                                status: 'completed',
                                completed_date: new Date().toISOString()
                              }
                            })
                          }
                        >
                          Save & Continue
                        </Button>
                      </div>
                    )}

                    {/* Handbook Signature */}
                    {task.task_type === 'handbook_signature' && (
                      <div className="space-y-4">
                        <Alert>
                          <BookOpen className="w-4 h-4" />
                          <AlertDescription>
                            I acknowledge that I have read and understand the MCI Employee Handbook and agree to comply with all policies.
                          </AlertDescription>
                        </Alert>
                        <div>
                          <Label className="mb-2 block">Your Signature</Label>
                          <SignaturePad onSave={(sig) => handleSignature(task.id, sig)} />
                        </div>
                      </div>
                    )}

                    {/* Training Tasks */}
                    {(task.task_type === 'safety_training' || task.task_type === 'system_training') && (
                      <div className="space-y-4">
                        <Alert>
                          <BookOpen className="w-4 h-4" />
                          <AlertDescription>
                            Complete the required training course in the Training section
                          </AlertDescription>
                        </Alert>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => window.location.href = '/capacitacion'}
                            variant="outline"
                          >
                            Go to Training
                          </Button>
                          <Button
                            onClick={() =>
                              updateTaskMutation.mutate({
                                taskId: task.id,
                                data: {
                                  status: 'completed',
                                  completed_date: new Date().toISOString()
                                }
                              })
                            }
                          >
                            Mark as Complete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Finish Onboarding */}
        {isComplete && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎉 Onboarding Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                You're all set to start using MCI Connect
              </p>
              <Button size="lg" onClick={finishOnboarding}>
                <Check className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}