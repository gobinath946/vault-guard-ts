import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronsUpDown, X, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetService, HardwareAllocation, CompanyUser, HardwareAsset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  hardwareAssetId: z.string().optional(), // For single allocation (edit mode)
  hardwareAssetIds: z.array(z.string()).optional(), // For bulk allocation (create mode)
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface HardwareAllocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAllocation?: HardwareAllocation | null;
}

export const HardwareAllocationForm = ({
  isOpen,
  onClose,
  onSuccess,
  editingAllocation,
}: HardwareAllocationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [availableHardware, setAvailableHardware] = useState<HardwareAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<HardwareAsset[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHardware, setLoadingHardware] = useState(true);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [hardwareSearchOpen, setHardwareSearchOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      hardwareAssetId: '',
      hardwareAssetIds: [],
      remarks: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchAvailableHardware();
      // Set bulk mode based on whether we're editing or creating
      setBulkMode(!editingAllocation);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingAllocation) {
      // Check if this is an event edit (has event metadata)
      const isEventEdit = (editingAllocation as any)._eventId;
      
      if (isEventEdit) {
        // Event editing mode - show all assets in the event
        const eventAssets = (editingAllocation as any)._eventAssets || [];
        const eventAssetObjects = eventAssets.map((asset: any) => ({
          _id: asset._id,
          assetName: asset.assetName,
          brand: asset.brand,
          assetModel: asset.assetModel,
          serialNumber: asset.serialNumber,
        }));
        
        setSelectedAssets(eventAssetObjects);
        setBulkMode(true); // Use bulk mode for event editing
        
        form.reset({
          userId: editingAllocation.userId._id,
          hardwareAssetId: '',
          hardwareAssetIds: eventAssets.map((asset: any) => asset._id),
          remarks: editingAllocation.remarks || '',
        });
      } else {
        // Single allocation editing
        form.reset({
          userId: editingAllocation.userId._id,
          hardwareAssetId: editingAllocation.hardwareAssetId._id,
          hardwareAssetIds: [],
          remarks: editingAllocation.remarks || '',
        });
        setBulkMode(false);
      }
    } else {
      form.reset({
        userId: '',
        hardwareAssetId: '',
        hardwareAssetIds: [],
        remarks: '',
      });
      setBulkMode(true);
    }
  }, [editingAllocation, form]);

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

  const fetchAvailableHardware = async () => {
    try {
      setLoadingHardware(true);
      const data = await assetService.getAvailableHardware();
      setAvailableHardware(data.assets);
    } catch (error: any) {
      console.error('Error fetching available hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available hardware',
        variant: 'destructive',
      });
    } finally {
      setLoadingHardware(false);
    }
  };

  const handleAssetToggle = (asset: HardwareAsset, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, asset]);
    } else {
      setSelectedAssets(prev => prev.filter(a => a._id !== asset._id));
    }
  };

  const removeSelectedAsset = (assetId: string) => {
    setSelectedAssets(prev => prev.filter(a => a._id !== assetId));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (editingAllocation) {
        const isEventEdit = (editingAllocation as any)._eventId;
        
        if (isEventEdit) {
          // Event editing - update all allocations in the event
          const eventAssets = (editingAllocation as any)._eventAssets || [];
          const updatePromises = eventAssets.map((asset: any) => 
            assetService.updateHardwareAllocation(asset.allocationId, {
              userId: data.userId,
              hardwareAssetId: asset._id,
              remarks: data.remarks,
            })
          );
          
          await Promise.all(updatePromises);
          toast({
            title: 'Success',
            description: `${eventAssets.length} hardware allocations updated successfully`,
          });
        } else {
          // Single allocation update - user field is not editable
          const updateData: {
            hardwareAssetId?: string;
            remarks?: string;
          } = {};
          
          // Only include hardwareAssetId if it actually changed
          if (data.hardwareAssetId && data.hardwareAssetId !== editingAllocation.hardwareAssetId._id) {
            updateData.hardwareAssetId = data.hardwareAssetId;
          }
          
          // Only include remarks if it changed
          if (data.remarks !== undefined && data.remarks !== (editingAllocation.remarks || '')) {
            updateData.remarks = data.remarks;
          }
          
          await assetService.updateHardwareAllocation(editingAllocation._id, updateData);
          toast({
            title: 'Success',
            description: 'Hardware allocation updated successfully',
          });
        }
      } else {
        // Bulk allocation creation
        if (selectedAssets.length === 0) {
          toast({
            title: 'Error',
            description: 'Please select at least one hardware asset',
            variant: 'destructive',
          });
          return;
        }

        if (selectedAssets.length === 1) {
          // Single asset allocation
          const createData: {
            userId: string;
            hardwareAssetId: string;
            remarks?: string;
          } = {
            userId: data.userId,
            hardwareAssetId: selectedAssets[0]._id,
            remarks: data.remarks,
          };
          await assetService.createHardwareAllocation(createData);
          toast({
            title: 'Success',
            description: 'Hardware allocation created successfully',
          });
        } else {
          // Bulk allocation
          const createData: {
            userId: string;
            hardwareAssetIds: string[];
            remarks?: string;
          } = {
            userId: data.userId,
            hardwareAssetIds: selectedAssets.map(a => a._id),
            remarks: data.remarks,
          };
          await assetService.createHardwareAllocationBulk(createData);
          toast({
            title: 'Success',
            description: `${selectedAssets.length} hardware assets allocated successfully`,
          });
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving hardware allocation:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save hardware allocation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAllocation ? 
              ((editingAllocation as any)._eventId ? 
                `Edit Hardware Event (${(editingAllocation as any)._eventAssetCount} assets)` : 
                'Edit Hardware Allocation'
              ) : 
              'Allocate Hardware'
            }
          </DialogTitle>
        </DialogHeader>

        {/* Event editing information */}
        {editingAllocation && (editingAllocation as any)._eventId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Package className="h-4 w-4" />
              <span className="font-medium">Editing Allocation Event</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              You are editing an allocation event with {(editingAllocation as any)._eventAssetCount} assets. 
              Changes will be applied to all allocations in this event.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>User *</FormLabel>
                  <Popover open={userSearchOpen && !editingAllocation} onOpenChange={(open) => !editingAllocation && setUserSearchOpen(open)}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userSearchOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                            editingAllocation && "bg-muted cursor-not-allowed"
                          )}
                          disabled={loadingUsers || !!editingAllocation}
                        >
                          {loadingUsers ? (
                            "Loading users..."
                          ) : field.value ? (
                            (() => {
                              const selectedUser = users.find(user => user._id === field.value);
                              return selectedUser ? `${selectedUser.username} (${selectedUser.email})` : "Select user";
                            })()
                          ) : (
                            "Select user"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList className="max-h-[250px] overflow-y-auto">
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user._id}
                                value={`${user.username} ${user.email}`}
                                onSelect={() => {
                                  field.onChange(user._id);
                                  setUserSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === user._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.username}</span>
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hardware Asset Selection */}
            {editingAllocation ? (
              // Single asset selection for editing
              <FormField
                control={form.control}
                name="hardwareAssetId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Hardware Asset *</FormLabel>
                    <Popover open={hardwareSearchOpen} onOpenChange={setHardwareSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={hardwareSearchOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={loadingHardware}
                          >
                            {loadingHardware ? (
                              "Loading hardware..."
                            ) : field.value ? (
                              (() => {
                                let selectedAsset = availableHardware.find(asset => asset._id === field.value);
                                if (!selectedAsset && editingAllocation && field.value === editingAllocation.hardwareAssetId._id) {
                                  selectedAsset = {
                                    _id: editingAllocation.hardwareAssetId._id,
                                    assetName: editingAllocation.hardwareAssetId.assetName,
                                    brand: editingAllocation.hardwareAssetId.brand,
                                    assetModel: editingAllocation.hardwareAssetId.assetModel,
                                    serialNumber: editingAllocation.hardwareAssetId.serialNumber,
                                  } as any;
                                }
                                return selectedAsset ? `${selectedAsset.assetName || 'Unnamed'} - ${selectedAsset.brand || ''} ${selectedAsset.assetModel || ''}` : "Select hardware asset";
                              })()
                            ) : (
                              "Select hardware asset"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search hardware assets..." />
                          <CommandList className="max-h-[250px] overflow-y-auto">
                            <CommandEmpty>No hardware assets found.</CommandEmpty>
                            <CommandGroup>
                              {editingAllocation && (
                                <CommandItem
                                  key={editingAllocation.hardwareAssetId._id}
                                  value={`${editingAllocation.hardwareAssetId.assetName || ''} ${editingAllocation.hardwareAssetId.brand || ''} ${editingAllocation.hardwareAssetId.assetModel || ''} ${editingAllocation.hardwareAssetId.serialNumber || ''}`}
                                  onSelect={() => {
                                    field.onChange(editingAllocation.hardwareAssetId._id);
                                    setHardwareSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === editingAllocation.hardwareAssetId._id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{editingAllocation.hardwareAssetId.assetName || 'Unnamed'} - {editingAllocation.hardwareAssetId.brand || ''} {editingAllocation.hardwareAssetId.assetModel || ''}</span>
                                    <span className="text-sm text-muted-foreground">SN: {editingAllocation.hardwareAssetId.serialNumber || 'N/A'} (Currently Allocated)</span>
                                  </div>
                                </CommandItem>
                              )}
                              {availableHardware.map((asset) => (
                                <CommandItem
                                  key={asset._id}
                                  value={`${asset.assetName || ''} ${asset.brand || ''} ${asset.assetModel || ''} ${asset.serialNumber || ''}`}
                                  onSelect={() => {
                                    field.onChange(asset._id);
                                    setHardwareSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === asset._id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{asset.assetName || 'Unnamed'} - {asset.brand || ''} {asset.assetModel || ''}</span>
                                    <span className="text-sm text-muted-foreground">SN: {asset.serialNumber || 'N/A'}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              // Bulk asset selection for creating
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Hardware Assets *</FormLabel>
                  <Badge variant="outline">
                    {selectedAssets.length} selected
                  </Badge>
                </div>
                
                {/* Selected Assets */}
                {selectedAssets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Assets:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAssets.map((asset) => (
                        <Badge key={asset._id} variant="secondary" className="flex items-center gap-1">
                          {asset.assetName || 'Unnamed'}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeSelectedAsset(asset._id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset Selection */}
                <Popover open={hardwareSearchOpen} onOpenChange={setHardwareSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={hardwareSearchOpen}
                      className="w-full justify-between"
                      disabled={loadingHardware}
                    >
                      {loadingHardware ? "Loading hardware..." : "Select hardware assets"}
                      <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search hardware assets..." />
                      <CommandList className="max-h-[250px] overflow-y-auto">
                        <CommandEmpty>No hardware assets found.</CommandEmpty>
                        <CommandGroup>
                          {availableHardware.map((asset) => {
                            const isSelected = selectedAssets.some(a => a._id === asset._id);
                            return (
                              <CommandItem
                                key={asset._id}
                                value={`${asset.assetName || ''} ${asset.brand || ''} ${asset.assetModel || ''} ${asset.serialNumber || ''}`}
                                onSelect={() => {
                                  handleAssetToggle(asset, !isSelected);
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="mr-2"
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{asset.assetName || 'Unnamed'} - {asset.brand || ''} {asset.assetModel || ''}</span>
                                  <span className="text-sm text-muted-foreground">SN: {asset.serialNumber || 'N/A'}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this allocation..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || loadingUsers || (loadingHardware && !editingAllocation)}>
                {loading ? 'Saving...' : editingAllocation ? 
                  ((editingAllocation as any)._eventId ? 
                    `Update Event (${(editingAllocation as any)._eventAssetCount} assets)` : 
                    'Update'
                  ) : 
                  selectedAssets.length > 1 ? `Allocate ${selectedAssets.length} Assets` : 'Allocate'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};