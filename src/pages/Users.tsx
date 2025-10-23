import { useState, useEffect } from 'react';
import { hashPassword } from '@/lib/crypto';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, Users as UsersIcon, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
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
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
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
  const [editSelectedOrganization, setEditSelectedOrganization] = useState<string>('');
  const [editSelectedCollections, setEditSelectedCollections] = useState<string[]>([]);
  const [editSelectedFolders, setEditSelectedFolders] = useState<string[]>([]);
  const [editExpandedCollections, setEditExpandedCollections] = useState<string[]>([]);

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
    if (selectedOrganization) {
      fetchCollections(selectedOrganization);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setFolders([]);
      setFormData(prev => ({
        ...prev,
        permissions: {
          organizations: selectedOrganization ? [selectedOrganization] : [],
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
  }, [selectedOrganization]);

  useEffect(() => {
    if (editSelectedOrganization) {
      fetchCollections(editSelectedOrganization);
      setEditFormData(prev => ({
        ...prev,
        permissions: {
          organizations: editSelectedOrganization ? [editSelectedOrganization] : [],
          collections: editSelectedCollections,
          folders: editSelectedFolders
        }
      }));
    }
  }, [editSelectedOrganization]);

  useEffect(() => {
    if (selectedOrganization && selectedCollections.length > 0) {
      fetchFolders(selectedOrganization, selectedCollections);
    } else {
      setFolders([]);
      setSelectedFolders([]);
    }
  }, [selectedOrganization, selectedCollections]);

  useEffect(() => {
    if (editSelectedOrganization && editSelectedCollections.length > 0) {
      fetchFolders(editSelectedOrganization, editSelectedCollections);
    }
  }, [editSelectedOrganization, editSelectedCollections]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        organizations: selectedOrganization ? [selectedOrganization] : [],
        collections: selectedCollections,
        folders: selectedFolders
      }
    }));
  }, [selectedOrganization, selectedCollections, selectedFolders]);

  useEffect(() => {
    setEditFormData(prev => ({
      ...prev,
      permissions: {
        organizations: editSelectedOrganization ? [editSelectedOrganization] : [],
        collections: editSelectedCollections,
        folders: editSelectedFolders
      }
    }));
  }, [editSelectedOrganization, editSelectedCollections, editSelectedFolders]);

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

// In your Users component, update the fetch functions:

