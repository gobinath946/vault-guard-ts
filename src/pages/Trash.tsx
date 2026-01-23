import { useState, useEffect, useContext } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Eye, Undo, Trash2, RefreshCw, Archive, User, Calendar, Folder, Building2, BookOpen, Key, Search } from 'lucide-react';
import { trashService, TrashItem } from '@/services/trashService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AuthContext } from '@/contexts/AuthContext';

const Trash = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmptyTrashDialogOpen, setIsEmptyTrashDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const auth = useContext(AuthContext) as any;
  const user = auth?.user;

  useEffect(() => {
    fetchTrashItems();
  }, [currentPage, rowsPerPage]);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      const response = await trashService.getAll(currentPage, rowsPerPage);
      setTrashItems(response.trashItems);
      setTotalItems(response.total);
      setTotalPages(response.totalPages || 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch trash items',
        variant: 'destructive',
      });
      setTrashItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await trashService.restore(id);
      toast({
        title: 'Success',
        description: 'Item restored successfully',
      });
      setIsRestoreDialogOpen(false);
      setSelectedItem(null);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to restore item',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await trashService.permanentDelete(id);
      toast({
        title: 'Success',
        description: 'Item permanently deleted',
      });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const result = await trashService.emptyTrash();
      toast({
        title: 'Success',
        description: `Trash emptied successfully. ${result.deletedCount} items deleted.`,
      });
      setIsEmptyTrashDialogOpen(false);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to empty trash',
        variant: 'destructive',
      });
    }
  };

  const openViewDialog = (item: TrashItem) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const openRestoreDialog = (item: TrashItem) => {
    setSelectedItem(item);
    setIsRestoreDialogOpen(true);
  };

  const openDeleteDialog = (item: TrashItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'collection':
        return <BookOpen className="h-4 w-4" />;
      case 'folder':
        return <Folder className="h-4 w-4" />;
      case 'organization':
        return <Building2 className="h-4 w-4" />;
      case 'password':
        return <Key className="h-4 w-4" />;
      default:
        return <Archive className="h-4 w-4" />;
    }
  };

  const getItemTypeBadge = (type: string) => {
    const typeConfig = {
      collection: { label: 'Collection', variant: 'default' as const },
      folder: { label: 'Folder', variant: 'secondary' as const },
      organization: { label: 'Organization', variant: 'outline' as const },
      password: { label: 'Password', variant: 'destructive' as const },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, variant: 'default' as const };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {getItemTypeIcon(type)}
        {config.label}
      </Badge>
    );
  };

  // Helper to get deleted by display
  const getDeletedByDisplay = (item: TrashItem) => {
    if (item.deletedBy && (item.deletedBy.username || item.deletedBy.email)) {
      return item.deletedBy.username || item.deletedBy.email;
    }
    if (user) {
      return user.email;
    }
    return 'Unknown User';
  };

  // Use only backend paginated items
  const filteredItems = trashItems;

  // Use backend totalPages

  if (loading) {
    return (
      <DashboardLayout title="Trash">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Header component
  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Search */}
      <div className="w-full sm:w-64">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deleted items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Right side: Refresh and Empty Trash */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors border border-border/50"
          onClick={() => fetchTrashItems()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {trashItems.length > 0 && (
          <>
            <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block"></div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsEmptyTrashDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Empty Trash
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // Footer component
  const footer = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      rowsPerPage={rowsPerPage}
      onPageChange={setCurrentPage}
      onRowsPerPageChange={setRowsPerPage}
    />
  );

  return (
    <DashboardLayout
      title="Trash"
      header={header}
      footer={footer}
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full">
        <CardHeader className="flex-none px-6 py-4 border-b">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Deleted Items ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 relative p-0 min-h-0 bg-background">
          <div className="absolute inset-0 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10 shadow-sm">
                <tr className="border-b border-border">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12 bg-card">
                    S.No
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Item Name</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Type</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Deleted From</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Deleted By</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Deleted At</th>
                  <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-card">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Archive className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No items in trash</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr key={item._id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td className="p-4 text-sm font-medium">{item.itemName}</td>
                      <td className="p-4 text-sm">
                        {getItemTypeBadge(item.itemType)}
                      </td>
                      <td className="p-4 text-sm">{item.deletedFrom}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {getDeletedByDisplay(item)}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.deletedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openViewDialog(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openRestoreDialog(item)}
                          >
                            <Undo className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Item Name</label>
                  <p className="text-sm">{selectedItem.itemName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    {getItemTypeBadge(selectedItem.itemType)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deleted From</label>
                  <p className="text-sm">{selectedItem.deletedFrom}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deleted By</label>
                  <p className="text-sm">
                    {getDeletedByDisplay(selectedItem)}
                    {selectedItem.deletedBy?.email && ` (${selectedItem.deletedBy.email})`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deleted At</label>
                  <p className="text-sm">
                    {format(new Date(selectedItem.deletedAt), 'PPpp')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{selectedItem?.itemName}"?
              The item will be moved back to its original location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedItem && handleRestore(selectedItem._id)}>
              <Undo className="mr-2 h-4 w-4" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              "{selectedItem?.itemName}" from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && handlePermanentDelete(selectedItem._id)}
              className="bg-destructive text-destructive-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={isEmptyTrashDialogOpen} onOpenChange={setIsEmptyTrashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all items in the trash.
              {trashItems.length > 0 && (
                <span className="font-semibold block mt-2">
                  This will delete {trashItems.length} item(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Trash;