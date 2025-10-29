import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { RefreshCw, Eye, EyeOff, Copy, Sparkles, X as LucideX } from 'lucide-react';
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
  password?: any; // Password to edit (optional)
  isEditMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FormData {
  itemName: string;
  username: string;
  password: string;
  websiteUrls: string[];
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
  password,
  isEditMode = false,
  open,
  onOpenChange,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameGeneratorOpen, setIsUsernameGeneratorOpen] = useState(false);
  // Dropdown state (no search/pagination)
  const [orgOptions, setOrgOptions] = useState<any[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<any[]>([]);
  const [folderOptions, setFolderOptions] = useState<any[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    username: '',
    password: '',
    websiteUrls: [''],
    notes: '',
    folderId: '',
    collectionId: '',
    organizationId: '',
  });
  const { toast } = useToast();

  // Fetch all organizations (no pagination/search, robust to API shape)
  const fetchOrganizations = async () => {
    try {
      const data = await organizationService.getAll(1, 1000, '');
      let orgs: any[] = [];
      if (Array.isArray(data)) {
        orgs = data;
      } else if (data && Array.isArray(data.organizations)) {
        orgs = data.organizations;
      } else if (data && Array.isArray(data.data)) {
        orgs = data.data;
      }
      // Filter for company_user
      if (user?.role === 'company_user' && user.permissions?.organizations) {
        orgs = orgs.filter((org) => user.permissions.organizations.includes(org._id));
      }
      setOrgOptions(orgs);
    } catch {
      setOrgOptions([]);
    }
  };

  // Fetch all collections for selected org (no pagination/search, robust to API shape)
  const fetchCollections = async (organizationId: string) => {
    if (!organizationId) {
      setCollectionOptions([]);
      return;
    }
    try {
      const response = await collectionService.getAll(1, 1000, '', organizationId);
      let cols: any[] = [];
      if (Array.isArray(response)) {
        cols = response;
      } else if (response && Array.isArray(response.collections)) {
        cols = response.collections;
      } else if (response && Array.isArray(response.data)) {
        cols = response.data;
      }
      // Filter for company_user
      if (user?.role === 'company_user' && user.permissions?.collections) {
        cols = cols.filter((col) => user.permissions.collections.includes(col._id));
      }
      setCollectionOptions(cols);
    } catch {
      setCollectionOptions([]);
    }
  };

  // Fetch all folders for selected org/collection (no pagination/search, robust to API shape)
  const fetchFolders = async (organizationId: string, collectionId: string) => {
    if (!organizationId || !collectionId) {
      setFolderOptions([]);
      return;
    }
    try {
      const response = await folderService.getAll(1, 1000, '', organizationId, collectionId);
      let folds: any[] = [];
      if (Array.isArray(response)) {
        folds = response;
      } else if (response && Array.isArray(response.folders)) {
        folds = response.folders;
      } else if (response && Array.isArray(response.data)) {
        folds = response.data;
      }
      // Filter for company_user
      if (user?.role === 'company_user' && user.permissions?.folders) {
        folds = folds.filter((fold) => user.permissions.folders.includes(fold._id));
      }
      setFolderOptions(folds);
    } catch {
      setFolderOptions([]);
    }
  };

  // When dialog opens, fetch orgs and set sourceId or prefill for edit
  useEffect(() => {
    const dialogOpen = open !== undefined ? open : isDialogOpen;
    if (dialogOpen) {
      fetchOrganizations();
      if (isEditMode && password) {
        setFormData({
          itemName: password.itemName || '',
          username: password.username || '',
          password: password.password || '',
          websiteUrls: Array.isArray(password.websiteUrls) && password.websiteUrls.length > 0 ? password.websiteUrls : [''],
          notes: password.notes || '',
          folderId: password.folderId || '',
          collectionId: password.collectionId || '',
          organizationId: password.organizationId || '',
        });
        // Fetch collections and folders for edit mode
        if (password.organizationId) {
          fetchCollections(password.organizationId).then(() => {
            if (password.collectionId) {
              fetchFolders(password.organizationId, password.collectionId);
            }
          });
        }
      } else if (sourceId) {
        setFormData(prev => ({
          ...prev,
          [sourceType === 'organization' ? 'organizationId' :
            sourceType === 'folder' ? 'folderId' : 'collectionId']: sourceId
        }));
      } else {
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
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDialogOpen, sourceType, sourceId, isEditMode, password]);

  // When org changes, reset collection/folder and fetch collections (skip reset in edit mode)
  useEffect(() => {
    if (formData.organizationId) {
      fetchCollections(formData.organizationId);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, collectionId: '', folderId: '' }));
      }
    } else {
      setCollectionOptions([]);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, collectionId: '', folderId: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.organizationId]);

  // When collection changes, reset folder and fetch folders (skip reset in edit mode)
  useEffect(() => {
    if (formData.organizationId && formData.collectionId) {
      fetchFolders(formData.organizationId, formData.collectionId);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, folderId: '' }));
      }
    } else {
      setFolderOptions([]);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, folderId: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.collectionId]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        websiteUrls: formData.websiteUrls.filter(url => url.trim() !== ''),
        sourceType, // Add source type flag
      };
      if (isEditMode && password && password._id) {
        // Update existing password
        await passwordService.update(password._id, submitData);
        toast({
          title: 'Success',
          description: 'Password updated successfully',
        });
      } else {
        // Create new password
        await passwordService.create(submitData);
        toast({
          title: 'Success',
          description: 'Password created successfully',
        });
      }
      if (onOpenChange) onOpenChange(false);
      setIsDialogOpen(false);
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
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: isEditMode ? 'Failed to update password' : 'Failed to create password',
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
      <Dialog open={open !== undefined ? open : isDialogOpen} onOpenChange={onOpenChange || setIsDialogOpen}>
        {trigger !== null && (
          <DialogTrigger asChild>
            {trigger || <Button size="sm">Add Password</Button>}
          </DialogTrigger>
        )}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Login' : 'Add New Login'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Organization Dropdown (no search/pagination) */}
            <div>
              <Label>Item Name *</Label>
              <Input
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g., Gmail Account"
              />
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
                <div className="flex gap-2 items-center">
                  <div className="relative w-full">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
              <Label>Website URLs</Label>
              {formData.websiteUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    type="url"
                    value={url}
                    onChange={e => {
                      const newUrls = [...formData.websiteUrls];
                      newUrls[idx] = e.target.value;
                      setFormData({ ...formData, websiteUrls: newUrls });
                    }}
                    placeholder="https://example.com"
                  />
                  {formData.websiteUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          websiteUrls: formData.websiteUrls.filter((_, i) => i !== idx),
                        });
                      }}
                      // Removed text-destructive to make icon black
                      aria-label="Remove URL"
                    >
                      <LucideX className="h-4 w-4" />
                    </Button>
                  )}
                  {idx === formData.websiteUrls.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData({ ...formData, websiteUrls: [...formData.websiteUrls, ''] })}
                    >
                      +
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <Label>Organization *</Label>
              <Select
                value={formData.organizationId}
                onValueChange={value => setFormData({ ...formData, organizationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map(org => (
                    <SelectItem key={org._id} value={org._id}>{org.organizationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Collection and Folder Dropdowns (no search/pagination) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Collection *</Label>
                <Select
                  value={formData.collectionId}
                  onValueChange={value => setFormData({ ...formData, collectionId: value })}
                  disabled={!formData.organizationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.organizationId ? 'Select collection' : 'Select organization first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionOptions.map(col => (
                      <SelectItem key={col._id} value={col._id}>{col.collectionName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder *</Label>
                <Select
                  value={formData.folderId}
                  onValueChange={value => setFormData({ ...formData, folderId: value })}
                  disabled={!formData.organizationId || !formData.collectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.organizationId && formData.collectionId ? 'Select folder' : 'Select collection first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {folderOptions.map(folder => (
                      <SelectItem key={folder._id} value={folder._id}>{folder.folderName}</SelectItem>
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
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Login' : 'Save Login'}
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