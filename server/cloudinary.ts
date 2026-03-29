import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  publicId?: string;
  tags?: string[];
  transformation?: any;
}

export class CloudinaryService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    if (!this.isConfigured) {
      console.warn('Cloudinary credentials not configured. File uploads will fail.');
    }
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  async uploadFromBuffer(
    buffer: Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder || 'estate-vista',
        resource_type: options.resourceType || 'auto',
        tags: options.tags,
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error(error.message));
          } else if (result) {
            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              format: result.format,
              resourceType: result.resource_type,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              duration: result.duration,
            });
          } else {
            reject(new Error('Upload failed with no result'));
          }
        }
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadFromBase64(
    base64Data: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }

    const uploadOptions: any = {
      folder: options.folder || 'estate-vista',
      resource_type: options.resourceType || 'auto',
      tags: options.tags,
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    const dataUri = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:application/octet-stream;base64,${base64Data}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
      };
    } catch (error: any) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  async uploadFromUrl(
    url: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }

    const uploadOptions: any = {
      folder: options.folder || 'estate-vista',
      resource_type: options.resourceType || 'auto',
      tags: options.tags,
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    try {
      const result = await cloudinary.uploader.upload(url, uploadOptions);
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
      };
    } catch (error: any) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  async deleteResource(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured.');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch (error: any) {
      console.error('Cloudinary delete failed:', error.message);
      return false;
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}): string {
    const transformations: any = {
      fetch_format: options.format || 'auto',
      quality: options.quality || 'auto',
    };

    if (options.width) transformations.width = options.width;
    if (options.height) transformations.height = options.height;
    if (options.crop) transformations.crop = options.crop;

    return cloudinary.url(publicId, transformations);
  }

  generateSignedUploadParams(): { timestamp: number; signature: string; apiKey: string; cloudName: string } {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured.');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'estate-vista' },
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    };
  }
}

export const cloudinaryService = new CloudinaryService();
