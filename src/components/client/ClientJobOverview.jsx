import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  Camera
} from 'lucide-react';

export default function ClientJobOverview({ 
  job, 
  taskStats, 
  completionPercentage,
  blueprints,
  jobPhotos 
}) {
  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
            Project Progress Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Completion</span>
              <span className="text-2xl font-bold text-[#3B9FF3]">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-500 h-full rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{taskStats.completed}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-900">{taskStats.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Ready</p>
                  <p className="text-2xl font-bold text-purple-900">{taskStats.readyForInspection}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">{taskStats.pending}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Information Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contract Information */}
        {job.contract_amount && (
          <Card className="bg-white shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Contract Amount</p>
                  <p className="text-2xl font-bold text-[#3B9FF3]">
                    ${job.contract_amount.toLocaleString()}
                  </p>
                </div>
                {job.estimated_hours && (
                  <div>
                    <p className="text-sm text-slate-600">Estimated Hours</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {job.estimated_hours} hours
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Timeline */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-[#3B9FF3]" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Current Status</p>
                <Badge className={
                  job.status === 'completed' ? 'bg-green-500 text-white text-lg px-3 py-1' :
                  job.status === 'active' ? 'bg-blue-500 text-white text-lg px-3 py-1' :
                  'bg-slate-500 text-white text-lg px-3 py-1'
                }>
                  {job.status}
                </Badge>
              </div>
              {job.completed_date && (
                <div>
                  <p className="text-sm text-slate-600">Completion Date</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(job.completed_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {job.team_name && (
                <div>
                  <p className="text-sm text-slate-600">Assigned Team</p>
                  <p className="text-lg font-semibold text-slate-900">{job.team_name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Blueprints Quick Access */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                <ImageIcon className="w-8 h-8 text-[#3B9FF3]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Interactive Blueprints
                </h3>
                <p className="text-slate-600 text-sm">
                  View project blueprints with real-time task tracking
                </p>
                <div className="mt-2">
                  <Badge className="bg-[#3B9FF3] text-white">
                    {blueprints.length} blueprint{blueprints.length !== 1 ? 's' : ''} available
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos Quick Access */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Photo Documentation
                </h3>
                <p className="text-slate-600 text-sm">
                  Browse progress photos and evidence of completed work
                </p>
                <div className="mt-2">
                  <Badge className="bg-green-600 text-white">
                    {jobPhotos.length} photo{jobPhotos.length !== 1 ? 's' : ''} uploaded
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Notice */}
      <Card className="bg-blue-50 border-blue-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">24/7 Project Transparency</h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                This portal provides you with real-time access to your project's progress. You can view blueprints 
                with task locations, check completion status, and browse photo documentation at any time. 
                Our team updates this information regularly to keep you informed every step of the way.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}