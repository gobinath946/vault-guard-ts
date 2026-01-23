import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, FolderTree, Folder as FolderIcon } from 'lucide-react';
import { folderService } from '@/services/folderService';
import { organizationService, Organization } from '@/services/organizationService';
import { collectionService, Collection } from '@/services/collectionService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/common/Pagination';
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

interface FoldersContentProps {
  isDialog?: boolean;
}

// Extracted content component without DashboardLayout
export const FoldersContent: React.FC<FoldersContentProps> = ({ isDialog = false }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const { user } = useAuth();
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
  const [orgRowsPerPage] = useState(20);
  const [collectionOptions, setCollectionOptions] = useState<Collection[]>([]);
  const [collectionPage] = useState(1);
  const [collectionRowsPerPage] = useState(20);
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders(currentPage, rowsPerPage, searchTerm);
    fetchOrganizations(orgPage, orgRowsPerPage, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchFolders(1, rowsPerPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (formData.organizationId) {
      fetchCollections(formData.organizationId, collectionPage, collectionRowsPerPage, '');
    } else {
      setCollectionOptions([]);
    }
  }, [formData.organizationId, collectionPage, collectionRowsPerPage]);

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
      } else if (data && Array.isArray(data.organizations)) {
        setOrgOptions(data.organizations);
      } else {
        setOrgOptions([]);
      }
    } catch {
      setOrgOptions([]);
    }
  };

  const fetchCollections = async (organizationId: string, page = 1, limit = 20, q = '') => {
    try {
      const response = await collectionService.getAll(page, limit, q, organizationId);
      if (Array.isArray(response)) {
        setCollectionOptions(response);
      } else if (response && Array.isArray(response.collections)) {
        setCollectionOptions(response.collections);
      } else {
        setCollectionOptions([]);
      }
    } catch {
      setCollectionOptions([]);
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
      fetchFolders(1, rowsPerPage, searchTerm);
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
      fetchFolders(currentPage, rowsPerPage, searchTerm);
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
      fetchFolders(currentPage, rowsPerPage, searchTerm);
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

  // Permission-based filtering
  let filteredFolders = folders;
  if (user?.role === 'company_user' && user.permissions?.folders) {
    filteredFolders = folders.filter((folder) => user.permissions!.folders!.includes(folder._id));
  }

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
            <h2 className="text-2xl font-bold tracking-tight">Folders</h2>
            <p className="text-xs text-muted-foreground">Organize your passwords with folders</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        isDialog ? "p-1" : "px-6 pb-6"
      )}>
        <Card className="flex flex-col h-full overflow-hidden border-border/50 shadow-sm">
          <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
            {filteredFolders.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1">
                <FolderTree className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
                <p className="text-center text-muted-foreground text-sm">
                  No folders yet. Create your first folder to organize passwords.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <Table containerClassName="overflow-visible min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="w-[80px] h-10 text-xs uppercase font-semibold">S.No</TableHead>
                        <TableHead className="h-10 text-xs uppercase font-semibold">Folder Name</TableHead>
                        <TableHead className="h-10 text-xs uppercase font-semibold">Created At</TableHead>
                        <TableHead className="text-right h-10 text-xs uppercase font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFolders.map((folder, index) => (
                        <TableRow key={folder._id} className="hover:bg-muted/30 group">
                          <TableCell className="py-3 font-medium text-xs">{(currentPage - 1) * rowsPerPage + index + 1}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2 font-semibold text-primary text-xs">
                              <FolderIcon className="h-3.5 w-3.5" />
                              {folder.folderName}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-xs">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(folder)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(folder)}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
  );
};

// Wrapper component with DashboardLayout for standalone page
const Folders = () => {
  return (
    <DashboardLayout
      title="Folders"
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <FoldersContent />
    </DashboardLayout>
  );
};

export default Folders;