import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Eye, Copy, Sparkles } from 'lucide-react';
import { passwordService } from '@/services/passwordService';
import { folderService } from '@/services/folderService';
import { collectionService } from '@/services/collectionService';
import { organizationService } from '@/services/organizationService';
import { useToast } from '@/hooks/use-toast';
import PasswordGenerator from './PasswordGenerator';
import UsernameGenerator from './UsernameGenerator';

interface AddPasswordFormProps {
  trigger?: React.ReactNode;
  sourceType: 'organization' | 'folder' | 'collection';
  sourceId?: string;
  onSuccess?: () => void;
}

interface FormData {
  itemName: string;
  username: string;
  password: string;
  websiteUrl: string;
  notes: string;
  folderId: string;
  collectionId: string;
  organizationId: string;
}

const AddPasswordForm: React.FC<AddPasswordFormProps> = ({
  trigger,
  sourceType,
  sourceId,
  onSuccess,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [isUsernameGeneratorOpen, setIsUsernameGeneratorOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    username: '',
    password: '',
    websiteUrl: '',
    notes: '',
    folderId: '',
    collectionId: '',
    organizationId: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isDialogOpen) {
      fetchDropdownData();
      // Set source ID based on sourceType
      if (sourceId) {
        setFormData(prev => ({
          ...prev,
          [sourceType === 'organization' ? 'organizationId' : 
           sourceType === 'folder' ? 'folderId' : 'collectionId']: sourceId
        }));
      }
    }
  }, [isDialogOpen, sourceType, sourceId]);

const fetchDropdownData = async () => {
  try {
    const [foldersData, collectionsData, organizationsData] = await Promise.all([
      folderService.getAll(),
      collectionService.getAll(),
      organizationService.getAll(),
    ]);
    
    // Handle direct arrays from backend
    setFolders(Array.isArray(foldersData) ? foldersData : foldersData?.data || []);
    setCollections(Array.isArray(collectionsData) ? collectionsData : collectionsData?.data || []);
    setOrganizations(Array.isArray(organizationsData) ? organizationsData : organizationsData?.data || []);
  } catch (error: any) {
    console.error('Error fetching dropdown data:', error);
    toast({
      title: 'Error',
      description: 'Failed to load dropdown data',
      variant: 'destructive',
    });
    // Ensure arrays are set to empty arrays even on error
    setFolders([]);
    setCollections([]);
    setOrganizations([]);
  }
};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        sourceType, // Add source type flag
      };
      await passwordService.create(submitData);
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
        organizationId: '',
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratedPassword = (password: string) => {
    setFormData({ ...formData, password });
    setIsPasswordGeneratorOpen(false);
  };

  const handleGeneratedUsername = (username: string) => {
    setFormData({ ...formData, username });
    setIsUsernameGeneratorOpen(false);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          {trigger || <Button size="sm">Add Password</Button>}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Login</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add safe check for organizations array */}
                    {(organizations || []).map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.organizationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item Name *</Label>
                <Input
                  required
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="e.g., Gmail Account"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username *</Label>
                <div className="flex gap-2">
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Username or email"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUsernameGeneratorOpen(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Password *</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordGeneratorOpen(true)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Website URL</Label>
              <Input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Folder</Label>
                <Select
                  value={formData.folderId}
                  onValueChange={(value) => setFormData({ ...formData, folderId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add safe check for folders array */}
                    {(folders || []).map((folder) => (
                      <SelectItem key={folder._id} value={folder._id}>
                        {folder.folderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Collection</Label>
                <Select
                  value={formData.collectionId}
                  onValueChange={(value) => setFormData({ ...formData, collectionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add safe check for collections array */}
                    {(collections || []).map((collection) => (
                      <SelectItem key={collection._id} value={collection._id}>
                        {collection.collectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Save Login'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <PasswordGenerator
        open={isPasswordGeneratorOpen}
        onOpenChange={setIsPasswordGeneratorOpen}
        onPasswordGenerated={handleGeneratedPassword}
      />

      <UsernameGenerator
        open={isUsernameGeneratorOpen}
        onOpenChange={setIsUsernameGeneratorOpen}
        onUsernameGenerated={handleGeneratedUsername}
      />
    </>
  );
};

export default AddPasswordForm;