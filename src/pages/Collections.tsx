import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { collectionService } from '@/services/collectionService';
import { Pagination } from '@/components/common/Pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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

interface CollectionsContentProps {
  isDialog?: boolean;
}

// Extracted content component without DashboardLayout
export const CollectionsContent: React.FC<CollectionsContentProps> = ({ isDialog = false }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const { user } = useAuth();
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
    fetchCollections(currentPage, rowsPerPage);
    fetchOrganizationsForDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage]);

  const fetchOrganizationsForDropdown = async () => {
    try {
      const data = await (await import('@/services/organizationService')).organizationService.getAll(1, 200);
      if (Array.isArray(data)) setOrgOptions(data);
      else if (data && Array.isArray(data.organizations)) setOrgOptions(data.organizations);
      else setOrgOptions([]);
    } catch (error: any) {
      setOrgOptions([]);
    }
  };

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
      fetchCollections(currentPage, rowsPerPage);
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
      fetchCollections(currentPage, rowsPerPage);
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

  let filteredCollections = collections;
  if (user?.role === 'company_user' && user.permissions?.collections) {
    filteredCollections = collections.filter((col) => user.permissions!.collections!.includes(col._id));
  }
  filteredCollections = filteredCollections.filter((collection) =>
    collection.collectionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isDialog ? "h-[80vh]" : "h-full"
    )}>
      {/* Fixed Header Section */}
      <div className={cn(
        "flex-shrink-0 space-y-4 bg-background",
        isDialog ? "p-1 pb-4" : "p-6"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Collections</h2>
            <p className="text-xs text-muted-foreground">Group related passwords together</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Collection Name</Label>
                  <Input
                    required
                    value={formData.collectionName}
                    onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                    placeholder="e.g., Social Media Accounts"
                  />
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this collection contains..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button type="submit" className="w-full">Create Collection</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search collections..." />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        isDialog ? "p-1" : "px-6 pb-6"
      )}>
        <Card className="flex flex-col h-full overflow-hidden border-border/50 shadow-sm">
          <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
            {filteredCollections.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
                <p className="text-center text-muted-foreground text-sm">
                  No collections yet. Create your first collection to group passwords.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <Table containerClassName="overflow-visible min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="w-[80px] h-10 text-xs uppercase font-semibold">S.No</TableHead>
                        <TableHead className="h-10 text-xs uppercase font-semibold">Collection Name</TableHead>
                        <TableHead className="h-10 text-xs uppercase font-semibold">Description</TableHead>
                        <TableHead className="h-10 text-xs uppercase font-semibold">Created At</TableHead>
                        <TableHead className="text-right h-10 text-xs uppercase font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCollections.map((collection, index) => (
                        <TableRow key={collection._id} className="hover:bg-muted/30 group">
                          <TableCell className="py-3 font-medium text-xs">{(currentPage - 1) * rowsPerPage + index + 1}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2 font-semibold text-primary text-xs">
                              <BookOpen className="h-3.5 w-3.5" />
                              {collection.collectionName}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate py-3 text-xs">
                            {collection.description || '-'}
                          </TableCell>
                          <TableCell className="py-3 text-xs">
                            {new Date(collection.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(collection)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(collection)}
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

                <div className="flex-initial flex justify-end px-4 py-3 border-t bg-muted/5">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.max(1, Math.ceil(totalCollections / rowsPerPage))}
                    totalItems={totalCollections}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(page) => { setCurrentPage(page); fetchCollections(page, rowsPerPage); }}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); fetchCollections(1, rows); }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
  );
};

// Wrapper component with DashboardLayout for standalone page
const Collections = () => {
  return (
    <DashboardLayout
      title="Collections"
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <CollectionsContent />
    </DashboardLayout>
  );
};

export default Collections;