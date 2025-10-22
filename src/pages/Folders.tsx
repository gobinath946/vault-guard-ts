import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, FolderTree, Folder as FolderIcon } from 'lucide-react';
import { folderService } from '@/services/folderService';
import { organizationService, Organization } from '@/services/organizationService';
import { collectionService, Collection } from '@/services/collectionService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/common/Pagination';
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

interface Folder {
  _id: string;
  folderName: string;
  parentFolderId?: string;
  createdAt: string;
}

const Folders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalFolders, setTotalFolders] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [formData, setFormData] = useState({
    folderName: '',
    organizationId: '',
    collectionId: '',
  });
  const [orgOptions, setOrgOptions] = useState<Organization[]>([]);
  const [orgPage, setOrgPage] = useState(1);
  const [orgRowsPerPage, setOrgRowsPerPage] = useState(20);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgSearch, setOrgSearch] = useState('');
  const [collectionOptions, setCollectionOptions] = useState<Collection[]>([]);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionRowsPerPage, setCollectionRowsPerPage] = useState(20);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [collectionSearch, setCollectionSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders(currentPage, rowsPerPage, searchTerm);
    fetchOrganizations(orgPage, orgRowsPerPage, orgSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage]);

  // Debounce search term
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  // Refetch when debounced search term changes (reset to first page)
  useEffect(() => {
    setCurrentPage(1);
    fetchFolders(1, rowsPerPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchOrganizations(orgPage, orgRowsPerPage, orgSearch);
  }, [orgPage, orgRowsPerPage, orgSearch]);

  useEffect(() => {
    if (formData.organizationId) {
      fetchCollections(formData.organizationId, collectionPage, collectionRowsPerPage, collectionSearch);
    } else {
      setCollectionOptions([]);
      setCollectionTotal(0);
    }
  }, [formData.organizationId, collectionPage, collectionRowsPerPage, collectionSearch]);

  // Reset form when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      setFormData({
        folderName: '',
        organizationId: '',
        collectionId: '',
      });
    }
  }, [isCreateDialogOpen]);

  const fetchOrganizations = async (page = 1, limit = 20, q = '') => {
    try {
      const data = await organizationService.getAll(page, limit, q);
      if (Array.isArray(data)) {
        setOrgOptions(data);
        setOrgTotal(data.length);
      } else if (data && Array.isArray(data.organizations)) {
        setOrgOptions(data.organizations);
        setOrgTotal(typeof data.total === 'number' ? data.total : data.organizations.length);
      } else {
        setOrgOptions([]);
        setOrgTotal(0);
      }
    } catch {
      setOrgOptions([]);
      setOrgTotal(0);
    }
  };

  const fetchCollections = async (organizationId: string, page = 1, limit = 20, q = '') => {
    try {
      const response = await collectionService.getAll(page, limit, q, organizationId);
      if (Array.isArray(response)) {
        setCollectionOptions(response);
        setCollectionTotal(response.length);
      } else if (response && Array.isArray(response.collections)) {
        setCollectionOptions(response.collections);
        setCollectionTotal(typeof response.total === 'number' ? response.total : response.collections.length);
      } else {
        setCollectionOptions([]);
        setCollectionTotal(0);
      }
    } catch {
      setCollectionOptions([]);
      setCollectionTotal(0);
    }
  };

  const fetchFolders = async (page = 1, limit = 10, q = '') => {
    try {
      setLoading(true);
      const response = await folderService.getAll(page, limit, q);
      if (Array.isArray(response)) {
        setFolders(response);
        setTotalFolders(response.length);
      } else if (response && Array.isArray(response.folders)) {
        setFolders(response.folders);
        setTotalFolders(typeof response.total === 'number' ? response.total : response.folders.length);
      } else {
        setFolders([]);
        setTotalFolders(0);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch folders',
        variant: 'destructive',
      });
      setFolders([]);
      setTotalFolders(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId) {
      toast({ title: 'Validation', description: 'Organization is required', variant: 'destructive' });
      return;
    }
    if (!formData.collectionId) {
      toast({ title: 'Validation', description: 'Collection is required', variant: 'destructive' });
      return;
    }
    try {
      await folderService.create(formData);
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
      setIsCreateDialogOpen(false);
      // Form will be reset by the useEffect when dialog opens next time
      fetchFolders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) return;

    try {
      await folderService.update(selectedFolder._id, formData);
      toast({
        title: 'Success',
        description: 'Folder updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedFolder(null);
  setFormData({ folderName: '', organizationId: '', collectionId: '' });
      fetchFolders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update folder',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;

    try {
      await folderService.delete(selectedFolder._id);
      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedFolder(null);
      fetchFolders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (folder: Folder) => {
    setSelectedFolder(folder);
    setFormData({
      folderName: folder.folderName,
      organizationId: (folder as any).organizationId || '',
      collectionId: (folder as any).collectionId || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsDeleteDialogOpen(true);
  };

  // No client-side filtering; folders is already paginated from server

  if (loading) {
    return (
      <DashboardLayout title="Folders">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Folders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Folders</h2>
            <p className="text-muted-foreground">Organize your passwords with folders</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <Label>Organization *</Label>
                  <Select value={formData.organizationId} onValueChange={(value) => {
                    setFormData({ ...formData, organizationId: value, collectionId: '' });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
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
                  <Label>Collection *</Label>
                  <Select value={formData.collectionId} onValueChange={(value) => setFormData({ ...formData, collectionId: value })} disabled={!formData.organizationId}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.organizationId ? 'Select collection' : 'Select organization first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(collectionOptions || []).map((col) => (
                        <SelectItem key={col._id} value={col._id}>
                          {col.collectionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Folder Name</Label>
                  <Input
                    required
                    value={formData.folderName}
                    onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                    placeholder="e.g., Work Accounts"
                  />
                </div>
                <Button type="submit" className="w-full">Create Folder</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

  <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search folders..." />

  {folders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderTree className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No folders yet. Create your first folder to organize passwords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Folders List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folder Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folders.map((folder) => (
                    <TableRow key={folder._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FolderIcon className="h-4 w-4 text-primary" />
                          {folder.folderName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEditDialog(folder)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(folder)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              
                <div className="flex justify-end mt-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.max(1, Math.ceil(totalFolders / rowsPerPage))}
                    totalItems={totalFolders}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      fetchFolders(page, rowsPerPage, searchTerm);
                    }}
                    onRowsPerPageChange={(rows) => {
                      setRowsPerPage(rows);
                      setCurrentPage(1);
                      fetchFolders(1, rows, searchTerm);
                    }}
                  />
                </div>
              
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Organization *</Label>
                <Select value={formData.organizationId} onValueChange={(value) => {
                  setFormData({ ...formData, organizationId: value, collectionId: '' });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
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
                <Label>Collection *</Label>
                <Select value={formData.collectionId} onValueChange={(value) => setFormData({ ...formData, collectionId: value })} disabled={!formData.organizationId}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.organizationId ? 'Select collection' : 'Select organization first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(collectionOptions || []).map((col) => (
                      <SelectItem key={col._id} value={col._id}>
                        {col.collectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder Name</Label>
                <Input
                  required
                  value={formData.folderName}
                  onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                  placeholder="e.g., Work Accounts"
                />
              </div>
              <Button type="submit" className="w-full">Update Folder</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the folder
                "{selectedFolder?.folderName}" and remove all associated data.
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

export default Folders;