import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, Upload, Download, CheckCircle, XCircle, 
  Users, Briefcase, FileText, AlertTriangle, Link as LinkIcon,
  ArrowRight, Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { initializeCrossAppClients } from '@/components/integrations/CrossAppClient';
import DataSyncService from '@/components/integrations/DataSyncService';
import CrossAppActions from '@/components/integrations/CrossAppActions';

export default function CrossAppSync() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState('1');
  const [selectedEntityType, setSelectedEntityType] = useState('Customer');
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);

  // Initialize cross-app clients
  React.useEffect(() => {
    const secrets = {
      EXTERNAL_APP_1_ID: process.env.EXTERNAL_APP_1_ID,
      EXTERNAL_APP_1_SERVICE_KEY: process.env.EXTERNAL_APP_1_SERVICE_KEY,
      EXTERNAL_APP_2_ID: process.env.EXTERNAL_APP_2_ID,
      EXTERNAL_APP_2_SERVICE_KEY: process.env.EXTERNAL_APP_2_SERVICE_KEY,
    };
    
    initializeCrossAppClients(secrets);
  }, []);

  // Fetch entities based on selected type
  const { data: entities, isLoading } = useQuery({
    queryKey: ['entities', selectedEntityType],
    queryFn: () => base44.entities[selectedEntityType].list(),
    initialData: [],
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (selectedEntities.length === 0) {
        throw new Error('No entities selected');
      }

      return await DataSyncService.bulkSyncToExternalApp(
        selectedEntityType,
        selectedEntities,
        parseInt(selectedApp)
      );
    },
    onSuccess: (results) => {
      setSyncStatus(results);
      toast.success(`Synced ${results.success.length} ${selectedEntityType}(s)`);
      setSelectedEntities([]);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (selectedEntityType === 'Customer') {
        return await DataSyncService.fetchCustomersFromExternalApp(parseInt(selectedApp));
      } else if (selectedEntityType === 'Job') {
        return await DataSyncService.fetchJobsFromExternalApp(parseInt(selectedApp));
      }
    },
    onSuccess: (data) => {
      toast.success(`Fetched ${data.length} ${selectedEntityType}(s)`);
      queryClient.invalidateQueries({ queryKey: ['entities', selectedEntityType] });
    }
  });

  const toggleEntitySelection = (entityId) => {
    setSelectedEntities(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const selectAll = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(entities.map(e => e.id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cross-App Sync</h1>
          <p className="text-slate-600">Sync data between MCI Connect and external Base44 apps</p>
        </div>

        {/* Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Sync Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target App</Label>
                <Select value={selectedApp} onValueChange={setSelectedApp}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">External App 1</SelectItem>
                    <SelectItem value="2">External App 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Entity Type</Label>
                <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customers</SelectItem>
                    <SelectItem value="Job">Jobs</SelectItem>
                    <SelectItem value="Invoice">Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => syncMutation.mutate()}
                disabled={selectedEntities.length === 0 || syncMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Sync to External App ({selectedEntities.length})
              </Button>

              <Button 
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                variant="outline"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Import from External App
              </Button>

              <Button onClick={selectAll} variant="outline">
                {selectedEntities.length === entities.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        {syncStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sync Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">{syncStatus.success.length} succeeded</span>
                </div>
                {syncStatus.failed.length > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">{syncStatus.failed.length} failed</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedEntityType === 'Customer' && <Users className="w-5 h-5" />}
              {selectedEntityType === 'Job' && <Briefcase className="w-5 h-5" />}
              {selectedEntityType === 'Invoice' && <FileText className="w-5 h-5" />}
              {selectedEntityType}s in MCI Connect
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-slate-500">Loading...</p>
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No {selectedEntityType}s found
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {entities.map(entity => (
                  <div
                    key={entity.id}
                    onClick={() => toggleEntitySelection(entity.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEntities.includes(entity.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {entity.customer_name || entity.name || entity.invoice_number}
                        </p>
                        {entity.email && (
                          <p className="text-sm text-slate-500">{entity.email}</p>
                        )}
                      </div>
                      {selectedEntities.includes(entity.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}