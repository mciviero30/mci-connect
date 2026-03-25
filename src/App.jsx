import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SupervisorDashboard from '@/pages/SupervisorDashboard';
import ForemanDashboard from '@/pages/ForemanDashboard';
import TimeTrackingTestControl from '@/pages/TimeTrackingTestControl';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;



const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPageName = pathSegments[0] || mainPageKey;

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app WITH Layout wrapping Routes
  const routesContent = (
    <Routes>
      <Route path="/" element={<MainPage />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<Page />} />
      ))}
      <Route path="/SupervisorDashboard" element={<SupervisorDashboard />} />
      <Route path="/ForemanDashboard" element={<ForemanDashboard />} />
      <Route path="/TimeTrackingTestControl" element={<TimeTrackingTestControl />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  if (!Layout) return routesContent;
  return <Layout currentPageName={currentPageName}>{routesContent}</Layout>;
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
          <NavigationTracker />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App