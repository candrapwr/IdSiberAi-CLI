# 🌐 Web Interface Troubleshooting Guide

This guide covers common issues and solutions for the web interface feature of IdSiberAi-CLI.

## Common Issues & Solutions

### 🚀 Server Startup Issues

#### Port Already in Use
```bash
❌ Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
1. Change web port in `.env`:
   ```env
   WEB_PORT=3001
   ```
2. Check for other services using port 3000:
   ```bash
   lsof -i :3000
   # OR on Windows
   netstat -ano | findstr :3000
   ```
3. Stop conflicting service
4. Restart application

#### Missing Dependencies
```bash
❌ Error: Cannot find module 'express' or 'socket.io'
```
**Solution:**
1. Install required dependencies:
   ```bash
   npm install express socket.io
   ```
2. Reinstall all dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 🔌 Connection Issues

#### Socket Connection Failed
```bash
Socket.io connection failed
```
**Solution:**
1. Check browser console for errors
2. Try different browser
3. Ensure no network restrictions (firewalls, proxies)
4. Verify server is running with correct port
5. Check browser console network tab for failed requests

#### Cannot Access Web Interface
```bash
Unable to connect to http://localhost:3000
```
**Solution:**
1. Ensure web server is running
2. Check terminal for errors
3. Try using IP address instead of localhost
4. Check firewall settings
5. Verify correct port in URL

### 🖥️ User Interface Issues

#### Web Interface Not Responsive
```bash
Web interface freezes or is slow to respond
```
**Solution:**
1. Check network connection
2. Clear browser cache
3. Reduce browser extensions
4. Try different device/browser
5. Restart web server

#### Messages Not Streaming
```bash
Messages appear all at once rather than streaming
```
**Solution:**
1. Verify socket.io connection in browser console
2. Ensure ENABLE_STREAMING=true in .env
3. Check for JavaScript errors in browser console
4. Try different browser
5. Restart the web server

#### Code Highlighting Not Working
```bash
Code blocks appear without syntax highlighting
```
**Solution:**
1. Check browser console for script loading errors
2. Ensure highlight.js is loading properly
3. Clear browser cache
4. Try a different browser

### 📱 Mobile Device Issues

#### Layout Problems on Mobile
```bash
Interface appears broken or unusable on mobile devices
```
**Solution:**
1. Ensure you're using a recent browser version
2. Try landscape orientation
3. Clear browser cache
4. Use Chrome or Safari for best compatibility
5. Try using desktop mode in browser settings

#### Keyboard Covers Input on Mobile
```bash
Virtual keyboard covers input field on mobile
```
**Solution:**
1. Scroll manually to see input
2. Try landscape orientation
3. Use an external keyboard if available
4. Try using a different mobile browser

### 🔧 Advanced Troubleshooting

#### Check Server Logs
```bash
Look for errors in the terminal where the server is running
```

#### Browser Developer Tools
```bash
Open browser developer tools (F12) to check:
- Console errors
- Network requests
- Socket.io connection status
```

#### Restart Web Server
```bash
1. Stop the server (Ctrl+C)
2. Start again with npm start
3. Select Web Mode
```

#### Force Refresh Web Page
```bash
Use Ctrl+F5 or Cmd+Shift+R to completely reload the page
```

## 🛠️ Quick Fixes Checklist

- [ ] Restart the application
- [ ] Clear browser cache and cookies
- [ ] Try a different browser
- [ ] Check firewall and network settings
- [ ] Verify all dependencies are installed
- [ ] Check terminal for error messages
- [ ] Verify correct port configuration
- [ ] Try accessing via IP address instead of localhost
- [ ] Update to the latest version of the application
- [ ] Reinstall dependencies if needed

---

If you continue to experience issues with the web interface, please check the main [Troubleshooting Guide](./TROUBLESHOOTING.md) or report the issue on GitHub.