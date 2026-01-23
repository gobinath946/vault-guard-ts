import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/common/Pagination';
import { SoftwareAssetForm } from '@/components/assets/SoftwareAssetForm';
import { SoftwareAllocationForm } from '@/components/assets/SoftwareAllocationForm';
import { AssetLogDialog } from '@/components/assets/AssetLogDialog';
import { AllocationLogDialog } from '@/components/assets/AllocationLogDialog';
import { assetService, SoftwareAsset, SoftwareAllocation } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package, Calendar, History } from 'lucide-react';
import { format } from 'date-fns';

const SoftwareAssets = () => {
  const [assets, setAssets] = useState<SoftwareAsset[]>([]);
  const [allocations, setAllocations] = useState<SoftwareAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SoftwareAsset | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<SoftwareAllocation | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'asset' | 'allocation';
    id: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'asset',
    id: '',
    title: '',
    description: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [assetLogDialog, setAssetLogDialog] = useState<{
    isOpen: boolean;
    assetId: string;
    assetName: string;
  }>({ isOpen: false, assetId: '', assetName: '' });
  const [allocationLogDialog, setAllocationLogDialog] = useState<{
    isOpen: boolean;
    allocationId?: string;
    assetId?: string;
    userId?: string;
    mode: 'allocation' | 'asset' | 'user';
    assetName?: string;
    userName?: string;
  }>({ isOpen: false, mode: 'allocation' });
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === 'assets') {
      fetchAssets();
    } else {
      fetchAllocations();
    }
  }, [activeTab, currentPage, rowsPerPage, searchQuery, statusFilter]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getSoftwareAssets({
        page: currentPage,
        limit: rowsPerPage,
        q: searchQuery,
        status: statusFilter,
      });
      setAssets(data.assets);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
    } catch (error: any) {
      console.error('Error fetching software assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch software assets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const data = await assetService.getSoftwareAllocations({
        page: currentPage,
        limit: rowsPerPage,
        q: searchQuery,
      });
      setAllocations(data.allocations);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
    } catch (error: any) {
      console.error('Error fetching software allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch software allocations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = () => {
    setEditingAsset(null);
    setShowAssetForm(true);
  };

  const handleEditAsset = (asset: SoftwareAsset) => {
    setEditingAsset(asset);
    setShowAssetForm(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = assets.find(a => a._id === assetId);
    setDeleteConfirm({
      isOpen: true,
      type: 'asset',
      id: assetId,
      title: 'Delete Software Asset',
      description: `Are you sure you want to delete "${asset?.softwareName}"? This action cannot be undone.`,
    });
  };

  const handleCreateAllocation = () => {
    setEditingAllocation(null);
    setShowAllocationForm(true);
  };

  const handleEditAllocation = (allocation: SoftwareAllocation) => {
    setEditingAllocation(allocation);
    setShowAllocationForm(true);
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    const allocation = allocations.find(a => a._id === allocationId);
    setDeleteConfirm({
      isOpen: true,
      type: 'allocation',
      id: allocationId,
      title: 'Delete Allocation',
      description: `Are you sure you want to delete the allocation for "${allocation?.softwareAssetId.softwareName}" to "${allocation?.userId.username}"? This action cannot be undone.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'asset') {
        await assetService.deleteSoftwareAsset(deleteConfirm.id);
        toast({
          title: 'Success',
          description: 'Software asset deleted successfully',
        });
        fetchAssets();
      } else {
        await assetService.deleteSoftwareAllocation(deleteConfirm.id);
        toast({
          title: 'Success',
          description: 'Software allocation deleted successfully',
        });
        fetchAllocations();
      }
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to delete ${deleteConfirm.type}`,
        variant: 'destructive',
      });
    }
  };

  const handleAssetFormSuccess = () => {
    setShowAssetForm(false);
    setEditingAsset(null);

    // Force refresh both assets and allocations since updating software end date affects allocations
    setTimeout(() => {
      fetchAssets();
      fetchAllocations(); // Also refresh allocations since expiry dates might have been updated
    }, 200);
  };

  const handleAllocationFormSuccess = () => {
    setShowAllocationForm(false);
    setEditingAllocation(null);

    // Force refresh both allocations and assets data
    setTimeout(() => {
      fetchAllocations();
      fetchAssets(); // Always refresh assets too since status might have changed
    }, 200);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getExpiryStatus = (expiryDate?: string, allocationStatus?: string) => {
    // Always trust the backend status first
    if (allocationStatus === 'EXPIRED') {
      return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    }

    if (allocationStatus === 'ACTIVE' && expiryDate) {
      const expiry = new Date(expiryDate);
      const current = new Date();

      // Set time to match backend logic
      expiry.setHours(23, 59, 59, 999); // End of the expiry date
      current.setHours(0, 0, 0, 0);     // Start of current date

      const diffTime = expiry.getTime() - current.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50' };
      } else if (diffDays <= 7) {
        return { status: 'expiring-soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
      } else if (diffDays <= 30) {
        return { status: 'expiring-month', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      }
    }

    return { status: 'active', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  // Header component
  const header = (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Tabs */}
        <TabsList>
          <TabsTrigger value="assets">Master Software</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
        </TabsList>

        {/* Right side: Search and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search software..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {activeTab === 'assets' && (
            <>
              <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block"></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <div className="h-4 w-[1px] bg-border/60 mx-1 hidden lg:block"></div>

          {activeTab === 'assets' ? (
            <Button onClick={handleCreateAsset} size="sm" className="h-9 gap-2 bg-[#4F46E5] hover:bg-[#4338CA] shadow-md">
              <Plus className="h-4 w-4" />
              Add Software
            </Button>
          ) : (
            <Button onClick={handleCreateAllocation} size="sm" className="h-9 gap-2 bg-[#4F46E5] hover:bg-[#4338CA] shadow-md">
              <Plus className="h-4 w-4" />
              Add Allocation
            </Button>
          )}
        </div>
      </div>
    </Tabs>
  );

  // Footer component
  const footer = (
    <Pagination
      currentPage={currentPage}
      totalPages={pagination.totalPages}
      totalItems={pagination.total}
      rowsPerPage={rowsPerPage}
      onPageChange={setCurrentPage}
      onRowsPerPageChange={setRowsPerPage}
    />
  );

  return (
    <DashboardLayout
      title="Software Assets"
      header={header}
      footer={footer}
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 w-full">
        <TabsContent value="assets" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full">
            <CardHeader className="flex-none px-6 py-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Software Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative p-0 min-h-0 bg-background">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="absolute inset-0 overflow-auto">
                  <table className="w-full caption-bottom text-xs">
                    <thead className="sticky top-0 bg-card z-10 shadow-sm [&_tr]:border-b">
                      <TableRow className="border-b border-border">
                        <TableHead className="w-12 h-12 px-4 text-left align-middle font-medium text-muted-foreground">S.No</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Software Name</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vendor</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total Licenses</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Available</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Assigned</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No software assets found
                          </TableCell>
                        </TableRow>
                      ) : (
                        assets.map((asset, index) => (
                          <TableRow key={asset._id}>
                            <TableCell className="text-center">
                              {(currentPage - 1) * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell className="font-medium">{asset.softwareName || '-'}</TableCell>
                            <TableCell>{asset.vendor || '-'}</TableCell>
                            <TableCell>{asset.totalLicenseCount || 0}</TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {asset.availableLicenseCount || 0}
                            </TableCell>
                            <TableCell className="text-blue-600 font-medium">
                              {(asset.totalLicenseCount || 0) - (asset.availableLicenseCount || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(asset.status)}>
                                {asset.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAsset(asset)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAssetLogDialog({
                                    isOpen: true,
                                    assetId: asset._id,
                                    assetName: asset.softwareName || 'Software Asset',
                                  })}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAsset(asset._id)}
                                  disabled={(asset.totalLicenseCount || 0) - (asset.availableLicenseCount || 0) > 0}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full">
            <CardHeader className="flex-none px-6 py-4 border-b">
              <CardTitle>Software Allocation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative p-0 min-h-0 bg-background">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="absolute inset-0 overflow-auto">
                  <table className="w-full caption-bottom text-xs">
                    <thead className="sticky top-0 bg-card z-10 shadow-sm [&_tr]:border-b">
                      <TableRow className="border-b border-border">
                        <TableHead className="w-12 h-12 px-4 text-left align-middle font-medium text-muted-foreground">S.No</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Software</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vendor</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Licenses</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Allocated Date</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Expiry Date</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {allocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No software allocations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        allocations.map((allocation, index) => (
                          <TableRow key={allocation._id}>
                            <TableCell className="text-center">
                              {(currentPage - 1) * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{allocation.userId.username}</p>
                                <p className="text-sm text-muted-foreground">{allocation.userId.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {allocation.softwareAssetId.softwareName || '-'}
                            </TableCell>
                            <TableCell>
                              {allocation.softwareAssetId.vendor || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {allocation.licenseCount}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                              </span>
                            </TableCell>
                            <TableCell>
                              {allocation.expiryDate ? (
                                (() => {
                                  const expiryStatus = getExpiryStatus(allocation.expiryDate, allocation.status);
                                  return (
                                    <div className={`flex items-center gap-1 text-sm p-2 rounded ${expiryStatus?.bgColor || ''}`}>
                                      <Calendar className={`h-3 w-3 ${expiryStatus?.color || ''}`} />
                                      <span className={expiryStatus?.color || ''}>
                                        {format(new Date(allocation.expiryDate), 'MMM dd, yyyy')}
                                      </span>
                                      {expiryStatus?.status === 'expired' && (
                                        <span className="text-xs font-medium text-red-600 ml-1">(EXPIRED)</span>
                                      )}
                                      {expiryStatus?.status === 'expiring-soon' && (
                                        <span className="text-xs font-medium text-orange-600 ml-1">(EXPIRES SOON)</span>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(allocation.status)}>
                                {allocation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAllocation(allocation)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAllocationLogDialog({
                                    isOpen: true,
                                    allocationId: allocation._id,
                                    mode: 'allocation',
                                    assetName: allocation.softwareAssetId.softwareName,
                                  })}
                                  title="View Allocation History"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAllocation(allocation._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms and Dialogs */}
      {showAssetForm && (
        <SoftwareAssetForm
          isOpen={showAssetForm}
          onClose={() => setShowAssetForm(false)}
          onSuccess={handleAssetFormSuccess}
          editingAsset={editingAsset}
        />
      )}

      {showAllocationForm && (
        <SoftwareAllocationForm
          isOpen={showAllocationForm}
          onClose={() => setShowAllocationForm(false)}
          onSuccess={handleAllocationFormSuccess}
          editingAllocation={editingAllocation}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Asset Log Dialog */}
      <AssetLogDialog
        isOpen={assetLogDialog.isOpen}
        onClose={() => setAssetLogDialog({ isOpen: false, assetId: '', assetName: '' })}
        assetType="software"
        assetId={assetLogDialog.assetId}
        assetName={assetLogDialog.assetName}
      />

      {/* Allocation Log Dialog */}
      <AllocationLogDialog
        isOpen={allocationLogDialog.isOpen}
        onClose={() => setAllocationLogDialog({ isOpen: false, mode: 'allocation' })}
        allocationType="software"
        allocationId={allocationLogDialog.allocationId}
        assetId={allocationLogDialog.assetId}
        userId={allocationLogDialog.userId}
        mode={allocationLogDialog.mode}
        assetName={allocationLogDialog.assetName}
        userName={allocationLogDialog.userName}
      />
    </DashboardLayout>
  );
};

export default SoftwareAssets;