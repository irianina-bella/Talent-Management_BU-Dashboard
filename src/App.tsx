import React, { Component, ReactNode, useEffect, useState } from 'react';
import { AppProvider, useApp } from './state/AppState';
import { Layout, NAV, PageKey } from './components/Layout';
import { ProfileModal, ListModal } from './components/ProfileModal';
import { EmptyState, Button, Spinner } from './components/ui';
import { Upload } from 'lucide-react';
import DataPage from './pages/DataPage';
import OverviewPage from './pages/OverviewPage';
import CalibrationPage from './pages/CalibrationPage';
import MatrixPage from './pages/MatrixPage';
import SuccessionPage from './pages/SuccessionPage';
import PerformancePage from './pages/PerformancePage';
import OrganizationPage from './pages/OrganizationPage';
import MovementPage from './pages/MovementPage';
import EmployeesPage from './pages/EmployeesPage';
import SettingsPage from './pages/SettingsPage';

class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <div className="font-semibold">Something went wrong while rendering this page.</div>
          <div className="mt-1 font-mono text-xs">{this.state.error.message}</div>
          <button className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const readHash = (): PageKey => {
  const h = window.location.hash.replace('#/', '') as PageKey;
  return NAV.some((n) => n.key === h) ? h : 'overview';
};

function Shell() {
  const { loading, employees } = useApp();
  const [page, setPageState] = useState<PageKey>(readHash);
  useEffect(() => {
    const h = () => setPageState(readHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const setPage = (p: PageKey) => { window.location.hash = `/${p}`; setPageState(p); window.scrollTo(0, 0); };

  const needsData = !['data', 'settings'].includes(page) && employees.length === 0;
  const pages: Record<PageKey, React.ComponentType<{ navigate: (p: PageKey) => void }>> = { overview: OverviewPage, calibration: CalibrationPage, matrix: MatrixPage, succession: SuccessionPage, performance: PerformancePage, organization: OrganizationPage, movement: MovementPage, employees: EmployeesPage, data: DataPage, settings: SettingsPage };
  const Page = pages[page];

  return (
    <Layout page={page} setPage={setPage}>
      <ErrorBoundary resetKey={page}>
        {loading ? (
          <div className="py-20"><Spinner label="Loading workspace…" /></div>
        ) : needsData ? (
          <EmptyState icon={<Upload size={22} />} title="No talent dataset loaded"
            text="Upload your talent management Excel file (.xlsx, .xls or .csv). Data is processed entirely in your browser and is never sent to a server."
            action={<Button onClick={() => setPage('data')}><Upload size={15} />Upload dataset</Button>} />
        ) : (
          <Page navigate={setPage} />
        )}
      </ErrorBoundary>
      <ListModal />
      <ProfileModal />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
