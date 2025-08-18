# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 🚀 Installation Issues

#### Node.js Version Error
```bash
Error: Unsupported Node.js version
```
**Solution:**
1. Check current version: `node --version`
2. Install Node.js 18+ from [nodejs.org](https://nodejs.org/)
3. Use nvm for version management:
   ```bash
   nvm install 18
   nvm use 18
   ```

#### Permission Errors
```bash
Error: EACCES: permission denied
```
**Solution:**
1. Fix npm permissions:
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```
2. Or use yarn instead:
   ```bash
   npm install -g yarn
   yarn install
   ```

#### Missing Dependencies
```bash
Error: Cannot find module
```
**Solution:**
1. Clear cache and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 🤖 AI Provider Issues

#### Invalid API Key
```bash
❌ AI API Error: Invalid API key
```
**Solution:**
1. Verify API key format:
   - DeepSeek: `sk-...`
   - OpenAI: `sk-proj-...`
   - Claude: `sk-ant-...`
   - Grok: `xai-...`
2. Check key in provider dashboard
3. Regenerate if expired
4. Verify environment variable loading:
   ```bash
   You: /providers
   ```

#### Rate Limit Exceeded
```bash
❌ Rate limit exceeded for provider
```
**Solution:**
1. Enable auto fallback:
   ```env
   ENABLE_AI_FALLBACK=true
   ```
2. Add more providers to `.env`
3. Upgrade provider plan
4. Wait for rate limit reset

#### Network Timeout
```bash
❌ Request timeout after 30s
```
**Solution:**
1. Check internet connection
2. Try different provider:
   ```bash
   You: /switch
   ```
3. Increase timeout in `.env`:
   ```env
   OPENAI_TIMEOUT=60000
   ```

### 📁 File Operation Issues

#### Path Outside Working Directory
```bash
❌ Path outside working directory not allowed
```
**Solution:**
1. Use relative paths:
   ```bash
   # Good: "edit ./src/index.js"
   # Bad: "edit /home/user/other/file.js"
   ```
2. Set correct working directory:
   ```env
   WORKING_DIRECTORY=/path/to/your/project
   ```

#### File Not Found
```bash
❌ File not found: package.json
```
**Solution:**
1. Check current directory:
   ```bash
   You: "show current directory contents"
   ```
2. Use correct file path:
   ```bash
   You: "read file at src/index.js"
   ```
3. Create file if needed:
   ```bash
   You: "create package.json file"
   ```

#### Permission Denied
```bash
❌ Permission denied: Cannot write to file
```
**Solution:**
1. Check file permissions:
   ```bash
   ls -la filename
   ```
2. Change permissions:
   ```bash
   chmod 644 filename
   ```
3. Ensure working directory is writable

#### Edit File Failures
```bash
❌ No matching text found to edit
```
**Solution:**
1. Check exact text in file:
   ```bash
   You: "show me lines around 'old text' in file.js"
   ```
2. Use flexible search:
   ```bash
   You: "replace text ignoring whitespace differences"
   ```
3. Check for case sensitivity:
   ```bash
   You: "replace 'OLD TEXT' with 'new text' case insensitive"
   ```

### ☁️ S3 Issues

#### S3 Connection Failed
```bash
❌ Network timeout connecting to S3
```
**Solution:**
1. Check endpoint URL:
   ```env
   S3_ENDPOINT=https://s3.amazonaws.com
   ```
2. Verify network connectivity:
   ```bash
   ping s3.amazonaws.com
   ```
3. Check firewall settings
4. Try different region

#### Invalid S3 Credentials
```bash
❌ Invalid access key ID
```
**Solution:**
1. Verify credentials format:
   ```env
   S3_ACCESS_KEY_ID=AKIA...
   S3_SECRET_ACCESS_KEY=...
   ```
2. Test in AWS Console/provider dashboard
3. Check IAM permissions
4. Regenerate keys if needed

#### Bucket Not Found
```bash
❌ The specified bucket does not exist
```
**Solution:**
1. Verify bucket name:
   ```env
   S3_BUCKET=your-bucket-name
   ```
2. Check bucket region
3. Create bucket if needed
4. Verify access permissions

#### S3 Upload Failed
```bash
❌ Upload failed: Request timeout
```
**Solution:**
1. Check file size (split large files)
2. Verify network stability
3. Use multipart upload for large files
4. Check bucket storage limits

### 📊 Performance Issues

#### Slow Response Times
```bash
⏱️ Request taking longer than usual
```
**Solution:**
1. Check AI provider status
2. Switch to faster provider:
   ```bash
   You: /switch
   # Select Grok or DeepSeek
   ```
3. Reduce max iterations:
   ```env
   MAX_ITERATIONS=15
   ```
4. Disable streaming temporarily:
   ```bash
   You: /stream
   ```

#### High Memory Usage
```bash
Process consuming too much memory
```
**Solution:**
1. Restart application:
   ```bash
   Ctrl+C
   npm start
   ```
2. Process smaller files
3. Clear conversation history:
   ```bash
   You: /clear
   ```
4. Increase Node.js memory:
   ```bash
   node --max-old-space-size=4096 index.js
   ```

#### Maximum Iterations Reached
```bash
❌ Maximum iterations reached (15)
```
**Solution:**
1. Break complex tasks into smaller requests
2. Increase iteration limit:
   ```env
   MAX_ITERATIONS=30
   ```
3. Provide more specific instructions
4. Check for circular logic in request

### 🌊 Streaming Issues

#### Streaming Not Working
```bash
Characters appearing all at once instead of streaming
```
**Solution:**
1. Enable streaming mode:
   ```bash
   You: /stream
   ```
2. Check provider support (not all providers support streaming)
3. Verify terminal compatibility
4. Try different provider:
   ```bash
   You: /switch
   ```

#### Broken Stream Display
```bash
Garbled or incomplete text display
```
**Solution:**
1. Check terminal encoding (UTF-8)
2. Try different terminal emulator
3. Disable streaming:
   ```bash
   You: /stream
   ```
4. Update terminal software

### 📝 Logging Issues

#### Log Files Growing Too Large
```bash
Disk space warning: log files large
```
**Solution:**
1. Clear old logs:
   ```bash
   You: /logs
   # Select "Clear old logs"
   ```
2. Adjust retention period:
   ```env
   LOG_RETENTION_DAYS=7
   ```
3. Disable logging temporarily:
   ```env
   ENABLE_LOGGING=false
   ```

#### Cannot Write Log Files
```bash
❌ Failed to write log file
```
**Solution:**
1. Check logs directory permissions:
   ```bash
   ls -la logs/
   ```
2. Create logs directory:
   ```bash
   mkdir logs
   chmod 755 logs
   ```
3. Check disk space availability

### 🔧 System-Specific Issues

#### Windows Path Issues
```bash
❌ Invalid path format
```
**Solution:**
1. Use forward slashes or double backslashes:
   ```env
   WORKING_DIRECTORY=C:/Users/yourname/project
   # OR
   WORKING_DIRECTORY=C:\\Users\\yourname\\project
   ```
2. Avoid spaces in paths
3. Use short path names

#### macOS Permission Issues
```bash
❌ Operation not permitted
```
**Solution:**
1. Grant Full Disk Access to Terminal:
   - System Preferences → Security & Privacy → Privacy → Full Disk Access
   - Add Terminal app
2. Check Gatekeeper settings
3. Use `sudo` for system operations

#### Linux File System Issues
```bash
❌ Read-only file system
```
**Solution:**
1. Check mount points:
   ```bash
   mount | grep ro
   ```
2. Remount as read-write:
   ```bash
   sudo mount -o remount,rw /
   ```
3. Check disk space:
   ```bash
   df -h
   ```

## 🛠️ Debugging Tools

### Enable Debug Mode
```env
DEBUG=true
NODE_ENV=development
```

### Verbose Logging
```bash
You: /logs
# View recent error logs
```

### Provider Testing
```bash
You: /test
# Test all AI providers
```

### System Information
```bash
You: "show system information"
You: "check working directory status"
```

### Connection Testing
```bash
You: "test S3 connection"
You: "check AI provider connectivity"
```

## 📞 Getting Additional Help

### Before Reporting Issues
1. **Check this troubleshooting guide**
2. **Search existing GitHub issues**
3. **Try with different AI provider**
4. **Test with minimal example**
5. **Gather error logs and system info**

### Information to Include
- **Version**: `npm list` output
- **Environment**: OS, Node.js version
- **Error Message**: Complete error text
- **Steps to Reproduce**: Exact commands used
- **Configuration**: Relevant .env settings (redact API keys)
- **Logs**: Recent error logs from `/logs`

### Support Channels
1. **GitHub Issues** - Bug reports and feature requests
2. **GitHub Discussions** - Community questions and help
3. **Documentation** - Comprehensive guides and examples
4. **Stack Overflow** - Tag with `idsiberai-cli`

### Quick Fixes Checklist
- [ ] Restart the application
- [ ] Check internet connection
- [ ] Verify API keys are valid
- [ ] Ensure working directory exists and is writable
- [ ] Try different AI provider
- [ ] Clear conversation history
- [ ] Update to latest version
- [ ] Check system resources (disk space, memory)
- [ ] Review recent changes to configuration
- [ ] Test with minimal example

---

**Need more help?** Check our [Examples Guide](./EXAMPLES.md) or join the [GitHub Discussions](https://github.com/your-repo/discussions)!