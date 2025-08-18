# ☁️ S3 Integration Guide

## Overview

IdSiberAi-CLI provides comprehensive S3 integration with AWS SDK v3, supporting both AWS S3 and S3-compatible storage services like MinIO, DigitalOcean Spaces, and more.

## 🚀 Quick Setup

### 1. AWS S3 Configuration

```env
# AWS S3 (Standard)
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://s3.amazonaws.com
```

### 2. S3-Compatible Services

#### MinIO
```env
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ENDPOINT=http://localhost:9000
```

#### DigitalOcean Spaces
```env
S3_ACCESS_KEY_ID=your-spaces-key
S3_SECRET_ACCESS_KEY=your-spaces-secret
S3_REGION=nyc3
S3_BUCKET=my-space
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

#### Custom S3 (CloudHost.id)
```env
S3_ACCESS_KEY_ID=043ITIPJI1L2TY8OE8YC
S3_SECRET_ACCESS_KEY=KKPsN4DHAeZUoMJDt9Hz1gRQGov58JCSgyxBM8If
S3_REGION=default
S3_BUCKET=portal-sstc
S3_ENDPOINT=https://is3.cloudhost.id
```

## 🛠️ Available Operations

### Upload Files

**Single File Upload:**
```bash
You: "upload package.json to S3 with key configs/package.json"

# AI Response:
☁️ S3 Upload Complete
✅ File: package.json
📍 S3 Key: configs/package.json
🌐 Location: https://s3.amazonaws.com/bucket/configs/package.json
📦 Size: 1.2 KB
```

**Batch Upload:**
```bash
You: "upload all .js files to S3 under source/ prefix"

# AI will:
# 1. Find all .js files
# 2. Upload each with source/ prefix
# 3. Provide upload summary
```

**Backup with Timestamp:**
```bash
You: "backup my project files to S3 with today's date"

# Creates structure: backup/2024-01-15/...
```

### Download Files

**Single File Download:**
```bash
You: "download configs/package.json from S3 to local-config.json"

# AI Response:
☁️ S3 Download Complete
✅ S3 Key: configs/package.json
📍 Local Path: local-config.json
📦 Size: 1.2 KB
🕐 Last Modified: 2024-01-15 10:30:00
```

**Batch Download:**
```bash
You: "download all files from S3 with prefix backup/2024-01-15/"

# AI will:
# 1. List all matching files
# 2. Create local directory structure
# 3. Download all files
# 4. Provide download summary
```

### Search and List

**List All Files:**
```bash
You: "list all files in S3 bucket"

# AI Response:
☁️ S3 Files (15 objects)
📁 configs/
  📄 package.json (1.2 KB)
  📄 database.json (0.8 KB)
📁 source/
  📄 index.js (3.5 KB)
  📄 utils.js (2.1 KB)
📁 backup/
  📄 2024-01-15/ (folder)
```

**Search with Prefix:**
```bash
You: "search S3 for files with prefix configs/"

# Returns only files starting with "configs/"
```

**Filter by Extension:**
```bash
You: "find all .json files in S3"

# AI will search and filter results
```

### Delete Operations

**Single File Delete:**
```bash
You: "delete old-config.json from S3"

# AI Response:
☁️ S3 Delete Complete
❌ Deleted: old-config.json
```

**Bulk Delete:**
```bash
You: "delete all files from S3 with prefix temp/"

# AI will:
# 1. List all matching files
# 2. Confirm deletion (if configured)
# 3. Delete all files
# 4. Provide deletion summary
```

**Cleanup Old Files:**
```bash
You: "delete S3 backup files older than 30 days"

# AI will:
# 1. List all backup files
# 2. Check modification dates
# 3. Delete old files
# 4. Report cleanup results
```

## 🎯 Common Use Cases

### 1. Project Backup

**Daily Backup:**
```bash
You: "create a complete backup of my project to S3"

# AI Workflow:
# 1. Identifies important files (.js, .ts, .json, .md, etc.)
# 2. Excludes temporary/build files
# 3. Creates timestamped backup structure
# 4. Uploads with organized keys
# 5. Provides backup verification
```

**Selective Backup:**
```bash
You: "backup only source code files to S3"

# Includes: .js, .ts, .py, .java, .cpp, etc.
# Excludes: node_modules, .git, build/, etc.
```

### 2. Configuration Management

**Environment Configs:**
```bash
You: "upload all config files to S3 under configs/ folder"

# Uploads: .env, config.json, database.yml, etc.
# Organized structure: configs/env/, configs/db/, etc.
```

**Config Sync:**
```bash
You: "download latest configs from S3 and update local files"

# Downloads and updates local configuration files
```

### 3. Asset Management

**Static Assets:**
```bash
You: "upload all images and CSS to S3 for web hosting"

# Uploads: .jpg, .png, .css, .js
# Optimizes for web delivery
```

**Media Processing:**
```bash
You: "upload videos to S3 and organize by date"

# Creates date-based folder structure
# Handles large file uploads efficiently
```

### 4. Data Archival

**Log Archival:**
```bash
You: "archive old log files to S3 and compress them"

# Compresses logs before upload
# Creates date-based archive structure
```

**Database Backups:**
```bash
You: "upload database dump to S3 with encryption"

# Handles large database files
# Applies server-side encryption
```

## 🔧 Advanced Features

### Metadata and Tagging

```bash
You: "upload file with custom metadata and tags"

