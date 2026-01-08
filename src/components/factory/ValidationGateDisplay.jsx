import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { validateProductionGate } from './FactoryValidationGates';

export default function ValidationGateDisplay({ dimensionSet }) {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGates = async () => {
      try {
        const result = await validateProductionGate(dimensionSet.id, 'approved_for_production');
        setValidation(result);
      } catch (error) {
        console.error('Gate validation failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkGates();
  }, [dimensionSet.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-slate-500">Checking validation gates...</div>
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  const getCheckIcon = (passed) => {
    if (passed) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <Card className={validation.passed ? 'border-green-200' : 'border-red-200'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validation.passed ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Production Gates: PASSED
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-600" />
              Production Gates: BLOCKED
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Gate Checks */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2 rounded border">
              {getCheckIcon(validation.checks.dimensions_exist)}
              <span className="flex-1 ml-3 text-sm">Required Dimensions</span>
              <Badge variant={validation.checks.dimensions_exist ? 'default' : 'destructive'}>
                {validation.checks.dimensions_exist ? 'Valid' : 'Missing'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded border">
              {getCheckIcon(validation.checks.benchmarks_valid)}
              <span className="flex-1 ml-3 text-sm">Benchmark Validation</span>
              <Badge variant={validation.checks.benchmarks_valid ? 'default' : 'destructive'}>
                {validation.checks.benchmarks_valid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded border">
              {getCheckIcon(validation.checks.conflicts_resolved)}
              <span className="flex-1 ml-3 text-sm">Conflicts Resolved</span>
              <Badge variant={validation.checks.conflicts_resolved ? 'default' : 'destructive'}>
                {validation.checks.conflicts_resolved ? 'Clear' : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded border">
              {getCheckIcon(validation.checks.latest_revision)}
              <span className="flex-1 ml-3 text-sm">Latest Revision</span>
              <Badge variant={validation.checks.latest_revision ? 'default' : 'destructive'}>
                {validation.checks.latest_revision ? 'Current' : 'Superseded'}
              </Badge>
            </div>
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Critical Issues:
              </div>
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings:
              </div>
              <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}