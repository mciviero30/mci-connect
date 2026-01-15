import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  Clock,
  Receipt,
  Car,
  AlertTriangle,
  Loader2,
  TrendingUp,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "../components/shared/PageHeader";
import { format, startOfYear, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AIPerformanceAnalyzer from "../components/empleados/AIPerformanceAnalyzer";
import EditEmployeeForm from "../components/empleados/EditEmployeeForm";
import { getDisplayName, capitalizeName, formatPosition } from "@/components/utils/nameHelpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EmployeeQRCode from "@/components/compliance/EmployeeQRCode";
import { canViewSensitiveEmployeeData, maskSSN } from "@/components/utils/employeeSecurity";

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('id');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [profileImageKey, setProfileImageKey] = useState(Date.now());

  const [editForm, setEditForm] = useState({});

  const { data: currentUser } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: employee, isLoading, refetch: refetchEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const employees = await base44.entities.User.list();
      return employees.find(e => e.id === employeeId);
    },
    enabled: !!employeeId
  });

  // Listen for profile updates
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      const timestamp = localStorage.getItem('profile_timestamp');
      if (timestamp) {
        setProfileImageKey(Date.now());
        refetchEmployee();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [refetchEmployee]);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['employeeTimeEntries', employee?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['employeeExpenses', employee?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['employeeDrivingLogs', employee?.email],
    queryFn: () => base44.entities.DrivingLog.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['employeeAssignments', employee?.email],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    enabled: !!employeeId,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['employeeCertifications', employee?.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee?.email,
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['employeeRecognitions', employee?.email],
    queryFn: () => base44.entities.Recognition.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee?.email,
  });

  // NEW: Prompt #54 - Calculate Performance KPIs for current month
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const { data: monthTimeEntries = [] } = useQuery({
    queryKey: ['monthTimeEntries', employeeId],
    queryFn: async () => {
      if (!employee) return [];
      const entries = await base44.entities.TimeEntry.filter({ 
        employee_email: employee.email,
        status: 'approved'
      });
      return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= currentMonthStart && entryDate <= currentMonthEnd;
      });
    },
    enabled: !!employee,
    initialData: []
  });

  const { data: monthExpenses = [] } = useQuery({
    queryKey: ['monthExpenses', employeeId],
    queryFn: async () => {
      if (!employee) return [];
      const expenses = await base44.entities.Expense.filter({ 
        employee_email: employee.email,
        status: 'approved'
      });
      return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd;
      });
    },
    enabled: !!employee,
    initialData: []
  });

  const { data: monthDrivingLogs = [] } = useQuery({
    queryKey: ['monthDrivingLogs', employeeId],
    queryFn: async () => {
      if (!employee) return [];
      const logs = await base44.entities.DrivingLog.filter({ 
        employee_email: employee.email,
        status: 'approved'
      });
      return logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= currentMonthStart && logDate <= currentMonthEnd;
      });
    },
    enabled: !!employee,
    initialData: []
  });

  // NEW: Prompt #63 - Employee Documents
  const { data: employeeDocuments = [] } = useQuery({
    queryKey: ['employeeDocuments', employee?.email],
    queryFn: () => base44.entities.EmployeeDocument.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  // Certifications for Certification Vault
  const { data: employeeCertifications = [] } = useQuery({
    queryKey: ['employeeCertifications', employee?.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: employee.email }),
    initialData: [],
    enabled: !!employee
  });

  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    document_type: 'contract',
    document_name: '',
    expiration_date: '',
    notes: ''
  });

  // Certification vault state
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [uploadingCertification, setUploadingCertification] = useState(false);
  const [certificationForm, setCertificationForm] = useState({
    certification_type: 'osha_30',
    certificate_front_url: '',
    certificate_back_url: '',
    issue_date: '',
    expiration_date: '',
    notes: ''
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    }
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDocuments'] });
      setShowDocumentDialog(false);
      setDocumentForm({
        document_type: 'contract',
        document_name: '',
        expiration_date: '',
        notes: ''
      });
      alert('✅ Document uploaded successfully!');
    }
  });

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!employee || !currentUser) {
        alert('Employee or current user information missing. Cannot upload document.');
        return;
    }

    setUploadingDocument(true);
    try {
      const file_url = await uploadDocumentMutation.mutateAsync(file);
      
      const documentData = {
        employee_email: employee.email,
        employee_name: employee.full_name,
        document_type: documentForm.document_type,
        document_name: documentForm.document_name || file.name,
        file_url,
        expiration_date: documentForm.expiration_date || null,
        notes: documentForm.notes,
        uploaded_by_email: currentUser.email,
        uploaded_by_name: currentUser.full_name,
        status: 'active'
      };

      // Check if expiring soon
      if (documentForm.expiration_date) {
        const expiryDate = new Date(documentForm.expiration_date);
        const today = new Date();
        const daysUntilExpiry = differenceInDays(expiryDate, today);
        if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
          documentData.status = 'expiring_soon';
        } else if (daysUntilExpiry <= 0) {
          documentData.status = 'expired';
        }
      }

      await createDocumentMutation.mutateAsync(documentData);
    } catch (error) {
      alert('❌ Error uploading document: ' + error.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDocuments'] });
      alert('✅ Document deleted successfully!');
    }
  });

  // Certification mutations
  const createCertificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Certification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeCertifications'] });
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      setShowCertificationDialog(false);
      setCertificationForm({
        certification_type: 'osha_30',
        certificate_front_url: '',
        certificate_back_url: '',
        issue_date: '',
        expiration_date: '',
        notes: ''
      });
      alert('✅ Certification uploaded successfully!');
    }
  });

  const deleteCertificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Certification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeCertifications'] });
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      alert('✅ Certification deleted successfully!');
    }
  });

  const handleCertificationUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCertification(true);
    try {
      const file_url = await uploadDocumentMutation.mutateAsync(file);
      setCertificationForm({...certificationForm, [field]: file_url});
    } catch (error) {
      alert('❌ Error uploading file: ' + error.message);
    } finally {
      setUploadingCertification(false);
    }
  };

  const handleCertificationSubmit = () => {
    if (!certificationForm.certificate_front_url) {
      alert('Please upload at least the front of the certificate');
      return;
    }

    const certData = {
      employee_email: employee.email,
      employee_name: employee.full_name,
      certification_type: certificationForm.certification_type,
      certificate_front_url: certificationForm.certificate_front_url,
      certificate_back_url: certificationForm.certificate_back_url || null,
      issue_date: certificationForm.issue_date || null,
      expiration_date: certificationForm.expiration_date || null,
      notes: certificationForm.notes,
      status: 'active'
    };

    // Check if expiring soon or expired
    if (certificationForm.expiration_date) {
      const expiryDate = new Date(certificationForm.expiration_date);
      const today = new Date();
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
        certData.status = 'expiring_soon';
      } else if (daysUntilExpiry <= 0) {
        certData.status = 'expired';
      }
    }

    createCertificationMutation.mutate(certData);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = [
        ...timeEntries.map(e => base44.entities.TimeEntry.delete(e.id)),
        ...expenses.map(e => base44.entities.Expense.delete(e.id)),
        ...drivingLogs.map(e => base44.entities.DrivingLog.delete(e.id)),
        ...assignments.map(e => base44.entities.JobAssignment.delete(e.id)),
        // Also delete employee documents
        ...employeeDocuments.map(doc => base44.entities.EmployeeDocument.delete(doc.id))
      ];
      await Promise.all(deletePromises);
      setDeleteSuccess(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setTimeout(() => {
        alert(`✅ Employee deleted successfully!\n\n⚠️ IMPORTANT: To block access to the app:\n\n1. Go to Dashboard → Data → User\n2. Find: ${employee.email}\n3. Change employment_status to: deleted\n\nThis will prevent them from logging in.`);
        navigate(createPageUrl('Empleados'));
      }, 2000);
    }
  });

  const fixNameMutation = useMutation({
    mutationFn: async () => {
      const updates = {};
      let needsUpdate = false;

      if (employee.first_name && employee.first_name !== capitalizeName(employee.first_name)) {
        updates.first_name = capitalizeName(employee.first_name);
        needsUpdate = true;
      }

      if (employee.last_name && employee.last_name !== capitalizeName(employee.last_name)) {
        updates.last_name = capitalizeName(employee.last_name);
        needsUpdate = true;
      }

      const correctFullName = getDisplayName(employee);
      if (employee.full_name !== correctFullName) {
        updates.full_name = correctFullName;
        needsUpdate = true;
      }

      if (employee.position && employee.position !== formatPosition(employee.position)) {
        updates.position = formatPosition(employee.position);
        needsUpdate = true;
      }

      if (employee.department && employee.department !== capitalizeName(employee.department)) {
        updates.department = capitalizeName(employee.department);
        needsUpdate = true;
      }

      if (employee.address && employee.address !== capitalizeName(employee.address)) {
        updates.address = capitalizeName(employee.address);
        needsUpdate = true;
      }

      if (!needsUpdate) {
        return { success: false, reason: 'no_changes' };
      }

      const isCurrentUser = currentUser && employee.email === currentUser.email;

      try {
        if (isCurrentUser) {
          await base44.auth.updateMe(updates);
          return { success: true, updates, method: 'updateMe' };
        } else {
          await base44.entities.User.update(employee.id, updates);
          return { success: true, updates, method: 'directUpdate' };
        }
      } catch (error) {
        console.error('Failed to update user:', error);
        return { 
          success: false, 
          reason: 'permission_error', 
          updates,
          error: error.message 
        };
      }
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.reason === 'no_changes') {
          alert('✓ El nombre ya está correctamente capitalizado');
        } else if (result.reason === 'permission_error') {
          const updateInstructions = `❌ No se pudo actualizar automáticamente por permisos.\n\n` +
            `📝 Por favor actualiza manualmente:\n\n` +
            `1. Abre Dashboard en el navegador\n` +
            `2. Ve a: Dashboard → Data → User\n` +
            `3. Busca: ${employee.email}\n` +
            `4. Haz clic en Edit\n` +
            `5. Actualiza estos campos:\n\n` +
            Object.entries(result.updates)
              .map(([key, value]) => `   • ${key}: ${value}`)
              .join('\n') +
            `\n\n6. Haz clic en Save`;
          
          alert(updateInstructions);
          window.open('https://app.base44.com/dashboard/data/User', '_blank');
        }
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // currentUser NOT invalidated - only if editing self
      
      alert(`✅ Nombre corregido exitosamente!\n\nCambios aplicados:\n${Object.entries(result.updates).map(([k,v]) => `• ${k}: ${v}`).join('\n')}\n\nRecargando página...`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      alert(`❌ Error al corregir nombre: ${error.message}`);
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data) => {
      // Ensure first_name and last_name are populated from full_name if needed
      let firstName = data.first_name || employee.first_name || '';
      let lastName = data.last_name || employee.last_name || '';
      
      // If full_name changed but first/last are missing, split the full_name
      if (data.full_name && (!firstName || !lastName)) {
        const parts = data.full_name.split(' ').filter(p => p);
        if (parts.length >= 2) {
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        } else if (parts.length === 1) {
          firstName = parts[0];
          lastName = '';
        }
      }
      
      // Auto-capitalize names
      firstName = capitalizeName(firstName);
      lastName = capitalizeName(lastName);
      const fullName = capitalizeName(data.full_name || `${firstName} ${lastName}`.trim());
      
      const updatePayload = {
        ...data,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        position: data.position ? formatPosition(data.position) : data.position,
        department: data.department || null,
        address: data.address ? capitalizeName(data.address) : data.address,
        team_id: data.team_id || null,
        team_name: data.team_name || null
      };
      
      console.log('💾 Saving employee data:', updatePayload);
      
      if (currentUser && employee.email === currentUser.email) {
        await base44.auth.updateMe(updatePayload);
      } else {
        try {
          await base44.entities.User.update(employee.id, updatePayload);
        } catch (error) {
          console.error('Direct update failed:', error);
          throw new Error('UPDATE_FAILED');
        }
      }
      return updatePayload;
    },
    onSuccess: async (data) => {
      try {
        const existingDirectory = await base44.entities.EmployeeDirectory.list();
        const directoryEntry = existingDirectory.find(d => d.employee_email === employee.email);

        const directoryData = {
          employee_email: employee.email,
          full_name: data.full_name,
          position: data.position || '',
          department: data.department || '',
          phone: data.phone || '',
          profile_photo_url: employee.profile_photo_url || '',
          status: 'active'
        };

        if (directoryEntry) {
          await base44.entities.EmployeeDirectory.update(directoryEntry.id, directoryData);
        } else {
          await base44.entities.EmployeeDirectory.create(directoryData);
        }
      } catch (error) {
        console.error('Directory sync error:', error);
      }

      // Invalidate all relevant queries EXCEPT currentUser
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // currentUser updated separately if needed
      queryClient.invalidateQueries({ queryKey: ['employeeDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });

      // Trigger profile sync event
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));

      setShowEditDialog(false);
      alert('✅ Employee updated successfully!');

      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      if (error.message === 'UPDATE_FAILED') {
        alert(`❌ Cannot update automatically due to permissions.\n\nPlease update manually through Dashboard → Data → User`);
      } else {
        alert(`❌ Error: ${error.message}`);
      }
      setShowEditDialog(false);
    }
  });

  // Determine user permissions
  const isEditingSelf = currentUser && employee && currentUser.email === employee.email;
  const canViewSensitive = canViewSensitiveEmployeeData(currentUser);
  
  const isAdmin = currentUser?.role === 'admin';
  const isCEO = currentUser?.position === 'CEO';
  const isHR = currentUser?.department === 'HR' || currentUser?.department === 'hr';
  const isManager = currentUser?.position === 'manager';
  
  const canEditSensitiveFields = canViewSensitive;
  const canEditPositionDepartment = isAdmin || isCEO || isHR || isManager;
  const canOnlyEditBasicInfo = isEditingSelf && !canEditSensitiveFields;



  // NEW: Prompt #54 - Calculate KPIs
  const performanceKPIs = React.useMemo(() => {
    const totalHours = monthTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    const totalMiles = monthDrivingLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    
    // Count time audit flags (entries that required review)
    const auditFlags = monthTimeEntries.filter(entry => 
      entry.requires_location_review || entry.exceeds_max_hours
    ).length;

    // Open tasks (simplified - would need job assignments data)
    // For now, let's count assignments that are not marked as 'completed' or 'canceled'
    const openTasks = assignments.filter(assign => 
      !['completed', 'canceled'].includes(assign.status)
    ).length;

    return {
      totalHours,
      totalMiles,
      auditFlags,
      openTasks
    };
  }, [monthTimeEntries, monthDrivingLogs, assignments]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-gray-800">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-gray-800">Employee not found</div>
      </div>
    );
  }

  // Build proper display name from first_name + last_name
  const displayName = (() => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (employee.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
      return employee.full_name;
    }
    return getDisplayName(employee);
  })();

  const needsNameCorrection =
    (employee.first_name && employee.first_name !== capitalizeName(employee.first_name)) ||
    (employee.last_name && employee.last_name !== capitalizeName(employee.last_name)) ||
    (employee.full_name !== getDisplayName(employee)) ||
    (employee.position && employee.position !== formatPosition(employee.position)) ||
    (employee.department && employee.department !== capitalizeName(employee.department)) ||
    (employee.address && employee.address !== capitalizeName(employee.address));

  const yearStart = startOfYear(new Date());
  const ytdTimeEntries = timeEntries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= yearStart && e.status === 'approved';
  });

  const totalHours = ytdTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalPay = totalHours * (employee.hourly_rate || 25);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const totalMiles = drivingLogs.reduce((sum, log) => sum + (log.miles || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={displayName}
          description={capitalizeName(employee.position) || 'Employee'}
          icon={User}
          showBack
          actions={
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Employee
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Employee
              </Button>
            </div>
          }
        />



        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md border border-gray-200 bg-white text-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Hours (YTD)</CardTitle>
              <Clock className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalHours.toFixed(1)}h</div>
              <p className="text-sm text-gray-600 mt-1">${totalPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border border-gray-200 bg-white text-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
              <Receipt className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <p className="text-sm text-gray-600 mt-1">Approved: ${approvedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border border-gray-200 bg-white text-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Miles</CardTitle>
              <Car className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalMiles.toFixed(1)}</div>
              <p className="text-sm text-gray-600 mt-1">Driving logs</p>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Prompt #54 - Performance KPIs Section */}
        <Card className="bg-white shadow-xl border-slate-200 mb-8">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
              Performance KPIs - {format(new Date(), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[#3B9FF3]" />
                  <span className="text-sm text-slate-600 font-medium">Total Hours</span>
                </div>
                <p className="text-3xl font-bold text-[#3B9FF3]">{performanceKPIs.totalHours.toFixed(1)}h</p>
                <p className="text-xs text-slate-500 mt-1">Approved hours this month</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600 font-medium">Mileage</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{performanceKPIs.totalMiles.toFixed(0)} mi</p>
                <p className="text-xs text-slate-500 mt-1">Approved miles this month</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-slate-600 font-medium">Time Audit Flags</span>
                </div>
                <p className="text-3xl font-bold text-amber-600">{performanceKPIs.auditFlags}</p>
                <p className="text-xs text-slate-500 mt-1">Entries requiring review</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-slate-600 font-medium">Open Tasks</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{performanceKPIs.openTasks}</p>
                <p className="text-xs text-slate-500 mt-1">Pending job assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-1 shadow-md border border-gray-200 bg-white text-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900">Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const profileImage = employee.preferred_profile_image === 'avatar' && employee.avatar_image_url
                  ? employee.avatar_image_url
                  : employee.profile_photo_url;
                
                return profileImage ? (
                  <img
                    key={profileImageKey}
                    src={`${profileImage}?v=${profileImageKey}`}
                    alt={getDisplayName(employee)}
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30 mx-auto"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto">
                    {getDisplayName(employee)?.[0]?.toUpperCase()}
                  </div>
                );
              })()}

              <div className="space-y-3 text-sm">
                {employee.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{employee.email}</span>
                  </div>
                )}

                {employee.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{employee.phone}</span>
                  </div>
                )}

                {employee.position && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span>{formatPosition(employee.position)}</span>
                  </div>
                )}

                {employee.department && (
                  <div className="text-gray-700">
                    <Badge variant="outline" className="text-blue-700 border-blue-200 text-sm px-3 py-1">
                      {capitalizeName(employee.department)}
                    </Badge>
                  </div>
                )}

                {(() => {
                  const teamName = employee.team_name || (employee.team_id ? teams.find(t => t.id === employee.team_id)?.team_name : null);
                  return teamName ? (
                    <div className="text-gray-700">
                      <span className="text-xs text-gray-500 block mb-1">Team:</span>
                      <Badge variant="outline" className="text-blue-700 border-blue-200">{teamName}</Badge>
                    </div>
                  ) : null;
                })()}

                {employee.address && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-xs">{capitalizeName(employee.address)}</span>
                  </div>
                )}

                {employee.dob && canViewSensitive && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Born: {format(new Date(employee.dob), 'MMM dd, yyyy')}</span>
                  </div>
                )}

                {employee.hire_date && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Hired: {format(new Date(employee.hire_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}

                {employee.hourly_rate && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>${employee.hourly_rate}/hour</span>
                  </div>
                )}

                {employee.tshirt_size && (
                  <div className="text-gray-700">
                    T-Shirt: <Badge variant="outline" className="text-blue-700 border-blue-200">{employee.tshirt_size}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <EmployeeQRCode employee={employee} />
            
            <AIPerformanceAnalyzer
              employee={employee}
              timeEntries={timeEntries}
              jobs={jobs}
              expenses={expenses}
              drivingLogs={drivingLogs}
              certifications={certifications}
              recognitions={recognitions}
              allEmployees={allEmployees}
              showFullAnalysis={true}
            />
          </div>
        </div>

        <div className="mt-8">
          <Card className="shadow-md border border-gray-200 bg-white text-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900">Activity & Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="time">
                <TabsList className="bg-gray-100 border border-gray-200 text-gray-700">
                  <TabsTrigger value="certifications">
                    <Shield className="w-4 h-4 mr-2" />
                    Certifications ({employeeCertifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="time">Time Entries ({timeEntries.length})</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
                  <TabsTrigger value="driving">Driving ({drivingLogs.length})</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
                  <TabsTrigger value="documents">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents ({employeeDocuments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="time" className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {timeEntries.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No time entries</p>
                  ) : (
                    timeEntries.map(entry => (
                      <div key={entry.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-900 font-medium">{entry.job_name || 'No job'}</p>
                            <p className="text-sm text-gray-600">{format(new Date(entry.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 font-bold">{entry.hours_worked}h</p>
                            <Badge className={
                              entry.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                              entry.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }>
                              {entry.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="expenses" className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No expenses</p>
                  ) : (
                    expenses.map(expense => (
                      <div key={expense.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-900 font-medium">{expense.description}</p>
                            <p className="text-sm text-gray-600">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                            <Badge variant="outline" className="mt-1 text-gray-700 border-gray-300">{expense.category}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 font-bold">${expense.amount.toFixed(2)}</p>
                            <Badge className={
                              expense.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                              expense.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }>
                              {expense.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="driving" className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {drivingLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No driving logs</p>
                  ) : (
                    drivingLogs.map(log => (
                      <div key={log.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-900 font-medium">{log.job_name || 'No job'}</p>
                            <p className="text-sm text-gray-600">{format(new Date(log.date), 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-gray-500 mt-1">{log.miles} miles • {log.hours}h</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 font-bold">${log.total_amount?.toFixed(2) || '0.00'}</p>
                            <Badge className={
                              log.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                              log.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }>
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="assignments" className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {assignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No assignments</p>
                  ) : (
                    assignments.map(assignment => (
                      <div key={assignment.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-900 font-medium">{assignment.job_name}</p>
                            <p className="text-sm text-gray-600">{format(new Date(assignment.date), 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {assignment.start_time} - {assignment.end_time}
                            </p>
                          </div>
                          <Badge className={
                              assignment.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                              assignment.status === 'canceled' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }>
                              {assignment.status}
                            </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* NEW: Prompt #63 - Documents Tab Content */}
                {/* Certification Vault Tab */}
                <TabsContent value="certifications" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Certification Vault</h3>
                    <Button
                      onClick={() => setShowCertificationDialog(true)}
                      className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>

                  {employeeCertifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No certifications on file</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {employeeCertifications.map(cert => {
                        const isExpiringSoon = cert.status === 'expiring_soon';
                        const isExpired = cert.status === 'expired';

                        return (
                          <div key={cert.id} className={`p-4 rounded-lg border ${
                            isExpired ? 'bg-red-50 border-red-300' :
                            isExpiringSoon ? 'bg-amber-50 border-amber-300' :
                            'bg-green-50 border-green-300'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield className="w-5 h-5 text-[#3B9FF3]" />
                                  <h4 className="font-semibold text-gray-900">
                                    {cert.certification_type.replace(/_/g, ' ').toUpperCase()}
                                  </h4>
                                  {isExpired && (
                                    <Badge className="bg-red-100 text-red-700">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Expired
                                    </Badge>
                                  )}
                                  {isExpiringSoon && (
                                    <Badge className="bg-amber-100 text-amber-700">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Expiring Soon
                                    </Badge>
                                  )}
                                  {cert.status === 'active' && (
                                    <Badge className="bg-green-100 text-green-700">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {cert.issue_date && (
                                    <p><strong>Issued:</strong> {format(new Date(cert.issue_date), 'MMM dd, yyyy')}</p>
                                  )}
                                  {cert.expiration_date && (
                                    <p>
                                      <strong>Expires:</strong> {format(new Date(cert.expiration_date), 'MMM dd, yyyy')}
                                      {isExpiringSoon && (
                                        <span className="ml-2 text-amber-600 font-semibold">
                                          ({differenceInDays(new Date(cert.expiration_date), new Date())} days remaining)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {cert.notes && <p><strong>Notes:</strong> {cert.notes}</p>}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {cert.certificate_front_url && (
                                  <a
                                    href={cert.certificate_front_url}
                                    download
                                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                    title="Download Front"
                                  >
                                    Front ↓
                                  </a>
                                )}
                                {cert.certificate_back_url && (
                                  <a
                                    href={cert.certificate_back_url}
                                    download
                                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                    title="Download Back"
                                  >
                                    Back ↓
                                  </a>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Delete this certification?')) {
                                      deleteCertificationMutation.mutate(cert.id);
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Employee Documents</h3>
                    <Button
                      onClick={() => setShowDocumentDialog(true)}
                      className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>

                  {employeeDocuments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No documents uploaded</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {employeeDocuments.map(doc => {
                        const isExpiringSoon = doc.status === 'expiring_soon';
                        const isExpired = doc.status === 'expired';
                        
                        return (
                          <div key={doc.id} className={`p-4 rounded-lg border ${
                            isExpired ? 'bg-red-50 border-red-300' :
                            isExpiringSoon ? 'bg-amber-50 border-amber-300' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-5 h-5 text-[#3B9FF3]" />
                                  <h4 className="font-semibold text-gray-900">{doc.document_name}</h4>
                                  {isExpired && (
                                    <Badge className="bg-red-100 text-red-700">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Expired
                                    </Badge>
                                  )}
                                  {isExpiringSoon && (
                                    <Badge className="bg-amber-100 text-amber-700">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Expiring Soon
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p><strong>Type:</strong> {doc.document_type.replace(/_/g, ' ').toUpperCase()}</p>
                                  {doc.expiration_date && (
                                    <p>
                                      <strong>Expires:</strong> {format(new Date(doc.expiration_date), 'MMM dd, yyyy')}
                                      {isExpiringSoon && (
                                        <span className="ml-2 text-amber-600 font-semibold">
                                          ({differenceInDays(new Date(doc.expiration_date), new Date())} days remaining)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {doc.notes && <p><strong>Notes:</strong> {doc.notes}</p>}
                                  <p className="text-xs text-gray-500">
                                    Uploaded by {doc.uploaded_by_name} on {format(new Date(doc.created_date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                  View
                                </a>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Delete this document?')) {
                                      deleteDocumentMutation.mutate(doc.id);
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-white text-gray-900 border-gray-200 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit Employee</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update employee information
              </DialogDescription>
            </DialogHeader>

            <EditEmployeeForm 
              employee={employee}
              currentUser={currentUser}
              onFormChange={setEditForm}
            />

            <DialogFooter className="mt-6 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(false)} 
                className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const submitData = {
                    ...editForm,
                    hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null,
                    department: editForm.department || null,
                    team_id: editForm.team_id || null,
                    team_name: editForm.team_name || null,
                    role: editForm.role || 'user'
                  };
                  
                  // Strip sensitive fields if user can't edit them
                  if (!canViewSensitive) {
                    delete submitData.dob;
                    delete submitData.ssn_tax_id;
                  }
                  
                  console.log('📤 Submitting form data:', submitData);
                  updateEmployeeMutation.mutate(submitData);
                }}
                disabled={updateEmployeeMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex-1"
              >
                {updateEmployeeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-white border-gray-200 text-gray-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Employee
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {deleteSuccess ? (
                  <div className="text-green-600 text-center py-4">
                    ✓ Employee deleted successfully!
                    <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
                  </div>
                ) : (
                  <>
                    <p className="mb-4">This will delete all employee data and block their access.</p>
                    <p className="mt-4 font-bold text-yellow-600">⚠️ This action cannot be undone!</p>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {!deleteSuccess && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200">
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Employee'}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Certification Upload Dialog */}
        <Dialog open={showCertificationDialog} onOpenChange={setShowCertificationDialog}>
          <DialogContent className="bg-white text-gray-900 border-gray-200 max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Add Certification</DialogTitle>
              <DialogDescription className="text-gray-600">
                Upload a certification for {employee?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cert_type" className="text-gray-900">Certification Type *</Label>
                <select
                  id="cert_type"
                  value={certificationForm.certification_type}
                  onChange={(e) => setCertificationForm({...certificationForm, certification_type: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-md px-3 py-2"
                  required
                >
                  <option value="osha_10">OSHA 10</option>
                  <option value="osha_30">OSHA 30</option>
                  <option value="forklift">Forklift Certification</option>
                  <option value="scissor_lift">Scissor Lift Certification</option>
                  <option value="fall_protection">Fall Protection Training</option>
                  <option value="scaffolding">Scaffolding Certification</option>
                  <option value="first_aid">First Aid Certification</option>
                  <option value="cpr">CPR Certification</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">Certificate Front *</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleCertificationUpload(e, 'certificate_front_url')}
                    disabled={uploadingCertification}
                    className="bg-gray-50"
                  />
                  {certificationForm.certificate_front_url && (
                    <p className="text-sm text-green-600 mt-1">✓ Front uploaded</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-900">Certificate Back (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleCertificationUpload(e, 'certificate_back_url')}
                    disabled={uploadingCertification}
                    className="bg-gray-50"
                  />
                  {certificationForm.certificate_back_url && (
                    <p className="text-sm text-green-600 mt-1">✓ Back uploaded</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">Issue Date</Label>
                  <Input
                    type="date"
                    value={certificationForm.issue_date}
                    onChange={(e) => setCertificationForm({...certificationForm, issue_date: e.target.value})}
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label className="text-gray-900">Expiration Date</Label>
                  <Input
                    type="date"
                    value={certificationForm.expiration_date}
                    onChange={(e) => setCertificationForm({...certificationForm, expiration_date: e.target.value})}
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-900">Notes</Label>
                <Input
                  value={certificationForm.notes}
                  onChange={(e) => setCertificationForm({...certificationForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="bg-gray-50"
                />
              </div>

              {uploadingCertification && (
                <p className="text-sm text-blue-600">Uploading file...</p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCertificationDialog(false)}
                className="bg-gray-100 border-gray-200"
                disabled={uploadingCertification || createCertificationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCertificationSubmit}
                disabled={uploadingCertification || createCertificationMutation.isPending || !certificationForm.certificate_front_url}
                className="bg-[#3B9FF3] hover:bg-blue-600"
              >
                {createCertificationMutation.isPending ? 'Saving...' : 'Save Certification'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEW: Prompt #63 - Document Upload Dialog */}
        <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
          <DialogContent className="bg-white text-gray-900 border-gray-200 max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Upload Employee Document</DialogTitle>
              <DialogDescription className="text-gray-600">
                Upload a document for {employee?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="document_type" className="text-gray-900">Document Type *</Label>
                <select
                  id="document_type"
                  value={documentForm.document_type}
                  onChange={(e) => setDocumentForm({...documentForm, document_type: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="contract">Contract</option>
                  <option value="license">License</option>
                  <option value="w4_form">W-4 Form</option>
                  <option value="i9_form">I-9 Form</option>
                  <option value="certification">Certification</option>
                  <option value="performance_review">Performance Review</option>
                  <option value="warning_letter">Warning Letter</option>
                  <option value="termination_letter">Termination Letter</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="document_name" className="text-gray-900">Document Name</Label>
                <Input
                  id="document_name"
                  value={documentForm.document_name}
                  onChange={(e) => setDocumentForm({...documentForm, document_name: e.target.value})}
                  placeholder="Enter document name or leave blank to use filename"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>

              {(['license', 'certification'].includes(documentForm.document_type)) && (
                <div>
                  <Label htmlFor="expiration_date" className="text-gray-900">
                    Expiration Date
                    <span className="text-amber-600 text-sm ml-2">(Alert will trigger 60 days before expiry)</span>
                  </Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={documentForm.expiration_date}
                    onChange={(e) => setDocumentForm({...documentForm, expiration_date: e.target.value})}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-gray-900">Notes</Label>
                <Input
                  id="notes"
                  value={documentForm.notes}
                  onChange={(e) => setDocumentForm({...documentForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>

              <div>
                <Label htmlFor="document_file" className="text-gray-900">Select File *</Label>
                <Input
                  id="document_file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDocument}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
                {uploadingDocument && (
                  <p className="text-sm text-blue-600 mt-2">Uploading document...</p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDocumentDialog(false)}
                className="bg-gray-100 border-gray-200 text-gray-700"
                disabled={uploadingDocument}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}