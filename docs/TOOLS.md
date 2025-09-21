# 🛠️ Tools Reference

## Overview

IdSiberAi-CLI provides **20+ powerful tools** organized into categories for efficient task automation and file management.

## 📋 Tools Summary

| Category | Tools | Purpose |
|----------|--------|---------|
| **File Operations** | 8 tools | Create, read, edit, manage files |
| **Directory Operations** | 3 tools | Manage folders and structure |
| **Analysis Tools** | 3 tools | Code analysis and text processing |
| **System Operations** | 2 tools | Execute commands and system info |
| **Internet Operations** | 2 tools | Browse web pages and perform searches |
| **S3 Cloud Storage** | 5 tools | Cloud storage operations |
| **AI Management** | 4 tools | Multi-AI provider management |
| **Logging Operations** | 3 tools | Monitor and analyze usage |

## 📁 File Operations

### `search_files`
Find files matching patterns with advanced filtering.

**Usage:**
```bash
You: "find all JavaScript files in src folder"
You: "search for .py files containing 'import pandas'"
```

**Parameters:**
- `pattern` - Search pattern (glob or regex)
- `directory` - Directory to search (optional)

**Returns:**
```json
{
  "success": true,
  "files": ["src/index.js", "src/utils.js"],
  "count": 2,
  "pattern": "*.js",
  "directory": "src"
}
```

### `read_file`
Read file content with metadata and language detection.

**Usage:**
```bash
You: "read the contents of package.json"
You: "show me what's in README.md"
```

**Parameters:**
- `filePath` - Path to file

**Returns:**
```json
{
  "success": true,
  "path": "package.json",
  "content": "{\n  \"name\": \"...\",\n  ...\n}",
  "size": 1024,
  "extension": "json",
  "lastModified": "2024-01-15T10:30:00.000Z"
}
```

### `write_file`
Create or update files with proper encoding.

**Usage:**
```bash
You: "create a new README.md file"
You: "write a simple Express server to server.js"
```

**Parameters:**
- `filePath` - Path to file
- `content` - File content

**Returns:**
```json
{
  "success": true,
  "path": "server.js",
  "size": 847,
  "message": "File created/updated: server.js"
}
```

### `append_to_file`
Add content to existing files without overwriting.

**Usage:**
```bash
You: "add a new route to my Express server"
You: "append installation instructions to README"
```

**Parameters:**
- `filePath` - Path to file
- `content` - Content to append

**Returns:**
```json
{
  "success": true,
  "path": "server.js",
  "size": 234,
  "message": "Content appended to file: server.js"
}
```

### `edit_file`
Smart text replacement with multiple matching strategies.

**Usage:**
```bash
You: "replace 'console.log' with 'logger.info' in all JS files"
You: "update the port number from 3000 to 8080"
```

**Parameters:**
- `filePath` - Path to file
- `edits` - Array of edit objects with `oldText` and `newText`

**Advanced Features:**
- ✅ **Exact matching** - Default behavior
- ✅ **Flexible whitespace** - Handles spacing differences
- ✅ **Trimmed matching** - Ignores leading/trailing spaces
- ✅ **Case-insensitive** - Last resort matching
- ✅ **Multiple edits** - Process multiple replacements
- ✅ **Detailed feedback** - Per-edit success/failure tracking

**Returns:**
```json
{
  "success": true,
  "path": "server.js",
  "editsApplied": 3,
  "totalEdits": 3,
  "successfulEdits": 3,
  "failedEdits": 0,
  "editResults": [
    {
      "index": 0,
      "success": true,
      "occurrences": 3,
      "strategy": "exact"
    }
  ],
  "diff": "- console.log('Starting server')\n+ logger.info('Starting server')",
  "message": "File edited: server.js (3 changes from 3/3 edits)"
}
```

### `delete_file`
Safely remove files with validation.

**Usage:**
```bash
You: "delete the old config.json file"
You: "remove all .tmp files"
```

**Parameters:**
- `filePath` - Path to file

**Returns:**
```json
{
  "success": true,
  "path": "config.json",
  "message": "File deleted: config.json"
}
```

### `copy_file`
Copy files to new locations with directory creation.

**Usage:**
```bash
You: "copy package.json to backup folder"
You: "duplicate index.js as index.backup.js"
```

**Parameters:**
- `sourcePath` - Source file path
- `destinationPath` - Destination file path

**Returns:**
```json
{
  "success": true,
  "source": "package.json",
  "destination": "backup/package.json",
  "message": "File copied from package.json to backup/package.json"
}
```

### `move_file`
Move or rename files with validation.

**Usage:**
```bash
You: "rename server.js to app.js"
You: "move all .txt files to docs folder"
```

**Parameters:**
- `sourcePath` - Source file path
- `destinationPath` - Destination file path

