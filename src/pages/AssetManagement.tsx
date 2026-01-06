import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AssetDashboard from '@/components/assets/AssetDashboard';
import HardwareAssets from '@/components/assets/HardwareAssets';
import SoftwareAssets from '@/components/assets/SoftwareAssets';

const AssetManagement = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
    
    if (!isLoading && user && user.role !== 'company_super_admin') {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'company_super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            Only Super Admins can access Asset Management
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'hardware':
        return <HardwareAssets />;
      case 'software':
        return <SoftwareAssets />;
      case 'dashboard':
      default:
        return <AssetDashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'hardware':
        return 'Hardware Assets';
      case 'software':
        return 'Software Assets';
      case 'dashboard':
      default:
        return 'Asset Management Dashboard';
    }
  };

  const getPageDescription = () => {
    switch (activeTab) {
      case 'hardware':
        return 'Manage and track company hardware assets';
      case 'software':
        return 'Manage and track company software assets';
      case 'dashboard':
      default:
        return 'Overview of company hardware and software assets';
    }
  };

  return (
    <DashboardLayout title="Asset Management">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h2>
          <p className="text-muted-foreground">{getPageDescription()}</p>
        </div>

        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default AssetManagement;