import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { Users, CheckCircle, XCircle, Key } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPasswords: number;
}

const CompanySuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalPasswords: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/company/dashboard');
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
      <DashboardLayout title="Company Dashboard">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Company Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your company's password management</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="Company users"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={CheckCircle}
            description="Currently active"
          />
          <StatCard
            title="Inactive Users"
            value={stats.inactiveUsers}
            icon={XCircle}
            description="Inactive users"
          />
          <StatCard
            title="Total Passwords"
            value={stats.totalPasswords}
            icon={Key}
            description="Stored passwords"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Quick Actions</h3>
          <p className="text-muted-foreground">
            Manage your passwords, users, folders, and collections from the navigation menu.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanySuperAdminDashboard;
