import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { 
  FileText, Plus, Search, DollarSign, Clock, 
  CheckCircle, XCircle, AlertCircle, Eye,
  Calendar, User, TrendingUp
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ChangeOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date', 100),
  });

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
    pending_approval: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
    completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  };

  const filteredOrders = changeOrders.filter(order => {
    const matchesSearch = order.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.change_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: changeOrders.length,
    pending: changeOrders.filter(o => o.status === 'pending_approval').length,
    approved: changeOrders.filter(o => o.status === 'approved').length,
    totalAmount: changeOrders.reduce((sum, o) => sum + (o.change_amount || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title="Change Orders"
        description="Gestión de órdenes de cambio"
        icon={FileText}
        actions={
          <Link to={createPageUrl('CrearChangeOrder')}>
            <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-lg hover:shadow-xl">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Change Order
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pendientes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Aprobados</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.approved}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Changes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${stats.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white dark:bg-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por job, número o título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'pending_approval', 'approved', 'in_progress', 'completed'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'Todos' : statusConfig[status]?.label || status}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Change Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 dark:text-slate-400">No hay change orders</p>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status]?.icon || AlertCircle;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {order.change_order_number}
                            </h3>
                            <Badge className={statusConfig[order.status]?.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[order.status]?.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-[#507DB4] dark:text-[#6B9DD8] mb-2">
                            {order.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {order.description}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Job:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {order.job_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Fecha:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {new Date(order.request_date || order.created_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Monto:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                ${order.change_amount?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link to={createPageUrl(`VerChangeOrder?id=${order.id}`)}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}