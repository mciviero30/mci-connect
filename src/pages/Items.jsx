
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  AlertTriangle // Added AlertTriangle icon for stock alerts
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert components

export default function Items() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const { data: items, isLoading } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list('name'),
    initialData: []
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pcs',
    unit_price: '',
    cost_per_unit: '',
    supplier: '',
    installation_time: '',
    category: 'materials',
    account_category: 'revenue_materials', // NEW: Prompt #59
    in_stock_quantity: 0, // NEW: Prompt #61
    min_stock_quantity: 5, // NEW: Prompt #61
    status: 'active'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QuoteItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      setShowForm(false);
      resetFormData();
      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Item creado exitosamente.' : 'Item created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error!",
        description: error.message || (language === 'es' ? 'Error al crear item.' : 'Failed to create item.'),
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuoteItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      setShowForm(false);
      setEditingItem(null);
      resetFormData();
      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Item actualizado exitosamente.' : 'Item updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error!",
        description: error.message || (language === 'es' ? 'Error al actualizar item.' : 'Failed to update item.'),
        variant: "destructive",
      });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.QuoteItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Item eliminado exitosamente.' : 'Item deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error!",
        description: error.message || (language === 'es' ? 'Error al eliminar item.' : 'Failed to delete item.'),
        variant: "destructive",
      });
    }
  });

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'pcs',
      unit_price: '',
      cost_per_unit: '',
      supplier: '',
      installation_time: '',
      category: 'materials',
      account_category: 'revenue_materials', // Reset new field
      in_stock_quantity: 0, // Reset new field
      min_stock_quantity: 5, // Reset new field
      status: 'active'
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...item,
      unit_price: item.unit_price != null ? item.unit_price.toString() : '',
      cost_per_unit: item.cost_per_unit != null ? item.cost_per_unit.toString() : '',
      installation_time: item.installation_time != null ? item.installation_time.toString() : '',
      in_stock_quantity: item.in_stock_quantity != null ? item.in_stock_quantity : 0, // Ensure it's a number
      min_stock_quantity: item.min_stock_quantity != null ? item.min_stock_quantity : 5, // Ensure it's a number
      supplier: item.supplier || '',
      description: item.description || '',
      account_category: item.account_category || 'revenue_materials'
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.unit_price || !formData.cost_per_unit || !formData.supplier) {
      toast({
        title: "⚠️ Validation Error",
        description: language === 'es' ? 'Por favor, rellene todos los campos obligatorios.' : 'Please fill in all required fields.',
        variant: "destructive",
      });
      return;
    }

    const dataToSubmit = {
      ...formData,
      unit_price: parseFloat(formData.unit_price) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      installation_time: parseFloat(formData.installation_time) || 0,
      in_stock_quantity: parseInt(formData.in_stock_quantity) || 0, // Parse as int
      min_stock_quantity: parseInt(formData.min_stock_quantity) || 5 // Parse as int
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryConfig = {
    materials: { label: language === 'es' ? 'Materiales' : 'Materials', color: 'bg-blue-500/20 text-blue-400' },
    labor: { label: language === 'es' ? 'Mano de Obra' : 'Labor', color: 'bg-purple-500/20 text-purple-400' },
    equipment: { label: language === 'es' ? 'Equipo' : 'Equipment', color: 'bg-orange-500/20 text-orange-400' },
    services: { label: language === 'es' ? 'Servicios' : 'Services', color: 'bg-cyan-500/20 text-cyan-400' },
    other: { label: language === 'es' ? 'Otro' : 'Other', color: 'bg-slate-500/20 text-slate-400' }
  };

  // NEW: Prompt #61 - Low stock detection
  const lowStockItems = items.filter(item =>
    item.in_stock_quantity < (item.min_stock_quantity || 5) &&
    item.in_stock_quantity > 0 &&
    item.category === 'materials' // Only materials should be considered for stock
  );

  const outOfStockItems = items.filter(item =>
    item.in_stock_quantity === 0 &&
    item.category === 'materials' // Only materials should be considered for stock
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Biblioteca de Items' : 'Item Library'}
          description={language === 'es' ? 'Gestiona productos y servicios para estimados' : 'Manage products and services for quotes'}
          icon={Package}
          actions={
            <Button
              onClick={() => {
                setEditingItem(null);
                resetFormData();
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {language === 'es' ? 'Nuevo Item' : 'New Item'}
            </Button>
          }
        />

        {/* NEW: Prompt #61 - Low Stock Alerts */}
        {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
          <div className="mb-6 space-y-3">
            {outOfStockItems.length > 0 && (
              <Alert className="bg-red-50 border-red-300 text-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertTitle className="font-bold">
                  {language === 'es' ? '🚫 Items Sin Stock' : '🚫 Out of Stock Items'}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {outOfStockItems.map(item => (
                      <Badge key={item.id} className="bg-red-600 text-white">
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {lowStockItems.length > 0 && (
              <Alert className="bg-amber-50 border-amber-300 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="font-bold">
                  {language === 'es' ? '⚠️ Stock Bajo - Reordenar Ahora' : '⚠️ Low Stock - Reorder Now'}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lowStockItems.map(item => (
                      <Badge key={item.id} className="bg-amber-600 text-white">
                        {item.name} ({item.in_stock_quantity} {language === 'es' ? 'restantes' : 'remaining'})
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">
                {language === 'es' ? 'Total Items' : 'Total Items'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{items.length}</div>
            </CardContent>
          </Card>

          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = items.filter(i => i.category === key).length;
            return (
              <Card key={key} className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">{config.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-white shadow-lg border-slate-200 mb-6">
          <CardContent className="p-4 flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
              <Input
                placeholder={language === 'es' ? 'Buscar items...' : 'Search items...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 bg-white border-slate-300 text-slate-900"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48 bg-white border-slate-300 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900">{language === 'es' ? 'Todas las categorías' : 'All Categories'}</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-slate-900">{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-200">
                    <TableHead className="text-slate-700">{language === 'es' ? 'Nombre' : 'Name'}</TableHead>
                    <TableHead className="text-slate-700">{language === 'es' ? 'Categoría' : 'Category'}</TableHead>
                    <TableHead className="text-slate-700">{language === 'es' ? 'Stock' : 'Stock'}</TableHead> {/* NEW: Stock column */}
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Precio Venta' : 'Sale Price'}</TableHead>
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Costo Interno' : 'Internal Cost'}</TableHead>
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Margen' : 'Profit Margin'}</TableHead>
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                        {language === 'es' ? 'Cargando...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                        {language === 'es' ? 'No se encontraron items' : 'No items found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => {
                      const categoryLabel = categoryConfig[item.category]?.label || categoryConfig.other.label;
                      const profit = (item.unit_price || 0) - (item.cost_per_unit || 0);
                      const marginPercentage = (item.unit_price > 0 && item.cost_per_unit > 0)
                        ? ((item.unit_price - item.cost_per_unit) / item.unit_price * 100).toFixed(1)
                        : 0;

                      // NEW: Prompt #61 - Stock status
                      const stockStatus = item.category === 'materials' && item.in_stock_quantity === 0
                        ? 'out_of_stock'
                        : item.category === 'materials' && item.in_stock_quantity < (item.min_stock_quantity || 5) && item.in_stock_quantity > 0
                        ? 'low_stock'
                        : 'in_stock'; // For non-materials or sufficient stock

                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50 border-slate-200">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 truncate max-w-xs">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={categoryConfig[item.category]?.color || categoryConfig.other.color}>
                              {categoryLabel}
                            </Badge>
                          </TableCell>

                          {/* NEW: Prompt #61 - Stock display with alerts */}
                          <TableCell>
                            {item.category === 'materials' ? (
                              <div className="flex items-center gap-1">
                                <span className={`font-semibold ${
                                  stockStatus === 'out_of_stock' ? 'text-red-600' :
                                  stockStatus === 'low_stock' ? 'text-amber-600' :
                                  'text-green-600'
                                }`}>
                                  {item.in_stock_quantity || 0}
                                </span>
                                <span className="text-xs text-slate-500">{item.unit}</span>
                                {stockStatus === 'out_of_stock' && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">
                                    {language === 'es' ? 'Sin Stock' : 'Out'}
                                  </Badge>
                                )}
                                {stockStatus === 'low_stock' && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                                    {language === 'es' ? 'Bajo' : 'Low'}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right font-bold text-[#3B9FF3]">
                            ${(item.unit_price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            ${(item.cost_per_unit || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={
                              marginPercentage > 30 ? 'bg-green-100 text-green-700' :
                              marginPercentage > 15 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {marginPercentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                className="text-[#3B9FF3] hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (window.confirm(language === 'es' ? '¿Eliminar este item?' : 'Delete this item?')) {
                                    deleteItemMutation.mutate(item.id);
                                  }
                                }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingItem(null);
            resetFormData();
          }
        }}>
          <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900">
                {editingItem
                  ? (language === 'es' ? 'Editar Item' : 'Edit Item')
                  : (language === 'es' ? 'Nuevo Item' : 'New Item')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-slate-700">{language === 'es' ? 'Nombre' : 'Name'} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-white border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">{language === 'es' ? 'Descripción' : 'Description'}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-20 bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Categoría' : 'Category'}</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="materials">{language === 'es' ? 'Materiales' : 'Materials'}</SelectItem>
                      <SelectItem value="labor">{language === 'es' ? 'Mano de Obra' : 'Labor'}</SelectItem>
                      <SelectItem value="equipment">{language === 'es' ? 'Equipo' : 'Equipment'}</SelectItem>
                      <SelectItem value="services">{language === 'es' ? 'Servicios' : 'Services'}</SelectItem>
                      <SelectItem value="other">{language === 'es' ? 'Otro' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Unidad' : 'Unit'}</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs, ft, sqft, etc."
                    className="bg-white border-slate-300"
                  />
                </div>

                {/* NEW: Account Category (Prompt #59) */}
                <div className="md:col-span-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Categoría Contable' : 'Account Category'}
                  </Label>
                  <Select value={formData.account_category} onValueChange={(value) => setFormData({...formData, account_category: value})}>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="revenue_service">{language === 'es' ? 'Ingreso: Servicio' : 'Revenue: Service'}</SelectItem>
                      <SelectItem value="revenue_materials">{language === 'es' ? 'Ingreso: Materiales' : 'Revenue: Materials'}</SelectItem>
                      <SelectItem value="expense_labor_cost">{language === 'es' ? 'Gasto: Costo Laboral' : 'Expense: Labor Cost'}</SelectItem>
                      <SelectItem value="expense_materials">{language === 'es' ? 'Gasto: Materiales' : 'Expense: Materials'}</SelectItem>
                      <SelectItem value="asset_inventory">{language === 'es' ? 'Activo: Inventario' : 'Asset: Inventory'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es'
                      ? 'Categoría contable para fines de informes financieros.'
                      : 'Accounting category for financial reporting purposes.'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Costo Interno' : 'Cost per Unit (Internal)'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                    required
                    className="bg-white border-slate-300"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es'
                      ? 'Lo que la empresa paga por este item'
                      : 'What the company pays for this item'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Precio de Venta' : 'Unit Price (Sale)'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    required
                    className="bg-white border-slate-300"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es'
                      ? 'Precio que se cobra al cliente'
                      : 'Price charged to customer'}
                  </p>
                </div>

                {/* NEW: Supplier field */}
                <div>
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Proveedor' : 'Supplier'} *
                  </Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
                    className="bg-white border-slate-300"
                    placeholder="Home Depot, ABC Supply, etc."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es'
                      ? 'Proveedor principal de este item'
                      : 'Main supplier for this item'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Tiempo de Instalación (horas)' : 'Installation Time (hours)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.installation_time}
                    onChange={(e) => setFormData({ ...formData, installation_time: e.target.value })}
                    className="bg-white border-slate-300"
                    placeholder="0.0"
                  />
                </div>

                {/* NEW: Prompt #61 - Stock Management Fields */}
                {formData.category === 'materials' && (
                  <>
                    <div>
                      <Label className="text-slate-700">
                        {language === 'es' ? 'Cantidad en Stock' : 'In Stock Quantity'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.in_stock_quantity}
                        onChange={(e) => setFormData({...formData, in_stock_quantity: parseInt(e.target.value) || 0})}
                        className="bg-white border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700">
                        {language === 'es' ? 'Stock Mínimo (Alerta)' : 'Minimum Stock (Alert)'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.min_stock_quantity}
                        onChange={(e) => setFormData({...formData, min_stock_quantity: parseInt(e.target.value) || 5})}
                        className="bg-white border-slate-300"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'es'
                          ? 'Se mostrará alerta cuando el stock caiga por debajo de esta cantidad'
                          : 'Alert will show when stock falls below this quantity'}
                      </p>
                    </div>
                  </>
                )}

              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-50 border-slate-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem
                    ? (language === 'es' ? 'Actualizar' : 'Update')
                    : (language === 'es' ? 'Crear' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
