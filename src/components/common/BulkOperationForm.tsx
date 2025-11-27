import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { passwordService } from '@/services/passwordService';
import { companyService } from '@/services/companyService';
import { S3Uploader, S3Config, UploadResult } from '@/lib/s3-client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit, Save, X, Eye, EyeOff, Key, Paperclip, Upload, File, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PendingAttachment {
  file: File;
  id: string;
}

interface BulkPasswordEntry {
  id: string;
  itemName: string;
  username: string;
  password: string;
  websiteUrls: string[];
  notes: string;
  isEditing: boolean;
  attachments: PendingAttachment[];
}

interface BulkOperationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: any[];
  folders: any[];
  organizations: any[];
  onSuccess: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const BulkOperationForm = ({
  open,
  onOpenChange,
  collections,
  folders,
  organizations,
  onSuccess,
}: BulkOperationFormProps) => {
  const [entries, setEntries] = useState<BulkPasswordEntry[]>([
    {
      id: crypto.randomUUID(),
      itemName: '',
      username: '',
      password: '',
      websiteUrls: [''],
      notes: '',
      isEditing: true,
      attachments: [],
    },
  ]);
  const [targetOrganizationId, setTargetOrganizationId] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [s3ConfigLoaded, setS3ConfigLoaded] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { toast } = useToast();
  const { user } = useAuth();

  // Load S3 config on mount
  useEffect(() => {
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
        console.log('S3 config not available for bulk upload');
      } finally {
        setS3ConfigLoaded(true);
      }
    };
    if (open) {
      loadS3Config();
    }
  }, [open]);

  const addNewEntry = () => {
    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        itemName: '',
        username: '',
        password: '',
        websiteUrls: [''],
        notes: '',
        isEditing: true,
        attachments: [],
      },
    ]);
  };

  const handleFileSelect = (entryId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newAttachments: PendingAttachment[] = Array.from(files).map((file) => ({
      file,
      id: crypto.randomUUID(),
    }));

    setEntries(
      entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, attachments: [...entry.attachments, ...newAttachments] }
          : entry
      )
    );
  };

  const removeAttachment = (entryId: string, attachmentId: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, attachments: entry.attachments.filter((a) => a.id !== attachmentId) }
          : entry
      )
    );
  };

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      toast({
        title: 'Cannot Remove',
        description: 'At least one entry is required',
        variant: 'destructive',
      });
      return;
    }
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof BulkPasswordEntry, value: any) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const toggleEdit = (id: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, isEditing: !entry.isEditing } : entry
      )
    );
  };

  const addWebsiteUrl = (entryId: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, websiteUrls: [...entry.websiteUrls, ''] }
          : entry
      )
    );
  };

  const updateWebsiteUrl = (entryId: string, index: number, value: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              websiteUrls: entry.websiteUrls.map((url, i) =>
                i === index ? value : url
              ),
            }
          : entry
      )
    );
  };

  const removeWebsiteUrl = (entryId: string, index: number) => {
    setEntries(
      entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              websiteUrls: entry.websiteUrls.filter((_, i) => i !== index),
            }
          : entry
      )
    );
  };

  const togglePasswordVisibility = (id: string) => {
    const newSet = new Set(visiblePasswords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisiblePasswords(newSet);
  };

  const generatePasswordForEntry = async (entryId: string) => {
    try {
      const response = await passwordService.generate({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        special: true,
        minNumbers: 1,
        minSpecial: 1,
        avoidAmbiguous: false,
      });
      updateEntry(entryId, 'password', response.password);
      toast({
        title: 'Success',
        description: 'Password generated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate password',
        variant: 'destructive',
      });
    }
  };

  const validateEntries = () => {
    for (const entry of entries) {
      if (!entry.itemName.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All entries must have an item name',
          variant: 'destructive',
        });
        return false;
      }
      if (!entry.username.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All entries must have a username',
          variant: 'destructive',
        });
        return false;
      }
      if (!entry.password.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All entries must have a password',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleBulkSave = async () => {
    if (!validateEntries()) {
      return;
    }

    // Validate organization and collection are selected
    if (!targetOrganizationId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an organization',
        variant: 'destructive',
      });
      return;
    }

    if (!targetCollectionId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a collection',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const passwordsData = entries.map((entry) => ({
        itemName: entry.itemName,
        username: entry.username,
        password: entry.password,
        websiteUrls: entry.websiteUrls.filter((url) => url.trim() !== ''),
        notes: entry.notes,
        organizationId: targetOrganizationId,
        collectionId: targetCollectionId,
        folderId: targetFolderId || undefined,
      }));

      const result = await passwordService.bulkCreate(passwordsData);

      // If we have attachments and S3 is configured, upload them
      if (s3Uploader && result.created > 0) {
        const companyName = (user as any)?.companyName || 'company';
        
        // Get the created password IDs from the response if available
        // For now, we'll fetch the passwords and match by itemName
        const response = await passwordService.getAll(1, 100, targetOrganizationId, [targetCollectionId], targetFolderId ? [targetFolderId] : []);
        
        for (const entry of entries) {
          if (entry.attachments.length === 0) continue;
          
          // Find the created password by itemName
          const createdPassword = response.passwords?.find(
            (p: any) => p.itemName === entry.itemName
          );
          
          if (!createdPassword) continue;

          // Upload attachments for this password
          for (const attachment of entry.attachments) {
            try {
              const uploadResult = await s3Uploader.uploadFile(
                attachment.file,
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
      }

      toast({
        title: 'Success',
        description: `${entries.length} password(s) created successfully`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create passwords',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEntries([
      {
        id: crypto.randomUUID(),
        itemName: '',
        username: '',
        password: '',
        websiteUrls: [''],
        notes: '',
        isEditing: true,
        attachments: [],
      },
    ]);
    setTargetOrganizationId('');
    setTargetCollectionId('');
    setTargetFolderId('');
    setVisiblePasswords(new Set());
  };

  const filteredCollections = targetOrganizationId
    ? collections.filter((c) => c.organizationId === targetOrganizationId)
    : collections;

  const filteredFolders = targetCollectionId
    ? folders.filter((f) => f.collectionId === targetCollectionId)
    : folders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Bulk Password Creation</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create multiple password entries at once and save them to the same location
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
          {/* Target Location Selection */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Save All Entries To</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    All password entries will be saved to this location
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

          {/* Password Entries */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-base font-semibold">
                  Password Entries ({entries.length})
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Create and manage multiple password entries
                </p>
              </div>
              <Button onClick={addNewEntry} size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {entries.map((entry, index) => (
                <Card key={entry.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {index + 1}
                          </div>
                          <Label className="text-sm font-semibold">
                            Entry #{index + 1}
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleEdit(entry.id)}
                            title={entry.isEditing ? "Save" : "Edit"}
                          >
                            {entry.isEditing ? (
                              <Save className="h-4 w-4" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeEntry(entry.id)}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {entry.isEditing ? (
                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Item Name *</Label>
                            <Input
                              value={entry.itemName}
                              onChange={(e) =>
                                updateEntry(entry.id, 'itemName', e.target.value)
                              }
                              placeholder="e.g., Gmail Account"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Username *</Label>
                            <Input
                              value={entry.username}
                              onChange={(e) =>
                                updateEntry(entry.id, 'username', e.target.value)
                              }
                              placeholder="e.g., user@example.com"
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Password *</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={visiblePasswords.has(entry.id) ? 'text' : 'password'}
                                  value={entry.password}
                                  onChange={(e) =>
                                    updateEntry(entry.id, 'password', e.target.value)
                                  }
                                  placeholder="Enter password"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => togglePasswordVisibility(entry.id)}
                                >
                                  {visiblePasswords.has(entry.id) ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => generatePasswordForEntry(entry.id)}
                                className="w-full sm:w-auto"
                                title="Generate Password"
                              >
                                <Key className="h-4 w-4 sm:mr-0 mr-2" />
                                <span className="sm:hidden">Generate</span>
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Website URLs</Label>
                            {entry.websiteUrls.map((url, urlIndex) => (
                              <div key={urlIndex} className="flex gap-2">
                                <Input
                                  value={url}
                                  onChange={(e) =>
                                    updateWebsiteUrl(entry.id, urlIndex, e.target.value)
                                  }
                                  placeholder="https://example.com"
                                />
                                {entry.websiteUrls.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeWebsiteUrl(entry.id, urlIndex)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addWebsiteUrl(entry.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add URL
                            </Button>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              value={entry.notes}
                              onChange={(e) =>
                                updateEntry(entry.id, 'notes', e.target.value)
                              }
                              placeholder="Additional notes..."
                              rows={2}
                            />
                          </div>

                          {/* Attachments Section */}
                          {s3Uploader && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Attachments</Label>
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  multiple
                                  ref={(el) => (fileInputRefs.current[entry.id] = el)}
                                  onChange={(e) => handleFileSelect(entry.id, e.target.files)}
                                  className="hidden"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRefs.current[entry.id]?.click()}
                                >
                                  <Paperclip className="h-4 w-4 mr-2" />
                                  Add Files
                                </Button>
                                {entry.attachments.length > 0 && (
                                  <div className="space-y-1 mt-2">
                                    {entry.attachments.map((att) => (
                                      <div
                                        key={att.id}
                                        className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                                      >
                                        <File className="h-4 w-4 flex-shrink-0" />
                                        <span className="flex-1 truncate">{att.file.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatFileSize(att.file.size)}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAttachment(entry.id, att.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Item Name:</span> {entry.itemName}
                          </div>
                          <div>
                            <span className="font-medium">Username:</span> {entry.username}
                          </div>
                          <div>
                            <span className="font-medium">Password:</span> ••••••••
                          </div>
                          {entry.websiteUrls.filter((url) => url.trim()).length > 0 && (
                            <div>
                              <span className="font-medium">URLs:</span>{' '}
                              {entry.websiteUrls.filter((url) => url.trim()).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkSave} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving...' : `Save All (${entries.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
