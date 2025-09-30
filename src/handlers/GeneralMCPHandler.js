import { GeneralTools } from '../GeneralTools.js';
import { AIManager } from '../AI/AIManager.js';
import { Logger } from '../Logger.js';
import { DebugHelper } from '../DebugHelper.js';
import { ConversationHandler } from './ConversationHandler.js';
import { ToolCallHandler } from './ToolCallHandler.js';
import { LoggingHandler } from './LoggingHandler.js';
import { RequestHandler } from './RequestHandler.js';
import { SessionManager } from './SessionManager.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import CancellationManager from './CancellationManager.js';

export class GeneralMCPHandler {
    constructor(apiKeys, workingDirectory, maxIterations = 15, options = {}) {
        this.sessionId = options.sessionId || crypto.randomUUID();
        this.aiManager = new AIManager(apiKeys, options.enableLogging !== false);
        this.tools = new GeneralTools(workingDirectory);
        this.logger = options.enableLogging !== false ? new Logger() : null;
        this.debug = new DebugHelper(options.debug || false);
        this.maxIterations = maxIterations;
        this.streamMode = options.streamMode || false;
        this.onStreamChunk = options.onStreamChunk || null;
        this.onToolExecution = options.onToolExecution || null;
        const sessionsDirectory = options.sessionsDirectory || process.env.SESSIONS_DIRECTORY || './sessions';
        this.sessionsDirectory = sessionsDirectory;
        this.sessionManager = new SessionManager({ sessionsDir: sessionsDirectory });

        // Context optimization settings
        this.enableContextOptimization = options.enableContextOptimization || 
                                        process.env.ENABLE_CONTEXT_OPTIMIZATION === 'true';
        this.optimizedActions = options.optimizedActions || 
                              (process.env.CONTEXT_OPTIMIZATION_ACTIONS ? 
                               process.env.CONTEXT_OPTIMIZATION_ACTIONS.split(',') : 
                               ['read_file']);

        const parseInteger = (value) => {
            if (value === undefined || value === null || value === '') return undefined;
            const parsed = parseInt(value, 10);
            return Number.isNaN(parsed) ? undefined : parsed;
        };

        const summaryEnabledEnv = process.env.ENABLE_CONTEXT_SUMMARY;
        if (typeof options.summaryEnabled === 'boolean') {
            this.enableContextSummaries = options.summaryEnabled;
        } else if (summaryEnabledEnv === 'false') {
            this.enableContextSummaries = false;
        } else {
            this.enableContextSummaries = true; // default on
        }

        this.contextSummaryThreshold = parseInteger(options.summaryThreshold ?? process.env.CONTEXT_SUMMARY_THRESHOLD);
        this.contextSummaryRetention = parseInteger(options.summaryRetention ?? process.env.CONTEXT_SUMMARY_RETENTION);
        this.contextSummaryRole = options.summaryRole || process.env.CONTEXT_SUMMARY_ROLE || 'assistant';
        this.contextSummaryPrefix = options.summaryPrefix || process.env.CONTEXT_SUMMARY_PREFIX || 'Context summary (auto-generated):';
        this.contextSummaryMaxLineLength = parseInteger(options.summaryMaxLineLength ?? process.env.CONTEXT_SUMMARY_MAX_LINE_LENGTH);
        
        // Set logger untuk AIManager
        if (this.logger) {
            this.aiManager.setLogger(this.logger);
        }
        
        // Initialize the tools
        this.initializeTools();
        
        // Initialize handlers
        this.conversationHandler = new ConversationHandler({
            enableContextOptimization: this.enableContextOptimization,
            optimizedActions: this.optimizedActions,
            debug: options.debug || false,
            summaryEnabled: this.enableContextSummaries,
            summaryThreshold: this.contextSummaryThreshold,
            summaryRetention: this.contextSummaryRetention,
            summaryRole: this.contextSummaryRole,
            summaryPrefix: this.contextSummaryPrefix,
            summaryMaxLineLength: this.contextSummaryMaxLineLength,
            debugLevel: options.debugLevel
        });
        
        this.toolCallHandler = new ToolCallHandler(this.availableTools, this.logger, this.debug, this.sessionId, this.aiManager);
        this.loggingHandler = new LoggingHandler(this.logger, this.aiManager);
        this.requestHandler = new RequestHandler(
            this.toolCallHandler, 
            this.conversationHandler, 
            this.loggingHandler, 
            this.aiManager, 
            this.sessionId, 
            this.maxIterations, 
            this.streamMode, 
            this.onStreamChunk,
            this.onToolExecution
        );

        this.syncSessionId();

        // Pastikan requestHandler menggunakan context optimization setting yang sama
        this.requestHandler.setContextOptimizationEnabled(this.enableContextOptimization);

        // Initialize the conversation with system prompt
        this.conversationHandler.initializeSystemPrompt(
            this.aiManager.getAvailableProviders(),
            this.aiManager.currentProvider
        );
        
        this.debug.log('Initializing GeneralMCPHandler', {
            sessionId: this.sessionId,
            workingDirectory,
            maxIterations,
            availableProviders: this.aiManager.getAvailableProviders(),
            currentProvider: this.aiManager.currentProvider,
            loggingEnabled: !!this.logger,
            contextOptimizationEnabled: this.enableContextOptimization,
            optimizedActions: this.optimizedActions
        });
    }

