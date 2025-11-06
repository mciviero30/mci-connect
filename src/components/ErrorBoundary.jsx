import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
          <Card className="max-w-2xl w-full p-8 bg-slate-800 border-red-500/50">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
              <div className="bg-slate-900 p-4 rounded-lg mb-4 text-left overflow-auto max-h-96">
                <p className="text-red-400 font-mono text-sm mb-2">
                  {this.state.error?.toString()}
                </p>
                {this.state.error?.message && (
                  <p className="text-slate-400 font-mono text-xs mb-2">
                    Message: {this.state.error.message}
                  </p>
                )}
                {this.state.error?.stack && (
                  <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo && (
                  <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap mt-4">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  Reload Page
                </Button>
                <Button 
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;