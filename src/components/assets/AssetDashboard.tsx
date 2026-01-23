import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { AssetChecker } from '@/components/assets/AssetChecker';
import { assetService, AssetDashboard as AssetDashboardType } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import {
  HardDrive,
  Monitor,
  Package,
  Users,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';

const AssetDashboard = () => {
  const [stats, setStats] = useState<AssetDashboardType>({
    hardware: { total: 0, available: 0, allocated: 0 },
    software: { total: 0, totalLicenses: 0, availableLicenses: 0, allocatedLicenses: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [showAssetChecker, setShowAssetChecker] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await assetService.getDashboard();
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching asset dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Checker Button */}
      <div className="flex justify-between">
        <div>
          <p className="text-[#1A1A1A] font-medium">
            Overview of company hardware and software assets
          </p>
        </div>
        <Button
          onClick={() => setShowAssetChecker(true)}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Asset Checker
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Hardware Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Utilization Rate</span>
                <span className="text-sm font-medium">
                  {stats.hardware.total > 0
                    ? `${((stats.hardware.allocated / stats.hardware.total) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: stats.hardware.total > 0
                      ? `${(stats.hardware.allocated / stats.hardware.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Software License Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">License Usage</span>
                <span className="text-sm font-medium">
                  {stats.software.totalLicenses > 0
                    ? `${((stats.software.allocatedLicenses / stats.software.totalLicenses) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: stats.software.totalLicenses > 0
                      ? `${(stats.software.allocatedLicenses / stats.software.totalLicenses) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Hardware Assets</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Hardware"
            value={stats.hardware.total}
            icon={HardDrive}
            description="Total hardware items"
          />
          <StatCard
            title="Available"
            value={stats.hardware.available}
            icon={CheckCircle}
            description="Ready for allocation"
            className="text-green-600"
          />
          <StatCard
            title="Allocated"
            value={stats.hardware.allocated}
            icon={Users}
            description="Currently in use"
            className="text-blue-600"
          />
        </div>
      </div>

      {/* Software Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Software Assets</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Software Products"
            value={stats.software.total}
            icon={Package}
            description="Total software assets"
          />
          <StatCard
            title="Total Licenses"
            value={stats.software.totalLicenses}
            icon={Monitor}
            description="All available licenses"
          />
          <StatCard
            title="Available Licenses"
            value={stats.software.availableLicenses}
            icon={CheckCircle}
            description="Ready for allocation"
            className="text-green-600"
          />
          <StatCard
            title="Allocated Licenses"
            value={stats.software.allocatedLicenses}
            icon={Users}
            description="Currently in use"
            className="text-blue-600"
          />
        </div>
      </div>

      {/* Asset Checker Modal */}
      {showAssetChecker && (
        <AssetChecker
          isOpen={showAssetChecker}
          onClose={() => setShowAssetChecker(false)}
        />
      )}
    </div>
  );
};

export default AssetDashboard;