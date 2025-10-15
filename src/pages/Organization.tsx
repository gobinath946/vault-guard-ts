import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, Key, Eye, Copy, RefreshCw } from 'lucide-react';
import { passwordService, PasswordGeneratorOptions } from '@/services/passwordService';
import { folderService } from '@/services/folderService';
import { collectionService } from '@/services/collectionService';
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
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Password {
  _id: string;
  itemName: string;
  username: string;
  password: string;
  websiteUrl: string;
  notes: string;
  createdAt: string;
}

const Organization = () => {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [folders, setFolders] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    itemName: '',
    username: '',
    password: '',
    websiteUrl: '',
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
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [passwordsData, foldersData, collectionsData] = await Promise.all([
        passwordService.getAll(),
        folderService.getAll(),
        collectionService.getAll(),
      ]);
      setPasswords(passwordsData);
      setFolders(foldersData);
      setCollections(collectionsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
    toast({
      title: 'Success',
      description: 'Password applied to form',
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this password?')) return;

    try {
      await passwordService.delete(id);
      toast({
        title: 'Success',
        description: 'Password deleted successfully',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete password',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await passwordService.create(formData);
      toast({
        title: 'Success',
        description: 'Password created successfully',
      });
      setIsDialogOpen(false);
      setFormData({
        itemName: '',
        username: '',
        password: '',
        websiteUrl: '',
        notes: '',
        folderId: '',
        collectionId: '',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create password',
        variant: 'destructive',
      });
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

  const filteredPasswords = passwords.filter((password) =>
    password.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.websiteUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPasswords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPasswords = filteredPasswords.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <DashboardLayout title="Organization">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Organization</h2>
            <p className="text-muted-foreground">Manage all your passwords and login entries</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Password
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Login Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Item Name</Label>
                  <Input
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="e.g., Gmail Account"
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button type="button" variant="outline" onClick={() => setIsGeneratorOpen(true)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Folder</Label>
                    <Select value={formData.folderId} onValueChange={(value) => setFormData({ ...formData, folderId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((folder: any) => (
                          <SelectItem key={folder._id} value={folder._id}>
                            {folder.folderName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Collection</Label>
                    <Select value={formData.collectionId} onValueChange={(value) => setFormData({ ...formData, collectionId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection: any) => (
                          <SelectItem key={collection._id} value={collection._id}>
                            {collection.collectionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Entry</Button>
              </form>
            </DialogContent>
          </Dialog>
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
                      <td className="p-4 text-sm">{password.websiteUrl}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(password._id)}>
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
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Password Generator Dialog */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Length: {generatorOptions.length}</Label>
              <Slider
                value={[generatorOptions.length]}
                onValueChange={(value) => setGeneratorOptions({ ...generatorOptions, length: value[0] })}
                min={12}
                max={128}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={generatorOptions.uppercase}
                  onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, uppercase: checked as boolean })}
                />
                <Label>Uppercase (A-Z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={generatorOptions.lowercase}
                  onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, lowercase: checked as boolean })}
                />
                <Label>Lowercase (a-z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={generatorOptions.numbers}
                  onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, numbers: checked as boolean })}
                />
                <Label>Numbers (0-9)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={generatorOptions.special}
                  onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, special: checked as boolean })}
                />
                <Label>Special Characters</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Numbers</Label>
                <Input
                  type="number"
                  value={generatorOptions.minNumbers}
                  onChange={(e) => setGeneratorOptions({ ...generatorOptions, minNumbers: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Min Special</Label>
                <Input
                  type="number"
                  value={generatorOptions.minSpecial}
                  onChange={(e) => setGeneratorOptions({ ...generatorOptions, minSpecial: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={generatePassword} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Password
            </Button>
            {generatedPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <code className="text-sm">{generatedPassword}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedPassword, 'Password')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={useGeneratedPassword} className="w-full">
                  Use This Password
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Organization;
