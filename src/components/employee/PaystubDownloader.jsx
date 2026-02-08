import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export default function PaystubDownloader({ user }) {
  const [downloading, setDownloading] = useState(null);

  const { data: paystubs = [], isLoading } = useQuery({
    queryKey: ['myPaystubs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const payrolls = await base44.entities.WeeklyPayroll.filter({
        employee_email: user.email
      }, '-week_start_date', 12);
      
      return payrolls.map(p => ({
        id: p.id,
        week_start: p.week_start_date,
        week_end: p.week_end_date,
        total_pay: p.total_pay,
        normal_hours: p.normal_hours,
        overtime_hours: p.overtime_hours,
        created_date: p.created_date
      }));
    },
    enabled: !!user?.email,
  });

  const handleDownload = async (paystub) => {
    try {
      setDownloading(paystub.id);
      const { generatePaystub } = await import('@/functions/generatePaystub');
      const response = await generatePaystub({
        employee_email: user.email,
        week_start_date: paystub.week_start,
        week_end_date: paystub.week_end
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Paystub_${paystub.week_start}_${user.full_name.replace(/\s/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Paystubs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          My Paystubs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {paystubs.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
            No paystubs available yet
          </p>
        ) : (
          <div className="space-y-2">
            {paystubs.map(stub => (
              <div
                key={stub.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      Week of {format(new Date(stub.week_start), 'MMM d')} - {format(new Date(stub.week_end), 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ${stub.total_pay?.toFixed(2) || '0.00'}
                      </span>
                      <span>•</span>
                      <span>{stub.normal_hours}h normal</span>
                      {stub.overtime_hours > 0 && (
                        <>
                          <span>•</span>
                          <span>{stub.overtime_hours}h OT</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(stub)}
                  size="sm"
                  disabled={downloading === stub.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {downloading === stub.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}