import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

class FieldErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Prevent error propagation to Layout
    console.error('MCI Field Error (contained):', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Stop propagation to prevent Layout remount
    if (error && error.stopPropagation) {
      error.stopPropagation();
    }
  }

  handleReset = () => {
    // Clear error state without reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Preserve user state in sessionStorage
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const jobId = urlParams.get('id');
      if (jobId) {
        const key = `fieldProject_${jobId}_errorRecovery`;
        sessionStorage.setItem(key, Date.now().toString());
      }
    } catch (e) {
      console.error('Failed to mark error recovery:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800 border-2 border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              MCI Field Error
            </h1>
            
            <p className="text-slate-300 mb-6">
              Something went wrong in MCI Field. Don't worry, your data is safe.
            </p>

            {import.meta.env?.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-black/40 rounded-lg text-left">
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link to={createPageUrl('Dashboard')} className="flex-1">
                <Button 
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FieldErrorBoundary;