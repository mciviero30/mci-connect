import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Mail, Trash2, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ClientAppDemo() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all demo users (marked in PendingEmployee as demo)
  const { data: demoUsers = [], isLoading } = useQuery({
    queryKey: ['demo-users'],
    queryFn: async () => {
      const pending = await base44.entities.PendingEmployee.filter({ 
        position: 'demo_user' 
      });
      
      // Check if each has registered as User
      const enriched = await Promise.all(
        pending.map(async (p) => {
          try {
            const users = await base44.entities.User.filter({ email: p.email });
            return {
              ...p,
              registered_user: users.length > 0 ? users[0] : null
            };
          } catch {
            return { ...p, registered_user: null };
          }
        })
      );
      
      return enriched;
    },
  });

  const inviteDemoUser = async () => {
    if (!email || !name) {
      toast.error("Please enter both name and email");
      return;
    }

    setIsInviting(true);
    try {
      // Mark as demo user FIRST
      await base44.entities.PendingEmployee.create({
        email: email,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        position: 'demo_user',
        status: 'invited',
        notes: 'DEMO_USER - Sandbox access only'
      });

      // Then invite as regular user
      await base44.users.inviteUser(email, "user");
      
      toast.success(`Demo invitation sent to ${email}. Once they register, manually convert them to demo role.`);
      setEmail("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    } catch (error) {
      toast.error(error.message || "Failed to send invitation");
      console.error(error);
    } finally {
      setIsInviting(false);
    }
  };

  const convertToDemo = useMutation({
    mutationFn: async (email) => {
      const { convertPendingToDemo } = await import("@/functions/convertPendingToDemo");
      const response = await convertPendingToDemo({ email });
      return response.data;
    },
    onSuccess: () => {
      toast.success("User converted to demo role");
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to convert user");
    },
  });

  const deleteDemoUser = useMutation({
    mutationFn: async (demoId) => {
      await base44.entities.PendingEmployee.delete(demoId);
    },
    onSuccess: () => {
      toast.success("Demo user removed");
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove demo user");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Client App Demo</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Invite clients to explore MCI Connect without accessing your real data
            </p>
          </div>
          <Badge variant="outline" className="px-4 py-2">
            <Eye className="w-4 h-4 mr-2" />
            {demoUsers.length} Active Demos
          </Badge>
        </div>

        {/* How it works */}
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm text-slate-700 dark:text-slate-300">
            <strong>How Demo Mode Works:</strong>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Demo users can create their own test data (quotes, jobs, customers, etc.)</li>
              <li>They <strong>cannot see</strong> your real company data (employees, projects, financials)</li>
              <li>Each demo user only sees data they created themselves</li>
              <li>Perfect for client presentations and training</li>
              <li>Demo data is isolated and can be cleaned up anytime</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Invite Form */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invite Demo User
            </CardTitle>
            <CardDescription>
              Send an invitation to explore MCI Connect in sandbox mode
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Full Name
                </label>
                <Input
                  placeholder="e.g., Staci Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g., staci@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <Button
              onClick={inviteDemoUser}
              disabled={isInviting || !email || !name}
              className="mt-4 w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isInviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Demo Invitation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Active Demo Users */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
            <CardTitle>Active Demo Users</CardTitle>
            <CardDescription>
              Manage users with sandbox access
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {demoUsers.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No demo users yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Invite your first demo user to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {demoUsers.map((user) => {
                  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                  return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {fullName || "Demo User"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                        {user.status === 'invited' && (
                          <Badge variant="outline" className="mt-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                            Invitation Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {user.registered_user && user.registered_user.role !== 'demo' && (
                        <Button
                          size="sm"
                          onClick={() => convertToDemo.mutate(user.email)}
                          disabled={convertToDemo.isPending}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                          {convertToDemo.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Converting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-2" />
                              Convert to Demo
                            </>
                          )}
                        </Button>
                      )}
                      {user.registered_user?.role === 'demo' ? (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Demo Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          Demo Access
                        </Badge>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Demo User</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove <strong>{fullName || user.email}</strong> from demo access?
                              Their sandbox data will remain but they won't be able to login.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteDemoUser.mutate(user.id)}
                              disabled={deleteDemoUser.isPending}
                            >
                              {deleteDemoUser.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                "Remove Access"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}