**Returns:**
```json
{
  "success": true,
  "source": "server.js",
  "destination": "app.js",
  "message": "File moved from server.js to app.js"
}
```

## 📂 Directory Operations

### `list_directory`
List directory contents with detailed metadata.

**Usage:**
```bash
You: "show me what's in the src folder"
You: "list all files in current directory"
```

**Parameters:**
- `dirPath` - Directory path (optional, defaults to current)

**Returns:**
```json
{
  "success": true,
  "path": "src",
  "contents": [
    {
      "name": "index.js",
      "type": "file",
      "size": 1024,
      "extension": "js",
      "lastModified": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "utils",
      "type": "directory",
      "itemCount": 5
    }
  ],
  "totalItems": 12,
  "files": 8,
  "directories": 4
}
```

### `create_directory`
Create directories recursively with validation.

**Usage:**
```bash
You: "create a new components folder"
You: "make a deep folder structure src/components/ui/buttons"
```

**Parameters:**
- `dirPath` - Directory path to create

**Returns:**
```json
{
  "success": true,
  "path": "src/components/ui/buttons",
  "created": true,
  "message": "Directory created: src/components/ui/buttons"
}
```

### `delete_directory`
Remove directories and their contents safely.

**Usage:**
```bash
You: "delete the old temp folder"
You: "remove the node_modules directory"
```

**Parameters:**
- `dirPath` - Directory path to delete

**Returns:**
```json
{
  "success": true,
  "path": "temp",
  "itemsDeleted": 15,
  "message": "Directory deleted: temp (15 items removed)"
}
```

## 🔍 Analysis Tools

### `analyze_file_structure`
Intelligent code analysis with language detection.

**Usage:**
```bash
You: "analyze the structure of my main.py file"
You: "what functions are defined in utils.js?"
```

**Parameters:**
- `filePath` - File to analyze

**Language Support:**
- **JavaScript/TypeScript** - Functions, classes, imports, exports
- **Python** - Functions, classes, imports, decorators
- **PHP** - Classes, methods, namespaces
- **JSON** - Structure validation and key analysis
- **Markdown** - Headers, code blocks, links
- **Plain Text** - General text metrics

**Returns:**
```json
{
  "success": true,
  "path": "utils.js",
  "language": "javascript",
  "lineCount": 156,
  "size": 4567,
  "structure": {
    "functions": [
      {
        "name": "formatDate",
        "line": 15,
        "type": "function"
      }
    ],
    "classes": [],
    "imports": ["lodash", "moment"],
    "exports": ["formatDate", "validateEmail"]
  },
  "metrics": {
    "complexity": "medium",
    "maintainability": "good"
  }
}
```

### `find_in_files`
Search text patterns across multiple files.

**Usage:**
```bash
You: "find all TODO comments in JavaScript files"
You: "search for 'API_KEY' in all config files"
```

**Parameters:**
- `searchTerm` - Text to search for
- `directory` - Directory to search (optional)
- `filePattern` - File pattern filter (optional)

**Returns:**
```json
{
  "success": true,
  "searchTerm": "TODO",
  "matches": [
    {
      "file": "src/utils.js",
      "line": 23,
      "content": "// TODO: Implement error handling",
      "lineNumber": 23
    }
  ],
  "totalMatches": 5,
  "filesSearched": 12
}
```

### `replace_in_files`
Replace text patterns across multiple files.

**Usage:**
```bash
You: "replace 'localhost:3000' with 'api.example.com' in all config files"
You: "update old function names across the project"
```

**Parameters:**
- `searchTerm` - Text to find
- `replaceTerm` - Replacement text
- `directory` - Directory to search (optional)
- `filePattern` - File pattern filter (optional)

**Returns:**
```json
{
  "success": true,
  "searchTerm": "localhost:3000",
  "replaceTerm": "api.example.com",
  "filesModified": [
    {
      "file": "config/development.js",
      "replacements": 2
    }
  ],
  "totalReplacements": 5,
  "filesProcessed": 8
}
```

## ⚙️ System Operations

### `execute_command`
Run system commands safely with output capture.

**Usage:**
```bash
You: "run npm install"
You: "check git status"
You: "list running processes"
```

**Parameters:**
- `command` - Command to execute
- `options` - Execution options (optional)

**Safety Features:**
- ✅ **Command validation** - Blocks dangerous commands
- ✅ **Timeout protection** - Prevents hanging processes
- ✅ **Output capture** - Captures stdout and stderr
- ✅ **Working directory** - Restricted to workspace

**Returns:**
```json
{
  "success": true,
  "command": "npm install",
  "exitCode": 0,
  "stdout": "added 245 packages in 12.3s",
  "stderr": "",
  "duration": 12300,
  "workingDirectory": "/workspace"
}
```

### `get_working_directory_info`
Get comprehensive workspace information.

