# 💻 Usage Examples

## Overview

Real-world examples demonstrating IdSiberAi-CLI capabilities across different scenarios and use cases.

## 🚀 Getting Started Examples

### First Steps
```bash
# Start the application
npm start

# Check what tools are available
You: /tools

# Test AI providers
You: /test

# Get help
You: /help
```

### Basic File Operations
```bash
# Create a simple file
You: "create a hello.txt file with 'Hello World' content"

# Read a file
You: "show me the contents of package.json"

# Edit a file
You: "change 'Hello World' to 'Hello IdSiberAi' in hello.txt"

# Delete a file
You: "delete the hello.txt file"
```

## 🏗️ Development Workflow Examples

### 1. Setting Up a New Project

**Request:**
```
"Create a new Node.js Express project with TypeScript setup"
```

**AI Actions:**
1. Creates project directory structure
2. Generates `package.json` with dependencies
3. Creates `tsconfig.json` for TypeScript
4. Sets up basic Express server with TypeScript
5. Creates `.gitignore` and `README.md`

**Expected Result:**
```
my-express-app/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── routes/
│   └── middleware/
├── .gitignore
└── README.md
```

### 2. Code Analysis and Refactoring

**Request:**
```
"Analyze all TypeScript files in src/ and replace console.log with proper logging"
```

**AI Actions:**
1. Searches for all `.ts` files in `src/`
2. Analyzes structure of each file
3. Finds all `console.log` statements
4. Replaces with proper logger calls
5. Creates summary report

**Example Output:**
```
📊 Code Analysis Complete
Files analyzed: 8 TypeScript files
Functions found: 23
Classes found: 5
Console.log statements replaced: 15

Changes made:
✅ src/index.ts: 3 replacements
✅ src/services/auth.ts: 5 replacements
✅ src/utils/helper.ts: 7 replacements
```

### 3. Project Backup to Cloud

**Request:**
```
"Backup all my source code files to S3 with today's date"
```

**AI Actions:**
1. Searches for source code files (`.js`, `.ts`, `.py`, etc.)
2. Creates timestamped backup structure
3. Uploads each file to S3 with organized keys
4. Provides backup summary

**Example Result:**
```
☁️ Backup Complete
📁 Backup location: s3://my-bucket/backups/2024-01-15/
📦 Files backed up: 23 files
📊 Total size: 2.3 MB

Files uploaded:
✅ src/index.ts → backups/2024-01-15/src/index.ts
✅ src/routes/api.ts → backups/2024-01-15/src/routes/api.ts
...
```

## 📁 File Management Examples

### 1. Organizing Downloads Folder

**Request:**
```
"Organize my downloads folder by file type"
```

**AI Actions:**
1. Lists all files in downloads folder
2. Analyzes file extensions
3. Creates type-based subdirectories
4. Moves files to appropriate folders

**Before:**
```
downloads/
├── document.pdf
├── image.jpg
├── video.mp4
├── archive.zip
└── spreadsheet.xlsx
```

**After:**
```
downloads/
├── documents/
│   ├── document.pdf
│   └── spreadsheet.xlsx
├── images/
│   └── image.jpg
├── videos/
│   └── video.mp4
└── archives/
    └── archive.zip
```

### 2. Cleaning Up Project Files

**Request:**
```
"Find and delete all .tmp, .log, and .cache files older than 7 days"
```

**AI Actions:**
1. Searches for files with specified extensions
2. Checks file modification dates
3. Safely deletes old temporary files
4. Reports cleanup summary

**Example Output:**
```
🧹 Cleanup Complete
Files deleted: 15 files
Space freed: 45.2 MB

Deleted files:
❌ temp/build.tmp (3 days old)
❌ logs/old.log (10 days old)
❌ cache/data.cache (15 days old)
...
```

### 3. Batch File Processing

**Request:**
```
"Convert all .txt files in docs/ to .md format and update links"
```

**AI Actions:**
1. Finds all `.txt` files in `docs/` directory
2. Reads content of each file
3. Converts to Markdown format
4. Updates internal links and references
5. Saves as new `.md` files

