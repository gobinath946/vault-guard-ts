import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { passwordService } from '@/services/passwordService';
import { Loader2, Copy } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';

interface Password {
  _id: string;
  itemName: string;
  username: string;
  websiteUrls: string[];
  folderId?: string;
  collectionId?: string;
  organizationId?: string;
}

interface BulkSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwords?: Password[]; // Made optional since we'll fetch our own
  collections: any[];
  folders: any[];
  organizations: any[];
  onSuccess: () => void;
}

export const BulkSelectionDialog = ({
  open,
  onOpenChange,
  passwords: externalPasswords,
  collections,
  folders,
  organizations,
  onSuccess,
}: BulkSelectionDialogProps) => {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [selectedPasswords, setSelectedPasswords] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [allPasswordIds, setAllPasswordIds] = useState<string[]>([]);
  const [targetOrganizationId, setTargetOrganizationId] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [operationType, setOperationType] = useState<'move' | 'save'>('move');
  const [loading, setLoading] = useState(false);
  const [fetchingPasswords, setFetchingPasswords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPasswords, setTotalPasswords] = useState(0);
  const { toast } = useToast();

  // Fetch passwords with pagination
  const fetchPasswords = async (page: number, limit: number) => {
    setFetchingPasswords(true);
    try {
      const response = await passwordService.getAll(page, limit, '', [], []);
      
      let fetchedPasswords = [];
      let total = 0;
      if (Array.isArray(response)) {
        fetchedPasswords = response;
        total = response.length;
      } else if (response && Array.isArray(response.passwords)) {
        fetchedPasswords = response.passwords;
        total = response.total || response.passwords.length;
      }
      
      setPasswords(fetchedPasswords);
      setTotalPasswords(total);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch passwords',
        variant: 'destructive',
      });
      setPasswords([]);
      setTotalPasswords(0);
    } finally {
      setFetchingPasswords(false);
    }
  };

  // Fetch all password IDs for "Select All Pages"
  const fetchAllPasswordIds = async () => {
    try {
      // Fetch all passwords without pagination to get all IDs
      const response = await passwordService.getAll(1, 10000, '', [], []);
      
      let allPasswords = [];
      if (Array.isArray(response)) {
        allPasswords = response;
      } else if (response && Array.isArray(response.passwords)) {
        allPasswords = response.passwords;
      }
      
      const ids = allPasswords.map((p: Password) => p._id);
      setAllPasswordIds(ids);
      return ids;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch all passwords',
        variant: 'destructive',
      });
      return [];
    }
  };

  useEffect(() => {
    if (open) {
      fetchPasswords(currentPage, rowsPerPage);
    } else {
      // Reset state when dialog closes
      setSelectedPasswords(new Set());
      setSelectAllPages(false);
      setAllPasswordIds([]);
      setTargetOrganizationId('');
      setTargetCollectionId('');
      setTargetFolderId('');
      setOperationType('move');
      setCurrentPage(1);
      setPasswords([]);
      setTotalPasswords(0);
    }
  }, [open, currentPage, rowsPerPage]);

  // Filter collections based on selected organization
  const filteredCollections = targetOrganizationId
    ? collections.filter((c) => c.organizationId === targetOrganizationId)
    : collections;

  // Filter folders based on selected collection
  const filteredFolders = targetCollectionId
    ? folders.filter((f) => f.collectionId === targetCollectionId)
    : folders;

  const togglePasswordSelection = (passwordId: string) => {
    const newSelection = new Set(selectedPasswords);
    if (newSelection.has(passwordId)) {
      newSelection.delete(passwordId);
    } else {
      newSelection.add(passwordId);
    }
    setSelectedPasswords(newSelection);
  };

  const toggleSelectAll = async () => {
    if (selectAllPages) {
      // Deselect all across all pages
      setSelectedPasswords(new Set());
      setSelectAllPages(false);
      setAllPasswordIds([]);
    } else {
      // Select all across all pages
      setSelectAllPages(true);
      const ids = await fetchAllPasswordIds();
      setSelectedPasswords(new Set(ids));
    }
  };

  const toggleCurrentPageSelection = () => {
    const currentPageIds = passwords.map(p => p._id);
    const allSelected = currentPageIds.every(id => selectedPasswords.has(id));
    
    const newSelection = new Set(selectedPasswords);
    if (allSelected) {
      // Deselect all on current page
      currentPageIds.forEach(id => newSelection.delete(id));
    } else {
      // Select all on current page
      currentPageIds.forEach(id => newSelection.add(id));
    }
    setSelectedPasswords(newSelection);
    setSelectAllPages(false);
  };

  const handleBulkMove = async () => {
    if (selectedPasswords.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one password to move',
        variant: 'destructive',
      });
      return;
    }

    if (!targetOrganizationId || !targetCollectionId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an organization and collection',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await passwordService.bulkMove(
        Array.from(selectedPasswords),
        targetFolderId ? undefined : targetCollectionId,
        targetFolderId || undefined
      );

      toast({
        title: 'Success',
        description: `${selectedPasswords.size} password(s) moved successfully`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to move passwords',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Bulk Selection - Move Passwords</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select multiple passwords and move them to a collection or folder
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Target Location Selection - At the top */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Move All Entries To</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      All selected passwords will be moved to this location
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-organization">Organization *</Label>
                      <Select
                        value={targetOrganizationId}
                        onValueChange={(value) => {
                          setTargetOrganizationId(value);
                          setTargetCollectionId('');
                          setTargetFolderId('');
                        }}
                      >
                        <SelectTrigger id="bulk-organization" className="w-full">
                          <SelectValue placeholder="Select organization..." />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No organizations available
                            </div>
                          ) : (
                            organizations.map((org) => (
                              <SelectItem key={org._id} value={org._id}>
                                {org.name || org.organizationName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-collection">Collection *</Label>
                      <Select
                        value={targetCollectionId}
                        onValueChange={(value) => {
                          setTargetCollectionId(value);
                          setTargetFolderId('');
                        }}
                        disabled={!targetOrganizationId}
                      >
                        <SelectTrigger id="bulk-collection" className="w-full">
                          <SelectValue placeholder={targetOrganizationId ? "Select collection..." : "Select organization first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCollections.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No collections available
                            </div>
                          ) : (
                            filteredCollections.map((col) => (
                              <SelectItem key={col._id} value={col._id}>
                                {col.name || col.collectionName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-folder">Folder (Optional)</Label>
                      <Select
                        value={targetFolderId}
                        onValueChange={setTargetFolderId}
                        disabled={!targetCollectionId}
                      >
                        <SelectTrigger id="bulk-folder" className="w-full">
                          <SelectValue placeholder={targetCollectionId ? "Select folder..." : "Select collection first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredFolders.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No folders available
                            </div>
                          ) : (
                            filteredFolders.map((folder) => (
                              <SelectItem key={folder._id} value={folder._id}>
                                {folder.name || folder.folderName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Password Selection */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-background pb-2 z-10">
                <div>
                  <Label className="text-base font-semibold">Select Passwords</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedPasswords.size} of {totalPasswords} selected
                    {selectAllPages && <span className="ml-1 text-primary">(All pages)</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCurrentPageSelection}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {passwords.every(p => selectedPasswords.has(p._id)) ? 'Deselect Page' : 'Select Page'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="shrink-0 w-full sm:w-auto"
                    disabled={fetchingPasswords}
                  >
                    {selectAllPages ? 'Deselect All Pages' : 'Select All Pages'}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[40vh] overflow-y-auto">
                  {fetchingPasswords ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading passwords...</p>
                    </div>
                  ) : passwords.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="text-lg font-medium">No passwords available</p>
                      <p className="text-sm mt-1">Create some passwords first to use bulk selection</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {passwords.map((password) => (
                        <div
                          key={password._id}
                          className="flex items-start space-x-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => togglePasswordSelection(password._id)}
                        >
                          <Checkbox
                            checked={selectedPasswords.has(password._id)}
                            onCheckedChange={() => togglePasswordSelection(password._id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-sm truncate">{password.itemName}</p>
                            {/* <p className="text-sm text-muted-foreground truncate">
                              <span className="font-mono">{password.username}</span>
                            </p>
                            {password.websiteUrls && password.websiteUrls.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                🔗 {password.websiteUrls[0]}
                              </p>
                            )} */}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPasswords > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalPasswords / rowsPerPage)}
                  totalItems={totalPasswords}
                  rowsPerPage={rowsPerPage}
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={setRowsPerPage}
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={loading || selectedPasswords.size === 0 || !targetOrganizationId || !targetCollectionId}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Moving...' : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Move {selectedPasswords.size > 0 ? `(${selectedPasswords.size})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
