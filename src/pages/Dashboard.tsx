import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MasterAdminDashboard from '@/components/dashboard/MasterAdminDashboard';
import CompanySuperAdminDashboard from '@/components/dashboard/CompanySuperAdminDashboard';
import CompanyUserDashboard from '@/components/dashboard/CompanyUserDashboard';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
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

  switch (user.role) {
    case 'master_admin':
      return <MasterAdminDashboard />;
    case 'company_super_admin':
      return <CompanySuperAdminDashboard />;
    case 'company_user':
      return <CompanyUserDashboard />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Invalid user role</p>
        </div>
      );
  }
};

export default Dashboard;
