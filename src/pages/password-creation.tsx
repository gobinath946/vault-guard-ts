import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, Key, Eye, Copy, RefreshCw, X, EyeOff, History } from 'lucide-react';
import { passwordService, PasswordGeneratorOptions } from '@/services/passwordService';
import { folderService } from '@/services/folderService';
import { collectionService } from '@/services/collectionService';
import { companyService } from '@/services/companyService';
import MultiSelectDropdown from '@/components/common/MultiSelectDropdown';
import AddPasswordForm from '@/components/common/AddPasswordForm';
import PasswordGenerator from '@/components/common/PasswordGenerator';
import { BulkSelectionDialog } from '@/components/common/BulkSelectionDialog';
import { BulkOperationForm } from '@/components/common/BulkOperationForm';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Password {
  _id: string;
  itemName: string;
  username: string;
  password: string;
  websiteUrls: string[];
  notes: string;
  folderId?: string;
  collectionId?: string;
  createdAt: string;
  updatedAt: string;
  lastModified: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  logs?: PasswordLog[];
}

interface PasswordLog {
  _id: string;
  passwordId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy?: string; // User ID (ObjectId as string)
  performedByName?: string; // Name of user who performed the action
  performedByEmail?: string; // Email of user who performed the action
  timestamp: string;
  details?: string;
}

