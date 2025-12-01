import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  QrCode, 
  Plus, 
  Search,
  Package,
  MapPin,
  DollarSign,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function QRCodeScanner({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [newMaterial, setNewMaterial] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    quantity: '',
    unit: '',
    location: '',
    supplier: '',
    cost_per_unit: '',
  });

  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery({
    queryKey: ['material-qr-codes', jobId],
    queryFn: () => base44.entities.MaterialQRCode.filter({ job_id: jobId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaterialQRCode.create({
      ...data,
      job_id: jobId,
      quantity: parseFloat(data.quantity) || 0,
      cost_per_unit: parseFloat(data.cost_per_unit) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-qr-codes', jobId] });
      setShowCreate(false);
      setNewMaterial({
        code: '',
        name: '',
        description: '',
        category: '',
        quantity: '',
        unit: '',
        location: '',
        supplier: '',
        cost_per_unit: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaterialQRCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-qr-codes', jobId] });
      setSelectedMaterial(null);
    },
  });

  const generateCode = () => {
    const code = `MAT-${Date.now().toString(36).toUpperCase()}`;
    setNewMaterial({ ...newMaterial, code });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredMaterials = materials.filter(m =>
    m.code.toLowerCase().includes(searchCode.toLowerCase()) ||
    m.name.toLowerCase().includes(searchCode.toLowerCase())
  );

  const searchResult = searchCode.length > 3 
    ? materials.find(m => m.code.toLowerCase() === searchCode.toLowerCase())
    : null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#D4C85C] flex items-center gap-2">
          <QrCode className="w-6 h-6" />
          Materiales (QR)
        </h1>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Material
        </Button>
      </div>

      {/* Search/Scan Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <Label className="text-slate-300 mb-2 block">Buscar por código o nombre</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Escanea o ingresa código..."
              className="pl-9 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Quick Search Result */}
        {searchResult && (
          <div 
            onClick={() => setSelectedMaterial(searchResult)}
            className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{searchResult.name}</p>
                <p className="text-sm text-slate-400">{searchResult.code}</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400">Encontrado</Badge>
            </div>
          </div>
        )}
      </div>

      {/* Materials Grid */}
      {materials.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Sin materiales</h3>
          <p className="text-slate-400 mb-4">Registra materiales con códigos QR</p>
          <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Material
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map(material => (
            <div 
              key={material.id}
              onClick={() => setSelectedMaterial(material)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <QrCode className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{material.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{material.code}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCode(material.code);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  {copiedCode === material.code ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>{material.quantity} {material.unit}</span>
                {material.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {material.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Material Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Código</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newMaterial.code}
                  onChange={(e) => setNewMaterial({ ...newMaterial, code: e.target.value })}
                  placeholder="Código único"
                  className="flex-1 bg-slate-800 border-slate-700 text-white font-mono"
                />
                <Button onClick={generateCode} variant="outline" className="border-slate-700">
                  Generar
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Nombre</Label>
              <Input
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                placeholder="Ej: Cable eléctrico 12 AWG"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Cantidad</Label>
                <Input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                  placeholder="0"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Unidad</Label>
                <Input
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                  placeholder="Ej: metros, piezas"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Ubicación</Label>
              <Input
                value={newMaterial.location}
                onChange={(e) => setNewMaterial({ ...newMaterial, location: e.target.value })}
                placeholder="Ej: Bodega A, Estante 3"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Proveedor</Label>
              <Input
                value={newMaterial.supplier}
                onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
                placeholder="Nombre del proveedor"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Costo por Unidad</Label>
              <Input
                type="number"
                step="0.01"
                value={newMaterial.cost_per_unit}
                onChange={(e) => setNewMaterial({ ...newMaterial, cost_per_unit: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(newMaterial)}
                disabled={!newMaterial.code || !newMaterial.name}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Crear Material
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Detail Dialog */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          {selectedMaterial && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  {selectedMaterial.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <p className="font-mono text-2xl text-amber-400">{selectedMaterial.code}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(selectedMaterial.code)}
                    className="mt-2 text-slate-400"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar código
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Cantidad</p>
                    <p className="text-white">{selectedMaterial.quantity} {selectedMaterial.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Costo/Unidad</p>
                    <p className="text-white">${selectedMaterial.cost_per_unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Ubicación</p>
                    <p className="text-white">{selectedMaterial.location || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Proveedor</p>
                    <p className="text-white">{selectedMaterial.supplier || '-'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate(selectedMaterial.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}