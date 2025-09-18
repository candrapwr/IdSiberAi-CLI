import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
    constructor(mcpHandler, port = 3000) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new SocketIOServer(this.server);
        this.port = port;
        this.mcpHandler = mcpHandler;
        
        // Track active connections
        this.activeConnections = 0;
        
        // Setup express
        this.setupExpress();
        
        // Setup socket.io
        this.setupSocketIO();
        
        console.log(chalk.blue('🌐 IdSiberAi Terminal web server initialized'));
    }
    
    setupExpress() {
        // Serve static files from public directory
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Main route serves the chat interface
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        // API route to get session info
        this.app.get('/api/session', (req, res) => {
            const sessionInfo = this.mcpHandler.getSessionInfo();
            res.json(sessionInfo);
        });
        
        // API route to get available tools
        this.app.get('/api/tools', (req, res) => {
            const tools = this.mcpHandler.getToolsList();
            res.json({ tools });
        });
        
        // API route to get conversation history
        this.app.get('/api/history', (req, res) => {
            const history = this.mcpHandler.getConversationHistory();
            res.json({ history });
        });
        
        // API route to clear conversation history
        this.app.post('/api/clear-history', (req, res) => {
            this.mcpHandler.clearHistory();
            res.json({ success: true, message: 'Conversation history cleared' });
        });

        // Session management routes
        this.app.get('/api/sessions', async (req, res) => {
            try {
                const sessions = await this.mcpHandler.listSessions();
                res.json({ success: true, sessions });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.app.post('/api/sessions/load', async (req, res) => {
            const { sessionId } = req.body || {};
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'sessionId is required' });
            }

            const result = await this.mcpHandler.loadSession(sessionId);
            res.status(result.success ? 200 : 400).json(result);
        });

        this.app.post('/api/sessions/new', async (req, res) => {
            const { title } = req.body || {};
            const result = await this.mcpHandler.startNewSession({ title });
            res.status(result.success ? 200 : 400).json(result);
        });

        this.app.delete('/api/sessions/:sessionId', async (req, res) => {
            const { sessionId } = req.params;
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'sessionId is required' });
            }

            const result = await this.mcpHandler.deleteSession(sessionId);
            res.status(result.success ? 200 : 400).json(result);
        });

        // API route to switch AI provider
        this.app.post('/api/switch-provider', async (req, res) => {
            const { provider } = req.body;
            if (!provider) {
                return res.status(400).json({ success: false, error: 'Provider name is required' });
            }
            
            const result = await this.mcpHandler.switchAIProvider(provider);
            res.json(result);
        });
        
        // API route to get API usage stats
        this.app.get('/api/stats', async (req, res) => {
            const apiUsage = await this.mcpHandler.getAPIUsage();
            res.json(apiUsage);
        });
        
        // API route to test all providers
        this.app.post('/api/test-providers', async (req, res) => {
            const result = await this.mcpHandler.testAIProviders();
            res.json(result);
        });
        
        // API route to get working directory
        this.app.get('/api/working-directory', (req, res) => {
            const directory = this.mcpHandler.getWorkingDirectory();
            res.json({ success: true, directory });
        });
        
        // API route to list directories
        this.app.get('/api/list-directories', async (req, res) => {
            try {
                // Get path parameter - either use the provided path or empty string for root
                const requestPath = req.query.path || '';
                
                // Call the list directory method with the raw path
                // The DirectoryTools class will handle joining with working directory
                const result = await this.mcpHandler.tools.listDirectory(requestPath,true);
                
                if (result.success) {
                    // Filter only directories
                    const directories = result.entries.filter(entry => entry.type === 'directory');
                    
                    // Return clean path information
                    res.json({
                        success: true,
                        path: result.path, // This will be the normalized path
                        absoluteWorkingDir: this.mcpHandler.getWorkingDirectory(),
                        requestPath: requestPath,
                        directories: directories,
                        count: directories.length
                    });
                } else {
                    console.log(`ERROR: ${result.error}`);
                    console.log('----------------------------------------');
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                console.error(`SERVER ERROR: ${error.message}`);
                console.log('----------------------------------------');
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // API route to change working directory
        this.app.post('/api/change-working-directory', async (req, res) => {
            const { directory } = req.body;
            if (!directory) {
                return res.status(400).json({ success: false, error: 'Directory path is required' });
            }
            
            const result = await this.mcpHandler.changeWorkingDirectory(directory);
            res.json(result);
        });
    }
    
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            this.activeConnections++;
            console.log(chalk.green(`🔌 Client connected (${this.activeConnections} active connections)`));

            const streamHandler = (chunk) => {
                socket.emit('stream-chunk', { chunk });
            };

            // Configure tool execution handler for this socket
            const toolExecutionHandler = (toolName, result) => {
                socket.emit('stream-chunk', {chunk: 'newMessageAssistant'});
                socket.emit('tool-execution', {
                    tool: toolName,
                    result: result
                });
            };
            
            // Send initial session info
            socket.emit('session-info', this.mcpHandler.getSessionInfo());
            
            // Handle user message
            socket.on('user-message', async (data) => {
                const { message } = data;
                
                // Set stream mode and tool execution handlers
                this.mcpHandler.setStreamMode(true, streamHandler);
                this.mcpHandler.setToolExecutionHandler(toolExecutionHandler);
                
                // Reset any previous stream state
                socket.emit('reset-stream', {});
                
                // Emit typing indicator
                socket.emit('assistant-typing', { typing: true });
                
                // Process the message
                try {
                    const startTime = Date.now();
                    const jobId = `web-${socket.id}-${Date.now()}`;
                    socket.currentJobId = jobId;
                    const result = await this.mcpHandler.handleUserRequest(message, { jobId });
                    const endTime = Date.now();
                    socket.currentJobId = null;
                    // Ensure typing indicator is turned off
                    socket.emit('assistant-typing', { typing: false });
                    
                    // Send complete response
                    socket.emit('assistant-response', {
                        ...result,
                        processingTime: endTime - startTime
                    });
                    
                    // Log completion
                    console.log(`IdSiberAi response completed in ${endTime - startTime}ms`);
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    socket.emit('error', { 
                        message: 'Error processing your message', 
                        error: error.message 
                    });
                    socket.emit('assistant-typing', { typing: false });
                }
            });

            // Handle stop request
            socket.on('stop', () => {
                const jobId = socket.currentJobId;
                if (!jobId) {
                    socket.emit('stopped', { success: false, message: 'No active job' });
                    return;
                }
                const res = this.mcpHandler.stopJob(jobId);
                socket.emit('stopped', res);
                // Also turn off typing indicator for UX
                socket.emit('assistant-typing', { typing: false });
            });
            
            // Handle command execution
            socket.on('execute-command', async (data) => {
                const { command } = data;
                
                try {
                    let result;
                    
                    switch (command) {
                        case 'clear-history':
                            this.mcpHandler.clearHistory();
                            result = { success: true, message: 'Conversation history cleared' };
                            break;
                            
                        case 'get-history':
                            const history = this.mcpHandler.getConversationHistory();
                            result = { success: true, history };
                            break;
                            
                        case 'get-tools':
                            const tools = this.mcpHandler.getToolsList();
                            result = { success: true, tools };
                            break;
                            
                        case 'get-stats':
                        result = await this.mcpHandler.getAPIUsage();
                        break;
                        
                    case 'get-working-directory':
                        const directory = this.mcpHandler.getWorkingDirectory();
                        result = { success: true, directory };
                    break;

                        case 'get-session-info':
                            result = { success: true, ...this.mcpHandler.getSessionInfo() };
                        break;

                    default:
                        result = { 
                            success: false, 
                            error: `Unknown command: ${command}` 
                        };
                    }
                    
                    socket.emit('command-result', {
                        command,
                        result
                    });
                    
                } catch (error) {
                    socket.emit('command-result', {
                        command,
                        result: { 
                            success: false, 
                            error: error.message 
                        }
                    });
                }
            });
            
            // Handle provider switch
            socket.on('switch-provider', async (data) => {
                const { provider } = data;
                
                try {
                    const result = await this.mcpHandler.switchAIProvider(provider);
                    socket.emit('provider-switched', result);
                    
                    // Send updated session info
                    socket.emit('session-info', this.mcpHandler.getSessionInfo());
                } catch (error) {
                    socket.emit('provider-switched', {
                        success: false,
                        error: error.message
                    });
                }
            });
            
            // Handle working directory change
            socket.on('change-working-directory', async (data) => {
                const { directory } = data;
                
                try {
                    const result = await this.mcpHandler.changeWorkingDirectory(directory);
                    socket.emit('working-directory-changed', result);
                    
                    // Send updated session info
                    socket.emit('session-info', this.mcpHandler.getSessionInfo());
                } catch (error) {
                    socket.emit('working-directory-changed', {
                        success: false,
                        error: error.message
                    });
                }
            });
            
            // Handle disconnect
            socket.on('disconnect', () => {
                this.activeConnections--;
                console.log(chalk.yellow(`🔌 Client disconnected (${this.activeConnections} active connections)`));
            });
        });
    }
    
    start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(chalk.green(`🚀 IdSiberAi Terminal web interface running at http://localhost:${this.port}`));
                resolve();
            });
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log(chalk.yellow('🛑 Web server stopped'));
                resolve();
            });
        });
    }
}