**Usage:**
```bash
You: "show me workspace information"
You: "what's the current directory structure?"
```

**Returns:**
```json
{
  "success": true,
  "path": "/workspace",
  "size": "156.7 MB",
  "files": 234,
  "directories": 45,
  "permissions": "readable, writable",
  "freeSpace": "2.3 GB",
  "lastModified": "2024-01-15T10:30:00.000Z"
}
```

## 🌐 Internet Operations

### `access_url`
Open web pages with headless Chromium (Puppeteer) and automatically extract readable content.

**Usage:**
```bash
You: "visit https://news.ycombinator.com and summarize the front page"
You: "load https://example.com/blog/123 with selector .article-body"
```

**Parameters:**
- `url` - Target URL (required)
- `options` - Advanced settings (optional)
  - `extractContent` - Enable smart content extraction (default `true`)
  - `contentLimit` - Character cap for extracted content (default `2000`)
  - `waitForSelector` - CSS selector to wait for before scraping
  - `includeMetadata` - Attach headers/status/page info in a separate `metadata` object
  - `includeHtml` - Attach rendered HTML to the response
  - `screenshotPath` - Save a screenshot to the given path

**Returns:**
```json
{
  "success": true,
  "status": 200,
  "contentType": "text/html; charset=UTF-8",
  "contentLength": 15342,
  "responseTime": 1540,
  "content": "# Example Domain\n\nThis domain is for use in illustrative examples..."
}
```

Set `options.includeMetadata = true` to receive extra details (status text, headers, extraction info, page metadata). When enabled, the response adds a `metadata` object:

```json
"metadata": {
  "statusText": "OK",
  "headers": { "content-type": "text/html; charset=UTF-8" },
  "pageInfo": { "title": "Example Domain", "description": "Example Domain" },
  "originalSize": 26451,
  "extracted": true,
  "extractionMethod": "html-extraction"
}
```

### `internet_search`
Perform real browser searches (DuckDuckGo by default) and return the top organic results.

**Usage:**
```bash
You: "search the web for latest Node.js LTS release"
You: "duckduckgo search for "serverless deployment guide" limit 5"
```

**Parameters:**
- `query` - Search keywords (required)
- `options` - Search configuration (optional)
  - `limit` - Maximum results to return (default `10`)
  - `engine` - Search engine (`duckduckgo`, `bing`)
  - `safeSearch` - Disable safe search with `false`
  - `includeHtml` - Include rendered HTML of the results page
  - `screenshotPath` - Save a screenshot of the results

**Returns:**
```json
{
  "success": true,
  "engine": "duckduckgo",
  "query": "latest node.js lts",
  "results": [
    {
      "title": "Node.js — Download",
      "url": "https://nodejs.org/en/download",
      "snippet": "Download the latest Long Term Support (LTS) release of Node.js..."
    }
  ],
  "totalResults": 8,
  "responseTime": 982
}
```

## ☁️ S3 Cloud Storage Operations

### `s3_upload`
Upload files to S3 bucket with metadata.

**Usage:**
```bash
You: "upload package.json to S3 with key configs/package.json"
You: "backup all .js files to S3 under backup/ prefix"
```

**Parameters:**
- `key` - S3 object key (path in bucket)
- `filePath` - Local file path

**Returns:**
```json
{
  "success": true,
  "operation": "upload",
  "key": "configs/package.json",
  "localPath": "package.json",
  "location": "https://s3.amazonaws.com/bucket/configs/package.json",
  "etag": "\"abc123...\"",
  "message": "File uploaded to s3://bucket/configs/package.json"
}
```

### `s3_download`
Download files from S3 bucket.

**Usage:**
```bash
You: "download configs/package.json from S3 to local-package.json"
You: "get backup files from S3"
```

**Parameters:**
- `key` - S3 object key
- `downloadPath` - Local destination path

**Returns:**
```json
{
  "success": true,
  "operation": "download",
  "key": "configs/package.json",
  "localPath": "local-package.json",
  "size": 1024,
  "lastModified": "2024-01-15T10:30:00.000Z",
  "message": "File downloaded from s3://bucket/configs/package.json"
}
```

### `s3_delete`
Delete files from S3 bucket.

**Usage:**
```bash
You: "delete old-config.json from S3"
You: "remove all temp files from S3"
```

**Parameters:**
- `key` - S3 object key to delete

**Returns:**
```json
{
  "success": true,
  "operation": "delete",
  "key": "old-config.json",
  "message": "File deleted from s3://bucket/old-config.json"
}
```

### `s3_search`
Search and list files in S3 bucket.

**Usage:**
```bash
You: "list all files in S3 bucket"
You: "search S3 for files with prefix configs/"
You: "find all .json files in S3"
```

**Parameters:**
- `prefix` - Key prefix to filter (optional)
- `maxKeys` - Maximum results (optional, default: 1000)

