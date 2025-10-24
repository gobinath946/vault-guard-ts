
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AddPasswordForm from '@/components/common/AddPasswordForm';
import { useAuth } from '@/contexts/AuthContext';

const CompanyUserDashboard = () => {
  const { user } = useAuth();
  // Only allow password creation module for company_user
  return (
    <DashboardLayout title="Password Creation">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-xl">
          <AddPasswordForm sourceType="organization" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyUserDashboard;