    initializeTools() {
        this.availableTools = {
            // File System Operations
            search_files: this.tools.searchFiles.bind(this.tools),
            read_file: this.tools.readFile.bind(this.tools),
            write_file: this.tools.writeFile.bind(this.tools),
            append_to_file: this.tools.appendToFile.bind(this.tools),
            delete_file: this.tools.deleteFile.bind(this.tools),
            copy_file: this.tools.copyFile.bind(this.tools),
            move_file: this.tools.moveFile.bind(this.tools),
            edit_file: this.tools.editFile.bind(this.tools),
            
            // Directory Operations
            list_directory: this.tools.listDirectory.bind(this.tools),
            create_directory: this.tools.createDirectory.bind(this.tools),
            delete_directory: this.tools.deleteDirectory.bind(this.tools),
            
            // Analysis Tools
            analyze_file_structure: this.tools.analyzeFileStructure.bind(this.tools),
            find_in_files: this.tools.findInFiles.bind(this.tools),
            replace_in_files: this.tools.replaceInFiles.bind(this.tools),
            
            // System Operations
            execute_command: this.tools.executeCommand.bind(this.tools),
            get_working_directory_info: this.tools.getWorkingDirectoryInfo.bind(this.tools),
            
            // S3 Cloud Storage Operations
            s3_upload: this.tools.s3Upload.bind(this.tools),
            s3_download: this.tools.s3Download.bind(this.tools),
            s3_delete: this.tools.s3Delete.bind(this.tools),
            s3_search: this.tools.s3Search.bind(this.tools),
            s3_set_acl: this.tools.s3SetAcl.bind(this.tools),
            s3_get_client_info: this.tools.s3GetClientInfo.bind(this.tools),
            
            // Database Operations
            execute_query: this.tools.executeQuery.bind(this.tools),
            
            // Internet Operations
            access_url: this.tools.accessUrl.bind(this.tools),
            internet_search: this.tools.internetSearch.bind(this.tools),

            // AI Management Operations
            switch_ai_provider: this.switchAIProvider.bind(this),
            list_ai_providers: this.listAIProviders.bind(this),
            get_ai_provider_info: this.getAIProviderInfo.bind(this),
            test_ai_providers: this.testAIProviders.bind(this),
            
            // Logging Operations
            get_api_usage: this.getAPIUsage.bind(this),
            get_recent_logs: this.getRecentLogs.bind(this),
            clear_old_logs: this.clearOldLogs.bind(this)
        };
    }

