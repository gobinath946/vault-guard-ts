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
import { assetService, SoftwareAsset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  softwareName: z.string().min(1, 'Software name is required'),
  vendor: z.string().optional(),
  totalLicenseCount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type FormData = z.infer<typeof formSchema>;

interface SoftwareAssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAsset?: SoftwareAsset | null;
}

export const SoftwareAssetForm = ({
  isOpen,
  onClose,
  onSuccess,
  editingAsset,
}: SoftwareAssetFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      softwareName: '',
      vendor: '',
      totalLicenseCount: 1,
      startDate: '',
      endDate: '',
    },
  });

  useEffect(() => {
    if (editingAsset) {
      form.reset({
        softwareName: editingAsset.softwareName,
        vendor: editingAsset.vendor,
        totalLicenseCount: editingAsset.totalLicenseCount,
        startDate: (editingAsset as any).startDate 
          ? new Date((editingAsset as any).startDate).toISOString().split('T')[0]
          : '',
        endDate: (editingAsset as any).endDate 
          ? new Date((editingAsset as any).endDate).toISOString().split('T')[0]
          : '',
      });
    } else {
      form.reset({
        softwareName: '',
        vendor: '',
        totalLicenseCount: 1,
        startDate: '',
        endDate: '',
      });
    }
  }, [editingAsset, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const submitData = {
        softwareName: data.softwareName,
        vendor: data.vendor || '',
        totalLicenseCount: data.totalLicenseCount || 1,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        customFields: {},
      };

      if (editingAsset) {
        await assetService.updateSoftwareAsset(editingAsset._id, submitData);
        toast({
          title: 'Success',
          description: 'Software asset updated successfully',
        });
      } else {
        await assetService.createSoftwareAsset(submitData);
        toast({
          title: 'Success',
          description: 'Software asset created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving software asset:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save software asset',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAsset ? 'Edit Software Asset' : 'Add Software Asset'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="softwareName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Software Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Microsoft Office" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Microsoft" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="totalLicenseCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total License Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingAsset ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};