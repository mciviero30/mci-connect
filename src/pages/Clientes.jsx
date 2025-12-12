import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search, Mail, Phone, MapPin, Building2, Edit, Trash2, MoreVertical, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/shared/PageHeader";
import CustomerForm from "../components/clientes/CustomerForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Clientes() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('Creating customer:', data);
      return base44.entities.Customer.create(data);
    },
    onSuccess: () => {
      console.log('Customer created successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast.success(t('customerCreated'));
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('Updating customer:', id, data);
      return base44.entities.Customer.update(id, data);
    },
    onSuccess: () => {
      console.log('Customer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast.success(t('customerUpdated'));
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      console.log('Deleting customer:', id);
      return base44.entities.Customer.delete(id);
    },
    onSuccess: () => {
      console.log('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t('customerDeleted'));
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleSubmit = (data) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (customer) => {
    if (window.confirm(t('confirmDeleteCustomer'))) {
      deleteMutation.mutate(customer.id);
    }
  };

  // CRITICAL FIX: Helper function to get customer display name
  const getCustomerDisplayName = (customer) => {
    // NEW FORMAT: first_name + last_name
    if (customer.first_name || customer.last_name) {
      const firstName = customer.first_name || '';
      const lastName = customer.last_name || '';
      return `${firstName} ${lastName}`.trim();
    }
    
    // OLD FORMAT: name field (backwards compatibility)
    if (customer.name) {
      return customer.name;
    }
    
    // FALLBACK: email
    return customer.email?.split('@')[0] || 'Unknown';
  };

  const filteredCustomers = customers.filter(c =>
    c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort alphabetically by last_name, then first_name
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const lastNameA = (a.last_name || a.name || '').toLowerCase();
    const lastNameB = (b.last_name || b.name || '').toLowerCase();
    
    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }
    
    const firstNameA = (a.first_name || '').toLowerCase();
    const firstNameB = (b.first_name || '').toLowerCase();
    return firstNameA.localeCompare(firstNameB);
  });

  const activeCustomers = sortedCustomers.filter(c => c.status === 'active');
  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('customers')}
          description={`${activeCustomers.length} ${t('active').toLowerCase()} ${t('customers').toLowerCase()}`}
          icon={Users}
          actions={
            isAdmin && (
              <Button onClick={() => setShowForm(true)} size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                {t('newCustomer')}
              </Button>
            )
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCustomers.map(customer => {
            const displayName = getCustomerDisplayName(customer);
            
            return (
              <Card key={customer.id} className="bg-slate-50 dark:bg-[#282828] shadow-lg hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      {/* CRITICAL: Line 1 - Contact Full Name (FIXED) */}
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 break-words">
                        {displayName}
                        {customer.title && (
                          <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-2">
                            ({customer.title})
                          </span>
                        )}
                      </h3>
                      
                      {/* CRITICAL: Line 2 - Company Name (SEPARATE FROM NAME) */}
                      {customer.company && (
                        <div className="flex items-center gap-2 text-sm text-[#3B9FF3] dark:text-blue-400 mt-1">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{customer.company}</span>
                        </div>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                          <DropdownMenuItem onClick={() => window.location.href = createPageUrl('CustomerDetails') + `?id=${customer.id}`} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(customer)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(customer)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="space-y-2">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <span className="truncate">
                          {customer.address}
                          {customer.city && `, ${customer.city}`}
                          {customer.state && `, ${customer.state}`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sortedCustomers.length === 0 && !isLoading && (
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('noCustomers')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Start by adding your first customer</p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE2] text-white shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('newCustomer')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}>
          <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">
                {editingCustomer ? t('editCustomer') : t('newCustomer')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <CustomerForm
                customer={editingCustomer}
                onSubmit={handleSubmit}
                onClose={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
                isProcessing={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}