    setStreamMode(enabled, onChunk = null) {
        this.streamMode = enabled;
        this.onStreamChunk = onChunk;
        
        // Hanya buat ulang RequestHandler jika belum ada
        if (!this.requestHandler) {
            this.requestHandler = new RequestHandler(
                this.toolCallHandler, 
                this.conversationHandler, 
                this.loggingHandler, 
                this.aiManager, 
                this.sessionId, 
                this.maxIterations, 
                this.streamMode, 
                this.onStreamChunk,
                this.onToolExecution
            );
            // Pastikan setting context optimization sesuai
            this.requestHandler.setContextOptimizationEnabled(this.enableContextOptimization);
        } else {
            // Perbarui properti di RequestHandler yang sudah ada
            this.requestHandler.streamMode = this.streamMode;
            this.requestHandler.onStreamChunk = this.onStreamChunk;
        }
    }
    
    // Set the tool execution handler
    setToolExecutionHandler(onToolExecution) {
        this.onToolExecution = onToolExecution;
        
        // Update in tool call handler first
        this.toolCallHandler.setToolExecutionHandler(onToolExecution);
        
        // Log untuk debugging
        console.log(`Tool execution handler diatur untuk ${onToolExecution ? 'fungsi callback' : 'null'}`);
        
        // Hanya buat ulang RequestHandler jika belum ada atau properti lain berubah
        // Ini mencegah kehilangan referensi ke handler
        if (!this.requestHandler) {
            this.requestHandler = new RequestHandler(
                this.toolCallHandler, 
                this.conversationHandler, 
                this.loggingHandler, 
                this.aiManager, 
                this.sessionId, 
                this.maxIterations, 
                this.streamMode, 
                this.onStreamChunk,
                this.onToolExecution
            );
            // Pastikan setting context optimization sesuai
            this.requestHandler.setContextOptimizationEnabled(this.enableContextOptimization);
        } else {
            // Gunakan metode untuk mengatur handler daripada membuat objek baru
            this.requestHandler.setToolExecutionHandler(onToolExecution);
        }
    }
    
    // Context Optimization methods
    setContextOptimizationEnabled(enabled) {
        this.enableContextOptimization = enabled;
        
        // Update in conversation handler
        this.conversationHandler.setContextOptimizationEnabled(enabled);
        
        // Update in request handler
        if (this.requestHandler) {
            this.requestHandler.setContextOptimizationEnabled(enabled);
        }
        
        return this.enableContextOptimization;
    }
    
    getContextOptimizerStatus() {
        return this.conversationHandler.getContextOptimizerStatus();
    }
    
    setContextOptimizerDebug(enabled, level = 1) {
        return this.conversationHandler.setContextOptimizerDebug(enabled, level);
    }
    
    setOptimizedActions(actions) {
        this.optimizedActions = actions;
        return this.conversationHandler.setOptimizedActions(actions);
    }
    
    getOptimizedActions() {
        return this.conversationHandler.getOptimizedActions();
    }
    
    getContextOptimizationStats() {
        return this.conversationHandler.getContextOptimizationStats();
    }
    
    // Manually trigger context optimization
    optimizeContext() {
        return this.conversationHandler.optimizeContext();
    }

    // AI Management Methods
    async switchAIProvider(providerName) {
        try {
            const success = this.aiManager.setCurrentProvider(providerName);
            if (success) {
                // Update system prompt dengan provider baru
                this.conversationHandler.initializeSystemPrompt(
                    this.aiManager.getAvailableProviders(),
                    this.aiManager.currentProvider
                );
                return {
                    success: true,
                    message: `Switched to ${providerName} provider`,
                    currentProvider: providerName
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async listAIProviders() {
        const providers = this.aiManager.getAvailableProviders();
        const currentProvider = this.aiManager.currentProvider;
        
        return {
            success: true,
            providers: providers,
            currentProvider: currentProvider,
            count: providers.length
        };
    }

    async getAIProviderInfo() {
        const info = this.aiManager.getProvidersInfo();
        const allModels = this.aiManager.getAllAvailableModels();
        
        return {
            success: true,
            providersInfo: info,
            availableModels: allModels,
            currentProvider: this.aiManager.currentProvider
        };
    }

    async testAIProviders() {
        try {
            const results = await this.aiManager.testAllProviders();
            return {
                success: true,
                testResults: results,
                message: `Tested ${Object.keys(results).length} providers`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // User request handling methods - delegate to RequestHandler
    async handleUserRequest(userInput, options = {}) {
        // create or reuse AbortController via CancellationManager if jobId provided
        const jobId = options.jobId || `req-${Date.now()}`;
        const { signal } = CancellationManager.create(jobId, { sessionId: this.sessionId, userInput });
        try {
            const result = await this.requestHandler.handleUserRequest(userInput, { ...options, jobId, signal });
            await this.saveCurrentSession({
                aiProvider: this.aiManager.currentProvider,
                lastUserMessage: userInput,
                lastAssistantMessage: result?.response || null
            });
            return result;
        } catch (error) {
            await this.saveCurrentSession({
                aiProvider: this.aiManager.currentProvider,
                lastUserMessage: userInput
            }).catch(() => {});
            throw error;
        } finally {
            // job completes (success or error), remove controller to avoid leaks
            CancellationManager.cancel(jobId);
        }
    }

    // Expose stop API
    stopJob(jobId) {
        const stopped = CancellationManager.cancel(jobId);
        return { success: stopped, jobId, message: stopped ? 'Stopped' : 'No active job' };
    }

    // Logging methods - delegate to LoggingHandler
    async getAPIUsage() {
        return await this.loggingHandler.getAPIUsage();
    }

    async getRecentLogs(logType = 'conversation', lines = 50) {
        return await this.loggingHandler.getRecentLogs(logType, lines);
    }

    async clearOldLogs(days = 7) {
        return await this.loggingHandler.clearOldLogs(days);
    }

    // Conversation management methods
    clearHistory() {
        this.conversationHandler.clearHistory();
        void this.saveCurrentSession({
            aiProvider: this.aiManager.currentProvider,
            lastUserMessage: null,
            lastAssistantMessage: null
        });
    }

    getConversationHistory() {
        return this.conversationHandler.getNonSystemMessages();
    }

    // Tool management
    getToolsList() {
        return Object.keys(this.availableTools);
    }

    // Working directory management
    async changeWorkingDirectory(newDirectory) {
        try {
            // Validate directory exists
            const resolvedPath = path.resolve(newDirectory);
            
            try {
                const stats = await fs.stat(resolvedPath);
                if (!stats.isDirectory()) {
                    return {
                        success: false,
                        error: `Path is not a directory: ${resolvedPath}`
                    };
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return {
                        success: false,
                        error: `Directory does not exist: ${resolvedPath}`
                    };
                } else {
                    throw error;
                }
            }
            
            // Update working directory in tools
            this.tools.setWorkingDirectory(resolvedPath);
            
            return {
                success: true,
                message: `Working directory changed to: ${resolvedPath}`,
                directory: resolvedPath
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to change working directory: ${error.message}`
            };
        }
    }
    
    getWorkingDirectory() {
        return this.tools.getWorkingDirectory();
    }

    syncSessionId() {
        if (this.toolCallHandler && typeof this.toolCallHandler.setSessionId === 'function') {
            this.toolCallHandler.setSessionId(this.sessionId);
        }
        if (this.requestHandler && typeof this.requestHandler.setSessionId === 'function') {
            this.requestHandler.setSessionId(this.sessionId);
        }
    }

    async saveCurrentSession(metadata = {}) {
        if (!this.sessionManager) {
            return;
        }

        try {
            const conversation = this.conversationHandler.getConversationHistory();
            if (!conversation || conversation.length === 0) {
                return;
            }

            const lastUser = [...conversation].reverse().find(message => message.role === 'user');
            const lastAssistant = [...conversation].reverse().find(message => message.role === 'assistant');
            const lastUserContent = lastUser?.content ?? null;
            const lastAssistantContent = lastAssistant?.content ?? null;

            const enrichedMetadata = {
                aiProvider: metadata.aiProvider || this.aiManager.currentProvider,
                lastUserMessage: metadata.lastUserMessage ?? lastUserContent,
                lastAssistantMessage: metadata.lastAssistantMessage ?? lastAssistantContent,
                messageCount: conversation.length,
                ...metadata
            };

            await this.sessionManager.saveSession(this.sessionId, conversation, enrichedMetadata);
        } catch (error) {
            this.debug.error('Failed to save session', error);
        }
    }

    async listSessions() {
        if (!this.sessionManager) {
            return [];
        }
        return await this.sessionManager.listSessions();
    }

    async loadSession(sessionId, options = {}) {
        if (!this.sessionManager) {
            return { success: false, error: 'Session manager not available' };
        }

        try {
            const session = await this.sessionManager.loadSession(sessionId);
            if (!Array.isArray(session.conversation) || session.conversation.length === 0) {
                throw new Error('Session conversation is empty');
            }

            this.sessionId = session.sessionId || sessionId;
            this.conversationHandler.setConversationHistory(session.conversation);
            this.syncSessionId();

            if (options.restoreProvider !== false && session.aiProvider && session.aiProvider !== this.aiManager.currentProvider) {
                try {
                    const switched = this.aiManager.setCurrentProvider(session.aiProvider);
                    if (!switched) {
                        this.debug.log(`AI provider ${session.aiProvider} not switched; keeping ${this.aiManager.currentProvider}`);
                    }
                } catch (error) {
                    this.debug.error('Failed to restore AI provider from session', error);
                }
            }

            await this.saveCurrentSession({
                aiProvider: this.aiManager.currentProvider,
                title: session.title
            });

            return {
                success: true,
                sessionId: this.sessionId,
                title: session.title,
                messageCount: session.conversation.length,
                aiProvider: this.aiManager.currentProvider
            };
        } catch (error) {
            this.debug.error('Failed to load session', error);
            return { success: false, error: error.message };
        }
    }

    async deleteSession(sessionId) {
        if (!this.sessionManager) {
            return { success: false, error: 'Session manager not available' };
        }
        return await this.sessionManager.deleteSession(sessionId);
    }

    async startNewSession(options = {}) {
        CancellationManager.cancelAll();
        this.sessionId = crypto.randomUUID();
        this.syncSessionId();

        const conversation = this.conversationHandler.initializeSystemPrompt(
            this.aiManager.getAvailableProviders(),
            this.aiManager.currentProvider
        );

        await this.saveCurrentSession({
            aiProvider: this.aiManager.currentProvider,
            title: options.title
        });

        return {
            success: true,
            sessionId: this.sessionId,
            messageCount: conversation.length,
            aiProvider: this.aiManager.currentProvider
        };
    }

    // Session information
    getSessionInfo() {
        const aiInfo = this.aiManager.getProvidersInfo();
        const contextOptimizerStatus = this.conversationHandler.getContextOptimizerStatus();

        return {
            sessionId: this.sessionId,
            streamMode: this.streamMode,
            enableAIFallback: process.env.ENABLE_AI_FALLBACK === 'true',
            maxIterations: this.maxIterations,
            toolsCount: Object.keys(this.availableTools).length,
            conversationLength: this.conversationHandler.getMessageCount() - 1,
            loggingEnabled: !!this.logger,
            currentAIProvider: this.aiManager.currentProvider,
            availableAIProviders: this.aiManager.getAvailableProviders(),
            aiProvidersInfo: aiInfo,
            contextOptimization: contextOptimizerStatus,
            workingDirectory: this.tools.getWorkingDirectory(),
            sessionsDirectory: this.sessionsDirectory
        };
    }
}