## 🔍 Data Analysis Examples

### 1. Log File Analysis

**Request:**
```
"Analyze error.log file and show me the most common errors"
```

**AI Actions:**
1. Reads the log file
2. Parses log entries and timestamps
3. Identifies error patterns
4. Creates statistical summary
5. Generates recommendations

**Example Output:**
```
📊 Log Analysis Results
📋 Total entries: 1,247
❌ Error entries: 89 (7.1%)
⚠️ Warning entries: 156 (12.5%)

Most common errors:
1. "Database connection timeout" - 23 occurrences
2. "Invalid API key" - 18 occurrences
3. "Rate limit exceeded" - 15 occurrences

🕐 Peak error times: 14:00-16:00 UTC
📈 Trend: Increasing over last 7 days
```

### 2. CSV Data Processing

**Request:**
```
"Analyze sales-data.csv and create a summary report"
```

**AI Actions:**
1. Reads and parses CSV file
2. Analyzes data structure and types
3. Calculates statistics and trends
4. Creates formatted summary report
5. Identifies data quality issues

### 3. Configuration File Validation

**Request:**
```
"Check all .json config files for syntax errors and inconsistencies"
```

**AI Actions:**
1. Finds all JSON configuration files
2. Validates JSON syntax
3. Checks for common configuration patterns
4. Reports errors and suggestions

## ☁️ Cloud Storage Examples

### 1. Automated Backup Strategy

**Request:**
```
"Set up daily backup of important files to S3"
```

**AI Actions:**
1. Identifies important file types and directories
2. Creates backup folder structure in S3
3. Uploads files with date-based organization
4. Provides backup verification

### 2. Cloud Synchronization

**Request:**
```
"Download all files from S3 backup/ folder and organize locally"
```

**AI Actions:**
1. Lists all files in S3 backup folder
2. Creates local directory structure
3. Downloads files maintaining organization
4. Provides sync summary

### 3. Cloud Storage Cleanup

**Request:**
```
"Find and delete old backup files in S3 older than 30 days"
```

**AI Actions:**
1. Lists all objects in S3 bucket
2. Checks last modified dates
3. Identifies files older than threshold
4. Safely deletes old backups
5. Reports cleanup results

## 🔧 System Administration Examples

### 1. Environment Setup

**Request:**
```
"Check my development environment and install missing dependencies"
```

**AI Actions:**
1. Checks for required tools (Node.js, Python, Git, etc.)
2. Validates versions and configurations
3. Identifies missing dependencies
4. Suggests installation commands
5. Optionally runs installation (with permission)

### 2. Performance Monitoring

**Request:**
```
"Monitor system performance and create a health report"
```

**AI Actions:**
1. Checks system resources (CPU, memory, disk)
2. Monitors running processes
3. Analyzes performance metrics
4. Creates comprehensive health report
5. Provides optimization recommendations

### 3. Security Audit

**Request:**
```
"Scan my project files for potential security issues"
```

**AI Actions:**
1. Searches for hardcoded credentials
2. Checks for vulnerable dependencies
3. Validates file permissions
4. Reports security findings
5. Suggests remediation steps

## 🤖 Multi-AI Examples

### 1. Provider Comparison

**Request:**
```
"Compare responses from different AI providers for code review"
```

**AI Actions:**
1. Uses DeepSeek for technical analysis
2. Switches to Claude for detailed review
3. Uses OpenAI for general recommendations
4. Compares and consolidates results

### 2. Specialized Tasks

**Request:**
```
"Use the best AI provider for each task: code analysis, documentation, and creative naming"
```

**AI Actions:**
1. Uses DeepSeek for code analysis (fast, accurate)
2. Uses Claude for documentation (thorough, detailed)
3. Uses Grok for creative naming (fun, engaging)

### 3. Fallback Scenarios

**Request:**
```
"Process this complex data analysis task with automatic fallback"
```

**Scenario:**
```
🔄 Primary provider (DeepSeek) rate limited
🔄 Falling back to OpenAI...
✅ Task completed successfully with OpenAI
```

