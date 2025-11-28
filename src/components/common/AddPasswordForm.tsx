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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RefreshCw, Eye, EyeOff, Sparkles, X as LucideX, Paperclip, Upload, File, Loader2 } from 'lucide-react';
import { passwordService } from '@/services/passwordService';
import { companyService } from '@/services/companyService';
import { folderService } from '@/services/folderService';
import { collectionService } from '@/services/collectionService';
import { organizationService } from '@/services/organizationService';
import { S3Uploader, S3Config } from '@/lib/s3-client';
import { useToast } from '@/hooks/use-toast';
import PasswordGenerator from './PasswordGenerator';
import UsernameGenerator from './UsernameGenerator';
import AttachmentUpload from './AttachmentUpload';

interface PendingFile {
  file: File;
  id: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};



interface AddPasswordFormProps {
  trigger?: React.ReactNode;
  sourceType: 'organization' | 'folder' | 'collection';
  sourceId?: string;
  onSuccess?: () => void;
  password?: any; // Password to edit (optional)
  isEditMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialPassword?: string; // Initial password to pre-fill (optional)
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
  initialPassword,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameGeneratorOpen, setIsUsernameGeneratorOpen] = useState(false);
  // Dropdown state (no search/pagination)
  const [orgOptions, setOrgOptions] = useState<any[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<any[]>([]);
  const [folderOptions, setFolderOptions] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // Track if we're initializing edit mode to prevent unnecessary refetches
  const isInitializingEdit = useRef(false);
  // Attachment state for create mode
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [s3ConfigLoaded, setS3ConfigLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  // Track original values for change detection in edit mode
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);
  
  const { toast } = useToast();
  
  // Check if form has changes (for edit mode)
  const hasChanges = () => {
    if (!isEditMode || !originalFormData) return true; // Always allow save in create mode
    
    // Compare each field
    const itemNameChanged = formData.itemName !== originalFormData.itemName;
    const usernameChanged = formData.username !== originalFormData.username;
    const passwordChanged = formData.password !== originalFormData.password;
    const notesChanged = formData.notes !== originalFormData.notes;
    const folderChanged = formData.folderId !== originalFormData.folderId;
    const collectionChanged = formData.collectionId !== originalFormData.collectionId;
    const organizationChanged = formData.organizationId !== originalFormData.organizationId;
    
    // Compare website URLs
    const websiteUrlsChanged = 
      formData.websiteUrls.length !== originalFormData.websiteUrls.length ||
      formData.websiteUrls.some((url, index) => url !== originalFormData.websiteUrls[index]);
    
    return (
      itemNameChanged ||
      usernameChanged ||
      passwordChanged ||
      notesChanged ||
      folderChanged ||
      collectionChanged ||
      organizationChanged ||
      websiteUrlsChanged
    );
  };

  // Load S3 config on dialog open
  useEffect(() => {
    const dialogOpen = open !== undefined ? open : isDialogOpen;
    if (dialogOpen && !s3ConfigLoaded) {
      const loadS3Config = async () => {
        try {
          const config = await companyService.getS3ConfigForUpload();
          setS3Uploader(
            new S3Uploader({
              region: config.region,
              bucket: config.bucket,
              accessKey: config.accessKey,
              secretKey: config.secretKey,
              s3Url: config.s3Url,
            })
          );
        } catch (error) {
          console.log('S3 config not available');
        } finally {
          setS3ConfigLoaded(true);
        }
      };
      loadS3Config();
    }
  }, [open, isDialogOpen, s3ConfigLoaded]);

  // Handle file selection for create mode
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: PendingFile[] = files.map((file) => ({
      file,
      id: crypto.randomUUID(),
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

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
      // Backend already filters by permissions for company_user - trust backend response
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
      // Normalize all collection IDs to strings for consistent comparison and mapping
      cols = cols.map((col: any) => {
        const normalizedId = col._id 
          ? (typeof col._id === 'string' ? col._id : String(col._id))
          : null;
        
        // Skip collections without valid IDs
        if (!normalizedId) return null;
        
        return {
          ...col,
          _id: normalizedId, // Ensure _id is always a string
        };
      }).filter((col: any) => col !== null); // Remove any collections without valid IDs
      
      // Backend already filters by permissions for company_user - trust backend response
      setCollectionOptions(cols);
    } catch {
      setCollectionOptions([]);
    }
  };

  // Fetch all folders for selected org/collection (no pagination/search, robust to API shape)
  const fetchFolders = async (organizationId: string, collectionId: string) => {
    setLoadingFolders(true);
    if (!organizationId || !collectionId) {
      setFolderOptions([]);
      setLoadingFolders(false);
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
      // Backend already filters by permissions for company_user - trust backend response
      setFolderOptions(folds);
    } catch {
      setFolderOptions([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  // When dialog opens, fetch orgs and set sourceId or prefill for edit
  useEffect(() => {
    const dialogOpen = open !== undefined ? open : isDialogOpen;
    if (dialogOpen) {
      fetchOrganizations();
      if (isEditMode && password) {
        // Set formData immediately for quick UI update
        // Convert IDs to strings to ensure Select components work correctly
        const orgId = password.organizationId 
          ? (typeof password.organizationId === 'string' 
            ? password.organizationId 
            : String(password.organizationId)) 
          : '';
        const colId = password.collectionId 
          ? (typeof password.collectionId === 'string' 
            ? password.collectionId 
            : String(password.collectionId)) 
          : '';
        const folderId = password.folderId 
          ? (typeof password.folderId === 'string' 
            ? password.folderId 
            : String(password.folderId)) 
          : '';
        
        // Pre-populate ALL form fields with password data
        const initialData = {
          itemName: password.itemName || '',
          username: password.username || '',
          password: password.password || '',
          websiteUrls: password.websiteUrls && password.websiteUrls.length > 0 ? password.websiteUrls : [''],
          notes: password.notes || '',
          folderId: folderId,
          collectionId: colId,
          organizationId: orgId,
        };
        
        setFormData(initialData);
        // Store original data for change detection
        setOriginalFormData(JSON.parse(JSON.stringify(initialData)));
        
        // Fetch collections and folders in background
        // Do this immediately to ensure they're available when dialog renders
        (async () => {
          if (orgId) {
            // Fetch collections first
            await fetchCollections(orgId);
            // Small delay to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 50));
            // Then fetch folders if we have a collection
            if (colId) {
              await fetchFolders(orgId, colId);
            }
          }
        })();
      } else if (sourceId) {
        setFormData(prev => ({
          ...prev,
          [sourceType === 'organization' ? 'organizationId' :
            sourceType === 'folder' ? 'folderId' : 'collectionId']: sourceId
        }));
      } else {
        // Reset form when opening in create mode
        setFormData({
          itemName: '',
          username: '',
          password: initialPassword || '',
          websiteUrls: [''],
          notes: '',
          folderId: '',
          collectionId: '',
          organizationId: '',
        });
        setOriginalFormData(null); // Clear original data in create mode
        setCollectionOptions([]);
        setFolderOptions([]);
      }
    } else {
      // Reset options when dialog closes
      setCollectionOptions([]);
      setFolderOptions([]);
      setPendingFiles([]); // Clear pending files when dialog closes
      setOriginalFormData(null); // Clear original data when dialog closes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDialogOpen, sourceType, sourceId, isEditMode, password, initialPassword]);

  // When org changes, reset collection/folder and fetch collections
  useEffect(() => {
    // In edit mode during initialization, we still need to fetch collections if they're not loaded
    if (isEditMode && password && formData.organizationId === password.organizationId && isInitializingEdit.current) {
      // Always fetch collections if they're not loaded, even during initialization
      if (collectionOptions.length === 0 && formData.organizationId) {
        fetchCollections(formData.organizationId);
      }
      // Mark initialization as complete after checking/fetching
      isInitializingEdit.current = false;
      return;
    }
    
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
    // Always fetch folders if we have org and collection, even in edit mode
    // This ensures folders are loaded when dialog reopens and when collection changes
    if (formData.organizationId && formData.collectionId) {
      // In edit mode during initial prefill, only skip if folders are already loaded for this collection
      if (isEditMode && password) {
        const isInitialPrefill = formData.collectionId === password.collectionId && 
                                 formData.organizationId === password.organizationId &&
                                 isInitializingEdit.current;
        
        // Only skip if we're in initial prefill AND folders are already loaded
        // But always fetch if collection changed (user is editing)
        if (isInitialPrefill && folderOptions.length > 0) {
          // Check if current folderOptions match the current collection
          const currentCollectionId = formData.collectionId ? (typeof formData.collectionId === 'string' ? formData.collectionId : String(formData.collectionId)) : '';
          const foldersMatchCollection = folderOptions.some((f: any) => {
            const folderCollectionId = f.collectionId ? (typeof f.collectionId === 'string' ? f.collectionId : String(f.collectionId)) : '';
            return folderCollectionId === currentCollectionId;
          });
          
          // If folders match current collection, we can skip (already loaded)
          // Otherwise, we need to fetch folders for the new collection
          if (foldersMatchCollection) {
            isInitializingEdit.current = false;
            return;
          }
        }
        // Always fetch folders when collection/org changes in edit mode
        // This allows the user to change the folder selection
        fetchFolders(formData.organizationId, formData.collectionId);
      } else {
        // Not edit mode, fetch and reset folderId
        fetchFolders(formData.organizationId, formData.collectionId);
        setFormData(prev => ({ ...prev, folderId: '' }));
      }
    } else {
      setFolderOptions([]);
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, folderId: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.collectionId, formData.organizationId]);

  // Set flag when dialog opens in edit mode
  useEffect(() => {
    const dialogOpen = open !== undefined ? open : isDialogOpen;
    if (dialogOpen && isEditMode && password) {
      isInitializingEdit.current = true;
    } else {
      isInitializingEdit.current = false;
    }
  }, [open, isDialogOpen, isEditMode, password]);

  // When collectionOptions are loaded and we're in edit mode, ensure collectionId is set correctly
  // This ensures the Select component has the value after options are available
  useEffect(() => {
    if (isEditMode && password && password.collectionId && collectionOptions.length > 0) {
      // Normalize password collectionId to string
      const passwordCollectionId = password.collectionId 
        ? (typeof password.collectionId === 'string' 
          ? password.collectionId 
          : String(password.collectionId)) 
        : '';
      
      if (!passwordCollectionId) return; // No valid ID to match
      
      // Find the collection in options - all IDs are already normalized to strings
      const collectionExists = collectionOptions.find((col: any) => {
        const collectionId = col._id ? String(col._id) : ''; // _id is already a string, but ensure it
        return collectionId === passwordCollectionId;
      });
      
      // Normalize current collectionId for comparison
      const currentCollectionId = formData.collectionId ? String(formData.collectionId) : '';
      
      // Set collectionId if the collection exists in options and it's not already set correctly
      if (collectionExists && currentCollectionId !== passwordCollectionId) {
        setFormData(prev => ({
          ...prev,
          collectionId: passwordCollectionId
        }));
      } else if (collectionExists && !formData.collectionId) {
        // If collection exists but formData.collectionId is empty, set it
        setFormData(prev => ({
          ...prev,
          collectionId: passwordCollectionId
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionOptions, isEditMode, password]);

  // When folderOptions are loaded, validate and set folderId
  // This ensures the folder is editable and shows correctly
  useEffect(() => {
    if (folderOptions.length > 0 && formData.organizationId && formData.collectionId) {
      // If we have a folderId, check if it belongs to the current collection
      if (formData.folderId) {
        const currentFolderId = formData.folderId ? (typeof formData.folderId === 'string' ? formData.folderId : String(formData.folderId)) : '';
        const folderExists = folderOptions.some((f: any) => {
          const folderId = f._id ? (typeof f._id === 'string' ? f._id : String(f._id)) : '';
          return folderId === currentFolderId;
        });
        
        // If current folder doesn't belong to current collection, clear it
        // This allows user to select a new folder
        if (!folderExists) {
          setFormData(prev => ({ ...prev, folderId: '' }));
        }
      }
      
      // In edit mode, if password has a folderId and it exists in options, set it
      if (isEditMode && password && password.folderId) {
        const passwordFolderId = password.folderId ? (typeof password.folderId === 'string' ? password.folderId : String(password.folderId)) : '';
        const folderExists = folderOptions.some((f: any) => {
          const folderId = f._id ? (typeof f._id === 'string' ? f._id : String(f._id)) : '';
          return folderId === passwordFolderId;
        });
        
        const currentFolderId = formData.folderId ? (typeof formData.folderId === 'string' ? formData.folderId : String(formData.folderId)) : '';
        
        // Set folderId if the folder exists in options and it's not already set correctly
        if (folderExists && currentFolderId !== passwordFolderId) {
          setFormData(prev => ({
            ...prev,
            folderId: passwordFolderId
          }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderOptions, isEditMode, password]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In edit mode, check if there are any changes
    if (isEditMode && !hasChanges()) {
      toast({
        title: 'No Changes',
        description: 'No changes were made to the password. Please modify at least one field or click Cancel.',
        variant: 'default',
      });
      return;
    }
    
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        websiteUrls: formData.websiteUrls.filter(url => url.trim() !== ''),
        sourceType, // Add source type flag
      };
      if (isEditMode && password && password._id) {
        // Update existing password - only if there are changes
        await passwordService.update(password._id, submitData);
        toast({
          title: 'Success',
          description: 'Password updated successfully',
        });
      } else {
        // Create new password
        const createdPassword = await passwordService.create(submitData);
        
        // Upload pending attachments if any
        if (pendingFiles.length > 0 && s3Uploader && createdPassword._id) {
          const companyName = (user as any)?.companyName || 'company';
          
          for (const pendingFile of pendingFiles) {
            try {
              const uploadResult = await s3Uploader.uploadFile(
                pendingFile.file,
                companyName,
                'attachments'
              );

              await passwordService.addAttachment(createdPassword._id, {
                fileUrl: uploadResult.url,
                fileName: uploadResult.fileName,
                fileSize: uploadResult.size,
                mimeType: uploadResult.mimeType,
                s3Key: uploadResult.key,
              });
            } catch (uploadError) {
              console.error('Failed to upload attachment:', uploadError);
            }
          }
        }
        
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
      setPendingFiles([]); // Clear pending files
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 
        (isEditMode ? 'Failed to update password' : 'Failed to create password');
      toast({
        title: 'Error',
        description: errorMessage,
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
                    {collectionOptions.map(col => {
                      // _id is already normalized to string in fetchCollections
                      const collectionId = col._id ? String(col._id) : '';
                      // Handle both collectionName and name fields (different API response formats)
                      const collectionName = col.collectionName || col.name || '';
                      
                      if (!collectionId) return null; // Skip invalid entries
                      
                      return (
                        <SelectItem key={collectionId} value={collectionId}>
                          {collectionName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder *</Label>
                <Select
                  value={formData.folderId || ''}
                  onValueChange={value => setFormData({ ...formData, folderId: value })}
                  disabled={!formData.organizationId || !formData.collectionId || loadingFolders}
                  key={`folder-select-${formData.folderId}-${folderOptions.length}`}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingFolders ? 'Loading folders...' : (formData.organizationId && formData.collectionId ? 'Select folder' : 'Select collection first')} />
                  </SelectTrigger>
                  <SelectContent>
                    {folderOptions.map(folder => {
                      const folderId = typeof folder._id === 'string' ? folder._id : folder._id?.toString();
                      return (
                        <SelectItem key={folderId} value={folderId}>
                          {folder.folderName || folder.name}
                        </SelectItem>
                      );
                    })}
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

            {/* Attachments Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="attachments">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                    {!isEditMode && pendingFiles.length > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {pendingFiles.length}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {isEditMode && password?._id ? (
                    // Edit mode - use full AttachmentUpload component
                    <AttachmentUpload
                      passwordId={password._id}
                      existingAttachments={password.attachments || []}
                      disabled={loading}
                    />
                  ) : (
                    // Create mode - simple file picker
                    <div className="space-y-3">
                      {s3ConfigLoaded && s3Uploader ? (
                        <>
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                              loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'
                            }`}
                            onClick={() => !loading && fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                              disabled={loading}
                            />
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to add files
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Files will be uploaded after saving
                            </p>
                          </div>

                          {pendingFiles.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-sm font-medium">
                                Files to upload ({pendingFiles.length})
                              </span>
                              {pendingFiles.map((pf) => (
                                <div
                                  key={pf.id}
                                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                                >
                                  <File className="h-4 w-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{pf.file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(pf.file.size)}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePendingFile(pf.id)}
                                    disabled={loading}
                                  >
                                    <LucideX className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : s3ConfigLoaded ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          S3 storage not configured. Contact your administrator.
                        </p>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (isEditMode && !hasChanges())}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Login' : 'Save Login'}
            </Button>
            {isEditMode && !hasChanges() && (
              <p className="text-sm text-muted-foreground text-center -mt-2">
                No changes detected. Modify at least one field to enable update.
              </p>
            )}
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