'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onUpload: (url: string) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Por favor, selecciona un archivo primero.');
      return;
    }

    setIsUploading(true);
    toast.loading('Subiendo imagen...');

    try {
      // 1. Get pre-signed URL from our API
      const presignedUrlResponse = await fetch('/api/admin/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!presignedUrlResponse.ok) {
        throw new Error('Failed to get pre-signed URL');
      }

      const { uploadUrl, finalUrl } = await presignedUrlResponse.json();

      // 2. Upload file to MinIO using the pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }
      
      // 3. Notify parent component of the final URL
      onUpload(finalUrl);

      toast.success('Imagen subida correctamente.');
      setFile(null); // Reset file input

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input type="file" accept="image/*" onChange={handleFileChange} className="flex-grow" />
      <Button onClick={handleUpload} disabled={!file || isUploading} type="button">
        {isUploading ? 'Subiendo...' : 'Subir'}
      </Button>
    </div>
  );
}
