import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  TrendingDown,
  Edit,
  Trash2,
  ArrowDown,
  ArrowUp,
  History
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Inventario() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [selectedInventoryType, setSelectedInventoryType] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: []
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list('name'),
    initialData: []
  });

  const { data: transactions } = useQuery({
    queryKey: ['inventoryTransactions'],
    queryFn: () => base44.entities.InventoryTransaction.list('-created_date'),
    initialData: []
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'materials',
    inventory_type: 'tools',
    team_id: '',
    team_name: '',
    description: '',
    sku: '',
    quantity: 0,
    min_quantity: 0,
    unit: 'units',
    cost: 0,
    location: '',
    photo_url: '',
    supplier_id: '',
    supplier_name: ''
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'remove',
    quantity: 0,
    reason: '',
    job_id: '',
    job_name: '',
    notes: ''
  });

  // NEW: Movement form for the new modal
  const [movementForm, setMovementForm] = useState({
    item_id: '',
    item_name: '',
    type: 'remove', // 'add' or 'remove'
    quantity: 0,
    job_id: '',
    job_name: '',
    notes: ''
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      setShowAddDialog(false);
      setItemForm({
        name: '',
        category: 'materials',
        inventory_type: 'tools',
        team_id: '',
        team_name: '',
        description: '',
        sku: '',
        quantity: 0,
        min_quantity: 0,
        unit: 'units',
        cost: 0,
        location: '',
        photo_url: '',
        supplier_id: '',
        supplier_name: ''
      });
      alert('✅ Item added successfully!');
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      setShowAddDialog(false);
      setSelectedItem(null);
      alert('✅ Item updated successfully!');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      alert('✅ Item deleted successfully!');
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      // Create transaction
      await base44.entities.InventoryTransaction.create(data);
      
      // Update item quantity
      const item = items.find(i => i.id === selectedItem.id);
      let newQuantity = item.quantity;
      
      if (data.type === 'add') {
        newQuantity += data.quantity;
      } else if (data.type === 'remove') {
        newQuantity -= data.quantity;
      } else { // 'adjust' type
        newQuantity = data.quantity; // Set directly to the provided quantity
      }
      
      // Update status based on quantity
      let status = 'in_stock';
      if (newQuantity <= 0) status = 'out_of_stock';
      else if (newQuantity <= item.min_quantity) status = 'low_stock';
      
      await base44.entities.InventoryItem.update(item.id, {
        quantity: Math.max(0, newQuantity),
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
      setShowTransactionDialog(false);
      setSelectedItem(null);
      setTransactionForm({
        type: 'remove',
        quantity: 0,
        reason: '',
        job_id: '',
        job_name: '',
        notes: ''
      });
      alert('✅ Transaction recorded successfully!');
    }
  });

  // NEW: Movement mutation - simplified version that just creates transaction and updates quantity
  const createMovementMutation = useMutation({
    mutationFn: async (data) => {
      // Create transaction
      await base44.entities.InventoryTransaction.create({
        item_id: data.item_id,
        item_name: data.item_name,
        type: data.type === 'add' ? 'add' : 'remove',
        quantity: data.quantity,
        reason: data.type === 'add' ? 'Stock In' : 'Stock Out', // Default reason for movement dialog
        job_id: data.job_id || '',
        job_name: data.job_name || '',
        employee_email: user.email,
        employee_name: user.full_name,
        notes: data.notes
      });
      
      // Update item quantity
      const item = items.find(i => i.id === data.item_id);
      let newQuantity = item.quantity;
      
      if (data.type === 'add') {
        newQuantity += data.quantity;
      } else { // 'remove' type
        newQuantity -= data.quantity;
      }
      
      // Update status based on quantity
      let status = 'in_stock';
      if (newQuantity <= 0) status = 'out_of_stock';
      else if (newQuantity <= item.min_quantity) status = 'low_stock';
      
      await base44.entities.InventoryItem.update(item.id, {
        quantity: Math.max(0, newQuantity),
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
      setShowMovementDialog(false);
      setMovementForm({
        item_id: '',
        item_name: '',
        type: 'remove',
        quantity: 0,
        job_id: '',
        job_name: '',
        notes: ''
      });
      alert('✅ Movement recorded successfully!');
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItemForm({ ...itemForm, photo_url: file_url });
    } catch (error) {
      alert(`❌ Error uploading photo: ${error.message}`);
    }
    setUploading(false);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setItemForm(item);
    setShowAddDialog(true);
  };

  const handleTransaction = (item) => {
    setSelectedItem(item);
    setShowTransactionDialog(true);
  };

  const handleSubmitTransaction = () => {
    if (!transactionForm.quantity || transactionForm.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const selectedJob = jobs.find(j => j.id === transactionForm.job_id);

    createTransactionMutation.mutate({
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      type: transactionForm.type,
      quantity: parseFloat(transactionForm.quantity),
      reason: transactionForm.reason,
      job_id: transactionForm.job_id,
      job_name: selectedJob?.name || '',
      employee_email: user.email,
      employee_name: user.full_name,
      notes: transactionForm.notes
    });
  };

  // NEW: Handle movement submission
  const handleSubmitMovement = () => {
    if (!movementForm.item_id || !movementForm.quantity || movementForm.quantity <= 0) {
      alert('Please select an item and enter a valid quantity');
      return;
    }

    const selectedItemForMovement = items.find(i => i.id === movementForm.item_id);
    const selectedJobForMovement = jobs.find(j => j.id === movementForm.job_id);

    createMovementMutation.mutate({
      ...movementForm,
      item_name: selectedItemForMovement?.name || '',
      job_name: selectedJobForMovement?.name || ''
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeamId === 'all' || item.team_id === selectedTeamId;
    const matchesType = selectedInventoryType === 'all' || item.inventory_type === selectedInventoryType;
    return matchesSearch && matchesTeam && matchesType;
  });

  const lowStockItems = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');
  const totalValue = items.reduce((sum, i) => sum + ((i.cost || 0) * (i.quantity || 0)), 0);

  // NEW: Calculate items used this month (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const itemsUsedThisMonth = transactions
    .filter(t => {
      const transactionDate = new Date(t.created_date);
      return t.type === 'remove' && transactionDate >= thirtyDaysAgo;
    })
    .reduce((sum, t) => sum + (t.quantity || 0), 0);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Inventory Management"
          description={`${items.length} items tracked`}
          icon={Package}
          actions={
            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  setShowMovementDialog(true);
                  // Reset movement form when opening for a new movement
                  setMovementForm({
                    item_id: '',
                    item_name: '',
                    type: 'remove',
                    quantity: 0,
                    job_id: '',
                    job_name: '',
                    notes: ''
                  });
                }} 
                variant="outline"
                size="lg" 
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register Movement
              </Button>
              <Button 
                onClick={() => { 
                  setSelectedItem(null); 
                  setItemForm({
                    name: '',
                    category: 'materials',
                    inventory_type: 'tools',
                    team_id: '',
                    team_name: '',
                    description: '',
                    sku: '',
                    quantity: 0,
                    min_quantity: 0,
                    unit: 'units',
                    cost: 0,
                    location: '',
                    photo_url: '',
                    supplier_id: '',
                    supplier_name: ''
                  });
                  setShowAddDialog(true); 
                }} 
                size="lg"
                className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{items.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{lowStockItems.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">${totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* UPDATED: Items Used This Month */}
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Items Used This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{itemsUsedThisMonth}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400"/>
            <Input 
              placeholder="Search items..."
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            />
          </div>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[200px] h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 z-[100]">
              <SelectItem value="all" className="text-slate-900 dark:text-white">
                <span>All Teams</span>
              </SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id} className="text-slate-900 dark:text-white">
                  <span>{team.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedInventoryType} onValueChange={setSelectedInventoryType}>
            <SelectTrigger className="w-[180px] h-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
              <SelectValue placeholder="Inventory Type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="all" className="text-slate-900 dark:text-white">All Types</SelectItem>
              <SelectItem value="tools" className="text-slate-900 dark:text-white">🔧 Tools</SelectItem>
              <SelectItem value="hardware" className="text-slate-900 dark:text-white">🔩 Hardware</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">All Items ({filteredItems.length})</TabsTrigger>
            <TabsTrigger value="low_stock" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              Low Stock ({lowStockItems.length})
              {lowStockItems.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white text-xs">{lowStockItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <Card key={item.id} className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={item.inventory_type === 'hardware' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                            {item.inventory_type === 'hardware' ? '🔩 Hardware' : '🔧 Tools'}
                          </Badge>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{item.category}</span>
                        </div>
                        {item.team_name && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Team: {item.team_name}</p>
                        )}
                        {item.sku && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">SKU: {item.sku}</p>
                        )}
                        {item.supplier_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supplier: {item.supplier_name}</p>
                        )}
                      </div>
                      {item.photo_url && (
                        <img src={item.photo_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover border-2 border-slate-200" />
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">Quantity:</span>
                        <Badge className={
                          item.status === 'out_of_stock' ? 'bg-red-100 text-red-700 border-red-300' :
                          item.status === 'low_stock' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                          'bg-green-100 text-green-700 border-green-300'
                        }>
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>
                      {item.cost !== undefined && item.cost !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400 text-sm">Unit Cost:</span>
                          <span className="text-slate-900 dark:text-white font-semibold">${item.cost.toFixed(2)}</span>
                        </div>
                      )}
                      {item.location && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400 text-sm">Location:</span>
                          <span className="text-slate-900 dark:text-white text-sm">{item.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleTransaction(item)} className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <ArrowDown className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditItem(item)} className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (window.confirm('Delete this item?')) deleteItemMutation.mutate(item.id);
                      }} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="low_stock">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lowStockItems.map(item => (
                <Card key={item.id} className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{item.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{item.category}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">Current:</span>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">Min Required:</span>
                        <span className="text-slate-900 dark:text-white font-semibold">{item.min_quantity} {item.unit}</span>
                      </div>
                    </div>

                    <Button size="sm" onClick={() => handleTransaction(item)} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Restock Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400">No transactions recorded yet.</p>
                  ) : (
                    transactions.map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'add' ? 'bg-green-100' :
                            transaction.type === 'remove' ? 'bg-red-100' :
                            'bg-blue-100'
                          }`}>
                            {transaction.type === 'add' ? <ArrowUp className="w-5 h-5 text-green-600" /> :
                             transaction.type === 'remove' ? <ArrowDown className="w-5 h-5 text-red-600" /> :
                             <History className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{transaction.item_name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {transaction.type === 'add' ? 'Added' : transaction.type === 'remove' ? 'Removed' : 'Adjusted'} {transaction.quantity} units
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {transaction.employee_name} • {new Date(transaction.created_date).toLocaleString()}
                            </p>
                            {transaction.job_name && (
                              <p className="text-xs text-[#3B9FF3] dark:text-blue-400 mt-1">Job: {transaction.job_name}</p>
                            )}
                            {transaction.reason && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reason: {transaction.reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* NEW: Register Movement Dialog */}
        <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Register Inventory Movement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Item *</Label>
                <Select 
                  value={movementForm.item_id} 
                  onValueChange={(v) => {
                    const selectedItemForMovement = items.find(item => item.id === v);
                    setMovementForm({...movementForm, item_id: v, item_name: selectedItemForMovement?.name || ''});
                  }}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Select an item..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id} className="text-slate-900">
                        {item.name} - {item.quantity} {item.unit} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Movement Type *</Label>
                <Select 
                  value={movementForm.type} 
                  onValueChange={(v) => setMovementForm({...movementForm, type: v})}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="add" className="text-slate-900">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        IN (Entry/Purchase)
                      </div>
                    </SelectItem>
                    <SelectItem value="remove" className="text-slate-900">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        OUT (Use/Removal)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({...movementForm, quantity: parseFloat(e.target.value) || 0})}
                  placeholder="Enter quantity"
                  className="bg-white border-slate-300 text-slate-900"
                />
                 {movementForm.item_id && (
                  <p className="text-xs text-slate-500 mt-1">
                    Current stock of {items.find(i => i.id === movementForm.item_id)?.name}: {items.find(i => i.id === movementForm.item_id)?.quantity} {items.find(i => i.id === movementForm.item_id)?.unit}
                  </p>
                )}
              </div>

              <div>
                <Label>Associated Job (Optional)</Label>
                <Select 
                  value={movementForm.job_id} 
                  onValueChange={(v) => {
                    const selectedJobForMovement = jobs.find(job => job.id === v);
                    setMovementForm({...movementForm, job_id: v, job_name: selectedJobForMovement?.name || ''});
                  }}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Select job (optional)..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="text-slate-900">
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({...movementForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="bg-white border-slate-300 text-slate-900"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowMovementDialog(false)} 
                className="bg-white border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitMovement} 
                className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
                disabled={createMovementMutation.isPending}
              >
                {createMovementMutation.isPending ? 'Recording...' : 'Record Movement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* UPDATED: Add/Edit Item Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label>Inventory Type *</Label>
                  <Select value={itemForm.inventory_type} onValueChange={(v) => setItemForm({...itemForm, inventory_type: v})}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="tools" className="text-slate-900">🔧 Tools (Herramientas)</SelectItem>
                      <SelectItem value="hardware" className="text-slate-900">🔩 Hardware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Team/Group *</Label>
                  <Select 
                    value={itemForm.team_id || ""} 
                    onValueChange={(v) => {
                      const team = teams.find(t => t.id === v);
                      setItemForm({...itemForm, team_id: v, team_name: team?.name || ''});
                    }}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select team...">{itemForm.team_name || "Select team..."}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[100]">
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id} className="text-slate-900">
                          <span className="text-slate-900">{team.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={itemForm.category} onValueChange={(v) => setItemForm({...itemForm, category: v})}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="tools" className="text-slate-900">Tools</SelectItem>
                      <SelectItem value="materials" className="text-slate-900">Materials</SelectItem>
                      <SelectItem value="equipment" className="text-slate-900">Equipment</SelectItem>
                      <SelectItem value="safety" className="text-slate-900">Safety</SelectItem>
                      <SelectItem value="supplies" className="text-slate-900">Supplies</SelectItem>
                      <SelectItem value="hardware" className="text-slate-900">Hardware</SelectItem>
                      <SelectItem value="other" className="text-slate-900">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SKU/Code</Label>
                  <Input
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({...itemForm, sku: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={itemForm.location}
                    onChange={(e) => setItemForm({...itemForm, location: e.target.value})}
                    placeholder="e.g. Warehouse A, Shelf 3"
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: parseFloat(e.target.value) || 0})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label>Min Quantity (Alert)</Label>
                  <Input
                    type="number"
                    value={itemForm.min_quantity}
                    onChange={(e) => setItemForm({...itemForm, min_quantity: parseFloat(e.target.value) || 0})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                
                {/* UPDATED: Standardized Unit field */}
                <div>
                  <Label>Unit *</Label>
                  <Select 
                    value={itemForm.unit} 
                    onValueChange={(v) => setItemForm({...itemForm, unit: v})}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="units" className="text-slate-900">Units</SelectItem>
                      <SelectItem value="feet" className="text-slate-900">Feet</SelectItem>
                      <SelectItem value="meters" className="text-slate-900">Meters</SelectItem>
                      <SelectItem value="gallons" className="text-slate-900">Gallons</SelectItem>
                      <SelectItem value="boxes" className="text-slate-900">Boxes</SelectItem>
                      <SelectItem value="rolls" className="text-slate-900">Rolls</SelectItem>
                      <SelectItem value="hours" className="text-slate-900">Hours</SelectItem>
                      <SelectItem value="sqft" className="text-slate-900">Square Feet</SelectItem>
                      <SelectItem value="bags" className="text-slate-900">Bags</SelectItem>
                      <SelectItem value="rolls" className="text-slate-900">Rolls</SelectItem>
                      <SelectItem value="pounds" className="text-slate-900">Pounds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Cost per Unit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.cost}
                    onChange={(e) => setItemForm({...itemForm, cost: parseFloat(e.target.value) || 0})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                
                {/* NEW: Supplier/Vendor field */}
                <div className="md:col-span-2">
                  <Label>Supplier/Vendor (Optional)</Label>
                  <Select 
                    value={itemForm.supplier_id} 
                    onValueChange={(v) => {
                      const supplier = customers.find(c => c.id === v);
                      setItemForm({
                        ...itemForm, 
                        supplier_id: v,
                        supplier_name: supplier ? `${supplier.first_name} ${supplier.last_name}`.trim() : ''
                      });
                    }}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id} className="text-slate-900">
                          {customer.first_name} {customer.last_name}
                          {customer.company && ` - ${customer.company}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  className="bg-white border-slate-300 text-slate-900"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Photo</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="item-photo"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('item-photo').click()}
                  disabled={uploading}
                  className="w-full mt-2 bg-white border-slate-300 text-slate-700"
                >
                  {uploading ? 'Uploading...' : itemForm.photo_url ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {itemForm.photo_url && (
                  <img src={itemForm.photo_url} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-white border-slate-300 text-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!itemForm.name) {
                    alert('Please enter item name');
                    return;
                  }
                  if (selectedItem) {
                    updateItemMutation.mutate({ id: selectedItem.id, data: itemForm });
                  } else {
                    createItemMutation.mutate(itemForm);
                  }
                }}
                className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
              >
                {selectedItem ? 'Update' : 'Add'} Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Dialog */}
        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent className="bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle>Record Transaction - {selectedItem?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm({...transactionForm, type: v})}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="add" className="text-slate-900">Add Stock</SelectItem>
                    <SelectItem value="remove" className="text-slate-900">Remove/Use</SelectItem>
                    <SelectItem value="adjust" className="text-slate-900">Adjust Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm({...transactionForm, quantity: parseFloat(e.target.value) || 0})}
                  className="bg-white border-slate-300 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Current stock: {selectedItem?.quantity} {selectedItem?.unit}
                </p>
              </div>
              <div>
                <Label>Reason *</Label>
                <Input
                  value={transactionForm.reason}
                  onChange={(e) => setTransactionForm({...transactionForm, reason: e.target.value})}
                  placeholder="e.g. Used in project, Restock, Damaged"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label>Associated Job (Optional)</Label>
                <Select value={transactionForm.job_id} onValueChange={(v) => setTransactionForm({...transactionForm, job_id: v})}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Select job..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="text-slate-900">
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="bg-white border-slate-300 text-slate-900"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransactionDialog(false)} className="bg-white border-slate-300 text-slate-700">
                Cancel
              </Button>
              <Button onClick={handleSubmitTransaction} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white">
                Record Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}