# AI can set:
# - Content-Type
# - Cache-Control headers
# - Custom metadata
# - Object tags
```

### Multipart Upload

For large files (>5MB), the system automatically uses multipart upload:

```bash
You: "upload large-video.mp4 to S3"

# AI handles:
# - Automatic multipart upload
# - Progress tracking
# - Resume on failure
# - Optimal part sizing
```

### Versioning Support

```bash
You: "upload new version of config.json to S3"

# If bucket has versioning enabled:
# - Preserves previous versions
# - Tracks version history
# - Allows rollback operations
```

### Access Control

```bash
You: "upload file with public read access"

# AI can set appropriate ACLs:
# - public-read
# - private
# - authenticated-read
```

## 📊 Monitoring and Analytics

### Usage Statistics

```bash
You: "show S3 usage statistics"

# AI Response:
☁️ S3 Usage Summary
📦 Total Objects: 147
📊 Total Size: 2.3 GB
📁 Folders: 12
📈 This Month: +23 objects (+156 MB)

Top Folders:
1. backup/ - 89 objects (1.8 GB)
2. configs/ - 23 objects (45 MB)
3. source/ - 35 objects (402 MB)
```

### Performance Metrics

```bash
You: "analyze S3 operation performance"

# Tracks:
# - Upload speeds
# - Download speeds
# - Operation success rates
# - Error patterns
```

## 🔒 Security Best Practices

### Access Key Management

```env
# Use IAM roles when possible
# Rotate keys regularly
# Use environment-specific keys
S3_ACCESS_KEY_ID=AKIA...  # Never commit to git
```

### Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket/public/*"
    }
  ]
}
```

### Encryption

```bash
You: "upload sensitive file with server-side encryption"

# AI sets appropriate encryption:
# - AES256
# - aws:kms
# - Customer-provided keys
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Errors
```
❌ Error: Network timeout
```
**Solutions:**
- Check endpoint URL
- Verify network connectivity
- Try different region
- Check firewall settings

#### 2. Authentication Errors
```
❌ Error: Invalid access key
```
**Solutions:**
- Verify access key format
- Check secret key
- Confirm key permissions
- Test with S3 console

#### 3. Bucket Not Found
```
❌ Error: The specified bucket does not exist
```
**Solutions:**
- Verify bucket name
- Check region settings
- Confirm bucket permissions
- Create bucket if needed

#### 4. Permission Denied
```
❌ Error: Access denied
```
**Solutions:**
- Check IAM permissions
- Verify bucket policies
- Confirm object ACLs
- Review cross-account access

### Debug Mode

```env
DEBUG=true
AWS_SDK_DEBUG=true
```

```bash
You: "enable S3 debug mode"

# Shows detailed operation logs:
# - Request/response headers
# - Network timing
# - Error details
# - Retry attempts
```

### Connection Testing

```bash
You: "test S3 connection"

# AI performs:
# 1. Endpoint connectivity test
# 2. Authentication verification
# 3. Bucket access check
# 4. Basic operations test

# Example Output:
🧪 S3 Connection Test
✅ Endpoint reachable: https://s3.amazonaws.com
✅ Authentication valid
✅ Bucket accessible: my-bucket
✅ Upload test: Success
✅ Download test: Success
✅ Delete test: Success
```

## 📈 Performance Optimization

### Upload Optimization

```bash
# For large files
You: "upload large file with optimized settings"

# AI optimizes:
# - Multipart chunk size
# - Concurrent uploads
# - Compression settings
# - Transfer acceleration
```

### Download Optimization

```bash
# For bulk downloads
You: "download all backup files with maximum speed"

# AI optimizes:
# - Parallel downloads
# - Retry logic
# - Resume capabilities
# - Bandwidth utilization
```

### Cost Optimization

```bash
You: "analyze S3 costs and suggest optimizations"

# AI analyzes:
# - Storage classes
# - Lifecycle policies
# - Transfer costs
# - Request patterns

# Suggestions:
# - Move old files to IA/Glacier
# - Enable compression
# - Optimize request patterns
# - Use appropriate storage classes
```

## 🔄 Migration and Sync

### Cross-Provider Migration

```bash
You: "migrate from AWS S3 to DigitalOcean Spaces"

# AI handles:
# 1. Lists source objects
# 2. Downloads from source
# 3. Uploads to destination
# 4. Verifies data integrity
# 5. Provides migration report
```

### Bidirectional Sync

```bash
You: "sync local project folder with S3 bucket"

# AI performs:
# 1. Compares local vs S3 files
# 2. Identifies differences
# 3. Uploads new/modified files
# 4. Downloads missing files
# 5. Provides sync summary
```

## 🎛️ Configuration Examples

### Production Setup
```env
# Production AWS S3
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_REGION=us-east-1
S3_BUCKET=myapp-production
S3_ENDPOINT=https://s3.amazonaws.com
```

### Development Setup
```env
# Local MinIO for development
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_BUCKET=dev-bucket
S3_ENDPOINT=http://localhost:9000
```

### Multi-Environment
```env
# Environment-specific buckets
S3_BUCKET_DEV=myapp-dev
S3_BUCKET_STAGING=myapp-staging
S3_BUCKET_PROD=myapp-production
```

---

**Next:** [Performance Guide](./PERFORMANCE.md) | [Troubleshooting](./TROUBLESHOOTING.md) | [Development](./DEVELOPMENT.md)