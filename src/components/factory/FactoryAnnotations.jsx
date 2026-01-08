import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit, Factory, Share2, Lock } from 'lucide-react';
import { requireFactoryRole, getUserPermissions } from './FactoryPermissionsService';
import { logFactoryAction } from './FactoryAuditLogger';

export default function FactoryAnnotations({ dimension, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [annotations, setAnnotations] = useState({
    production_notes: dimension.factory_production_notes || '',
    cut_instructions: dimension.factory_cut_instructions || '',
    material_constraints: dimension.factory_material_constraints || '',
    shared_with_field: dimension.factory_annotations_shared || false
  });
  
  // Check permissions
  useEffect(() => {
    checkPermissions();
  }, []);
  
  const checkPermissions = async () => {
    try {
      const user = await base44.auth.me();
      const userPermissions = await getUserPermissions(user);
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const hasAnnotations = dimension.factory_production_notes || 
                        dimension.factory_cut_instructions || 
                        dimension.factory_material_constraints;

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      // CRITICAL: Permission check
      await requireFactoryRole(user, 'add factory annotations');
      
      const isNew = !dimension.factory_production_notes && 
                    !dimension.factory_cut_instructions && 
                    !dimension.factory_material_constraints;
      
      await base44.entities.FieldDimension.update(dimension.id, {
        factory_production_notes: annotations.production_notes || null,
        factory_cut_instructions: annotations.cut_instructions || null,
        factory_material_constraints: annotations.material_constraints || null,
        factory_annotations_shared: annotations.shared_with_field,
        factory_annotated_by: user.email,
        factory_annotated_at: new Date().toISOString()
      });
      
      // Audit log
      await logFactoryAction(
        isNew ? 'factory_annotation_added' : 'factory_annotation_updated',
        {
          dimension_set_id: dimension.id,
          job_id: dimension.job_id,
          details: {
            dimension_type: dimension.measurement_type,
            annotations: annotations
          }
        }
      );

      setEditing(false);
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Failed to save annotations:', error);
      alert('❌ ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) {
    return <div className="text-xs text-slate-500">Loading...</div>;
  }
  
  // Read-only view for non-factory users
  if (!permissions?.can_annotate) {
    if (hasAnnotations) {
      return (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Factory className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                Factory Annotations
              </span>
              <Lock className="w-3 h-3 text-orange-600" />
            </div>
            <div className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
              {dimension.factory_production_notes && (
                <div>
                  <div className="font-semibold">Production Notes:</div>
                  <div className="text-xs">{dimension.factory_production_notes}</div>
                </div>
              )}
              {dimension.factory_cut_instructions && (
                <div>
                  <div className="font-semibold">Cut Instructions:</div>
                  <div className="text-xs">{dimension.factory_cut_instructions}</div>
                </div>
              )}
              {dimension.factory_material_constraints && (
                <div>
                  <div className="font-semibold">Material Constraints:</div>
                  <div className="text-xs">{dimension.factory_material_constraints}</div>
                </div>
              )}
              <div className="text-[10px] text-orange-600 pt-2 border-t border-orange-200">
                Read-only (Factory role required to edit)
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {hasAnnotations && !editing ? (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                  Factory Annotations
                </span>
                {dimension.factory_annotations_shared && (
                  <Badge variant="outline" className="text-xs">
                    <Share2 className="w-3 h-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
              {dimension.factory_production_notes && (
                <div>
                  <div className="font-semibold">Production Notes:</div>
                  <div className="text-xs">{dimension.factory_production_notes}</div>
                </div>
              )}
              {dimension.factory_cut_instructions && (
                <div>
                  <div className="font-semibold">Cut Instructions:</div>
                  <div className="text-xs">{dimension.factory_cut_instructions}</div>
                </div>
              )}
              {dimension.factory_material_constraints && (
                <div>
                  <div className="font-semibold">Material Constraints:</div>
                  <div className="text-xs">{dimension.factory_material_constraints}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : editing ? (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="w-4 h-4 text-orange-600" />
              Factory Annotations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Production Notes</Label>
              <Textarea
                value={annotations.production_notes}
                onChange={(e) => setAnnotations({...annotations, production_notes: e.target.value})}
                placeholder="Special production requirements, tolerances, finish notes..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Cut Instructions</Label>
              <Textarea
                value={annotations.cut_instructions}
                onChange={(e) => setAnnotations({...annotations, cut_instructions: e.target.value})}
                placeholder="Cutting angles, notches, special cuts required..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Material Constraints</Label>
              <Textarea
                value={annotations.material_constraints}
                onChange={(e) => setAnnotations({...annotations, material_constraints: e.target.value})}
                placeholder="Material limitations, substitutions, alternatives..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                checked={annotations.shared_with_field}
                onCheckedChange={(checked) => setAnnotations({...annotations, shared_with_field: checked})}
              />
              <Label className="text-xs cursor-pointer">
                Share these annotations with Field View
              </Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Annotations'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          className="w-full border-dashed"
        >
          <Factory className="w-4 h-4 mr-2" />
          Add Factory Annotations
        </Button>
      )}
    </div>
  );
}