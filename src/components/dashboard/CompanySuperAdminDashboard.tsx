import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { Users, CheckCircle, XCircle, Key, Folder, BookOpen, Building2, TrendingUp } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPasswords: number;
  totalCollections: number;
  totalFolders: number;
  totalOrganizations: number;
  passwordGrowth: { date: string; count: number }[];
  userActivity: { date: string; activeUsers: number; newUsers: number }[];
  categoryDistribution: { name: string; value: number; color: string }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Default empty data for charts
const defaultPasswordGrowth = [
  { date: '2024-01-01', count: 0 },
  { date: '2024-01-02', count: 0 },
  { date: '2024-01-03', count: 0 },
  { date: '2024-01-04', count: 0 },
  { date: '2024-01-05', count: 0 },
  { date: '2024-01-06', count: 0 },
  { date: '2024-01-07', count: 0 }
];

const defaultUserActivity = [
  { date: '2024-01-01', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-02', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-03', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-04', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-05', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-06', activeUsers: 0, newUsers: 0 },
  { date: '2024-01-07', activeUsers: 0, newUsers: 0 }
];

const defaultCategoryDistribution = [
  { name: 'Passwords', value: 0, color: '#0088FE' },
  { name: 'Collections', value: 0, color: '#00C49F' },
  { name: 'Folders', value: 0, color: '#FFBB28' },
  { name: 'Organizations', value: 0, color: '#FF8042' },
  { name: 'Users', value: 0, color: '#8884D8' },
  { name: 'Active Users', value: 0, color: '#82CA9D' }
];

const CompanySuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalPasswords: 0,
    totalCollections: 0,
    totalFolders: 0,
    totalOrganizations: 0,
    passwordGrowth: defaultPasswordGrowth,
    userActivity: defaultUserActivity,
    categoryDistribution: defaultCategoryDistribution
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const dashboardData = await companyService.getEnhancedDashboard();
      
      // Ensure all arrays have default values if undefined
      setStats({
        totalUsers: dashboardData.totalUsers || 0,
        activeUsers: dashboardData.activeUsers || 0,
        inactiveUsers: dashboardData.inactiveUsers || 0,
        totalPasswords: dashboardData.totalPasswords || 0,
        totalCollections: dashboardData.totalCollections || 0,
        totalFolders: dashboardData.totalFolders || 0,
        totalOrganizations: dashboardData.totalOrganizations || 0,
        passwordGrowth: dashboardData.passwordGrowth?.length ? dashboardData.passwordGrowth : defaultPasswordGrowth,
        userActivity: dashboardData.userActivity?.length ? dashboardData.userActivity : defaultUserActivity,
        categoryDistribution: dashboardData.categoryDistribution?.length ? dashboardData.categoryDistribution : defaultCategoryDistribution
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Safe array accessors
  const passwordGrowth = stats.passwordGrowth || defaultPasswordGrowth;
  const userActivity = stats.userActivity || defaultUserActivity;
  const categoryDistribution = stats.categoryDistribution || defaultCategoryDistribution;

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

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="Company users"
            trend={userActivity.length > 0 ? userActivity[userActivity.length - 1]?.newUsers || 0 : 0}
             trendLabel="new"
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
            trend={passwordGrowth.length > 0 ? passwordGrowth[passwordGrowth.length - 1]?.count || 0 : 0}
             trendLabel="today"
          />
        </div>

        {/* Additional Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Collections"
            value={stats.totalCollections}
            icon={BookOpen}
            description="Password groups"
          />
          <StatCard
            title="Folders"
            value={stats.totalFolders}
            icon={Folder}
            description="Organized folders"
          />
          <StatCard
            title="Organizations"
            value={stats.totalOrganizations}
            icon={Building2}
            description="Managed organizations"
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* Password Growth Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Password Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={passwordGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Passwords"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Items']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* User Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="activeUsers" 
                  fill="#0088FE" 
                  name="Active Users"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="newUsers" 
                  fill="#00C49F" 
                  name="New Users"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Passwords/User</p>
                  <p className="text-2xl font-bold">
                    {stats.totalUsers > 0 ? (stats.totalPasswords / stats.totalUsers).toFixed(1) : 0}
                  </p>
                </div>
                <Key className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organization Usage</p>
                  <p className="text-2xl font-bold">
                    {stats.totalOrganizations > 0 ? (stats.totalCollections / stats.totalOrganizations).toFixed(1) : 0}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Folder Organization</p>
                  <p className="text-2xl font-bold">
                    {stats.totalCollections > 0 ? (stats.totalFolders / stats.totalCollections).toFixed(1) : 0}
                  </p>
                </div>
                <Folder className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanySuperAdminDashboard;