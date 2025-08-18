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
        
        console.log(chalk.blue('🌐 Web server initialized'));
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
    }
    
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            this.activeConnections++;
            console.log(chalk.green(`🔌 Client connected (${this.activeConnections} active connections)`));
            
            // Configure stream handler for this connection
            const handleStreamChunk = (chunk) => {
                socket.emit('stream-chunk', { chunk });
            };
            
            // Send initial session info
            socket.emit('session-info', this.mcpHandler.getSessionInfo());
            
            // Handle user message
            socket.on('user-message', async (data) => {
                const { message } = data;
                
                // Configure streaming for this request with custom handler for this socket
                const streamHandler = (chunk) => {
                    // Log chunk size for debugging
                    // console.log(`Sending chunk of ${chunk.length} chars`);
                    socket.emit('stream-chunk', { chunk });
                };
                
                // Set stream mode with our custom handler
                this.mcpHandler.setStreamMode(true, streamHandler);
                
                // Reset any previous stream state
                socket.emit('reset-stream', {});
                
                // Emit typing indicator
                socket.emit('assistant-typing', { typing: true });
                
                // Process the message
                try {
                    const startTime = Date.now();
                    const result = await this.mcpHandler.handleUserRequest(message);
                    const endTime = Date.now();
                    
                    // Ensure typing indicator is turned off
                    socket.emit('assistant-typing', { typing: false });
                    
                    // Send complete response
                    socket.emit('assistant-response', {
                        ...result,
                        processingTime: endTime - startTime
                    });
                    
                    // Log completion
                    console.log(`Response completed in ${endTime - startTime}ms`);
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    socket.emit('error', { 
                        message: 'Error processing your message', 
                        error: error.message 
                    });
                    socket.emit('assistant-typing', { typing: false });
                }
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
                console.log(chalk.green(`🚀 Web server running at http://localhost:${this.port}`));
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