const fetchOrganizations = async () => {
  setLoadingOrganizations(true);
  try {
    const data = await companyService.getOrganizations();
    // Map the backend response to frontend format
    const mappedOrganizations = data.organizations.map((org: any) => ({
      _id: org._id,
      name: org.organizationName || org.name, // Handle both field names
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

const fetchCollections = async (organizationId: string) => {
  setLoadingCollections(true);
  try {
    const data = await companyService.getCollections(organizationId);
    // Map the backend response to frontend format
    const mappedCollections = data.collections.map((collection: any) => ({
      _id: collection._id,
      name: collection.collectionName || collection.name, // Handle both field names
      description: collection.description,
      organizationId: collection.organizationId
    }));
    setCollections(mappedCollections);
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

const fetchFolders = async (organizationId: string, collectionIds: string[]) => {
  setLoadingFolders(true);
  try {
    const data = await companyService.getFolders(organizationId, collectionIds);
    // Map the backend response to frontend format
    const mappedFolders = data.folders.map((folder: any) => ({
      _id: folder._id,
      name: folder.folderName || folder.name, // Handle both field names
      description: folder.description || '',
      collectionId: folder.collectionId,
      organizationId: folder.organizationId
    }));
    setFolders(mappedFolders);
  } catch (error: any) {
    toast({
      title: 'Error',
      description: 'Failed to fetch folders',
      variant: 'destructive',
    });
  } finally {
    setLoadingFolders(false);
  }
};

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await companyService.deleteUser(id);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  // Update the handleEdit function to ensure proper data loading:

const handleEdit = async (user: User) => {
  setEditingUser(user);
  setEditFormData({
    username: user.username,
    email: user.email,
    password: '',
    permissions: user.permissions || {
      organizations: [],
      collections: [],
      folders: []
    }
  });

  const userOrg = user.permissions?.organizations?.[0];
  const userCollections = user.permissions?.collections || [];
  const userFolders = user.permissions?.folders || [];

  console.log('Editing user data:', {
    userOrg,
    userCollections,
    userFolders,
    organizations: organizations.length
  });

  if (userOrg) {
    // First ensure organizations are loaded
    if (organizations.length === 0) {
      await fetchOrganizations();
    }
    
    // Set the organization
    setEditSelectedOrganization(userOrg);
    
    // Set collections and folders
    setEditSelectedCollections(userCollections);
    setEditSelectedFolders(userFolders);

    // Fetch collections for the organization
    await fetchCollections(userOrg);
    
    // If there are collections, fetch folders for them
    if (userCollections.length > 0) {
      await fetchFolders(userOrg, userCollections);
      
      // Auto-expand collections that have folders
      setTimeout(() => {
        const collectionsWithFolders = userCollections.filter(collectionId => 
          folders.some(folder => folder.collectionId === collectionId)
        );
        setEditExpandedCollections(collectionsWithFolders);
      }, 500); // Small delay to ensure folders are loaded
    }
  } else {
    setEditSelectedOrganization('');
    setEditSelectedCollections([]);
    setEditSelectedFolders([]);
    setEditExpandedCollections([]);
  }

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
        // Double hash: SHA256 on frontend before sending to backend
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
      setEditSelectedOrganization('');
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

  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrganization(orgId);
  };

  const handleEditOrganizationChange = (orgId: string) => {
    setEditSelectedOrganization(orgId);
    setEditSelectedCollections([]);
    setEditSelectedFolders([]);
  };

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

  const toggleEditCollectionExpansion = (collectionId: string) => {
    setEditExpandedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
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
    if (folders.length > 0 && editSelectedCollections.length > 0) {
      const collectionsWithFolders = new Set(folders.map(folder => folder.collectionId));
      const newExpanded = editSelectedCollections.filter(collectionId =>
        collectionsWithFolders.has(collectionId)
      );
      setEditExpandedCollections(newExpanded);
    }
  }, [folders, editSelectedCollections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Double hash: SHA256 on frontend before sending to backend
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
      setSelectedOrganization('');
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

  const renderPermissionSection = (
    isEdit: boolean,
    selectedOrg: string,
    selectedCols: string[],
    selectedFolds: string[],
    expandedCols: string[],
    onOrgChange: (orgId: string) => void,
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

      <div>
        <Label htmlFor={isEdit ? "edit-organization" : "organization"}>Organization *</Label>
        <Select
          value={selectedOrg}
          onValueChange={onOrgChange}
          disabled={loadingOrganizations}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingOrganizations ? "Loading organizations..." : "Select an organization"} />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org._id} value={org._id}>
                {org.name}
                {org.description && ` - ${org.description}`}
              </SelectItem>
            ))}
            {organizations.length === 0 && !loadingOrganizations && (
              <SelectItem value="no-org" disabled>
                No organizations found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedOrg && (
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
              {collections.map((collection) => (
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
              {collections.length === 0 && (
                <div className="text-sm text-muted-foreground">No collections found in this organization</div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedOrg && selectedCols.length > 0 && (
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
      )}

      {(selectedOrg || selectedCols.length > 0 || selectedFolds.length > 0) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
          <h4 className="font-medium text-sm mb-2">Access Summary:</h4>
          <div className="text-sm space-y-1">
            {selectedOrg && (
              <div>• Organization: {organizations.find(org => org._id === selectedOrg)?.name}</div>
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
                    selectedOrganization,
                    selectedCollections,
                    selectedFolders,
                    expandedCollections,
                    handleOrganizationChange,
                    handleCollectionToggle,
                    handleFolderToggle,
                    handleSelectAllFoldersInCollection,
                    toggleCollectionExpansion
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!selectedOrganization || !formData.username || !formData.email || !formData.password}
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
                  editSelectedOrganization,
                  editSelectedCollections,
                  editSelectedFolders,
                  editExpandedCollections,
                  handleEditOrganizationChange,
                  handleEditCollectionToggle,
                  handleEditFolderToggle,
                  handleEditSelectAllFoldersInCollection,
                  toggleEditCollectionExpansion
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!editSelectedOrganization || !editFormData.username || !editFormData.email}
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
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Role</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-border">
                      <td className="p-4 text-sm font-medium">{user.username}</td>
                      <td className="p-4 text-sm">{user.email}</td>
                      <td className="p-4 text-sm capitalize">{user.role?.replace('_', ' ')}</td>
                      <td className="p-4">
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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