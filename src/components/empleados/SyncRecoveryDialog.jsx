import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function SyncRecoveryDialog({ onSync }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const data = await onSync();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Hidden trigger button */}
      <button
        data-sync-recovery-trigger
        onClick={() => setIsOpen(true)}
        style={{ display: 'none' }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recover Missing Employee Data</DialogTitle>
            <DialogDescription>
              Sync all missing fields from PendingEmployee records to active User accounts
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-sm">
                  ℹ️ This will check all employees and fill in any missing data (name, phone, address, position, team, etc.) from their original pending records.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSync}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Start Recovery'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <AlertDescription className="text-green-800">
                      ✅ Recovery complete!
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-600">Users Checked</p>
                      <p className="text-2xl font-bold text-slate-900">{result.summary.total_users_checked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Pending Records</p>
                      <p className="text-2xl font-bold text-slate-900">{result.summary.total_pending_employees}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Data Synced</p>
                      <p className="text-2xl font-bold text-green-600">{result.summary.synced}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Already Complete</p>
                      <p className="text-2xl font-bold text-blue-600">{result.summary.already_complete}</p>
                    </div>
                  </div>

                  {result.summary.errors > 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                      <AlertDescription className="text-amber-800">
                        ⚠️ {result.summary.errors} error(s) occurred during sync. Check details below.
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.details && result.details.length > 0 && (
                    <div className="max-h-64 overflow-y-auto">
                      <p className="text-sm font-semibold mb-2">Details:</p>
                      <div className="space-y-2">
                        {result.details.slice(0, 10).map((detail, idx) => (
                          <div key={idx} className="text-xs p-2 bg-white border rounded">
                            <p className="font-medium text-slate-900">{detail.email}</p>
                            <p className="text-slate-600">
                              {detail.status === 'synced' && `✅ Synced ${detail.fields_synced?.length || 0} fields`}
                              {detail.status === 'already_complete' && '✔️ Already complete'}
                              {detail.status === 'error' && `❌ ${detail.error}`}
                              {detail.status === 'no_user_found' && '⚠️ No active user found'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {result.details.length > 10 && (
                        <p className="text-xs text-slate-500 mt-2">...and {result.details.length - 10} more</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    ❌ Error: {result.error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    setResult(null);
                  }}
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}