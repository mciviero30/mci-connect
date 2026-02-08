import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Umbrella, 
  FileText, 
  DollarSign, 
  Shield, 
  Heart,
  Calendar,
  Download,
  Award,
  Building2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PTOTracker from '../components/employee/PTOTracker';
import PaystubDownloader from '../components/employee/PaystubDownloader';
import { Badge } from '@/components/ui/badge';

export default function EmployeeBenefits() {
  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['myDocuments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.EmployeeDocument.filter({
        employee_email: user.email
      }, '-created_date', 20);
    },
    enabled: !!user?.email,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Certification.filter({
        employee_email: user.email
      }, '-issue_date');
    },
    enabled: !!user?.email,
  });

  const benefitCards = [
    {
      title: 'Health Insurance',
      icon: Heart,
      color: 'from-red-500 to-pink-600',
      description: 'Medical, Dental, Vision coverage',
      action: 'Contact HR for details',
      status: 'Active'
    },
    {
      title: '401(k) Plan',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      description: 'Retirement savings with company match',
      action: 'Contact HR for enrollment',
      status: 'Available'
    },
    {
      title: 'Workers Comp',
      icon: Shield,
      color: 'from-blue-500 to-indigo-600',
      description: 'Injury and accident protection',
      action: 'Covered automatically',
      status: 'Active'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-20 md:pb-0">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Benefits</h1>
              <p className="text-slate-600 dark:text-slate-400">Manage your time off, paystubs, and documents</p>
            </div>
          </div>
        </div>

        {/* PTO & Paystubs Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <PTOTracker user={user} />
          <PaystubDownloader user={user} />
        </div>

        {/* Benefits Cards */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Employee Benefits
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {benefitCards.map((benefit, idx) => (
              <Card key={idx} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-12 h-12 bg-gradient-to-br ${benefit.color} rounded-xl flex items-center justify-center shadow-md`}>
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {benefit.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {benefit.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {benefit.action}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* My Documents */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              My Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
                No documents uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {doc.document_name}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {doc.document_type} • {new Date(doc.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open(doc.file_url, '_blank')}
                      size="sm"
                      variant="outline"
                      className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          <Link to={createPageUrl('TimeOffRequests')}>
            <Button className="w-full h-20 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white flex-col gap-2">
              <Calendar className="w-6 h-6" />
              <span className="text-sm font-semibold">Request Time Off</span>
            </Button>
          </Link>
          <Link to={createPageUrl('MyPayroll')}>
            <Button className="w-full h-20 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-col gap-2">
              <DollarSign className="w-6 h-6" />
              <span className="text-sm font-semibold">View Payroll</span>
            </Button>
          </Link>
          <Link to={createPageUrl('Capacitacion')}>
            <Button className="w-full h-20 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex-col gap-2">
              <Award className="w-6 h-6" />
              <span className="text-sm font-semibold">Training</span>
            </Button>
          </Link>
          <Link to={createPageUrl('MyProfile')}>
            <Button className="w-full h-20 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span className="text-sm font-semibold">My Profile</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}