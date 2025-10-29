import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { organizationService, Organization } from '@/services/organizationService';
import { Pagination } from '@/components/common/Pagination';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';

// Extracted content component without DashboardLayout
export const OrganizationsContent = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  // Auth context for permission filtering
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { user, isLoading } = useAuth();
    const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrganizations, setTotalOrganizations] = useState(0);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    setCurrentPage(1);
  };
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationEmail: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations(currentPage, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage]);

  // Reset form when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      setFormData({
        organizationName: '',
        organizationEmail: '',
      });
    }
  }, [isCreateDialogOpen]);

  const fetchOrganizations = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const data = await organizationService.getAll(page, limit);
      // data may be array (old API) or paginated object { organizations, total }
      if (Array.isArray(data)) {
        setOrganizations(data);
        setTotalOrganizations(data.length);
      } else if (data && Array.isArray(data.organizations)) {
        setOrganizations(data.organizations);
        setTotalOrganizations(typeof data.total === 'number' ? data.total : data.organizations.length);
      } else {
        setOrganizations([]);
        setTotalOrganizations(0);
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations. Please check if the server is running.',
        variant: 'destructive',
      });
      setOrganizations([]);
      setTotalOrganizations(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await organizationService.create(formData);
      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });
      setIsCreateDialogOpen(false);
      // Form will be reset by the useEffect when dialog opens next time
      // after creating a new org, refresh first page so new item appears
      setCurrentPage(1);
      fetchOrganizations(1, rowsPerPage);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create organization. Please check your connection.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization) return;

    try {
      await organizationService.update(selectedOrganization._id, formData);
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedOrganization(null);
      setFormData({ organizationName: '', organizationEmail: '' });
      fetchOrganizations(currentPage, rowsPerPage);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update organization.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedOrganization) return;

    try {
      await organizationService.delete(selectedOrganization._id);
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedOrganization(null);
  // refresh current page
  fetchOrganizations(currentPage, rowsPerPage);
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete organization',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setFormData({
      organizationName: organization.organizationName,
      organizationEmail: organization.organizationEmail,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsDeleteDialogOpen(true);
  };

  // Permission-based filtering for company_user
  let filteredOrganizations = organizations;
  if (user?.role === 'company_user' && user.permissions?.organizations) {
    filteredOrganizations = organizations.filter((org) => user.permissions!.organizations!.includes(org._id));
  }
  // Search filter
  filteredOrganizations = filteredOrganizations.filter((org) =>
    org.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.organizationEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
            <p className="text-muted-foreground">Manage your organizations</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label>Organization Name *</Label>
                  <Input
                    required
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <Label>Organization Email *</Label>
                  <Input
                    required
                    type="email"
                    value={formData.organizationEmail}
                    onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                    placeholder="e.g., admin@acme.com"
                  />
                </div>
                <Button type="submit" className="w-full">Create Organization</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search organizations..." />

        {filteredOrganizations.length === 0 && !loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No organizations yet. Create your first organization to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Organizations List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>

                    <TableHead>S.No</TableHead>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((organization ,index) => (
                    
                       <TableRow key={organization._id}>
        {/* S.No */}
        <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {organization.organizationName}
                        </div>
                      </TableCell>
                      <TableCell>{organization.organizationEmail}</TableCell>
                      <TableCell>
                        {new Date(organization.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEditDialog(organization)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(organization)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

          {/* Pagination */}
          
            <div className="flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(totalOrganizations / rowsPerPage))}
                totalItems={totalOrganizations}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            </div>
          

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label>Organization Name *</Label>
                <Input
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div>
                <Label>Organization Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.organizationEmail}
                  onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                  placeholder="e.g., admin@acme.com"
                />
              </div>
              <Button type="submit" className="w-full">Update Organization</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the organization
                "{selectedOrganization?.organizationName}" and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
};

// Wrapper component with DashboardLayout for standalone page
const Organizations = () => {
  return (
    <DashboardLayout title="Organizations">
      <OrganizationsContent />
    </DashboardLayout>
  );
};

export default Organizations;