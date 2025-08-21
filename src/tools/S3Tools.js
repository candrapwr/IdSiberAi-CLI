import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, PutObjectAclCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { ValidationHelper } from './ValidationHelper.js';

/**
 * S3Tools - Provides operations for AWS S3 (upload, download, delete, search)
 * Updated to use AWS SDK v3 for better performance and modern JavaScript support
 * @AI_CAPABLE - This tool is designed to be easily integrated with AI systems
 * @AI_USAGE - The AI can use these methods to manage cloud storage operations
 */
export class S3Tools {
  constructor(workingDirectory = process.cwd()) {
    // AWS SDK v3 - New S3Client with improved performance
    this.s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
    
    this.bucket = process.env.S3_BUCKET;
    this.workingDirectory = workingDirectory;
    this.validator = new ValidationHelper(workingDirectory);
  }
  
  setWorkingDirectory(newDirectory) {
    this.workingDirectory = newDirectory;
    this.validator.setWorkingDirectory(newDirectory);
    return this.workingDirectory;
  }

  /**
   * Upload file to S3 bucket
   * @AI_PROPERTY - Returns standardized response format for AI processing
   */
  async upload(key, filePath) {
    try {
      const fullPath = path.join(this.workingDirectory, filePath);
      
      // Validate file exists
      await this.validator.validateFile(fullPath);
      
      const fileContent = await fs.readFile(fullPath);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent
      });

      const result = await this.s3Client.send(command);
      
      return {
        success: true,
        operation: 'upload',
        key,
        localPath: filePath,
        location: `${process.env.S3_ENDPOINT}/${this.bucket}/${key}`,
        etag: result.ETag,
        message: `File uploaded to s3://${this.bucket}/${key}`
      };
    } catch (error) {
      return {
        success: false,
        operation: 'upload',
        error: error.message,
        key,
        localPath: filePath
      };
    }
  }

  /**
   * Download file from S3 bucket
   * @AI_PROPERTY - Returns standardized response format for AI processing
   */
  async download(key, downloadPath) {
    try {
      const fullPath = path.join(this.workingDirectory, downloadPath);
      
      // Validate destination path
      await this.validator.validateWritablePath(fullPath);
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to buffer for AWS SDK v3
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const fileContent = Buffer.concat(chunks);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, fileContent);
      
      return {
        success: true,
        operation: 'download',
        key,
        localPath: downloadPath,
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        message: `File downloaded from s3://${this.bucket}/${key} to ${downloadPath}`
      };
    } catch (error) {
      return {
        success: false,
        operation: 'download',
        error: error.message,
        key,
        localPath: downloadPath
      };
    }
  }

  /**
   * Delete file from S3 bucket
   * @AI_PROPERTY - Returns standardized response format for AI processing
   */
  async delete(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const result = await this.s3Client.send(command);
      
      return {
        success: true,
        operation: 'delete',
        key,
        versionId: result.VersionId,
        message: `File deleted from s3://${this.bucket}/${key}`
      };
    } catch (error) {
      return {
        success: false,
        operation: 'delete',
        error: error.message,
        key
      };
    }
  }

  /**
   * Search files in S3 bucket
   * @AI_PROPERTY - Returns standardized response format for AI processing
   */
  async search(prefix = '', maxKeys = 1000) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await this.s3Client.send(command);
      
      return {
        success: true,
        operation: 'search',
        prefix,
        results: (response.Contents || []).map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          storageClass: item.StorageClass,
          etag: item.ETag
        })),
        count: response.Contents?.length || 0,
        isTruncated: response.IsTruncated,
        nextContinuationToken: response.NextContinuationToken,
        message: `Found ${response.Contents?.length || 0} objects in s3://${this.bucket}/${prefix}`
      };
    } catch (error) {
      return {
        success: false,
        operation: 'search',
        error: error.message,
        prefix
      };
    }
  }

  /**
   * Get S3 client information for debugging
   * @AI_PROPERTY - Returns S3 configuration info for troubleshooting
   */
  getClientInfo() {
    return {
      success: true,
      bucket: this.bucket,
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      hasCredentials: !!(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
      sdkVersion: '3.x',
      message: `S3 client configured for bucket: ${this.bucket}`
    };
  }

  /**
   * Set ACL (Access Control List) for S3 object
   * @param {string} key - S3 object key
   * @param {string} acl - ACL type ('private'|'public-read'|'public-read-write'|etc)
   * @AI_PROPERTY - Returns standardized response format for AI processing
   */
  async setAcl(key, acl = 'private') {
    try {
      const command = new PutObjectAclCommand({
        Bucket: this.bucket,
        Key: key,
        ACL: acl
      });

      const result = await this.s3Client.send(command);
      
      return {
        success: true,
        operation: 'setAcl',
        key,
        acl,
        message: `ACL set to ${acl} for s3://${this.bucket}/${key}`
      };
    } catch (error) {
      return {
        success: false,
        operation: 'setAcl',
        error: error.message,
        key,
        acl
      };
    }
  }
}