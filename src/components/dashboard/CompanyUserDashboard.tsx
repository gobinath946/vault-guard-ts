import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { assetService } from '@/services/assetService';
import { StatCard } from '@/components/common/StatCard';
import { HardDrive, Package } from 'lucide-react';

interface AssetStats {
  hardware: {
    total: number;
  };
  software: {
    total: number;
    totalLicenses: number;
  };
}

const CompanyUserDashboard = () => {
  const [stats, setStats] = useState<AssetStats>({
    hardware: { total: 0 },
    software: { total: 0, totalLicenses: 0 }
  });

  useEffect(() => {
    fetchAssetStats();
  }, []);

  const fetchAssetStats = async () => {
    try {
      const data = await assetService.getUserAllocatedAssetsDashboard();
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching asset stats:', error);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Hardware Assets"
          value={stats.hardware.total}
          icon={HardDrive}
          description="Assets allocated to you"
        />
        <StatCard
          title="Software Assets"
          value={stats.software.total}
          icon={Package}
          description={`${stats.software.totalLicenses} licenses allocated`}
        />
      </div>
    </DashboardLayout>
  );
};

export default CompanyUserDashboard;