## 📊 Complex Workflow Examples

### 1. Full Project Analysis

**Request:**
```
"Analyze my entire project: structure, dependencies, code quality, and generate comprehensive report"
```

**AI Workflow:**
1. **Discovery Phase:**
   - Lists all project files
   - Identifies project type and structure
   - Maps dependencies and relationships

2. **Analysis Phase:**
   - Analyzes code structure and quality
   - Checks for best practices
   - Identifies potential issues

3. **Reporting Phase:**
   - Creates detailed analysis report
   - Provides improvement recommendations
   - Uploads report to S3 for backup

### 2. Automated Documentation

**Request:**
```
"Create comprehensive documentation for my API project"
```

**AI Workflow:**
1. **Code Analysis:**
   - Scans all API route files
   - Extracts endpoints and methods
   - Analyzes request/response schemas

2. **Documentation Generation:**
   - Creates API reference documentation
   - Generates usage examples
   - Creates README with setup instructions

3. **Organization:**
   - Structures documentation files
   - Creates navigation and links
   - Uploads to S3 for hosting

### 3. Migration Assistant

**Request:**
```
"Help me migrate from JavaScript to TypeScript"
```

**AI Workflow:**
1. **Assessment:**
   - Identifies all JavaScript files
   - Analyzes code complexity
   - Plans migration strategy

2. **Conversion:**
   - Renames `.js` files to `.ts`
   - Adds type annotations
   - Fixes TypeScript compilation errors

3. **Validation:**
   - Runs TypeScript compiler
   - Tests converted code
   - Creates migration report

## 🎯 Best Practices Examples

### Effective Prompting

**Good:**
```
"Analyze all JavaScript files in src/, find functions without proper error handling, and add try-catch blocks"
```

**Better:**
```
"Analyze JavaScript files in src/ directory, identify functions lacking error handling, add appropriate try-catch blocks with meaningful error messages, and create a summary of changes made"
```

### Specific vs General Requests

**General:**
```
"Fix my code"
```

**Specific:**
```
"Review server.js for potential security vulnerabilities, check for input validation, and ensure proper error handling"
```

### Progressive Complexity

**Start Simple:**
```
"Create a basic Express server"
```

**Add Complexity:**
```
"Add authentication middleware to the Express server"
```

**Further Enhancement:**
```
"Add database integration and API documentation"
```

## 🔧 Troubleshooting Examples

### Common Issues and Solutions

#### 1. File Not Found
**Request:** `"edit the config file"`
**Issue:** Multiple config files exist
**Solution:** Be more specific: `"edit the database config file in src/config/db.js"`

#### 2. Permission Denied
**Request:** `"delete system files"`
**Issue:** Files outside working directory
**Solution:** Ensure files are within workspace: `"delete temp files in my project folder"`

#### 3. Large File Operations
**Request:** `"process this 100MB log file"`
**Issue:** Memory or timeout issues
**Solution:** Break into smaller chunks: `"analyze the last 1000 lines of error.log"`

## 📈 Performance Optimization Examples

### Efficient Operations

**Batch Processing:**
```
"Process all .js files: analyze structure, add JSDoc comments, and run prettier formatting"
```

**Parallel Operations:**
```
"Upload multiple files to S3 simultaneously: package.json, README.md, and src/ folder"
```

**Incremental Updates:**
```
"Only process files modified in the last 24 hours"
```

## 🎉 Creative Use Cases

### 1. Code Generation
```
"Create a complete REST API for a todo application with authentication"
```

### 2. Data Visualization
```
"Analyze sales data and create charts showing monthly trends"
```

### 3. Automation Scripts
```
"Create a deployment script that runs tests, builds the project, and uploads to S3"
```

### 4. Documentation Automation
```
"Generate API documentation from my Express routes and upload to S3 as a static site"
```

---

**Next:** [Troubleshooting Guide](./TROUBLESHOOTING.md) | [Performance Guide](./PERFORMANCE.md) | [Development Guide](./DEVELOPMENT.md)