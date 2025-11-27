import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import { passwordService } from '@/services/passwordService';
import { S3Uploader, S3Config, UploadResult } from '@/lib/s3-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Upload,
  X,
  File,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  Loader2,
  Trash2,
  Eye,
  Download,
} from 'lucide-react';

interface Attachment {
  _id?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  uploadedAt?: Date;
}

interface PendingFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  result?: UploadResult;
  error?: string;
}

interface AttachmentUploadProps {
  passwordId?: string; // If provided, attachments are saved to this password
  existingAttachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  onPendingFilesChange?: (files: PendingFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return <Archive className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  passwordId,
  existingAttachments = [],
  onAttachmentsChange,
  onPendingFilesChange,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 25 * 1024 * 1024, // 25MB default
}) => {
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(existingAttachments);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadS3Config();
  }, []);

  useEffect(() => {
    setAttachments(existingAttachments);
  }, [existingAttachments]);

  useEffect(() => {
    onPendingFilesChange?.(pendingFiles);
  }, [pendingFiles, onPendingFilesChange]);

  const loadS3Config = async () => {
    setConfigLoading(true);
    try {
      const config = await companyService.getS3ConfigForUpload();
      const s3ConfigMapped: S3Config = {
        region: config.region,
        bucket: config.bucket,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        s3Url: config.s3Url,
      };
      setS3Config(s3ConfigMapped);
      setS3Uploader(new S3Uploader(s3ConfigMapped));
    } catch (error: any) {
      // S3 config not available
      console.log('S3 config not available:', error.message);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = attachments.length + pendingFiles.length + files.length;
    if (totalFiles > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: PendingFile[] = [];
    for (const file of files) {
      if (file.size > maxFileSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${formatFileSize(maxFileSize)} limit`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push({
        file,
        id: crypto.randomUUID(),
        progress: 0,
        status: 'pending',
      });
    }

    setPendingFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadPendingFiles = async (): Promise<UploadResult[]> => {
    if (!s3Uploader || pendingFiles.length === 0) return [];

    const companyName = (user as any)?.companyName || 'company';
    const results: UploadResult[] = [];

    for (const pendingFile of pendingFiles) {
      if (pendingFile.status !== 'pending') continue;

      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pendingFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
        )
      );

      try {
        const result = await s3Uploader.uploadFile(pendingFile.file, companyName, 'attachments');
        results.push(result);

        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id
              ? { ...f, status: 'done' as const, progress: 100, result }
              : f
          )
        );
      } catch (error: any) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id
              ? { ...f, status: 'error' as const, error: error.message }
              : f
          )
        );
      }
    }

    return results;
  };

  const uploadAndSave = async () => {
    if (!s3Uploader || !passwordId) return;

    setLoading(true);
    try {
      const results = await uploadPendingFiles();

      // Save each attachment to the password
      for (const result of results) {
        await passwordService.addAttachment(passwordId, {
          fileUrl: result.url,
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          s3Key: result.key,
        });
      }

      // Refresh attachments
      const response = await passwordService.getAttachments(passwordId);
      setAttachments(response.attachments);
      onAttachmentsChange?.(response.attachments);

      // Clear completed pending files
      setPendingFiles((prev) => prev.filter((f) => f.status !== 'done'));

      toast({
        title: 'Success',
        description: `${results.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAttachment = async (attachment: Attachment) => {
    if (!passwordId || !attachment._id) return;

    try {
      const response = await passwordService.deleteAttachment(passwordId, attachment._id);

      // Delete from S3
      if (s3Uploader && response.s3Key) {
        try {
          await s3Uploader.deleteFile(response.s3Key);
        } catch (s3Error) {
          console.error('Failed to delete from S3:', s3Error);
        }
      }

      // Update local state
      const newAttachments = attachments.filter((a) => a._id !== attachment._id);
      setAttachments(newAttachments);
      onAttachmentsChange?.(newAttachments);

      toast({
        title: 'Success',
        description: 'Attachment deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete attachment',
        variant: 'destructive',
      });
    }
  };

  // Get pending files for external use (bulk operations)
  const getPendingFilesForUpload = () => pendingFiles.filter((f) => f.status === 'pending');

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!s3Config) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-muted-foreground">
          <p className="text-sm">S3 storage not configured. Contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'
        }`}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Click to upload or drag and drop files here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {formatFileSize(maxFileSize)} per file, up to {maxFiles} files
        </p>
      </div>

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Files ({pendingFiles.length})</span>
            {passwordId && (
              <Button size="sm" onClick={uploadAndSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            )}
          </div>
          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
            >
              {getFileIcon(pf.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pf.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pf.file.size)}
                  {pf.status === 'uploading' && ' • Uploading...'}
                  {pf.status === 'done' && ' • Done'}
                  {pf.status === 'error' && ` • Error: ${pf.error}`}
                </p>
              </div>
              {pf.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
              {pf.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePendingFile(pf.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Attachments ({attachments.length})</span>
          {attachments.map((att) => (
            <div
              key={att._id || att.s3Key}
              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg group"
            >
              {getFileIcon(att.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(att.fileUrl, '_blank')}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = att.fileUrl;
                    link.download = att.fileName;
                    link.click();
                  }}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {passwordId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAttachment(att)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export helper for bulk operations
export const useAttachmentUploader = () => {
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadConfig = async () => {
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
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    if (!s3Uploader) return null;
    const companyName = (user as any)?.companyName || 'company';
    return s3Uploader.uploadFile(file, companyName, 'attachments');
  };

  const deleteFile = async (s3Key: string): Promise<void> => {
    if (!s3Uploader) return;
    await s3Uploader.deleteFile(s3Key);
  };

  return { uploadFile, deleteFile, isReady: !loading && !!s3Uploader, loading };
};

export default AttachmentUpload;
