import { useState, useEffect } from 'react';
import { hashPassword } from '@/lib/crypto';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, Users as UsersIcon, ChevronDown, ChevronUp, Eye, EyeOff, X } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions?: UserPermissions;
}

interface Organization {
  _id: string;
  name: string;
  description?: string;
}

interface Collection {
  _id: string;
  name: string;
  organizationId: string;
  description?: string;
}

interface Folder {
  _id: string;
  name: string;
  collectionId: string;
  organizationId: string;
  description?: string;
}

interface UserPermissions {
  organizations: string[];
  collections: string[];
  folders: string[];
}

interface FormData {
  username: string;
  email: string;
  password: string;
  permissions: UserPermissions;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<string[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Edit form states
  const [editFormData, setEditFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    permissions: {
      organizations: [],
      collections: [],
      folders: []
    }
  });
  const [editSelectedOrganizations, setEditSelectedOrganizations] = useState<string[]>([]);
  const [editSelectedCollections, setEditSelectedCollections] = useState<string[]>([]);
  const [editSelectedFolders, setEditSelectedFolders] = useState<string[]>([]);
  const [editExpandedCollections, setEditExpandedCollections] = useState<string[]>([]);
  const [editFoldersAutoExpanded, setEditFoldersAutoExpanded] = useState(false);

  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    permissions: {
      organizations: [],
      collections: [],
      folders: []
    }
  });

  useEffect(() => {
    fetchUsers(currentPage, rowsPerPage, searchTerm);
  }, [currentPage, rowsPerPage, searchTerm]);

  useEffect(() => {
    if (isDialogOpen || isEditDialogOpen) {
      fetchOrganizations();
    }
  }, [isDialogOpen, isEditDialogOpen]);

  useEffect(() => {
    if (selectedOrganizations.length > 0) {
      // Fetch collections for all selected organizations
      selectedOrganizations.forEach(orgId => {
        fetchCollections(orgId);
      });
      setSelectedCollections([]);
      setSelectedFolders([]);
      setFolders([]);
      setFormData(prev => ({
        ...prev,
        permissions: {
          organizations: selectedOrganizations,
          collections: [],
          folders: []
        }
      }));
    } else {
      setCollections([]);
      setFolders([]);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setFormData(prev => ({
        ...prev,
        permissions: {
          organizations: [],
          collections: [],
          folders: []
        }
      }));
    }
  }, [selectedOrganizations]);

  useEffect(() => {
    if (editSelectedOrganizations.length > 0) {
      // Fetch collections for all selected organizations in edit mode
      editSelectedOrganizations.forEach(orgId => {
        fetchCollections(orgId);
      });
      setEditFormData(prev => ({
        ...prev,
        permissions: {
          organizations: editSelectedOrganizations,
          collections: editSelectedCollections,
          folders: editSelectedFolders
        }
      }));
    }
  }, [editSelectedOrganizations]);

  useEffect(() => {
    if (selectedOrganizations.length > 0 && selectedCollections.length > 0) {
      fetchFolders(selectedOrganizations, selectedCollections);
    } else {
      setFolders([]);
      setSelectedFolders([]);
    }
  }, [selectedOrganizations, selectedCollections]);

  useEffect(() => {
    (async () => {
      if (editSelectedOrganizations.length > 0 && editSelectedCollections.length > 0) {
        const allFolders: Folder[] = [];
        for (const orgId of editSelectedOrganizations) {
          const orgCollections = collections
            .filter(col => col.organizationId === orgId)
            .map(col => col._id)
            .filter(id => editSelectedCollections.includes(id));
          if (orgCollections.length === 0) continue;
          const data = await companyService.getFolders(orgId, orgCollections);
          const mappedFolders = data.folders.map((folder: any) => ({
            _id: folder._id,
            name: folder.folderName || folder.name,
            description: folder.description || "",
            collectionId: folder.collectionId,
            organizationId: folder.organizationId,
          }));
          allFolders.push(...mappedFolders);
        }
        setFolders(allFolders);
      }
    })();
  }, [editSelectedOrganizations, editSelectedCollections]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        organizations: selectedOrganizations,
        collections: selectedCollections,
        folders: selectedFolders
      }
    }));
  }, [selectedOrganizations, selectedCollections, selectedFolders]);

  useEffect(() => {
    setEditFormData(prev => ({
      ...prev,
      permissions: {
        organizations: editSelectedOrganizations,
        collections: editSelectedCollections,
        folders: editSelectedFolders
      }
    }));
  }, [editSelectedOrganizations, editSelectedCollections, editSelectedFolders]);

  const fetchUsers = async (page = 1, limit = 10, q = '') => {
    setLoading(true);
    try {
      const data = await companyService.getUsers(page, limit, q);
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    setLoadingOrganizations(true);
    try {
      const data = await companyService.getOrganizations();
      const mappedOrganizations = data.organizations.map((org: any) => ({
        _id: org._id,
        name: org.organizationName || org.name,
        description: org.organizationEmail || org.description
      }));
      setOrganizations(mappedOrganizations);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const fetchCollections = async (organizationId: string | { _id: string }) => {
    const finalId = typeof organizationId === 'object'
      ? organizationId._id
      : organizationId;

    setLoadingCollections(true);

    try {
      const data = await companyService.getCollections(finalId);
      const mappedCollections = data.collections.map((collection: any) => ({
        _id: collection._id,
        name: collection.collectionName || collection.name,
        description: collection.description,
        organizationId: collection.organizationId,
      }));
      // Merge with existing collections
      setCollections(prev => {
        const newCollections = [...prev];
        mappedCollections.forEach(newCol => {
          if (!newCollections.find(col => col._id === newCol._id)) {
            newCollections.push(newCol);
          }
        });
        return newCollections;
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch collections',
        variant: 'destructive',
      });
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchFolders = async (
    organizationIds: string[],
    collectionIds: string[]
  ) => {
    setLoadingFolders(true);
    try {
      const allFolders: Folder[] = [];
      for (const orgId of organizationIds) {
        // Only send collections that belong to this org
        const orgCollections = collections
          .filter(col => col.organizationId === orgId)
          .map(col => col._id)
          .filter(id => collectionIds.includes(id));
        if (orgCollections.length === 0) continue;
        const data = await companyService.getFolders(orgId, orgCollections);
        const mappedFolders = data.folders.map((folder: any) => ({
          _id: folder._id,
          name: folder.folderName || folder.name,
          description: folder.description || "",
          collectionId: folder.collectionId,
          organizationId: folder.organizationId,
        }));
        allFolders.push(...mappedFolders);
      }
      setFolders(allFolders);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch folders",
        variant: "destructive",
      });
    } finally {
      setLoadingFolders(false);
    }
  };

  // Delete confirmation modal state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = (id: string) => {
    setDeleteUserId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;
    try {
      await companyService.deleteUser(deleteUserId);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    }
  };

  // Update the handleEdit function for multiple organizations
  const handleEdit = async (user: User) => {
    setEditingUser(user);
    
    // Extract _id from permissions arrays
    const orgIds = (user.permissions?.organizations || []).map((org: any) =>
      typeof org === 'object' && org !== null ? (org as any)._id : org
    );
    const collectionIds = (user.permissions?.collections || []).map((c: any) =>
      typeof c === 'object' && c !== null ? c._id : c
    );
    const folderIds = (user.permissions?.folders || []).map((f: any) =>
      typeof f === 'object' && f !== null ? f._id : f
    );

    setEditFormData({
      username: user.username,
      email: user.email,
      password: '',
      permissions: {
        organizations: orgIds,
        collections: collectionIds,
        folders: folderIds
      }
    });

    if (orgIds.length > 0) {
      // First ensure organizations are loaded
      if (organizations.length === 0) {
        await fetchOrganizations();
      }
      setEditSelectedOrganizations(orgIds);
      setEditSelectedCollections(collectionIds);
      setEditSelectedFolders(folderIds);
      
      // Fetch collections for all organizations
      orgIds.forEach(orgId => {
        fetchCollections(orgId);
      });
      
      if (collectionIds.length > 0) {
        await fetchFolders(orgIds, collectionIds);
        setTimeout(() => {
          const collectionsWithFolders = collectionIds.filter(collectionId => 
            folders.some(folder => folder.collectionId === collectionId)
          );
          setEditExpandedCollections(collectionsWithFolders);
        }, 500);
      }
    } else {
      setEditSelectedOrganizations([]);
      setEditSelectedCollections([]);
      setEditSelectedFolders([]);
      setEditExpandedCollections([]);
    }
  setEditFoldersAutoExpanded(false);
  setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        username: editFormData.username,
        email: editFormData.email,
        permissions: editFormData.permissions
      };

      if (editFormData.password.trim() !== '') {
        updateData.password = hashPassword(editFormData.password);
      }

      await companyService.updateUser(editingUser._id, updateData);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditFormData({
        username: '',
        email: '',
        password: '',
        permissions: {
          organizations: [],
          collections: [],
          folders: []
        }
      });
      setEditSelectedOrganizations([]);
      setEditSelectedCollections([]);
      setEditSelectedFolders([]);
      setShowEditPassword(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = async (userId: string, newStatus: boolean) => {
    try {
      await companyService.updateUserStatus(userId, newStatus);
      toast({
        title: 'Success',
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchUsers(currentPage, rowsPerPage, searchTerm);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  // Organization handlers
  const handleOrganizationToggle = (orgId: string) => {
    setSelectedOrganizations(prev => {
      const newOrganizations = prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId];

      if (!newOrganizations.includes(orgId)) {
        // Remove collections and folders that belong to the deselected organization
        const collectionsToRemove = collections
          .filter(collection => collection.organizationId === orgId)
          .map(collection => collection._id);
        
        setSelectedCollections(prevCols => 
          prevCols.filter(colId => !collectionsToRemove.includes(colId))
        );

        const foldersToRemove = folders
          .filter(folder => folder.organizationId === orgId)
          .map(folder => folder._id);
        
        setSelectedFolders(prevFolders => 
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newOrganizations;
    });
  };

  const handleEditOrganizationToggle = (orgId: string) => {
    setEditSelectedOrganizations(prev => {
      const newOrganizations = prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId];

      if (!newOrganizations.includes(orgId)) {
        // Remove collections and folders that belong to the deselected organization
        const collectionsToRemove = collections
          .filter(collection => collection.organizationId === orgId)
          .map(collection => collection._id);
        
        setEditSelectedCollections(prevCols => 
          prevCols.filter(colId => !collectionsToRemove.includes(colId))
        );

        const foldersToRemove = folders
          .filter(folder => folder.organizationId === orgId)
          .map(folder => folder._id);
        
        setEditSelectedFolders(prevFolders => 
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newOrganizations;
    });
  };

  // Collection handlers
  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newCollections = prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId];

      if (!newCollections.includes(collectionId)) {
        const foldersToRemove = folders
          .filter(folder => folder.collectionId === collectionId)
          .map(folder => folder._id);
        setSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newCollections;
    });
  };

  const handleEditCollectionToggle = (collectionId: string) => {
    setEditSelectedCollections(prev => {
      const newCollections = prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId];

      if (!newCollections.includes(collectionId)) {
        const foldersToRemove = folders
          .filter(folder => folder.collectionId === collectionId)
          .map(folder => folder._id);
        setEditSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newCollections;
    });
  };

  // Folder handlers
  const handleFolderToggle = (folderId: string) => {
    setSelectedFolders(prev => {
      return prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId];
    });
  };

  const handleEditFolderToggle = (folderId: string) => {
    setEditSelectedFolders(prev => {
      return prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId];
    });
  };

  const handleSelectAllFoldersInCollection = (collectionId: string) => {
    const collectionFolders = folders
      .filter(folder => folder.collectionId === collectionId)
      .map(folder => folder._id);

    setSelectedFolders(prev => {
      const allSelected = collectionFolders.every(folderId => prev.includes(folderId));
      return allSelected
        ? prev.filter(folderId => !collectionFolders.includes(folderId))
        : [...prev, ...collectionFolders.filter(folderId => !prev.includes(folderId))];
    });
  };

  const handleEditSelectAllFoldersInCollection = (collectionId: string) => {
    const collectionFolders = folders
      .filter(folder => folder.collectionId === collectionId)
      .map(folder => folder._id);

    setEditSelectedFolders(prev => {
      const allSelected = collectionFolders.every(folderId => prev.includes(folderId));
      return allSelected
        ? prev.filter(folderId => !collectionFolders.includes(folderId))
        : [...prev, ...collectionFolders.filter(folderId => !prev.includes(folderId))];
    });
  };

  const toggleCollectionExpansion = (collectionId: string) => {
    setExpandedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const toggleEditCollectionExpansion = async (collectionId: string) => {
    setEditExpandedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
    // If expanding, fetch folders for this collection if not already present
    if (!editExpandedCollections.includes(collectionId)) {
      const orgId = collections.find(col => col._id === collectionId)?.organizationId;
      if (orgId && !folders.some(f => f.collectionId === collectionId)) {
        const data = await companyService.getFolders(orgId, [collectionId]);
        const mappedFolders = data.folders.map((folder: any) => ({
          _id: folder._id,
          name: folder.folderName || folder.name,
          description: folder.description || "",
          collectionId: folder.collectionId,
          organizationId: folder.organizationId,
        }));
        setFolders(prev => [...prev, ...mappedFolders]);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleEditPasswordVisibility = () => {
    setShowEditPassword(!showEditPassword);
  };

  useEffect(() => {
    if (folders.length > 0 && selectedCollections.length > 0) {
      const collectionsWithFolders = new Set(folders.map(folder => folder.collectionId));
      const newExpanded = selectedCollections.filter(collectionId =>
        collectionsWithFolders.has(collectionId)
      );
      setExpandedCollections(newExpanded);
    }
  }, [folders, selectedCollections]);

  useEffect(() => {
      if (!isEditDialogOpen) {
        setEditFoldersAutoExpanded(false);
        return;
      }
      if (!editFoldersAutoExpanded && folders.length > 0 && editSelectedCollections.length > 0) {
        const collectionsWithFolders = new Set(folders.map(folder => folder.collectionId));
        const newExpanded = editSelectedCollections.filter(collectionId =>
          collectionsWithFolders.has(collectionId)
        );
        setEditExpandedCollections(newExpanded);
        setEditFoldersAutoExpanded(true);
      }
    }, [folders, editSelectedCollections, isEditDialogOpen, editFoldersAutoExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        password: formData.password ? hashPassword(formData.password) : '',
      };
      await companyService.createUser(userData);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsDialogOpen(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        permissions: { organizations: [], collections: [], folders: [] }
      });
      setSelectedOrganizations([]);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setExpandedCollections([]);
      setShowPassword(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(totalUsers / rowsPerPage);

  // Helper function to render organization selection
  const renderOrganizationSelection = (
    isEdit: boolean,
    selectedOrgs: string[],
    onOrgToggle: (orgId: string) => void
  ) => (
    <div>
      <div className="flex items-center justify-between">
        <Label>Organizations *</Label>
        <span className="text-sm text-muted-foreground">
          {selectedOrgs.length} selected
        </span>
      </div>
      {loadingOrganizations ? (
        <div className="text-sm text-muted-foreground mt-2">Loading organizations...</div>
      ) : (
        <div className="space-y-2 mt-2">
          {organizations.map((org) => (
            <div key={org._id} className="flex items-center space-x-2">
              <Checkbox
                checked={selectedOrgs.includes(org._id)}
                onCheckedChange={() => onOrgToggle(org._id)}
                disabled={loadingOrganizations}
              />
              <Label className="flex-1 cursor-pointer">
                {org.name}
                {org.description && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {org.description}
                  </span>
                )}
              </Label>
            </div>
          ))}
          {organizations.length === 0 && !loadingOrganizations && (
            <div className="text-sm text-muted-foreground">No organizations found</div>
          )}
        </div>
      )}
    </div>
  );

  const renderPermissionSection = (
    isEdit: boolean,
    selectedOrgs: string[],
    selectedCols: string[],
    selectedFolds: string[],
    expandedCols: string[],
    onOrgToggle: (orgId: string) => void,
    onColToggle: (colId: string) => void,
    onFolderToggle: (folderId: string) => void,
    onSelectAllFolders: (colId: string) => void,
    onToggleExpand: (colId: string) => void
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Permissions & Access</h3>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Users will have full access to the selected organizations, collections, and folders.
        </p>
      </div>

      {renderOrganizationSelection(isEdit, selectedOrgs, onOrgToggle)}

      {selectedOrgs.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <Label>Collections</Label>
            <span className="text-sm text-muted-foreground">
              {selectedCols.length} selected
            </span>
          </div>
          {loadingCollections ? (
            <div className="text-sm text-muted-foreground mt-2">Loading collections...</div>
          ) : (
            <div className="space-y-2 mt-2">
              {collections
                .filter(collection => selectedOrgs.includes(collection.organizationId))
                .map((collection) => (
                  <div key={collection._id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedCols.includes(collection._id)}
                      onCheckedChange={() => onColToggle(collection._id)}
                      disabled={loadingCollections}
                    />
                    <Label className="flex-1 cursor-pointer">
                      {collection.name}
                      {collection.description && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {collection.description}
                        </span>
                      )}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleExpand(collection._id)}
                      disabled={!selectedCols.includes(collection._id)}
                    >
                      {expandedCols.includes(collection._id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              {collections.filter(col => selectedOrgs.includes(col.organizationId)).length === 0 && (
                <div className="text-sm text-muted-foreground">No collections found in selected organizations</div>
              )}
            </div>
          )}
        </div>
      )}

  {selectedOrgs.length > 0 && (
        selectedCols.length > 0 ? (
          <div>
            <div className="flex items-center justify-between">
              <Label>Folders</Label>
              <span className="text-sm text-muted-foreground">
                {selectedFolds.length} selected
              </span>
            </div>
            {loadingFolders ? (
              <div className="text-sm text-muted-foreground mt-2">Loading folders...</div>
            ) : (
              <div className="space-y-3 mt-2">
                {collections
                  .filter(collection => selectedCols.includes(collection._id))
                  .map(collection => {
                    const collectionFolders = folders.filter(
                      folder => folder.collectionId === collection._id
                    );
                    const allFoldersSelected = collectionFolders.length > 0 &&
                      collectionFolders.every(folder => selectedFolds.includes(folder._id));

                    return (
                      <div key={collection._id}>
                        {expandedCols.includes(collection._id) && collectionFolders.length > 0 && (
                          <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
                            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                              <Checkbox
                                checked={allFoldersSelected}
                                onCheckedChange={() => onSelectAllFolders(collection._id)}
                              />
                              <Label className="cursor-pointer font-medium">
                                Select all folders in {collection.name}
                              </Label>
                            </div>

                            {collectionFolders.map(folder => (
                              <div key={folder._id} className="flex items-center space-x-2 p-2 border rounded">
                                <Checkbox
                                  checked={selectedFolds.includes(folder._id)}
                                  onCheckedChange={() => onFolderToggle(folder._id)}
                                />
                                <Label className="cursor-pointer flex-1">
                                  {folder.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-2">Select at least one collection to view folders.</div>
        )
      )}

      {(selectedOrgs.length > 0 || selectedCols.length > 0 || selectedFolds.length > 0) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
          <h4 className="font-medium text-sm mb-2">Access Summary:</h4>
          <div className="text-sm space-y-1">
            {selectedOrgs.length > 0 && (
              <div>• Organizations: {selectedOrgs.length} selected</div>
            )}
            {selectedCols.length > 0 && (
              <div>• Collections: {selectedCols.length} selected</div>
            )}
            {selectedFolds.length > 0 && (
              <div>• Folders: {selectedFolds.length} selected</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout title="Users">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">Manage company users and permissions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Enter password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {renderPermissionSection(
                    false,
                    selectedOrganizations,
                    selectedCollections,
                    selectedFolders,
                    expandedCollections,
                    handleOrganizationToggle,
                    handleCollectionToggle,
                    handleFolderToggle,
                    handleSelectAllFoldersInCollection,
                    toggleCollectionExpansion
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!selectedOrganizations.length || !formData.username || !formData.email || !formData.password}
                  >
                    Create User
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit User - {editingUser?.username}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <div>
                    <Label htmlFor="edit-username">Username *</Label>
                    <Input
                      id="edit-username"
                      required
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                    <div className="relative">
                      <Input
                        id="edit-password"
                        type={showEditPassword ? "text" : "password"}
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                        placeholder="Enter new password (optional)"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={toggleEditPasswordVisibility}
                      >
                        {showEditPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {renderPermissionSection(
                  true,
                  editSelectedOrganizations,
                  editSelectedCollections,
                  editSelectedFolders,
                  editExpandedCollections,
                  handleEditOrganizationToggle,
                  handleEditCollectionToggle,
                  handleEditFolderToggle,
                  handleEditSelectAllFoldersInCollection,
                  toggleEditCollectionExpansion
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!editSelectedOrganizations.length || !editFormData.username || !editFormData.email}
                >
                  Update User
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search users..." />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              All Users ({totalUsers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                        S.No
                      </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Role</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user , index) => (
                    <tr key={user._id} className="border-b border-border">
                       <td className="p-4 align-middle">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                      <td className="p-4 text-sm font-medium">{user.username}</td>
                      <td className="p-4 text-sm">{user.email}</td>
                      <td className="p-4 text-sm capitalize">{user.role?.replace('_', ' ')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${user.isActive ? 'bg-[#8C47D1]' : 'bg-gray-300'
                              }`}
                            onClick={() => handleStatusToggle(user._id, !user.isActive)}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </div>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(user._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUsers}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>
    </DashboardLayout>
  );
};

export default Users;