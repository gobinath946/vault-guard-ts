import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';
import { Package, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/common/Pagination';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AllocatedSoftware {
  allocationId: string;
  _id: string;
  softwareName?: string;
  vendor?: string;
  totalLicenseCount?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  licenseCount: number;
  expiryDate?: string;
  remarks?: string;
}

const MyAllocatedSoftware = () => {
  const [software, setSoftware] = useState<AllocatedSoftware[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoftware, setSelectedSoftware] = useState<AllocatedSoftware | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllocatedSoftware();
  }, []);

  const fetchAllocatedSoftware = async () => {
    try {
      setLoading(true);
      const response = await assetService.getUserAllocatedSoftware();
      setSoftware(response.software || []);
    } catch (error: any) {
      console.error('Error fetching allocated software:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch allocated software',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSoftware = (item: AllocatedSoftware) => {
    setSelectedSoftware(item);
    setViewDialogOpen(true);
  };

  // Filter logic
  const filteredSoftware = software.filter(item =>
    item.softwareName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredSoftware.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSoftware = filteredSoftware.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: 'No expiry', color: 'bg-green-100 text-green-800' };

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiry <= 30) {
      return { label: `Expires in ${daysUntilExpiry} days`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: `Expires in ${daysUntilExpiry} days`, color: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Software Assets">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Software Assets"
      mainClassName="p-0 flex flex-col overflow-hidden"
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-slate-900">Allocated Software Assets</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search software..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
        </div>
      }
      footer={
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredSoftware.length}
          rowsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setItemsPerPage}
        />
      }
    >
      <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full bg-transparent">
        <CardContent className="flex-1 relative p-0 min-h-0">
          <div className="absolute inset-0 overflow-auto">
            {filteredSoftware.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <Package className="h-12 w-12 opacity-20 mb-4" />
                <p className="text-lg font-medium">No software assets found</p>
                <p className="text-sm">
                  {searchQuery ? "No assets match your search criteria." : "No software assets allocated to you yet."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Software Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Licenses Allocated</TableHead>
                    <TableHead>Total Licenses</TableHead>
                    <TableHead>Expiry Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSoftware.map((item, index) => {
                    const expiryStatus = getExpiryStatus(item.expiryDate);
                    return (
                      <TableRow key={item.allocationId} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-500">{startIndex + index + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{item.softwareName || '-'}</TableCell>
                        <TableCell className="text-slate-600">{item.vendor || '-'}</TableCell>
                        <TableCell className="font-medium">{item.licenseCount || 0}</TableCell>
                        <TableCell className="text-slate-500">{item.totalLicenseCount || '-'}</TableCell>
                        <TableCell>
                          <Badge className={cn("font-normal border-none", expiryStatus.color)}>
                            {expiryStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-500">{item.remarks || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSoftware(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4 text-slate-400" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Software Asset Details</DialogTitle>
          </DialogHeader>
          {selectedSoftware && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Software Name</label>
                <p className="text-base font-medium">{selectedSoftware.softwareName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                <p className="text-base font-medium">{selectedSoftware.vendor || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-base font-medium">{selectedSoftware.status || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Licenses</label>
                <p className="text-base font-medium">{selectedSoftware.totalLicenseCount || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Licenses Allocated</label>
                <p className="text-base font-medium">{selectedSoftware.licenseCount || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                <p className="text-base font-medium">
                  {selectedSoftware.expiryDate ? new Date(selectedSoftware.expiryDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="text-base font-medium">
                  {selectedSoftware.startDate ? new Date(selectedSoftware.startDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Remarks</label>
                <p className="text-base font-medium">{selectedSoftware.remarks || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyAllocatedSoftware;
