# 📋 Installation & Setup Guide

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+ or **yarn** 3+
- **Terminal/Command Line** access
- **Internet connection** for AI providers

## 🚀 Quick Installation

### 1. Get the Project
```bash
# Clone repository
git clone https://github.com/your-username/IdSiberAi-CLI.git
cd IdSiberAi-CLI

# Or download and extract ZIP
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see below)
nano .env  # or your preferred editor
```

### 4. First Run
```bash
npm start
```

## ⚙️ Environment Configuration

### Required Settings

Edit `.env` file with your configuration:

```env
# =================================
# AI PROVIDER API KEYS
# =================================
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
OPENAI_API_KEY=sk-your-openai-key-here
CLAUDE_API_KEY=sk-ant-your-claude-key-here
GROK_API_KEY=xai-your-grok-key-here
ZHIPUAI_API_KEY=your-zhipuai-key-here

# =================================
# SYSTEM CONFIGURATION
# =================================
WORKING_DIRECTORY=/path/to/your/workspace
MAX_ITERATIONS=50
ENABLE_LOGGING=true
ENABLE_STREAMING=true
DEFAULT_AI_PROVIDER=DeepSeek

# =================================
# S3 CLOUD STORAGE (Optional)
# =================================
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint
```

### AI Provider Setup

You need **at least one** AI provider configured:

#### 🔥 DeepSeek (Recommended)
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create account and get API key
3. Add to `.env`: `DEEPSEEK_API_KEY=sk-...`

#### 🤖 OpenAI GPT
1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Create API key
3. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`

#### 🎭 Claude (Anthropic)
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Generate API key
3. Add to `.env`: `CLAUDE_API_KEY=sk-ant-...`

#### ⚡ Grok (xAI)
1. Visit [xAI Console](https://console.x.ai/)
2. Get API key
3. Add to `.env`: `GROK_API_KEY=xai-...`

#### 🌟 ZhiPuAI
1. Visit [ZhiPuAI Platform](https://open.bigmodel.cn/)
2. Get API key
3. Add to `.env`: `ZHIPUAI_API_KEY=...`

### S3 Configuration (Optional)

For cloud storage features:

#### AWS S3
```env
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://s3.amazonaws.com
```

#### Custom S3-Compatible (MinIO, DigitalOcean, etc.)
```env
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=default
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-s3-endpoint.com
```

## 🔧 Advanced Configuration

### Working Directory

```env
# Absolute path (recommended)
WORKING_DIRECTORY=/Users/yourname/projects/workspace

# Relative path
WORKING_DIRECTORY=./workspace

# Windows
WORKING_DIRECTORY=C:\\Users\\yourname\\workspace
```

### Performance Tuning

```env
# Increase for complex tasks
MAX_ITERATIONS=100

# Enable for development
DEBUG=true
NODE_ENV=development

# Logging settings
ENABLE_LOGGING=true
LOG_RETENTION_DAYS=30
```

### AI Provider Preferences

```env
# Primary provider
DEFAULT_AI_PROVIDER=DeepSeek

# Enable automatic fallback
ENABLE_AI_FALLBACK=true

# Provider-specific settings
DEEPSEEK_MAX_TOKENS=4000
OPENAI_MODEL=gpt-4o
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## ✅ Verification

### 1. Test Installation
```bash
npm start
```

Should show:
```
🚀 General MCP Assistant CLI - Multi-AI Edition
AI-Powered File System & Automation Assistant
==================================================
✅ MCP Assistant initialized successfully!
```

### 2. Test AI Providers
```bash
You: /test

🧪 Testing AI Providers
========================================
🔄 Testing all providers...
✅ PASS DeepSeek (Response Time: 1.2s)
✅ PASS OpenAI (Response Time: 2.1s)
❌ FAIL Claude (Error: Invalid API key)
```

### 3. Test Tools
```bash
You: /tools

🛠️  Available Tools
========================================
File Operations:
  ✅ search_files
  ✅ read_file
  ✅ write_file
...
Total: 20+ tools available
```

### 4. Test S3 (if configured)
```bash
You: "show S3 client configuration"

🤖 Assistant:
S3 Configuration:
✅ Bucket: your-bucket-name
✅ Region: us-east-1  
✅ Endpoint: https://s3.amazonaws.com
✅ Credentials: Valid
```

## 🐛 Troubleshooting Installation

### Common Issues

#### 1. Node.js Version
```bash
# Check version
node --version  # Should be 18+

# Update Node.js
# Visit https://nodejs.org/
```

#### 2. Permission Errors
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm

# Use yarn instead
npm install -g yarn
yarn install
```

#### 3. Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. API Key Issues
```bash
# Test API key format
echo $DEEPSEEK_API_KEY  # Should start with sk-

# Check .env loading
You: /providers
# Should show configured providers
```

#### 5. S3 Connection Issues
```bash
# Test S3 connectivity
You: "test S3 connection"

# Check credentials
You: "show S3 client info"
```

### Environment Issues

#### Windows Path Problems
```env
# Use forward slashes or double backslashes
WORKING_DIRECTORY=C:/Users/yourname/workspace
# OR
WORKING_DIRECTORY=C:\\\\Users\\\\yourname\\\\workspace
```

#### File Permissions
```bash
# Make sure workspace is writable
chmod 755 ./workspace

# Check current directory permissions
ls -la
```

### Performance Issues

#### Slow Responses
```env
# Reduce max iterations
MAX_ITERATIONS=15

# Disable streaming temporarily
ENABLE_STREAMING=false
```

#### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 index.js
```

## 🎯 Next Steps

1. **[AI Providers Guide](./AI_PROVIDERS.md)** - Configure multiple AI providers
2. **[Tools Reference](./TOOLS.md)** - Learn about available tools
3. **[Usage Examples](./EXAMPLES.md)** - See real-world examples
4. **[S3 Integration](./S3_GUIDE.md)** - Set up cloud storage

## 📞 Getting Help

- Check **[Troubleshooting Guide](./TROUBLESHOOTING.md)**
- Review **[Performance Guide](./PERFORMANCE.md)**
- Join our **[Discussions](https://github.com/your-repo/discussions)**
- Report **[Issues](https://github.com/your-repo/issues)**

---

**Ready to start? 🚀**

```bash
npm start
You: "What can you help me with?"
```