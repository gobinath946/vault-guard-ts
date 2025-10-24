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
import AddPasswordForm from '@/components/common/AddPasswordForm';
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
  action: 'create' | 'update' | 'delete';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
  };
  timestamp: string;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
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
    
    try {
      const [passwordsData, foldersDataRaw, collectionsDataRaw] = await Promise.all([
        passwordService.getAll(currentPage, rowsPerPage),
        folderService.getAll(),
        collectionService.getAll(),
      ]);
      if (Array.isArray(passwordsData)) {
        setPasswords(passwordsData);
        setTotalPasswords(passwordsData.length);
      } else if (passwordsData && Array.isArray(passwordsData.passwords)) {
        setPasswords(passwordsData.passwords);
        setTotalPasswords(typeof passwordsData.total === 'number' ? passwordsData.total : passwordsData.passwords.length);
      } else {
        setPasswords([]);
        setTotalPasswords(0);
      }

      // Permission-based filtering for folders/collections
      let foldersArr = [];
      if (Array.isArray(foldersDataRaw)) {
        foldersArr = foldersDataRaw;
      } else if (foldersDataRaw && Array.isArray(foldersDataRaw.folders)) {
        foldersArr = foldersDataRaw.folders;
      } else if (foldersDataRaw && Array.isArray(foldersDataRaw.data)) {
        foldersArr = foldersDataRaw.data;
      }
      if (user.role === 'company_user' && user.permissions?.folders) {
        foldersArr = foldersArr.filter((f: any) => user.permissions!.folders!.includes(f._id));
      }
      setFolders(foldersArr);

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, hasPermission]);

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
      toast({
        title: 'Error',
        description: isEditMode ? 'Failed to update password' : 'Failed to create password',
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
      setFormData({
        itemName: decryptedPassword.itemName,
        username: decryptedPassword.username,
        password: decryptedPassword.password, // This will be the actual decrypted password
        websiteUrls: decryptedPassword.websiteUrls && decryptedPassword.websiteUrls.length > 0 ? decryptedPassword.websiteUrls : [''],
        notes: decryptedPassword.notes,
        folderId: decryptedPassword.folderId || '',
        collectionId: decryptedPassword.collectionId || '',
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

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search passwords..." />

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
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Password</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Website</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPasswords.map((password) => (
                    <tr key={password._id} className="border-b border-border">
                      <td className="p-4 text-sm font-medium">{password.itemName}</td>
                      <td className="p-4 text-sm font-mono">
                        <div className="flex items-center gap-2">
                          {visiblePasswords.has(password._id) ? password.username : '••••••••'}
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
                    {log.performedBy
                      ? `${log.performedBy.name} (${log.performedBy.email})`
                      : 'Unknown user'
                    }
                  </div>

                  {log.action === 'create' && (
                    <div className="text-sm">
                      <strong>Original Password:</strong>{' '}
                      <code className="bg-muted px-1 rounded">{log.newValue}</code>
                    </div>
                  )}

                  {log.action === 'update' && log.field === 'password' && (
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Previous Password:</strong>{' '}
                        <code className="bg-muted px-1 rounded">{log.oldValue}</code>
                      </div>
                      <div>
                        <strong>New Password:</strong>{' '}
                        <code className="bg-muted px-1 rounded">{log.newValue}</code>
                      </div>
                    </div>
                  )}

                  {log.action === 'update' && log.field && log.field !== 'password' && (
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Field:</strong> {log.field}
                      </div>
                      <div>
                        <strong>Previous Value:</strong> {log.oldValue || 'N/A'}
                      </div>
                      <div>
                        <strong>New Value:</strong> {log.newValue || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Password;