import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
    Upload,
    X,
    File,
    Image,
    FileText,
    Loader2,
    Eye,
    Download,
} from 'lucide-react';

interface Attachment {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt?: string;
}

interface CheckoutStepAttachmentProps {
    checkoutId: string;
    stepIndex: number;
    existingAttachment?: Attachment;
    onUploadComplete?: () => void;
    isReadOnly?: boolean;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const CheckoutStepAttachment: React.FC<CheckoutStepAttachmentProps> = ({
    checkoutId,
    stepIndex,
    existingAttachment,
    onUploadComplete,
    isReadOnly = false,
}) => {
    const [uploading, setUploading] = useState(false);
    const [viewing, setViewing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [attachment, setAttachment] = useState<Attachment | undefined>(existingAttachment);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a PDF, PNG, or JPEG file.',
                variant: 'destructive',
            });
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast({
                title: 'File Too Large',
                description: 'File size must be less than 10MB.',
                variant: 'destructive',
            });
            return;
        }

        // Upload file
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('attachment', file);

            const response = await api.post(
                `/checkout/${checkoutId}/step/${stepIndex}/upload`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            setAttachment(response.data);
            toast({
                title: 'Success',
                description: 'Attachment uploaded successfully',
            });

            // Call the callback to refresh checkout details
            onUploadComplete?.();
        } catch (error: any) {
            console.error('Upload error:', error);

            // Enhanced error handling for content validation
            const errorMessage = error.response?.data?.message || 'Failed to upload attachment';

            if (errorMessage.includes('HTML content')) {
                toast({
                    title: 'Invalid File Content',
                    description: 'The selected file contains HTML content instead of the expected file type. Please select a valid PDF or image file.',
                    variant: 'destructive',
                });
            } else if (errorMessage.includes('PDF header')) {
                toast({
                    title: 'Invalid PDF File',
                    description: 'The selected file is not a valid PDF document. Please select a proper PDF file.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Upload Error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = async () => {
        if (!attachment) return;

        try {
            await api.delete(`/checkout/${checkoutId}/step/${stepIndex}/attachment`);
            setAttachment(undefined);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            toast({
                title: 'Success',
                description: 'Attachment removed successfully',
            });
            onUploadComplete?.();
        } catch (error: any) {
            console.error('Remove error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to remove attachment',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                    Optional Attachment
                </label>
                {!isReadOnly && !attachment && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload File
                            </>
                        )}
                    </Button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isReadOnly || uploading}
            />

            {!attachment && !uploading && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">
                        No attachment uploaded
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        PDF, PNG, or JPEG • Max 10MB
                    </p>
                </div>
            )}

            {attachment && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
                    {getFileIcon(attachment.mimeType)}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                        <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.fileSize)}
                            {attachment.uploadedAt && (
                                <> • {new Date(attachment.uploadedAt).toLocaleDateString()}</>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                setViewing(true);
                                try {
                                    // Use the api instance which includes auth headers
                                    const proxyUrl = `/checkout/${checkoutId}/step/${stepIndex}/attachment`;

                                    // Test API connection first
                                    try {
                                        const testResponse = await api.get('/health');

                                        // Test debug endpoint to check attachment data
                                        const debugResponse = await api.get(`/checkout/${checkoutId}/step/${stepIndex}/attachment/debug`);

                                        // Test S3 file content directly
                                        const s3TestResponse = await api.get(`/checkout/${checkoutId}/step/${stepIndex}/attachment/test`);

                                    } catch (testError) {
                                        throw new Error('Backend API is not accessible. Please check if backend is running on the correct port.');
                                    }

                                    // Make authenticated request to get the file
                                    const response = await api.get(proxyUrl, {
                                        responseType: 'blob',
                                        headers: {
                                            'Cache-Control': 'no-cache',
                                            'Pragma': 'no-cache'
                                        }
                                    });

                                    // Verify we got a valid blob
                                    if (!response.data || response.data.size === 0) {
                                        throw new Error('Empty file received');
                                    }

                                    // Create blob URL and open in new tab
                                    const blob = new Blob([response.data], {
                                        type: attachment.mimeType || response.headers['content-type'] || 'application/octet-stream'
                                    });

                                    // Debug: Check if it's actually a PDF by reading first few bytes
                                    if (blob.size < 10000) { // Only for small files to avoid performance issues
                                        const reader = new FileReader();
                                        reader.onload = function (e) {
                                            const content = e.target?.result as string;
                                            const firstBytes = content.substring(0, 100);

                                            if (firstBytes.includes('%PDF')) {
                                                // Valid PDF detected
                                            } else if (firstBytes.includes('<html') || firstBytes.includes('<!DOCTYPE')) {
                                                toast({
                                                    title: 'Corrupted Attachment Detected',
                                                    description: 'This attachment contains HTML content instead of the expected file. Please re-upload a valid file using the replace button.',
                                                    variant: 'destructive',
                                                });
                                            } else {
                                                // Unknown content type
                                            }
                                        };
                                        reader.readAsText(blob.slice(0, 100));
                                    }

                                    const blobUrl = URL.createObjectURL(blob);

                                    // Test if the blob URL is accessible
                                    fetch(blobUrl)
                                        .catch(error => {
                                            console.error('Blob URL test failed:', error);
                                        });

                                    const newWindow = window.open(blobUrl, '_blank');

                                    if (!newWindow) {
                                        // If popup was blocked, try downloading instead
                                        const link = document.createElement('a');
                                        link.href = blobUrl;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }

                                    // Clean up blob URL after a longer delay to ensure it loads
                                    setTimeout(() => {
                                        URL.revokeObjectURL(blobUrl);
                                    }, 10000); // Increased to 10 seconds

                                } catch (error: any) {
                                    console.error('Error viewing attachment:', error);
                                    toast({
                                        title: 'Error',
                                        description: `Failed to view attachment: ${error.message}. Trying direct link...`,
                                        variant: 'destructive',
                                    });
                                    // Fallback to direct S3 URL
                                    window.open(attachment.fileUrl, '_blank');
                                } finally {
                                    setViewing(false);
                                }
                            }}
                            title="View"
                            disabled={viewing}
                        >
                            {viewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                // Force download instead of view
                                setDownloading(true);
                                try {
                                    const proxyUrl = `/checkout/${checkoutId}/step/${stepIndex}/attachment`;

                                    const response = await api.get(proxyUrl, {
                                        responseType: 'blob',
                                        headers: {
                                            'Cache-Control': 'no-cache',
                                            'Pragma': 'no-cache'
                                        }
                                    });

                                    const blob = new Blob([response.data], {
                                        type: attachment.mimeType || response.headers['content-type'] || 'application/octet-stream'
                                    });
                                    const blobUrl = URL.createObjectURL(blob);

                                    const link = document.createElement('a');
                                    link.href = blobUrl;
                                    link.download = attachment.fileName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

                                    toast({
                                        title: 'Success',
                                        description: `File "${attachment.fileName}" downloaded successfully`,
                                    });
                                } catch (error: any) {
                                    console.error('Error downloading:', error);
                                    toast({
                                        title: 'Error',
                                        description: 'Download failed. Trying direct link...',
                                        variant: 'destructive',
                                    });
                                    window.open(attachment.fileUrl, '_blank');
                                } finally {
                                    setDownloading(false);
                                }
                            }}
                            title="Force Download"
                            disabled={downloading}
                        >
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        {!isReadOnly && (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Replace File"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    <Upload className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemove}
                                    title="Remove"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutStepAttachment;