const Password = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [folders, setFolders] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPasswords, setTotalPasswords] = useState(0);
  
  // Filter states
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [filterCollections, setFilterCollections] = useState<string[]>([]);
  const [filterFolders, setFilterFolders] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [filterCollectionsList, setFilterCollectionsList] = useState<any[]>([]);
  const [filterFoldersList, setFilterFoldersList] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [loadingFilterCollections, setLoadingFilterCollections] = useState(false);
  const [loadingFilterFolders, setLoadingFilterFolders] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [passwordFromGenerator, setPasswordFromGenerator] = useState<string>('');
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [isBulkSelectionOpen, setIsBulkSelectionOpen] = useState(false);
  const [isBulkOperationOpen, setIsBulkOperationOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [passwordToDelete, setPasswordToDelete] = useState<string | null>(null);
  const [selectedPassword, setSelectedPassword] = useState<Password | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<PasswordLog[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [formData, setFormData] = useState({
    itemName: '',
    username: '',
    password: '',
    websiteUrls: [''],
    notes: '',
    folderId: '',
    collectionId: '',
    organizationId: '',
  });
  const [generatorOptions, setGeneratorOptions] = useState<PasswordGeneratorOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    minNumbers: 1,
    minSpecial: 1,
    avoidAmbiguous: false,
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const { toast } = useToast();

  // Check if user has permission to access this page
  const hasPermission = user && (user.role === 'company_super_admin' || (user.role === 'company_user' && user.permissions));

  const fetchData = async () => {
    if (!hasPermission) return;
    
    setLoading(true);
    try {
      const [passwordsData, foldersDataRaw, collectionsDataRaw] = await Promise.all([
        passwordService.getAll(
          currentPage, 
          rowsPerPage, 
          filterOrganization && filterOrganization !== 'all' ? filterOrganization : '', 
          filterCollections, 
          filterFolders
        ),
        folderService.getAll(),
        collectionService.getAll(),
      ]);
      // Permission-based filtering for folders/collections
      let foldersArr = [];
      if (Array.isArray(foldersDataRaw)) {
        foldersArr = foldersDataRaw;
      } else if (foldersDataRaw && Array.isArray(foldersDataRaw.folders)) {
        foldersArr = foldersDataRaw.folders;
      } else if (foldersDataRaw && Array.isArray(foldersDataRaw.data)) {
        foldersArr = foldersDataRaw.data;
      }
      // For company users, filter folders by permissions
      if (user.role === 'company_user' && user.permissions?.folders) {
        setFolders(foldersArr.filter((f: any) => user.permissions.folders.includes(f._id)));
      } else {
        setFolders(foldersArr);
      }

      let filteredPasswords = [];
      let total = 0;
      if (Array.isArray(passwordsData)) {
        filteredPasswords = passwordsData;
        total = passwordsData.length;
      } else if (passwordsData && Array.isArray(passwordsData.passwords)) {
        filteredPasswords = passwordsData.passwords;
        total = passwordsData.total || passwordsData.passwords.length;
      }
      
      // Update both states together to prevent UI flicker
      setTotalPasswords(total);
      setPasswords(filteredPasswords);

      let collectionsArr = [];
      if (Array.isArray(collectionsDataRaw)) {
        collectionsArr = collectionsDataRaw;
      } else if (collectionsDataRaw && Array.isArray(collectionsDataRaw.collections)) {
        collectionsArr = collectionsDataRaw.collections;
      } else if (collectionsDataRaw && Array.isArray(collectionsDataRaw.data)) {
        collectionsArr = collectionsDataRaw.data;
      }
      if (user.role === 'company_user' && user.permissions?.collections) {
        collectionsArr = collectionsArr.filter((c: any) => user.permissions!.collections!.includes(c._id));
      }
      setCollections(collectionsArr);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
      setFolders([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  // Load organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!hasPermission) return;
      setLoadingOrganizations(true);
      try {
        const data = await companyService.getOrganizations();
        setOrganizations(data.organizations || []);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setLoadingOrganizations(false);
      }
    };
    loadOrganizations();
  }, [hasPermission]);

  // Load collections when organization filter changes
  useEffect(() => {
    if (!filterOrganization || filterOrganization === 'all') {
      setFilterCollectionsList([]);
      setFilterCollections([]);
      setFilterFoldersList([]);
      setFilterFolders([]);
      return;
    }

    const loadCollections = async () => {
      setLoadingFilterCollections(true);
      try {
        const data = await companyService.getCollections(filterOrganization);
        setFilterCollectionsList(data.collections || []);
      } catch (error) {
        console.error('Failed to load filter collections:', error);
      } finally {
        setLoadingFilterCollections(false);
      }
    };
    loadCollections();
  }, [filterOrganization]);

  // Load folders when collection filters change
  useEffect(() => {
    if (!filterOrganization || filterOrganization === 'all' || filterCollections.length === 0) {
      setFilterFoldersList([]);
      setFilterFolders([]);
      return;
    }

    const loadFolders = async () => {
      setLoadingFilterFolders(true);
      try {
        const data = await companyService.getFolders(filterOrganization, filterCollections);
        setFilterFoldersList(data.folders || []);
      } catch (error) {
        console.error('Failed to load filter folders:', error);
      } finally {
        setLoadingFilterFolders(false);
      }
    };
    loadFolders();
  }, [filterOrganization, filterCollections]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterOrganization, filterCollections, filterFolders, searchTerm]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, filterOrganization, filterCollections, filterFolders, hasPermission]);

  const generatePassword = async () => {
    try {
      const response = await passwordService.generate(generatorOptions);
      setGeneratedPassword(response.password);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to generate password',
        variant: 'destructive',
      });
    }
  };

  const useGeneratedPassword = () => {
    setFormData({ ...formData, password: generatedPassword });
    setIsGeneratorOpen(false);
    setGeneratedPassword(''); // Reset generated password
    toast({
      title: 'Success',
      description: 'Password applied to form',
    });
  };

  const validateForm = () => {
    if (!formData.itemName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Item name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.username.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Username is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Password is required',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Filter out empty website URLs before submitting
      const submitData = {
        ...formData,
        websiteUrls: formData.websiteUrls.filter(url => url.trim() !== '')
      };

      if (isEditMode && editingPassword) {
        await passwordService.update(editingPassword._id, submitData);
        toast({
          title: 'Success',
          description: 'Password updated successfully',
        });
      } else {
        await passwordService.create(submitData);
        toast({
          title: 'Success',
          description: 'Password created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 
        (isEditMode ? 'Failed to update password' : 'Failed to create password');
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await passwordService.delete(id);
      toast({
        title: 'Success',
        description: 'Password deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setPasswordToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete password',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (id: string) => {
    setPasswordToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleEdit = async (password: Password) => {
    try {
      // Fetch the decrypted password for editing
      const decryptedPassword = await passwordService.getById(password._id);

      setEditingPassword(decryptedPassword);
      setIsEditMode(true);
      
      // Convert IDs to strings to ensure Select components work correctly
      const orgId = decryptedPassword.organizationId 
        ? (typeof decryptedPassword.organizationId === 'string' 
          ? decryptedPassword.organizationId 
          : String(decryptedPassword.organizationId)) 
        : '';
      const colId = decryptedPassword.collectionId 
        ? (typeof decryptedPassword.collectionId === 'string' 
          ? decryptedPassword.collectionId 
          : String(decryptedPassword.collectionId)) 
        : '';
      const folderId = decryptedPassword.folderId 
        ? (typeof decryptedPassword.folderId === 'string' 
          ? decryptedPassword.folderId 
          : String(decryptedPassword.folderId)) 
        : '';
      
      setFormData({
        itemName: decryptedPassword.itemName,
        username: decryptedPassword.username,
        password: decryptedPassword.password, // This will be the actual decrypted password
        websiteUrls: decryptedPassword.websiteUrls && decryptedPassword.websiteUrls.length > 0 ? decryptedPassword.websiteUrls : [''],
        notes: decryptedPassword.notes,
        folderId: folderId,
        collectionId: colId,
        organizationId: orgId,
      });
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load password for editing',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      username: '',
      password: '',
      websiteUrls: [''],
      notes: '',
      folderId: '',
      collectionId: '',
      organizationId: '',
    });
    setShowPassword(false);
    setIsEditMode(false);
    setEditingPassword(null);
    setGeneratedPassword('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const togglePasswordVisibility = async (id: string) => {
    if (!visiblePasswords.has(id)) {
      try {
        const decrypted = await passwordService.getById(id);
        setPasswords((prev) =>
          prev.map((p) => (p._id === id ? decrypted : p))
        );
        setVisiblePasswords((prev) => new Set(prev).add(id));
      } catch (error: any) {
        toast({
          title: 'Error',
          description: 'Failed to decrypt password',
          variant: 'destructive',
        });
      }
    } else {
      setVisiblePasswords((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Username visibility state
  const [visibleUsernames, setVisibleUsernames] = useState<Set<string>>(new Set());

  // Toggle username visibility in the table
  const toggleUsernameVisibility = async (id: string) => {
    if (!visibleUsernames.has(id)) {
      try {
        const decrypted = await passwordService.getById(id);
        setPasswords((prev) =>
          prev.map((p) => (p._id === id ? decrypted : p))
        );
        setVisibleUsernames((prev) => new Set(prev).add(id));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to decrypt username',
          variant: 'destructive',
        });
      }
    } else {
      setVisibleUsernames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const viewLogs = async (password: Password) => {
    try {
      const passwordWithLogs = await passwordService.getById(password._id);
      setSelectedPassword(password);
      setSelectedLogs(passwordWithLogs.logs || []);
      setIsLogsOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch logs',
        variant: 'destructive',
      });
    }
  };

  // Handle website URL changes
  const handleWebsiteUrlChange = (index: number, value: string) => {
    const newWebsiteUrls = [...formData.websiteUrls];
    newWebsiteUrls[index] = value;
    setFormData({ ...formData, websiteUrls: newWebsiteUrls });
  };

  // Add a new website URL field
  const addWebsiteUrl = () => {
    setFormData({
      ...formData,
      websiteUrls: [...formData.websiteUrls, '']
    });
  };

  // Remove a website URL field
  const removeWebsiteUrl = (index: number) => {
    const newWebsiteUrls = formData.websiteUrls.filter((_, i) => i !== index);
    setFormData({ ...formData, websiteUrls: newWebsiteUrls });
  };

  // Toggle password visibility in the form
  const toggleFormPasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const filteredPasswords = passwords.filter((password) =>
    password.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (password.websiteUrls && password.websiteUrls.some(url =>
      url.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  const totalPages = Math.ceil(totalPasswords / rowsPerPage);
  const paginatedPasswords = filteredPasswords;

  // Render permission denied screens
  if (!user) {
    return (
      <DashboardLayout title="Password Creation">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-lg text-muted-foreground">You must be logged in to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return (
      <DashboardLayout title="Password Creation">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-lg text-muted-foreground">You do not have permission to create passwords.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Password">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Password">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Password</h2>
            <p className="text-muted-foreground">Manage all your passwords and login entries</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Selection Button */}
            <Button
              variant="outline"
              onClick={() => setIsBulkSelectionOpen(true)}
            >
              Bulk Selection
            </Button>
            {/* Bulk Operation Button */}
            <Button
              variant="outline"
              onClick={() => setIsBulkOperationOpen(true)}
            >
              Bulk Operation
            </Button>
            {/* Password Generator Button */}
            <Button
              onClick={() => setIsPasswordGeneratorOpen(true)}
            >
              <Key className="mr-2 h-4 w-4" />
              Password Generator
            </Button>
            {/* Add Password Dialog - Always render but conditionally enable */}
            <AddPasswordForm
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Password
                </Button>
              }
              sourceType="organization"
              onSuccess={fetchData}
            />
          </div>
          {/* Edit Password Dialog - Always render but conditionally open */}
          <AddPasswordForm
            isEditMode
            password={editingPassword}
            sourceType="organization"
            open={isEditMode}
            onOpenChange={(open) => {
              setIsEditMode(open);
              if (!open) setEditingPassword(null);
            }}
            onSuccess={() => {
              fetchData();
              setIsEditMode(false);
              setEditingPassword(null);
            }}
            trigger={null}
          />
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="filter-organization">Organization (Default)</Label>
                <Select
                  value={filterOrganization}
                  onValueChange={(value) => {
                    setFilterOrganization(value);
                    setFilterCollections([]);
                    setFilterFolders([]);
                  }}
                  disabled={loadingOrganizations}
                >
                  <SelectTrigger id="filter-organization">
                    <SelectValue placeholder="Select organization (default)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((org: any) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name || org.organizationName} {org.description || org.organizationEmail ? `(${org.description || org.organizationEmail})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <MultiSelectDropdown
                  options={filterCollectionsList.map(col => ({
                    value: col._id,
                    label: (col.name || col.collectionName) + (col.description ? ` (${col.description})` : "")
                  }))}
                  value={filterCollections}
                  onChange={setFilterCollections}
                  label="Collections"
                  placeholder={filterOrganization && filterOrganization !== 'all' ? "Select collections..." : "Select organization first"}
                  isDisabled={loadingFilterCollections || !filterOrganization || filterOrganization === 'all'}
                />
              </div>
              <div className="space-y-2">
                <MultiSelectDropdown
                  options={filterFoldersList
                    .filter(f => filterCollections.length === 0 || filterCollections.includes(f.collectionId))
                    .map(f => {
                      const collectionName = filterCollectionsList.find(c => c._id === f.collectionId)?.name || 
                                            filterCollectionsList.find(c => c._id === f.collectionId)?.collectionName || '';
                      return { 
                        value: f._id, 
                        label: `${f.name || f.folderName}${collectionName ? ` (${collectionName})` : ''}` 
                      };
                    })}
                  value={filterFolders}
                  onChange={setFilterFolders}
                  label="Folders"
                  placeholder={filterCollections.length > 0 ? "Select folders..." : "Select collections first"}
                  isDisabled={loadingFilterFolders || filterCollections.length === 0}
                />
              </div>
            </div>
            {((filterOrganization && filterOrganization !== 'all') || filterCollections.length > 0 || filterFolders.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterOrganization('all');
                  setFilterCollections([]);
                  setFilterFolders([]);
                }}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search..." />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              All Passwords ({filteredPasswords.length})
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
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Password</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Website</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPasswords.map((password , index) => (
                    <tr key={password._id} className="border-b border-border">
                      <td className="p-4 align-middle">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                      <td className="p-4 text-sm font-medium">{password.itemName}</td>
                      <td className="p-4 text-sm font-mono">
                        <div className="flex items-center gap-2">
                          {visibleUsernames.has(password._id) ? password.username : '••••••••'}
                          <Button size="sm" variant="ghost" onClick={() => toggleUsernameVisibility(password._id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(password.username, 'Username')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-mono">
                        <div className="flex items-center gap-2">
                          {visiblePasswords.has(password._id) ? password.password : '••••••••'}
                          <Button size="sm" variant="ghost" onClick={() => togglePasswordVisibility(password._id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(password.password, 'Password')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {password.websiteUrls && password.websiteUrls.length > 0 ? (
                          <div className="space-y-1">
                            {password.websiteUrls.slice(0, 2).map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline block text-xs"
                              >
                                {url}
                              </a>
                            ))}
                            {password.websiteUrls.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{password.websiteUrls.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No website</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(password.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(password)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => viewLogs(password)}>
                            <History className="h-4 w-4" />
                          </Button>
                          {/* Show delete button for all users */}
                          <Button size="sm" variant="ghost" onClick={() => confirmDelete(password._id)}>
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
          totalItems={totalPasswords}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* Password Generator Dialog */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Password generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Generated Password Display */}
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all">{generatedPassword || 'Your password will appear here'}</code>
                {generatedPassword && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedPassword, 'Password')}
                    className="ml-2 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Length Input */}
            <div className="space-y-2">
              <Label htmlFor="length" className="text-sm font-medium">
                Length
              </Label>
              <Input
                id="length"
                type="number"
                value={generatorOptions.length}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 8 && value <= 128) {
                    setGeneratorOptions({ ...generatorOptions, length: value });
                  }
                }}
                min={8}
                max={128}
                className="w-full"
              />
            </div>

            {/* Character Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="uppercase"
                    checked={generatorOptions.uppercase}
                    onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, uppercase: checked as boolean })}
                  />
                  <Label htmlFor="uppercase" className="text-sm font-normal">
                    Uppercase
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lowercase"
                    checked={generatorOptions.lowercase}
                    onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, lowercase: checked as boolean })}
                  />
                  <Label htmlFor="lowercase" className="text-sm font-normal">
                    Lowercase
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="numbers"
                    checked={generatorOptions.numbers}
                    onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, numbers: checked as boolean })}
                  />
                  <Label htmlFor="numbers" className="text-sm font-normal">
                    Numbers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="special"
                    checked={generatorOptions.special}
                    onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, special: checked as boolean })}
                  />
                  <Label htmlFor="special" className="text-sm font-normal">
                    Special
                  </Label>
                </div>
              </div>
            </div>

            {/* Minimum Requirements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minNumbers" className="text-sm font-medium">
                  Minimum number
                </Label>
                <Input
                  id="minNumbers"
                  type="number"
                  value={generatorOptions.minNumbers}
                  onChange={(e) => setGeneratorOptions({ ...generatorOptions, minNumbers: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={generatorOptions.length}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSpecial" className="text-sm font-medium">
                  Minimum special char
                </Label>
                <Input
                  id="minSpecial"
                  type="number"
                  value={generatorOptions.minSpecial}
                  onChange={(e) => setGeneratorOptions({ ...generatorOptions, minSpecial: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={generatorOptions.length}
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button onClick={generatePassword} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Password
            </Button>

            {/* Use Password Button */}
            {generatedPassword && (
              <Button onClick={useGeneratedPassword} variant="outline" className="w-full">
                Use This Password
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this password? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => passwordToDelete && handleDelete(passwordToDelete)}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Password Activity Logs</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedPassword?.itemName} - Complete history of changes
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No activity logs found</p>
            ) : (
              selectedLogs.map((log, index) => (
                <div key={log._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      log.action === 'create' ? 'default' :
                        log.action === 'update' ? 'secondary' : 'destructive'
                    }>
                      {log.action.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm">
                    <strong>Performed by:</strong>{" "}
                    {log.performedByName && log.performedByEmail
                      ? `${log.performedByName} (${log.performedByEmail})`
                      : log.performedByEmail
                      ? `User (${log.performedByEmail})`
                      : log.performedByName
                      ? log.performedByName
                      : 'Unknown user'
                    }
                  </div>

                  {log.action === 'create' && (
                    <div className="text-sm">
                      <strong>Details:</strong> Password entry was created successfully
                    </div>
                  )}

                  {log.action === 'update' && log.field === 'password' && (
                    <div className="text-sm">
                      <strong>Details:</strong> Password was changed (value hidden for security)
                    </div>
                  )}

                  {log.action === 'update' && log.field === 'username' && (
                    <div className="text-sm">
                      <strong>Details:</strong> Username was changed
                    </div>
                  )}

                  {log.action === 'update' && log.field === 'itemName' && log.oldValue && log.newValue && (
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Field:</strong> Item Name
                      </div>
                      <div>
                        <strong>Previous Value:</strong> {log.oldValue}
                      </div>
                      <div>
                        <strong>New Value:</strong> {log.newValue}
                      </div>
                    </div>
                  )}

                  {log.action === 'update' && log.field && !['password', 'username', 'itemName'].includes(log.field) && (
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Field:</strong> {log.field}
                      </div>
                      {log.details && (
                        <div>
                          <strong>Details:</strong> {log.details}
                        </div>
                      )}
                    </div>
                  )}

                  {log.action === 'delete' && (
                    <div className="text-sm">
                      <strong>Details:</strong> Password was deleted and moved to trash
                    </div>
                  )}

                  {log.action === 'view' && (
                    <div className="text-sm">
                      <strong>Details:</strong> Password was viewed
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Generator Dialog */}
      <PasswordGenerator
        open={isPasswordGeneratorOpen}
        onOpenChange={setIsPasswordGeneratorOpen}
        onPasswordGenerated={(password) => {
          setPasswordFromGenerator(password);
          setIsPasswordGeneratorOpen(false);
          setIsAddPasswordOpen(true);
        }}
      />

      {/* Add Password Dialog with Generated Password */}
      <AddPasswordForm
        open={isAddPasswordOpen}
        onOpenChange={(open) => {
          setIsAddPasswordOpen(open);
          if (!open) {
            setPasswordFromGenerator('');
          }
        }}
        sourceType="organization"
        onSuccess={() => {
          fetchData();
          setIsAddPasswordOpen(false);
          setPasswordFromGenerator('');
        }}
        initialPassword={passwordFromGenerator}
        trigger={null}
      />

      {/* Bulk Selection Dialog */}
      <BulkSelectionDialog
        open={isBulkSelectionOpen}
        onOpenChange={setIsBulkSelectionOpen}
        passwords={filteredPasswords}
        collections={collections}
        folders={folders}
        organizations={organizations}
        onSuccess={fetchData}
      />

      {/* Bulk Operation Form */}
      <BulkOperationForm
        open={isBulkOperationOpen}
        onOpenChange={setIsBulkOperationOpen}
        collections={collections}
        folders={folders}
        organizations={organizations}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
};

export default Password;