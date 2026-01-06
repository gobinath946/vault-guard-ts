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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { assetService, HardwareAsset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  assetName: z.string().min(1, 'Asset name is required'),
  assetType: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  isReturned: z.boolean().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface HardwareAssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAsset?: HardwareAsset | null;
}

export const HardwareAssetForm = ({
  isOpen,
  onClose,
  onSuccess,
  editingAsset,
}: HardwareAssetFormProps) => {
  const [loading, setLoading] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<string>('AVAILABLE');
  const { toast } = useToast();
  
  // Check if asset is assigned to a user
  const isAssigned = editingAsset?.status === 'ASSIGNED';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetName: '',
      assetType: '',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      isReturned: false,
      remarks: '',
    },
  });

  useEffect(() => {
    if (editingAsset) {
      setOriginalStatus(editingAsset.status);
      form.reset({
        assetName: editingAsset.assetName,
        assetType: editingAsset.assetType,
        brand: editingAsset.brand,
        model: editingAsset.assetModel,
        serialNumber: editingAsset.serialNumber,
        purchaseDate: editingAsset.purchaseDate 
          ? new Date(editingAsset.purchaseDate).toISOString().split('T')[0]
          : '',
        isReturned: editingAsset.status === 'RETURNED',
        remarks: editingAsset.remarks || '',
      });
    } else {
      setOriginalStatus('AVAILABLE');
      form.reset({
        assetName: '',
        assetType: '',
        brand: '',
        model: '',
        serialNumber: '',
        purchaseDate: '',
        isReturned: false,
        remarks: '',
      });
    }
  }, [editingAsset, form]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'RETURNED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      // Determine the status based on the toggle
      let status: 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'DELETED' = 'AVAILABLE';
      if (editingAsset && data.isReturned !== undefined) {
        if (data.isReturned) {
          // Toggle is ON - mark as RETURNED
          status = 'RETURNED';
        } else {
          // Toggle is OFF - determine appropriate status
          if (originalStatus === 'RETURNED') {
            // If it was RETURNED and toggle is off, make it AVAILABLE
            status = 'AVAILABLE';
          } else if (originalStatus === 'ASSIGNED') {
            // If it was ASSIGNED and toggle is off, keep it ASSIGNED
            // (The backend will validate if there's still an active allocation)
            status = 'ASSIGNED';
          } else {
            // For AVAILABLE or other statuses, keep the original
            status = originalStatus as 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'DELETED';
          }
        }
      } else if (editingAsset) {
        // If no toggle change, keep the original status
        status = originalStatus as 'AVAILABLE' | 'ASSIGNED' | 'RETURNED' | 'DELETED';
      }
      
      const submitData = {
        assetName: data.assetName,
        assetType: data.assetType || '',
        brand: data.brand || '',
        assetModel: data.model || '',
        serialNumber: data.serialNumber || '',
        purchaseDate: data.purchaseDate || undefined,
        status: status, // Always include status
        remarks: data.remarks || '',
      };

      if (editingAsset) {
        await assetService.updateHardwareAsset(editingAsset._id, submitData);
        toast({
          title: 'Success',
          description: 'Hardware asset updated successfully',
        });
      } else {
        const result = await assetService.createHardwareAsset(submitData);
        toast({
          title: 'Success',
          description: 'Hardware asset created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving hardware asset:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save hardware asset',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingAsset ? 'Edit Hardware Asset' : 'Add Hardware Asset'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., MacBook Pro" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Laptop, Desktop, Monitor" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Apple" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., MacBook Pro 16-inch" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., ABC123456789" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        disabled={isAssigned}
                        className={isAssigned ? "bg-muted cursor-not-allowed" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {editingAsset && (
              <FormField
                control={form.control}
                name="isReturned"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="space-y-1.5">
                      <FormLabel className="text-base font-semibold text-gray-900">Return Asset</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Current Status:</span>
                        <Badge className={getStatusBadgeClass(originalStatus)}>
                          {originalStatus}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {field.value ? (
                          <span className="text-purple-600">Marking as <strong>RETURNED</strong></span>
                        ) : (
                          <span className="text-gray-600">Toggle to mark as <strong>RETURNED</strong></span>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <div className="flex flex-col items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-7 w-12"
                        />
                        {field.value && (
                          <span className="text-xs font-semibold text-purple-600 animate-pulse">RETURN</span>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this asset..."
                      className="resize-none"
                      disabled={false}
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
              <Button 
                type="submit" 
                disabled={loading}
                onClick={() => console.log('Create button clicked', form.formState.errors)}
              >
                {loading ? 'Saving...' : editingAsset ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};