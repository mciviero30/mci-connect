import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check, X, Clock, AlertTriangle, Calendar, Users } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { notifyTimeOffStatus } from "../components/notifications/notificationHelpers";
import { toast } from "sonner"; // Assuming sonner for toast notifications
import { Toaster } from "@/components/ui/sonner"; // Assuming Toaster component for sonner

export default function TimeOffRequests() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false); // Renamed from showNotesDialog
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(''); // Renamed from notes
  const [language, setLanguage] = useState('en'); // Added for toast messages

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });
  const isAdmin = user?.role === 'admin';

  const { data: requests, isLoading } = useQuery({
    queryKey: ['timeOffRequests'],
    queryFn: () => base44.entities.TimeOffRequest.list('-created_date'),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: []
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      const updatedRequest = await base44.entities.TimeOffRequest.update(requestId, { 
        status: 'approved',
        notes: 'Approved by admin'
      });
      
      // Send notification
      try {
        await notifyTimeOffStatus(request, 'approved', user);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      return updatedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      setShowDetailsDialog(false); // Close details dialog if open after approval
      setSelectedRequest(null); // Clear selected request
      toast.success(language === 'es' ? '✅ Solicitud aprobada' : '✅ Request approved');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const request = requests.find(r => r.id === requestId);
      const updatedRequest = await base44.entities.TimeOffRequest.update(requestId, { 
        status: 'rejected',
        notes: reason
      });
      
      // Send notification
      try {
        await notifyTimeOffStatus(request, 'rejected', user);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      return updatedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      setRejectDialogOpen(false);
      setShowDetailsDialog(false); // Close details dialog if open after rejection
      setSelectedRequest(null);
      setRejectionReason("");
      toast.success(language === 'es' ? '❌ Solicitud rechazada' : '❌ Request rejected');
    }
  });

  const handleAction = (request, status) => {
    setSelectedRequest(request);
    if (status === 'rejected') {
      setRejectDialogOpen(true);
    } else {
      approveMutation.mutate(request.id);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  const myRequests = requests.filter(r => r.employee_email === user?.email);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-300',
    approved: 'bg-green-100 text-green-700 border-green-300',
    rejected: 'bg-red-100 text-red-700 border-red-300'
  };

  const timeOffTypeColors = {
    vacation: 'bg-blue-100 text-blue-700',
    sick: 'bg-red-100 text-red-700',
    personal: 'bg-purple-100 text-purple-700',
    unpaid: 'bg-gray-100 text-gray-700'
  };

  // Get employee balance for time off type
  const getEmployeeBalance = (request) => {
    const employee = employees.find(e => e.email === request.employee_email);
    if (!employee) return null;

    switch (request.time_off_type) {
      case 'vacation':
        return employee.vacation_days_balance || 0;
      case 'sick':
        return employee.sick_days_balance || 0;
      case 'personal':
        return employee.personal_days_balance || 0;
      default:
        return null; // Unpaid doesn't have balance
    }
  };

  // Get conflicts for a request (other requests from same team in overlapping dates)
  const getConflicts = (request) => {
    if (!request.team_id) return [];

    const requestDates = eachDayOfInterval({
      start: new Date(request.start_date),
      end: new Date(request.end_date)
    });

    return requests.filter(r => 
      r.id !== request.id &&
      r.team_id === request.team_id &&
      (r.status === 'approved' || r.status === 'pending') &&
      requestDates.some(date => {
        const otherDates = eachDayOfInterval({
          start: new Date(r.start_date),
          end: new Date(r.end_date)
        });
        return otherDates.some(otherDate => isSameDay(date, otherDate));
      })
    );
  };

  const RequestCard = ({ request }) => {
    const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
    const balance = getEmployeeBalance(request);
    const conflicts = getConflicts(request);
    const hasConflict = conflicts.length > 0;
    const isOverBalance = balance !== null && request.total_days > balance;
    
    return (
      <Card className={`bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all ${hasConflict ? 'border-l-4 border-l-orange-400' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{request.employee_name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{request.employee_email}</p>
              {request.team_name && (
                <Badge className="mt-1 bg-slate-100 text-slate-700">
                  {request.team_name}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={statusColors[request.status]}>
                {request.status}
              </Badge>
              {request.time_off_type && (
                <Badge className={timeOffTypeColors[request.time_off_type]}>
                  {request.time_off_type}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Dates:</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Duration:</span>
              <span className="text-[#3B9FF3] dark:text-blue-400 font-semibold">
                {request.time_scope === 'partial_day' 
                  ? `${request.total_hours || 0}h` 
                  : `${request.total_days || days} day${(request.total_days || days) > 1 ? 's' : ''}`}
              </span>
            </div>

            {/* NEW: Days Remaining Column */}
            {balance !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Days Remaining:</span>
                <span className={`font-semibold ${isOverBalance ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {balance} days
                  {isOverBalance && (
                    <AlertTriangle className="w-4 h-4 inline ml-1 text-red-600" />
                  )}
                </span>
              </div>
            )}

            {/* NEW: Conflict Warning */}
            {hasConflict && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-800">
                  <strong>Conflict Alert:</strong> {conflicts.length} other team member{conflicts.length > 1 ? 's' : ''} {conflicts.length > 1 ? 'have' : 'has'} time off on these dates
                </div>
              </div>
            )}

            <div className="mt-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Reason:</p>
              <p className="text-sm text-slate-900 dark:text-white">{request.reason}</p>
            </div>

            {request.notes && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Admin Notes:</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{request.notes}</p>
              </div>
            )}
          </div>

          {request.status === 'pending' && isAdmin && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleViewDetails(request)}
                variant="outline"
                className="flex-1 bg-white border-slate-300 text-slate-700"
              >
                <Calendar className="w-4 h-4 mr-1" />
                View Details
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction(request, 'approved')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction(request, 'rejected')}
                variant="outline"
                className="flex-1 bg-white border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3">
            Requested: {format(new Date(request.created_date), 'MMM d, yyyy HH:mm')}
          </p>
        </CardContent>
      </Card>
    );
  };

  // Mini Calendar for Details Dialog
  const ConflictCalendar = ({ request }) => {
    if (!request) return null;

    const conflicts = getConflicts(request);
    const requestDates = eachDayOfInterval({
      start: new Date(request.start_date),
      end: new Date(request.end_date)
    });

    return (
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#3B9FF3]" />
          Team Availability Check
        </h4>

        {conflicts.length === 0 ? (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
            ✅ No conflicts - Team has full availability during these dates
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
              ⚠️ {conflicts.length} team member{conflicts.length > 1 ? 's' : ''} will be out:
            </div>
            {conflicts.map(conflict => (
              <div key={conflict.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{conflict.employee_name}</p>
                  <p className="text-xs text-slate-600">
                    {format(new Date(conflict.start_date), 'MMM d')} - {format(new Date(conflict.end_date), 'MMM d')}
                  </p>
                  <Badge className={`mt-1 ${statusColors[conflict.status]}`}>
                    {conflict.status}
                  </Badge>
                </div>
                {conflict.time_off_type && (
                  <Badge className={timeOffTypeColors[conflict.time_off_type]}>
                    {conflict.time_off_type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <h5 className="text-sm font-medium text-slate-700 mb-2">Requested Dates:</h5>
          <div className="flex flex-wrap gap-2">
            {requestDates.map((date, idx) => (
              <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                {format(date, 'MMM d')}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Time-Off Requests"
          description="Manage employee time-off requests"
          icon={CalendarClock}
        />

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{pending.length}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{approved.length}</p>
                </div>
                <Check className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">{rejected.length}</p>
                </div>
                <X className="w-10 h-10 text-red-600 dark:text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={isAdmin ? "pending" : "my_requests"} className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm rounded-xl shadow-lg p-2">
        <TabsList className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          {isAdmin && (
            <>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
                  Pending ({pending.length})
                  {pending.length > 0 && (
                    <Badge className="ml-2 bg-amber-500 text-white text-xs">{pending.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">All Requests ({requests.length})</TabsTrigger>
              </>
            )}
            <TabsTrigger value="my_requests" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">My Requests ({myRequests.length})</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <>
              <TabsContent value="pending">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {pending.map(request => <RequestCard key={request.id} request={request} />)}
                </div>
              </TabsContent>

              <TabsContent value="all">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {requests.map(request => <RequestCard key={request.id} request={request} />)}
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="my_requests">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {myRequests.map(request => <RequestCard key={request.id} request={request} />)}
            </div>
          </TabsContent>
        </Tabs>

        {/* Details Dialog with Conflict Calendar */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Request Details - {selectedRequest?.employee_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRequest && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-slate-600">Type:</Label>
                      <p className="font-medium">{selectedRequest.time_off_type || 'Unpaid'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Duration:</Label>
                      <p className="font-medium">
                        {selectedRequest.time_scope === 'partial_day' 
                          ? `${selectedRequest.total_hours || 0} hours` 
                          : `${selectedRequest.total_days || 0} days`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Dates:</Label>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.start_date), 'MMM d')} - {format(new Date(selectedRequest.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {selectedRequest.time_scope === 'partial_day' && (
                      <div>
                        <Label className="text-slate-600">Time:</Label>
                        <p className="font-medium">
                          {selectedRequest.start_time} - {selectedRequest.end_time}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-600">Reason:</Label>
                    <p className="text-slate-900 mt-1">{selectedRequest.reason}</p>
                  </div>

                  <ConflictCalendar request={selectedRequest} />
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="bg-white border-slate-300">
                Close
              </Button>
              {selectedRequest?.status === 'pending' && isAdmin && (
                <>
                  <Button 
                    onClick={() => {
                      setShowDetailsDialog(false);
                      approveMutation.mutate(selectedRequest.id);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setRejectDialogOpen(true); // Open reject dialog
                    }}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Reject Request - {selectedRequest?.employee_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for Rejection</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="bg-white border-slate-300 text-slate-900 mt-2"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="bg-white border-slate-300 text-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!rejectionReason) {
                    toast.error(language === 'es' ? 'Por favor, proporciona una razón para el rechazo' : 'Please provide a reason for rejection');
                    return;
                  }
                  rejectMutation.mutate({ 
                    requestId: selectedRequest.id, 
                    reason: rejectionReason 
                  });
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster /> {/* Toaster component for displaying toast notifications */}
    </div>
  );
}