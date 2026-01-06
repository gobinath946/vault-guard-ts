import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ChevronsUpDown, Calendar, Info, Plus, Trash2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetService, SoftwareAllocation, CompanyUser, SoftwareAsset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  softwareAssetId: z.string().min(1, 'Software asset is required'),
  licenseCount: z.number().min(1, 'License count must be at least 1'),
  expiryDate: z.string().optional(),
  remarks: z.string().optional(),
  customFields: z.array(z.object({
    key: z.string().optional(),
    value: z.string().optional(),
  })).optional(),
}).refine((data) => {
  // This will be validated in the component with selectedSoftware
  return true;
}, {
  message: "License count exceeds available licenses",
  path: ["licenseCount"],
});

type FormData = z.infer<typeof formSchema>;

interface SoftwareAllocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAllocation?: SoftwareAllocation | null;
}

export const SoftwareAllocationForm = ({
  isOpen,
  onClose,
  onSuccess,
  editingAllocation,
}: SoftwareAllocationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [availableSoftware, setAvailableSoftware] = useState<SoftwareAsset[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareAsset | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSoftware, setLoadingSoftware] = useState(true);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      softwareAssetId: '',
      licenseCount: 1,
      expiryDate: '',
      remarks: '',
      customFields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'customFields',
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchAvailableSoftware(); // Always fetch available software
      
      // If editing, immediately add the software to availableSoftware list
      // so the Select can show it as selected
      if (editingAllocation && editingAllocation.softwareAssetId) {
        const editingSoftware: SoftwareAsset = {
          _id: editingAllocation.softwareAssetId._id,
          softwareName: editingAllocation.softwareAssetId.softwareName,
          vendor: editingAllocation.softwareAssetId.vendor || '',
          totalLicenseCount: editingAllocation.softwareAssetId.totalLicenseCount,
          availableLicenseCount: editingAllocation.softwareAssetId.totalLicenseCount,
          customFields: {},
          startDate: undefined,
          endDate: undefined,
          status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'DELETED',
          createdAt: '',
          updatedAt: '',
        };
        
        setAvailableSoftware(prev => {
          const exists = prev.some(s => s._id === editingSoftware._id);
          if (!exists) {
            return [editingSoftware, ...prev];
          }
          return prev;
        });
        
        setSelectedSoftware(editingSoftware);
      }
    }
  }, [isOpen, editingAllocation]);

  useEffect(() => {
    const loadAllocationData = async () => {
      if (editingAllocation) {
        let customFieldsArray: { key: string; value: string }[] = [];

        // Try to fetch and decrypt custom fields first
        try {
          const customFieldsData = await assetService.getSoftwareAllocationCredentials(editingAllocation._id);
          if (customFieldsData.customFields && Object.keys(customFieldsData.customFields).length > 0) {
            customFieldsArray = Object.entries(customFieldsData.customFields).map(([key, value]) => ({
              key,
              value: String(value),
            }));
          }
        } catch (error: any) {
          console.error('Error fetching encrypted custom fields:', error);
          // Fallback to unencrypted custom fields if they exist
          if ((editingAllocation as any).customFields) {
            customFieldsArray = Object.entries((editingAllocation as any).customFields).map(([key, value]) => ({
              key,
              value: String(value),
            }));
          }
        }

        // Set form values from editing allocation
        form.reset({
          userId: editingAllocation.userId._id,
          softwareAssetId: editingAllocation.softwareAssetId._id,
          licenseCount: editingAllocation.licenseCount,
          expiryDate: editingAllocation.expiryDate
            ? new Date(editingAllocation.expiryDate).toISOString().split('T')[0]
            : '',
          remarks: editingAllocation.remarks || '',
          customFields: customFieldsArray,
        });
        
        // Immediately set selected software from editing allocation
        const editingSoftware: SoftwareAsset = {
          _id: editingAllocation.softwareAssetId._id,
          softwareName: editingAllocation.softwareAssetId.softwareName,
          vendor: editingAllocation.softwareAssetId.vendor || '',
          totalLicenseCount: editingAllocation.softwareAssetId.totalLicenseCount,
          availableLicenseCount: editingAllocation.softwareAssetId.totalLicenseCount,
          customFields: {},
          startDate: undefined,
          endDate: undefined,
          status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'DELETED',
          createdAt: '',
          updatedAt: '',
        };
        setSelectedSoftware(editingSoftware);
      } else {
        // Reset form for new allocation
        form.reset({
          userId: '',
          softwareAssetId: '',
          licenseCount: 1,
          expiryDate: '',
          remarks: '',
          customFields: [],
        });
        setSelectedSoftware(null);
      }
    };

    if (isOpen) {
      loadAllocationData();
    }
  }, [editingAllocation, form, isOpen]);

  useEffect(() => {
    if (editingAllocation && availableSoftware.length > 0) {
      // Try to find the software in the available list first
      const existingSoftware = availableSoftware.find(s => s._id === editingAllocation.softwareAssetId._id);
      if (existingSoftware) {
        setSelectedSoftware(existingSoftware);
      } else {
        // If not found in available list, fetch complete software details
        fetchCompleteSoftwareDetails(editingAllocation.softwareAssetId._id);
      }
    }
  }, [editingAllocation, availableSoftware]);

  const fetchCompleteSoftwareDetails = async (softwareId: string) => {
    try {
      const softwareDetails = await assetService.getSoftwareAsset(softwareId);
      setSelectedSoftware(softwareDetails);

      // Add the software to available list if not already present
      setAvailableSoftware(prev => {
        const exists = prev.some(s => s._id === softwareDetails._id);
        if (!exists) {
          return [softwareDetails, ...prev];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching complete software details:', error);
      // Fallback to basic software object if API call fails
      const basicSoftware: SoftwareAsset = {
        _id: editingAllocation!.softwareAssetId._id,
        softwareName: editingAllocation!.softwareAssetId.softwareName,
        vendor: editingAllocation!.softwareAssetId.vendor,
        totalLicenseCount: editingAllocation!.softwareAssetId.totalLicenseCount,
        availableLicenseCount: editingAllocation!.softwareAssetId.totalLicenseCount,
        customFields: {},
        startDate: undefined,
        endDate: undefined,
        status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'DELETED',
        createdAt: '',
        updatedAt: '',
      };

      setSelectedSoftware(basicSoftware);
      setAvailableSoftware(prev => [basicSoftware, ...prev]);
    }
  };

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

  const fetchAvailableSoftware = async () => {
    try {
      setLoadingSoftware(true);
      const data = await assetService.getAvailableSoftware();
      setAvailableSoftware(data.assets);
    } catch (error: any) {
      console.error('Error fetching available software:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available software',
        variant: 'destructive',
      });
    } finally {
      setLoadingSoftware(false);
    }
  };

  const handleSoftwareSelect = (softwareId: string) => {
    const software = availableSoftware.find(s => s._id === softwareId);
    setSelectedSoftware(software || null);

    // Reset license count when software changes
    if (software && form.getValues('licenseCount') > software.availableLicenseCount) {
      form.setValue('licenseCount', Math.min(1, software.availableLicenseCount));
    }

    // Set expiry date from selected software's end date (for display and submission)
    if (software && software.endDate) {
      form.setValue('expiryDate', new Date(software.endDate).toISOString().split('T')[0]);
    } else {
      form.setValue('expiryDate', '');
    }
  };

  const validateLicenseCount = (value: number) => {
    if (!selectedSoftware) return true;
    if (value > selectedSoftware.availableLicenseCount) {
      return `Cannot exceed ${selectedSoftware.availableLicenseCount} available licenses`;
    }
    return true;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Convert custom fields array back to object
      const customFields: { [key: string]: any } = {};
      data.customFields?.forEach(field => {
        if (field.key && field.value) {
          customFields[field.key] = field.value;
        }
      });

      const submitData: any = {
        userId: data.userId,
        softwareAssetId: data.softwareAssetId,
        licenseCount: data.licenseCount,
        expiryDate: data.expiryDate || undefined,
        remarks: data.remarks,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };

      if (editingAllocation) {
        await assetService.updateSoftwareAllocation(editingAllocation._id, submitData);
        toast({
          title: 'Success',
          description: 'Software allocation updated successfully',
        });
      } else {
        await assetService.createSoftwareAllocation(submitData);
        toast({
          title: 'Success',
          description: 'Software allocation created successfully',
        });
      }

      // Small delay to ensure backend processing is complete
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      console.error('Error saving software allocation:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save software allocation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSoftwareConfiguration = () => {
    append({ key: '', value: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAllocation ? 'Edit Software Allocation' : 'Allocate Software'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>User *</FormLabel>
                  <Popover open={userSearchOpen} onOpenChange={(open) => !editingAllocation && setUserSearchOpen(open)}>
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
                        <CommandList>
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

            <FormField
              control={form.control}
              name="softwareAssetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software Asset *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleSoftwareSelect(value);
                    }}
                    value={field.value}
                    disabled={loadingSoftware}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingSoftware ? "Loading software..." : "Select software asset"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSoftware.map((asset) => (
                        <SelectItem key={asset._id} value={asset._id}>
                          <div className="flex flex-col">
                            <span>{asset.softwareName || 'Unnamed'} - {asset.vendor || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {asset.availableLicenseCount || 0} available
                              {asset.endDate && ` • Expires: ${new Date(asset.endDate).toLocaleDateString()}`}
                              {!asset.endDate && ' • No expiry date'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Count *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={selectedSoftware?.availableLicenseCount || 1}
                      {...field}
                      readOnly={!!editingAllocation}
                      className={cn(
                        editingAllocation ? "no-spinner bg-muted cursor-not-allowed" : "",
                        editingAllocation && "text-muted-foreground"
                      )}
                      onChange={(e) => {
                        // Only allow changes if not in edit mode
                        if (!editingAllocation) {
                          const value = parseInt(e.target.value) || 1;
                          field.onChange(value);

                          // Custom validation
                          const validationResult = validateLicenseCount(value);
                          if (validationResult !== true) {
                            form.setError('licenseCount', {
                              type: 'manual',
                              message: validationResult,
                            });
                          } else {
                            form.clearErrors('licenseCount');
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {selectedSoftware && !editingAllocation && (
                    <p className="text-xs text-muted-foreground">
                      Maximum available: {selectedSoftware.availableLicenseCount} licenses
                    </p>
                  )}
                  {editingAllocation && (
                    <p className="text-xs text-muted-foreground">
                      License count cannot be changed when editing an allocation
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Expiry Date - Display only from selected software */}
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expiry Date
              </FormLabel>
              <div className="px-3 py-2 border rounded-md bg-muted">
                {selectedSoftware?.endDate ? (
                  <span className="text-sm">
                    {new Date(selectedSoftware.endDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">No expiry date</span>
                )}
              </div>
              {selectedSoftware && selectedSoftware.endDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  This expiry date is from the selected software
                </p>
              )}
            </FormItem>

            {/* Software Configuration */}
            {selectedSoftware && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-600" />
                        Software Configuration
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Specify software version, edition, modules, and other configuration details. All configuration data is encrypted and secure.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addSoftwareConfiguration}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Configuration
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Plus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">No configuration details added</p>
                          <p className="text-sm text-muted-foreground">
                            Add software-specific details like version, edition, or license type
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-3 p-3 border rounded-lg bg-muted/30">
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.key`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-sm font-medium">Configuration Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Version, Edition, License Type, Module"
                                    className="bg-background"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-sm font-medium">Configuration Value</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., 2023, Professional, Named User, CRM"
                                    className="bg-background"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            className="mb-2 hover:bg-destructive hover:text-destructive-foreground"
                            title="Remove configuration"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Remarks - Moved to bottom */}
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
              <Button type="submit" disabled={loading || loadingUsers || (loadingSoftware && !editingAllocation)}>
                {loading ? 'Saving...' : editingAllocation ? 'Update' : 'Allocate'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};