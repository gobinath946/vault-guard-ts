import { api } from '@/lib/api';

export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const uploadService = {
  uploadFile: async (file: File): Promise<{ file: UploadedFile }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (fileName: string): Promise<void> => {
    await api.delete('/upload', {
      data: { fileName },
    });
  },
};
