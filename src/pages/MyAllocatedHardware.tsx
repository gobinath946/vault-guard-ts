import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';
import { HardDrive, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/common/Pagination';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AllocatedHardware {
  allocationId: string;
  _id: string;
  assetName?: string;
  assetType?: string;
  brand?: string;
  assetModel?: string;
  serialNumber?: string;
  purchaseDate?: string;
  remarks?: string;
  status: string;
}

const MyAllocatedHardware = () => {
  const [hardware, setHardware] = useState<AllocatedHardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<AllocatedHardware | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllocatedHardware();
  }, []);

  const fetchAllocatedHardware = async () => {
    try {
      setLoading(true);
      const response = await assetService.getUserAllocatedHardware();
      setHardware(response.hardware || []);
    } catch (error: any) {
      console.error('Error fetching allocated hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch allocated hardware',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAsset = (asset: AllocatedHardware) => {
    setSelectedAsset(asset);
    setViewDialogOpen(true);
  };

  // Filter logic
  const filteredHardware = hardware.filter(item =>
    item.assetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.assetModel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredHardware.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHardware = filteredHardware.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <DashboardLayout title="My Hardware Assets">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Hardware Assets"
      mainClassName="p-0 flex flex-col overflow-hidden"
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-slate-900">Allocated Hardware Assets</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search hardware..."
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
          totalItems={filteredHardware.length}
          rowsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setItemsPerPage}
        />
      }
    >
      <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full bg-transparent">
        <CardContent className="flex-1 relative p-0 min-h-0">
          <div className="absolute inset-0 overflow-auto">
            {filteredHardware.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <HardDrive className="h-12 w-12 opacity-20 mb-4" />
                <p className="text-lg font-medium">No hardware assets found</p>
                <p className="text-sm">
                  {searchQuery ? "No assets match your search criteria." : "No hardware assets allocated to you yet."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Brand/Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHardware.map((item, index) => (
                    <TableRow key={item.allocationId} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium text-slate-500">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{item.assetName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal border-slate-200">
                          {item.assetType || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.brand || '-'} {item.assetModel || ''}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{item.serialNumber || '-'}</TableCell>
                      <TableCell className="text-slate-600">
                        {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-500">{item.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAsset(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4 text-slate-400" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hardware Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Asset Name</label>
                <p className="text-base font-medium">{selectedAsset.assetName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-base font-medium">{selectedAsset.assetType || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand</label>
                <p className="text-base font-medium">{selectedAsset.brand || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Model</label>
                <p className="text-base font-medium">{selectedAsset.assetModel || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                <p className="text-base font-medium">{selectedAsset.serialNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-base font-medium">{selectedAsset.status || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                <p className="text-base font-medium">
                  {selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Remarks</label>
                <p className="text-base font-medium">{selectedAsset.remarks || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyAllocatedHardware;
