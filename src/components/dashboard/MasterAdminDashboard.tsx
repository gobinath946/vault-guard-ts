import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { Building2, Users, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  totalUsers: number;
}

const MasterAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/master/dashboard');
      setStats(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Master Admin Dashboard">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Master Admin Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">System-wide statistics and company management</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Companies"
            value={stats.totalCompanies}
            icon={Building2}
            description="All registered companies"
          />
          <StatCard
            title="Active Companies"
            value={stats.activeCompanies}
            icon={CheckCircle}
            description="Currently active"
          />
          <StatCard
            title="Inactive Companies"
            value={stats.inactiveCompanies}
            icon={XCircle}
            description="Inactive companies"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="All company users"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Company Management</h3>
          <p className="text-muted-foreground">
            View and manage all registered companies from the Companies section.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MasterAdminDashboard;
