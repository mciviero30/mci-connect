import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Send, UserCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const OnboardingStep = ({ step, isActive, isCompleted, icon: Icon, label, date, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-4"
    >
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isCompleted
              ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
              : isActive
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 animate-pulse"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : isActive ? (
            <Clock className="w-6 h-6 animate-spin" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>
        {step !== "complete" && (
          <div
            className={`absolute left-1/2 top-12 w-0.5 h-8 -translate-x-1/2 transition-all ${
              isCompleted ? "bg-green-500" : "bg-slate-700"
            }`}
          />
        )}
      </div>
      
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-bold ${isCompleted || isActive ? "text-white" : "text-slate-400"}`}>
            {label}
          </h4>
          {isCompleted && date && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              {format(new Date(date), 'MMM dd, HH:mm')}
            </Badge>
          )}
        </div>
        <p className={`text-sm ${isCompleted || isActive ? "text-slate-300" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export default function OnboardingTracker({ employee }) {
  const getOnboardingStatus = () => {
    const steps = {
      created: {
        completed: !!employee.created_date,
        date: employee.created_date,
        active: employee.status === 'pending' && !employee.invited_date
      },
      invited: {
        completed: !!employee.invited_date,
        date: employee.invited_date,
        active: employee.status === 'invited'
      },
      registered: {
        completed: employee.status === 'active',
        date: employee.registered_date,
        active: employee.status === 'active' && !employee.onboarding_completed_date
      },
      complete: {
        completed: !!employee.onboarding_completed_date,
        date: employee.onboarding_completed_date,
        active: false
      }
    };

    return steps;
  };

  const steps = getOnboardingStatus();

  const getProgressPercentage = () => {
    const completed = Object.values(steps).filter(s => s.completed).length;
    return (completed / 4) * 100;
  };

  const progress = getProgressPercentage();

  return (
    <Card className="bg-slate-900/50 border-slate-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Onboarding Progress
          </CardTitle>
          <Badge
            className={
              progress === 100
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : progress > 50
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            }
          >
            {progress.toFixed(0)}% Complete
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progress === 100
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
              }`}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <OnboardingStep
            step="created"
            icon={UserCheck}
            label="Account Created"
            description="Employee profile created in the system"
            isCompleted={steps.created.completed}
            isActive={steps.created.active}
            date={steps.created.date}
          />
          
          <OnboardingStep
            step="invited"
            icon={Send}
            label="Invitation Sent"
            description="Email invitation sent to employee"
            isCompleted={steps.invited.completed}
            isActive={steps.invited.active}
            date={steps.invited.date}
          />
          
          <OnboardingStep
            step="registered"
            icon={UserCheck}
            label="Account Registered"
            description="Employee has registered and accessed the app"
            isCompleted={steps.registered.completed}
            isActive={steps.registered.active}
            date={steps.registered.date}
          />
          
          <OnboardingStep
            step="complete"
            icon={Sparkles}
            label="Onboarding Complete"
            description="Employee is fully onboarded and active"
            isCompleted={steps.complete.completed}
            isActive={steps.complete.active}
            date={steps.complete.date}
          />
        </div>
      </CardContent>
    </Card>
  );
}