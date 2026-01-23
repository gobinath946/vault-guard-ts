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
import { HardwareAssetForm } from '@/components/assets/HardwareAssetForm';
import { HardwareAllocationForm } from '@/components/assets/HardwareAllocationForm';
import { AssetLogDialog } from '@/components/assets/AssetLogDialog';
import { AllocationLogDialog } from '@/components/assets/AllocationLogDialog';
import { assetService, HardwareAsset, HardwareAllocation, HardwareAllocationEvent } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Monitor, Calendar, History, Users, Package } from 'lucide-react';
import { format } from 'date-fns';

const HardwareAssets = () => {
  const [assets, setAssets] = useState<HardwareAsset[]>([]);
  const [allocations, setAllocations] = useState<HardwareAllocation[]>([]);
  const [allocationEvents, setAllocationEvents] = useState<HardwareAllocationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<HardwareAllocation | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [allocationViewMode, setAllocationViewMode] = useState<'events' | 'individual'>('individual'); // Start with individual view as it's more stable
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'asset' | 'allocation' | 'event';
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
    allocationIds?: string[];
    assetId?: string;
    assetIds?: string[];
    userId?: string;
    mode: 'allocation' | 'asset' | 'user' | 'event';
    assetName?: string;
    userName?: string;
  }>({ isOpen: false, mode: 'allocation' });
  const { toast } = useToast();

  useEffect(() => {

    if (activeTab === 'assets') {
      fetchAssets();
    } else {
      if (allocationViewMode === 'events') {
        fetchAllocationEvents();
      } else {
        fetchAllocations();
      }
    }
  }, [activeTab, allocationViewMode, currentPage, rowsPerPage, searchQuery, statusFilter]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getHardwareAssets({
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
      console.error('Error fetching hardware assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware assets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);

      const data = await assetService.getHardwareAllocations({
        page: currentPage,
        limit: rowsPerPage,
        q: searchQuery,
      });

      if (!data || !data.allocations) {
        console.error('No individual allocations data received');
        setAllocations([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }));
        return;
      }

      setAllocations(data.allocations);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));


    } catch (error: any) {
      console.error('Error fetching hardware allocations:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: `Failed to fetch hardware allocations: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationEvents = async () => {
    try {
      setLoading(true);


      // For now, we'll simulate the event-based view by grouping existing allocations
      // In a real implementation, this would call a dedicated backend endpoint
      const data = await assetService.getHardwareAllocations({
        page: currentPage,
        limit: rowsPerPage * 3, // Fetch more to account for grouping
        q: searchQuery,
      });



      if (!data || !data.allocations) {
        console.error('No allocations data received');
        setAllocationEvents([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }));
        return;
      }

      // Group allocations by user and date to simulate events
      const groupedEvents = groupAllocationsByEvent(data.allocations);


      setAllocationEvents(groupedEvents);

      setPagination(prev => ({
        ...prev,
        total: groupedEvents.length,
        totalPages: Math.ceil(groupedEvents.length / rowsPerPage),
      }));
    } catch (error: any) {
      console.error('Error fetching hardware allocation events:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: `Failed to fetch hardware allocation events: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
      setAllocationEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to group allocations into events
  const groupAllocationsByEvent = (allocations: HardwareAllocation[]): HardwareAllocationEvent[] => {
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid allocations data:', allocations);
      return [];
    }

    const eventMap = new Map<string, HardwareAllocationEvent>();

    allocations.forEach((allocation, index) => {
      try {
        // Validate allocation data
        if (!allocation || !allocation.userId || !allocation.hardwareAssetId || !allocation.allocatedDate) {
          console.warn(`Skipping invalid allocation at index ${index}:`, allocation);
          return;
        }

        // Create a key based on user and date (same day)
        const dateKey = format(new Date(allocation.allocatedDate), 'yyyy-MM-dd');
        const eventKey = `${allocation.userId._id}-${dateKey}`;

        if (eventMap.has(eventKey)) {
          const event = eventMap.get(eventKey)!;
          event.assetCount++;
          event.assets.push({
            _id: allocation.hardwareAssetId._id,
            assetName: allocation.hardwareAssetId.assetName || 'Unnamed Asset',
            brand: allocation.hardwareAssetId.brand || 'Unknown Brand',
            assetModel: allocation.hardwareAssetId.assetModel || 'Unknown Model',
            serialNumber: allocation.hardwareAssetId.serialNumber || 'N/A',
            allocationId: allocation._id,
          });
        } else {
          eventMap.set(eventKey, {
            _id: eventKey,
            userId: allocation.userId,
            allocatedDate: allocation.allocatedDate,
            status: allocation.status,
            remarks: allocation.remarks,
            assetCount: 1,
            assets: [{
              _id: allocation.hardwareAssetId._id,
              assetName: allocation.hardwareAssetId.assetName || 'Unnamed Asset',
              brand: allocation.hardwareAssetId.brand || 'Unknown Brand',
              assetModel: allocation.hardwareAssetId.assetModel || 'Unknown Model',
              serialNumber: allocation.hardwareAssetId.serialNumber || 'N/A',
              allocationId: allocation._id,
            }],
            createdAt: allocation.createdAt,
          });
        }
      } catch (error) {
        console.error(`Error processing allocation at index ${index}:`, error, allocation);
      }
    });

    const events = Array.from(eventMap.values()).sort((a, b) =>
      new Date(b.allocatedDate).getTime() - new Date(a.allocatedDate).getTime()
    );


    return events;
  };

  const handleCreateAsset = () => {
    setEditingAsset(null);
    setShowAssetForm(true);
  };

  const handleEditAsset = (asset: HardwareAsset) => {
    setEditingAsset(asset);
    setShowAssetForm(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = assets.find(a => a._id === assetId);
    setDeleteConfirm({
      isOpen: true,
      type: 'asset',
      id: assetId,
      title: 'Delete Hardware Asset',
      description: `Are you sure you want to delete "${asset?.assetName}"? This action cannot be undone.`,
    });
  };

  const handleCreateAllocation = () => {
    setEditingAllocation(null);
    setShowAllocationForm(true);
  };

  const handleEditAllocation = (allocation: HardwareAllocation) => {
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
      description: `Are you sure you want to delete the allocation for "${allocation?.hardwareAssetId.assetName}" to "${allocation?.userId.username}"? This action cannot be undone.`,
    });
  };

  const handleEditEvent = (event: HardwareAllocationEvent) => {
    // For event editing, we'll edit the first allocation and apply changes to all
    // This is a simplified approach - in a real implementation, you might want a dedicated event edit dialog
    const firstAllocation = allocations.find(a =>
      event.assets.some(asset => asset.allocationId === a._id)
    );

    if (firstAllocation) {
      // Create a special allocation object that represents the event
      const eventAllocation: HardwareAllocation = {
        ...firstAllocation,
        // Add event context for the form to know it's editing an event
        _eventId: event._id,
        _eventAssetCount: event.assetCount,
        _eventAssets: event.assets,
      } as any;

      setEditingAllocation(eventAllocation);
      setShowAllocationForm(true);
    } else {
      toast({
        title: 'Error',
        description: 'Could not find allocation data for this event',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const event = allocationEvents.find(e => e._id === eventId);
    setDeleteConfirm({
      isOpen: true,
      type: 'event',
      id: eventId,
      title: 'Delete Allocation Event',
      description: `Are you sure you want to delete all ${event?.assetCount} allocations for "${event?.userId.username}" from ${format(new Date(event?.allocatedDate || ''), 'MMM dd, yyyy')}? This action cannot be undone.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'asset') {
        await assetService.deleteHardwareAsset(deleteConfirm.id);
        toast({
          title: 'Success',
          description: 'Hardware asset deleted successfully',
        });
        fetchAssets();
      } else if (deleteConfirm.type === 'allocation') {
        await assetService.deleteHardwareAllocation(deleteConfirm.id);
        toast({
          title: 'Success',
          description: 'Hardware allocation deleted successfully',
        });
        if (allocationViewMode === 'events') {
          fetchAllocationEvents();
        } else {
          fetchAllocations();
        }
        // Also refresh assets to update allocation status with a small delay
        setTimeout(() => {
          if (activeTab === 'assets') {
            fetchAssets();
          } else {
            // Always refresh assets even if on allocations tab to update status
            fetchAssets();
          }
        }, 500); // Small delay to ensure backend has updated the status
      } else if (deleteConfirm.type === 'event') {
        // Delete all allocations in the event
        const event = allocationEvents.find(e => e._id === deleteConfirm.id);
        if (event) {
          for (const asset of event.assets) {
            await assetService.deleteHardwareAllocation(asset.allocationId);
          }
          toast({
            title: 'Success',
            description: `${event.assetCount} hardware allocations deleted successfully`,
          });
          fetchAllocationEvents();
          // Also refresh assets to update allocation status
          setTimeout(() => {
            fetchAssets();
          }, 500);
        }
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

    // Force refresh both assets and allocations since changing hardware status affects allocations
    setTimeout(() => {
      fetchAssets();
      fetchAllocations(); // Also refresh allocations since status changes might hide returned allocations
    }, 200);
  };

  const handleAllocationFormSuccess = () => {
    setShowAllocationForm(false);
    setEditingAllocation(null);
    if (allocationViewMode === 'events') {
      fetchAllocationEvents();
    } else {
      fetchAllocations();
    }
    // Also refresh assets to update allocation status
    if (activeTab === 'assets') {
      fetchAssets();
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'RETURNED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  // Header component
  const header = (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Tabs */}
        <TabsList>
          <TabsTrigger value="assets">Master Hardware</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
        </TabsList>

        {/* Right side: Search and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search hardware..."
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
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <div className="h-4 w-[1px] bg-border/60 mx-1 hidden lg:block"></div>

          {activeTab === 'assets' ? (
            <Button onClick={handleCreateAsset} size="sm" className="h-9 gap-2 bg-[#4F46E5] hover:bg-[#4338CA] shadow-md">
              <Plus className="h-4 w-4" />
              Add Hardware
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
      title="Hardware Assets"
      header={header}
      footer={footer}
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 w-full">
        <TabsContent value="assets" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full">
            <CardHeader className="flex-none px-6 py-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Hardware Assets
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
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Asset Name</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Brand/Model</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Serial Number</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Allocated To</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Purchase Date</TableHead>
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No hardware assets found
                          </TableCell>
                        </TableRow>
                      ) : (
                        assets.map((asset, index) => (
                          <TableRow key={asset._id}>
                            <TableCell className="text-center">
                              {(currentPage - 1) * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell className="font-medium">{asset.assetName || '-'}</TableCell>
                            <TableCell>{asset.assetType || '-'}</TableCell>
                            <TableCell>{asset.brand || '-'} {asset.assetModel || ''}</TableCell>
                            <TableCell className="font-mono text-sm">{asset.serialNumber || '-'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(asset.status)}>
                                {asset.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {asset.currentAllocation ? (
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{asset.currentAllocation.userId.username}</p>
                                  <p className="text-xs text-muted-foreground">{asset.currentAllocation.userId.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Allocated: {format(new Date(asset.currentAllocation.allocatedDate), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not allocated</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {asset.purchaseDate ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(asset.purchaseDate), 'MMM dd, yyyy')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
                                    assetName: asset.assetName || 'Hardware Asset',
                                  })}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAsset(asset._id)}
                                  disabled={asset.status === 'ASSIGNED'}
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
              <div className="flex items-center justify-between">
                <CardTitle>Hardware Allocations</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={allocationViewMode} onValueChange={(value: 'events' | 'individual') => setAllocationViewMode(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="events">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Event View
                        </div>
                      </SelectItem>
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Individual View
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 relative p-0 min-h-0 bg-background">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="absolute inset-0 overflow-auto">
                  {/* Render views with error boundary */}
                  {(() => {
                    try {
                      return allocationViewMode === 'events' ? (
                        // Event-based view
                        <div>
                          <h3 className="sticky top-0 bg-background z-20 px-4 py-2 font-medium border-b text-sm flex items-center shadow-sm">Event View - Grouped Allocations</h3>
                          <table className="w-full caption-bottom text-xs">
                            <thead className="sticky top-[37px] bg-card z-10 shadow-sm [&_tr]:border-b">
                              <TableRow>
                                <TableHead className="w-12">S.No</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Assets</TableHead>
                                <TableHead>Allocated Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                              {allocationEvents.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No hardware allocation events found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                allocationEvents.map((event, index) => {
                                  // Add safety checks for event data
                                  if (!event || !event.userId || !event.assets) {
                                    console.warn('Skipping invalid event:', event);
                                    return null;
                                  }

                                  return (
                                    <TableRow key={event._id || `event-${index}`}>
                                      <TableCell className="text-center">
                                        {(currentPage - 1) * rowsPerPage + index + 1}
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium">{event.userId?.username || 'Unknown User'}</p>
                                          <p className="text-sm text-muted-foreground">{event.userId?.email || 'No email'}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                              {event.assetCount || 0} Asset{(event.assetCount || 0) > 1 ? 's' : ''}
                                            </Badge>
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {event.assets && event.assets.length > 0
                                              ? event.assets.slice(0, 2).map(asset => asset?.assetName || 'Unnamed').join(', ')
                                              : 'No assets'
                                            }
                                            {event.assets && event.assets.length > 2 && ` +${event.assets.length - 2} more`}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="flex items-center gap-1 text-sm">
                                          <Calendar className="h-3 w-3" />
                                          {event.allocatedDate
                                            ? format(new Date(event.allocatedDate), 'MMM dd, yyyy')
                                            : 'Unknown date'
                                          }
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={getStatusBadgeClass(event.status || 'ACTIVE')}>
                                          {event.status || 'ACTIVE'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setAllocationLogDialog({
                                              isOpen: true,
                                              allocationIds: event.assets?.map(asset => asset?.allocationId).filter(Boolean) || [],
                                              assetIds: event.assets?.map(asset => asset?._id).filter(Boolean) || [],
                                              mode: 'event',
                                              userName: event.userId?.username || 'Unknown User',
                                            })}
                                            title="View Event Allocation History"
                                          >
                                            <History className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteEvent(event._id)}
                                            title="Delete Event"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }).filter(Boolean) // Remove any null entries from invalid events
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        // Individual allocation view
                        <div>
                          <table className="w-full caption-bottom text-xs">
                            <thead className="sticky top-0 bg-card z-10 shadow-sm [&_tr]:border-b">
                              <TableRow>
                                <TableHead className="w-12">S.No</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>Brand/Model</TableHead>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Allocated Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                              {allocations.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No hardware allocations found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                allocations.map((allocation, index) => {
                                  // Add safety checks for allocation data
                                  if (!allocation || !allocation.userId || !allocation.hardwareAssetId) {
                                    console.warn('Skipping invalid allocation:', allocation);
                                    return null;
                                  }

                                  return (
                                    <TableRow key={allocation._id || `allocation-${index}`}>
                                      <TableCell className="text-center">
                                        {(currentPage - 1) * rowsPerPage + index + 1}
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium">{allocation.userId?.username || 'Unknown User'}</p>
                                          <p className="text-sm text-muted-foreground">{allocation.userId?.email || 'No email'}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {allocation.hardwareAssetId?.assetName || 'Unknown Asset'}
                                      </TableCell>
                                      <TableCell>
                                        {allocation.hardwareAssetId?.brand || 'Unknown'} {allocation.hardwareAssetId?.assetModel || ''}
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">
                                        {allocation.hardwareAssetId?.serialNumber || 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        <span className="flex items-center gap-1 text-sm">
                                          <Calendar className="h-3 w-3" />
                                          {allocation.allocatedDate
                                            ? format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')
                                            : 'Unknown date'
                                          }
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={getStatusBadgeClass(allocation.status || 'ACTIVE')}>
                                          {allocation.status || 'ACTIVE'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditAllocation(allocation)}
                                            title="Edit Allocation"
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
                                              assetName: allocation.hardwareAssetId?.assetName || 'Unknown Asset',
                                            })}
                                            title="View Allocation History"
                                          >
                                            <History className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteAllocation(allocation._id)}
                                            title="Delete Allocation"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }).filter(Boolean) // Remove any null entries from invalid allocations
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering allocation view:', error);
                      return (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                          <h3 className="text-red-800 font-medium">Rendering Error</h3>
                          <p className="text-red-600 text-sm mt-1">
                            There was an error displaying the {allocationViewMode} view. Please try refreshing the page or switching views.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => window.location.reload()}
                          >
                            Refresh Page
                          </Button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      {showAssetForm && (
        <HardwareAssetForm
          isOpen={showAssetForm}
          onClose={() => setShowAssetForm(false)}
          onSuccess={handleAssetFormSuccess}
          editingAsset={editingAsset}
        />
      )}

      {showAllocationForm && (
        <HardwareAllocationForm
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
        assetType="hardware"
        assetId={assetLogDialog.assetId}
        assetName={assetLogDialog.assetName}
      />

      {/* Allocation Log Dialog */}
      <AllocationLogDialog
        isOpen={allocationLogDialog.isOpen}
        onClose={() => setAllocationLogDialog({ isOpen: false, mode: 'allocation' })}
        allocationType="hardware"
        allocationId={allocationLogDialog.allocationId}
        allocationIds={allocationLogDialog.allocationIds}
        assetId={allocationLogDialog.assetId}
        assetIds={allocationLogDialog.assetIds}
        userId={allocationLogDialog.userId}
        mode={allocationLogDialog.mode}
        assetName={allocationLogDialog.assetName}
        userName={allocationLogDialog.userName}
      />
    </DashboardLayout>
  );
};

export default HardwareAssets;