import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, File, Image, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadService, UploadedFile } from '@/services/uploadService';

interface FileUploadProps {
  attachments: UploadedFile[];
  onAttachmentsChange: (attachments: UploadedFile[]) => void;
  maxFiles?: number;
}

export const FileUpload = ({ 
  attachments, 
  onAttachmentsChange,
  maxFiles = 5 
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const newAttachments = [...attachments];
    
    for (const file of files) {
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 50MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file type
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image or video format`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        const result = await uploadService.uploadFile(file);
        newAttachments.push(result.file);
        
        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.response?.data?.message || `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
    
    onAttachmentsChange(newAttachments);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      await uploadService.deleteFile(attachment.fileName);
      onAttachmentsChange(attachments.filter((_, i) => i !== index));
      
      toast({
        title: 'Success',
        description: 'File removed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || attachments.length >= maxFiles}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Add Attachment
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          {attachments.length}/{maxFiles} files • Max 50MB per file
        </span>
      </div>
      
      <input
        id="file-upload"
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading || attachments.length >= maxFiles}
      />

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.mimeType)}
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate hover:underline block"
                  >
                    {attachment.fileName.split('/').pop()}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
