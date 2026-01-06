import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HardwareAllocationForm } from '@/components/assets/HardwareAllocationForm';
import { SoftwareAllocationForm } from '@/components/assets/SoftwareAllocationForm';
import { AllocationLogDialog } from '@/components/assets/AllocationLogDialog';
import { assetService, AssetChecker as AssetCheckerType, CompanyUser, HardwareAllocation, SoftwareAllocation } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { HardDrive, Package, Edit, Trash2, Calendar, Check, ChevronsUpDown, History } from 'lucide-react';
import { format } from 'date-fns';

interface AssetCheckerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetChecker = ({ isOpen, onClose }: AssetCheckerProps) => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assetData, setAssetData] = useState<AssetCheckerType | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showHardwareAllocationForm, setShowHardwareAllocationForm] = useState(false);
  const [showSoftwareAllocationForm, setShowSoftwareAllocationForm] = useState(false);
  const [editingHardwareAllocation, setEditingHardwareAllocation] = useState<HardwareAllocation | null>(null);
  const [editingSoftwareAllocation, setEditingSoftwareAllocation] = useState<SoftwareAllocation | null>(null);
  const [allocationLogDialog, setAllocationLogDialog] = useState<{
    isOpen: boolean;
    allocationId?: string;
    mode: 'allocation';
    assetName?: string;
    allocationType: 'hardware' | 'software';
  }>({ isOpen: false, mode: 'allocation', allocationType: 'hardware' });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await assetService.getCompanyUsers();
      setUsers(data.users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserAssets = async (userId: string) => {
    try {
      setLoading(true);
      const data = await assetService.getAssetChecker(userId);
      setAssetData(data);
    } catch (error: any) {
      console.error('Error fetching user assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user assets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'EXPIRED':
        return 'destructive';
      case 'RETURNED':
        return 'secondary';
      case 'DELETED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'RETURNED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'DELETED':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
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

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setUserDropdownOpen(false);
    setAssetData(null);
    if (userId) {
      fetchUserAssets(userId);
    }
  };

  const handleEditAllocation = (e: React.MouseEvent, type: 'hardware' | 'software', allocation: HardwareAllocation | SoftwareAllocation) => {
    e.stopPropagation();
    if (type === 'hardware') {
      setEditingHardwareAllocation(allocation as HardwareAllocation);
      setShowHardwareAllocationForm(true);
    } else {
      setEditingSoftwareAllocation(allocation as SoftwareAllocation);
      setShowSoftwareAllocationForm(true);
    }
  };

  const handleAllocationSuccess = () => {
    setShowHardwareAllocationForm(false);
    setShowSoftwareAllocationForm(false);
    setEditingHardwareAllocation(null);
    setEditingSoftwareAllocation(null);
    
    // Refresh data with a small delay to ensure backend processing is complete
    setTimeout(() => {
      if (selectedUserId) {
        fetchUserAssets(selectedUserId);
      }
    }, 200);
  };

  const handleLogClick = (e: React.MouseEvent, allocation: HardwareAllocation | SoftwareAllocation, type: 'hardware' | 'software') => {
    e.stopPropagation();
    setAllocationLogDialog({
      isOpen: true,
      allocationId: allocation._id,
      mode: 'allocation',
      assetName: type === 'hardware' 
        ? (allocation as HardwareAllocation).hardwareAssetId.assetName
        : (allocation as SoftwareAllocation).softwareAssetId.softwareName,
      allocationType: type,
    });
  };

  const handleDeleteAllocation = async (e: React.MouseEvent, type: 'hardware' | 'software', allocationId: string) => {
    e.stopPropagation();
    try {
      if (type === 'hardware') {
        await assetService.deleteHardwareAllocation(allocationId);
      } else {
        await assetService.deleteSoftwareAllocation(allocationId);
      }
      
      toast({
        title: 'Success',
        description: `${type} allocation deleted successfully`,
      });
      
      // Refresh data
      if (selectedUserId) {
        fetchUserAssets(selectedUserId);
      }
    } catch (error: any) {
      console.error('Error deleting allocation:', error);
      toast({
        title: 'Error',
        description: `Failed to delete ${type} allocation`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Checker</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select User</label>
            <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userDropdownOpen}
                  className="w-full justify-between"
                  disabled={loadingUsers}
                >
                  {selectedUserId
                    ? users.find((user) => user._id === selectedUserId)?.username + 
                      ` (${users.find((user) => user._id === selectedUserId)?.email})`
                    : loadingUsers ? "Loading users..." : "Select a user"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user._id}
                        value={`${user.username} ${user.email}`}
                        onSelect={() => handleUserSelect(user._id)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedUserId === user._id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {user.username} ({user.email})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {/* Asset Data */}
          {assetData && !loading && (
            <Tabs defaultValue="hardware" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hardware" className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Hardware Assets ({assetData.hardware.length})
                </TabsTrigger>
                <TabsTrigger value="software" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Software Assets ({assetData.software.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hardware" className="mt-4">
                {assetData.hardware.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hardware assets assigned
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">S.No</TableHead>
                          <TableHead>Asset Name</TableHead>
                          <TableHead>Brand & Model</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assetData.hardware.map((allocation, index) => (
                          <TableRow key={allocation._id}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {allocation.hardwareAssetId.assetName || '-'}
                            </TableCell>
                            <TableCell>
                              {allocation.hardwareAssetId.brand || '-'} {allocation.hardwareAssetId.assetModel || ''}
                            </TableCell>
                            <TableCell>
                              {allocation.hardwareAssetId.serialNumber || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(allocation.status)}>
                                {allocation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleEditAllocation(e, 'hardware', allocation)}
                                  title="Edit Allocation"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleLogClick(e, allocation, 'hardware')}
                                  title="View Allocation History"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleDeleteAllocation(e, 'hardware', allocation._id)}
                                  title="Delete Allocation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="software" className="mt-4">
                {assetData.software.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No software assets assigned
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">S.No</TableHead>
                          <TableHead>Software Name</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>License Count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assetData.software.map((allocation, index) => (
                          <TableRow key={allocation._id}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {allocation.softwareAssetId.softwareName || '-'}
                            </TableCell>
                            <TableCell>
                              {allocation.softwareAssetId.vendor || '-'}
                            </TableCell>
                            <TableCell>
                              {allocation.licenseCount}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(allocation.status)}>
                                {allocation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                              </div>
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
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleEditAllocation(e, 'software', allocation)}
                                  title="Edit Allocation"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleLogClick(e, allocation, 'software')}
                                  title="View Allocation History"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleDeleteAllocation(e, 'software', allocation._id)}
                                  title="Delete Allocation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* No User Selected */}
          {!selectedUserId && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              Select a user to view their assigned assets
            </div>
          )}
        </div>

        {/* Hardware Allocation Form */}
        <HardwareAllocationForm
          isOpen={showHardwareAllocationForm}
          onClose={() => {
            setShowHardwareAllocationForm(false);
            setEditingHardwareAllocation(null);
          }}
          onSuccess={handleAllocationSuccess}
          editingAllocation={editingHardwareAllocation}
        />

        {/* Software Allocation Form */}
        <SoftwareAllocationForm
          isOpen={showSoftwareAllocationForm}
          onClose={() => {
            setShowSoftwareAllocationForm(false);
            setEditingSoftwareAllocation(null);
          }}
          onSuccess={handleAllocationSuccess}
          editingAllocation={editingSoftwareAllocation}
        />

        {/* Allocation Log Dialog */}
        <AllocationLogDialog
          isOpen={allocationLogDialog.isOpen}
          onClose={() => setAllocationLogDialog({ isOpen: false, mode: 'allocation', allocationType: 'hardware' })}
          allocationType={allocationLogDialog.allocationType}
          allocationId={allocationLogDialog.allocationId}
          mode={allocationLogDialog.mode}
          assetName={allocationLogDialog.assetName}
        />
      </DialogContent>
    </Dialog>
  );
};