**Returns:**
```json
{
  "success": true,
  "operation": "search",
  "prefix": "configs/",
  "results": [
    {
      "key": "configs/package.json",
      "size": 1024,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "storageClass": "STANDARD",
      "etag": "\"abc123...\""
    }
  ],
  "count": 5,
  "isTruncated": false,
  "message": "Found 5 objects in s3://bucket/configs/"
}
```

### `s3_get_client_info`
Get S3 configuration information for debugging.

**Usage:**
```bash
You: "show S3 client configuration"
You: "check S3 connection settings"
```

**Returns:**
```json
{
  "success": true,
  "bucket": "my-bucket",
  "region": "us-east-1",
  "endpoint": "https://s3.amazonaws.com",
  "hasCredentials": true,
  "sdkVersion": "3.x",
  "message": "S3 client configured for bucket: my-bucket"
}
```

## 🤖 AI Management Operations

### `switch_ai_provider`
Switch between configured AI providers.

**Usage:**
```bash
You: /switch
You: "switch to Claude for analysis tasks"
```

**Parameters:**
- `providerName` - Name of AI provider

**Returns:**
```json
{
  "success": true,
  "message": "Switched to Claude provider",
  "currentProvider": "Claude"
}
```

### `list_ai_providers`
List all available AI providers.

**Usage:**
```bash
You: /providers
You: "show available AI providers"
```

**Returns:**
```json
{
  "success": true,
  "providers": ["DeepSeek", "OpenAI", "Claude", "Grok"],
  "currentProvider": "DeepSeek",
  "count": 4
}
```

### `get_ai_provider_info`
Get detailed information about AI providers.

**Usage:**
```bash
You: /ai
You: "show AI provider details"
```

**Returns:**
```json
{
  "success": true,
  "providersInfo": {
    "DeepSeek": {
      "isActive": true,
      "defaultModel": "deepseek-chat",
      "hasApiKey": true,
      "loggingEnabled": true
    }
  },
  "currentProvider": "DeepSeek"
}
```

### `test_ai_providers`
Test connectivity of all AI providers.

**Usage:**
```bash
You: /test
You: "test all AI providers"
```

**Returns:**
```json
{
  "success": true,
  "testResults": {
    "DeepSeek": {
      "success": true,
      "responseTime": 1200
    },
    "OpenAI": {
      "success": false,
      "error": "Invalid API key"
    }
  },
  "message": "Tested 4 providers"
}
```

## 📊 Logging Operations

### `get_api_usage`
Get API usage statistics for all providers.

**Usage:**
```bash
You: /stats
You: "show API usage statistics"
```

**Returns:**
```json
{
  "DeepSeek": {
    "totalCalls": 47,
    "successfulCalls": 45,
    "failedCalls": 2,
    "successRate": "95.74%",
    "totalTokens": 15847
  }
}
```

### `get_recent_logs`
Retrieve recent logs by type.

**Usage:**
```bash
You: /logs
You: "show recent conversation logs"
```

**Parameters:**
- `logType` - Type of logs (conversation, api, tools, errors)
- `lines` - Number of recent entries (default: 50)

**Returns:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "user_input": "create a new file",
      "ai_response": "I'll create a new file for you...",
      "aiProvider": "DeepSeek"
    }
  ],
  "count": 20
}
```

### `clear_old_logs`
Clear old log entries to free space.

**Usage:**
```bash
You: /logs → "Clear old logs"
You: "clean up old log files"
```

**Parameters:**
- `days` - Age threshold in days (default: 7)

**Returns:**
```json
{
  "success": true,
  "message": "Cleared 150 log entries older than 7 days",
  "entriesRemoved": 150,
  "spaceFreed": "2.3 MB"
}
```

## 🎯 Advanced Usage

### Chaining Operations
```bash
You: "read package.json, analyze its structure, then upload it to S3"

# AI will automatically:
# 1. Use read_file to get package.json content
# 2. Use analyze_file_structure to analyze it
# 3. Use s3_upload to upload it to S3
```

### Batch Operations
```bash
You: "find all .js files, analyze each one, and create a summary report"

# AI will:
# 1. Use search_files to find all .js files
# 2. Use analyze_file_structure on each file
# 3. Use write_file to create the summary report
```

### Error Handling
All tools include comprehensive error handling:
- ✅ **Path validation** - Ensures safe file operations
- ✅ **Permission checks** - Validates read/write access
- ✅ **Input sanitization** - Prevents injection attacks
- ✅ **Detailed error messages** - Clear problem descriptions
- ✅ **Graceful degradation** - Continues operation when possible

---

**Next:** [S3 Integration Guide](./S3_GUIDE.md) | [Usage Examples](./EXAMPLES.md) | [Troubleshooting](./TROUBLESHOOTING.md)
