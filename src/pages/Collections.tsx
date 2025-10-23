import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { collectionService } from '@/services/collectionService';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Collection {
  _id: string;
  collectionName: string;
  description: string;
  passwords: string[];
  createdAt: string;
}

const Collections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  // Auth context for permission filtering
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { user } = require('@/contexts/AuthContext').useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCollections, setTotalCollections] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    collectionName: '',
    description: '',
    organizationId: '',
  });
  const { toast } = useToast();
  const [orgOptions, setOrgOptions] = useState<any[]>([]);

  useEffect(() => {
    fetchCollections();
    fetchOrganizationsForDropdown();
  }, []);

  const fetchOrganizationsForDropdown = async () => {
    try {
      // Fetch first page with a reasonable limit for dropdown
      const data = await (await import('@/services/organizationService')).organizationService.getAll(1, 200);
      // data may be { organizations, total } or array
      if (Array.isArray(data)) setOrgOptions(data);
      else if (data && Array.isArray(data.organizations)) setOrgOptions(data.organizations);
      else setOrgOptions([]);
    } catch (error: any) {
      setOrgOptions([]);
    }
  };

  // Reset form when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      setFormData({
        collectionName: '',
        description: '',
        organizationId: '',
      });
    }
  }, [isCreateDialogOpen]);

  const fetchCollections = async (page = currentPage, limit = rowsPerPage) => {
    try {
      setLoading(true);
      const response = await collectionService.getAll(page, limit);
      if (Array.isArray(response)) {
        setCollections(response);
        setTotalCollections(response.length);
      } else if (response && Array.isArray(response.collections)) {
        setCollections(response.collections);
        setTotalCollections(typeof response.total === 'number' ? response.total : response.collections.length);
      } else {
        setCollections([]);
        setTotalCollections(0);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch collections',
        variant: 'destructive',
      });
      setCollections([]);
      setTotalCollections(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.organizationId) {
        toast({ title: 'Validation', description: 'Organization is required', variant: 'destructive' });
        return;
      }
      await collectionService.create(formData);
      toast({
        title: 'Success',
        description: 'Collection created successfully',
      });
      setIsCreateDialogOpen(false);
      // Form will be reset by the useEffect when dialog opens next time
      fetchCollections(1, rowsPerPage);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create collection',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection) return;

    try {
      await collectionService.update(selectedCollection._id, formData);
      toast({
        title: 'Success',
        description: 'Collection updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedCollection(null);
  setFormData({ collectionName: '', description: '', organizationId: '' });
      fetchCollections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update collection',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCollection) return;

    try {
      await collectionService.delete(selectedCollection._id);
      toast({
        title: 'Success',
        description: 'Collection deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedCollection(null);
      fetchCollections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete collection',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setFormData({
      collectionName: collection.collectionName,
      description: collection.description,
      organizationId: (collection as any).organizationId || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setIsDeleteDialogOpen(true);
  };

  // Permission-based filtering for company_user
  let filteredCollections = collections;
  if (user?.role === 'company_user' && user.permissions?.collections) {
    filteredCollections = collections.filter((col) => user.permissions!.collections!.includes(col._id));
  }
  // Search filter
  filteredCollections = filteredCollections.filter((collection) =>
    collection.collectionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalCollections / rowsPerPage) || 1;

  if (loading) {
    return (
      <DashboardLayout title="Collections">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Collections">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Collections</h2>
            <p className="text-muted-foreground">Group related passwords together</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label>Collection Name</Label>
                  <Input
                    required
                    value={formData.collectionName}
                    onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                    placeholder="e.g., Social Media Accounts"
                  />
                </div>
                <div>
                  <Label>Organization (optional)</Label>
                  <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(orgOptions || []).map((org) => (
                        <SelectItem key={org._id} value={org._id}>
                          {org.organizationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this collection contains..."
                  />
                </div>
                <Button type="submit" className="w-full">Create Collection</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

  <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search collections..." />

        {filteredCollections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No collections yet. Create your first collection to group passwords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Collections List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((collection) => (
                    <TableRow key={collection._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          {collection.collectionName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {collection.description || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(collection.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEditDialog(collection)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(collection)}
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

        <div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCollections}
            rowsPerPage={rowsPerPage}
            onPageChange={(page) => { setCurrentPage(page); fetchCollections(page, rowsPerPage); }}
            onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); fetchCollections(1, rows); }}
          />
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
            </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label>Collection Name</Label>
                  <Input
                    required
                    value={formData.collectionName}
                    onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                    placeholder="e.g., Social Media Accounts"
                  />
                </div>
                <div>
                  <Label>Organization (optional)</Label>
                  <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(orgOptions || []).map((org) => (
                        <SelectItem key={org._id} value={org._id}>
                          {org.organizationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this collection contains..."
                  />
                </div>
                <Button type="submit" className="w-full">Update Collection</Button>
              </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the collection
                "{selectedCollection?.collectionName}" and remove all associated data.
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
    </DashboardLayout>
  );
};

export default Collections;