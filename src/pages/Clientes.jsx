import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search, Mail, Phone, MapPin, Building2, Edit, Trash2, MoreVertical, Eye, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

import PageHeader from "../components/shared/PageHeader";
import CustomerForm from "../components/clientes/CustomerForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import SavedFilters from "@/components/shared/SavedFilters";
import CompactListView from "@/components/shared/CompactListView";
import { createPageUrl } from "@/utils";
import ModernCustomerCard from "@/components/clientes/ModernCustomerCard";
import InvitationModal from "@/components/field/InvitationModal";
import { getCustomerDisplayName, sortCustomersByName } from "@/components/utils/nameHelpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ExcelExporter, { transformCustomersForExport } from "@/components/shared/ExcelExporter";


export default function Clientes() {
  const { t, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const allCustomers = await base44.entities.Customer.list('-created_date');
      // Normalize data structure - flatten data object to top level
      const normalized = allCustomers.map(c => ({
        ...c,
        ...(c.data || {}),
        id: c.id,
        created_date: c.created_date,
        updated_date: c.updated_date
      }));
      return normalized;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast({
        title: t('customerCreated'),
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast({
        title: t('customerUpdated'),
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: t('customerDeleted'),
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
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

  // Memoize expensive filtering and sorting
  const sortedCustomers = useMemo(() => {
    const filtered = customers.filter(c =>
      c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return sortCustomersByName(filtered);
  }, [customers, searchTerm]);

  const isAdmin = user?.role === 'admin';

  const toggleCustomerSelection = (customer) => {
    setSelectedCustomers(prev => {
      const exists = prev.find(c => c.email === customer.email);
      if (exists) {
        return prev.filter(c => c.email !== customer.email);
      } else {
        return [...prev, { email: customer.email, name: getCustomerDisplayName(customer) }];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === sortedCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(sortedCustomers.map(c => ({ 
        email: c.email, 
        name: getCustomerDisplayName(c) 
      })));
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('customers')}
          description={`${sortedCustomers.length} ${t('customers').toLowerCase()}`}
          icon={Users}
          actions={
            isAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <ExcelExporter
                  data={sortedCustomers}
                  filename="customers"
                  sheetName="Customers"
                  transformData={transformCustomersForExport}
                  buttonText={language === 'es' ? 'Excel' : 'Excel'}
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-600 hover:bg-green-50"
                />
                <Button onClick={() => setShowForm(true)} size="lg" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px]">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">{t('newCustomer')}</span>
                  <span className="sm:hidden">{language === 'es' ? 'Nuevo' : 'New'}</span>
                </Button>
              </div>
            )
          }
        />

        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>

          <SavedFilters
            page="customers"
            currentFilters={{ searchTerm, statusFilter: 'all' }}
            onApplyFilter={(filters) => {
              if (filters.searchTerm) setSearchTerm(filters.searchTerm);
            }}
            user={user}
          />

          {/* Bulk Actions Bar */}
          {isAdmin && sortedCustomers.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', maxWidth: '18px', maxHeight: '18px' }}
                  className={`rounded flex items-center justify-center transition-all ${
                    selectedCustomers.length === sortedCustomers.length && sortedCustomers.length > 0
                      ? 'bg-[#FFB800] text-white'
                      : 'bg-white border border-slate-300 hover:border-[#FFB800]'
                  }`}
                >
                  {selectedCustomers.length === sortedCustomers.length && sortedCustomers.length > 0 && (
                    <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {selectedCustomers.length > 0
                    ? `${selectedCustomers.length} selected`
                    : 'Select all'}
                </span>
              </div>
              {selectedCustomers.length > 0 && (
                <Button
                  onClick={() => setShowInvitationModal(true)}
                  size="sm"
                  className="bg-[#FFB800] hover:bg-[#E5A600] text-white h-7 text-xs"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Invite to MCI Field
                </Button>
              )}
            </div>
          )}
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCustomers.map(customer => {
              const isSelected = selectedCustomers.some(c => c.email === customer.email);
              return (
                <ModernCustomerCard
                  key={customer.id}
                  customer={customer}
                  onViewDetails={isAdmin ? handleEdit : () => {}}
                  isSelected={isSelected}
                  onToggleSelect={() => toggleCustomerSelection(customer)}
                  showSelectButton={isAdmin}
                />
              );
            })}
          </div>
        ) : (
          <CompactListView
            items={sortedCustomers}
            entityType="customer"
            user={user}
            getTitle={(customer) => `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.name || customer.email}
            getSubtitle={(customer) => customer.company || customer.email}
            getBadges={(customer) => customer.status && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                {customer.status}
              </span>
            )}
            onItemClick={(customer) => isAdmin && handleEdit(customer)}
          />
        )}

        {/* Invitation Modal */}
        <InvitationModal
          open={showInvitationModal}
          onOpenChange={setShowInvitationModal}
          selectedCustomers={selectedCustomers}
        />

        {sortedCustomers.length === 0 && !isLoading && (
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('noCustomers')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Start by adding your first customer</p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md">
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
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