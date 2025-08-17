import { GeneralTools } from '../GeneralTools.js';
import { AIManager } from '../AI/AIManager.js';
import { Logger } from '../Logger.js';
import { DebugHelper } from '../DebugHelper.js';
import { ConversationHandler } from './ConversationHandler.js';
import { ToolCallHandler } from './ToolCallHandler.js';
import { LoggingHandler } from './LoggingHandler.js';
import { RequestHandler } from './RequestHandler.js';
import crypto from 'crypto';
import chalk from 'chalk';

export class GeneralMCPHandler {
    constructor(apiKeys, workingDirectory, maxIterations = 15, options = {}) {
        this.sessionId = crypto.randomUUID();
        this.aiManager = new AIManager(apiKeys, options.enableLogging !== false);
        this.tools = new GeneralTools(workingDirectory);
        this.logger = options.enableLogging !== false ? new Logger() : null;
        this.debug = new DebugHelper(options.debug || false);
        this.maxIterations = maxIterations;
        this.streamMode = options.streamMode || false;
        this.onStreamChunk = options.onStreamChunk || null;
        
        // Set logger untuk AIManager
        if (this.logger) {
            this.aiManager.setLogger(this.logger);
        }
        
        // Initialize the tools
        this.initializeTools();
        
        // Initialize handlers
        this.conversationHandler = new ConversationHandler();
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
            this.onStreamChunk
        );
        
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
            loggingEnabled: !!this.logger
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
        // Update in request handler
        this.requestHandler = new RequestHandler(
            this.toolCallHandler, 
            this.conversationHandler, 
            this.loggingHandler, 
            this.aiManager, 
            this.sessionId, 
            this.maxIterations, 
            this.streamMode, 
            this.onStreamChunk
        );
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
    async handleUserRequest(userInput) {
        return await this.requestHandler.handleUserRequest(userInput);
    }

    async handleUserRequestWithFallback(userInput, options = {}) {
        return await this.requestHandler.handleUserRequestWithFallback(userInput, options);
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
    }

    getConversationHistory() {
        return this.conversationHandler.getNonSystemMessages();
    }

    // Tool management
    getToolsList() {
        return Object.keys(this.availableTools);
    }

    // Session information
    getSessionInfo() {
        const aiInfo = this.aiManager.getProvidersInfo();
        
        return {
            sessionId: this.sessionId,
            streamMode: this.streamMode,
            maxIterations: this.maxIterations,
            toolsCount: Object.keys(this.availableTools).length,
            conversationLength: this.conversationHandler.getMessageCount() - 1,
            loggingEnabled: !!this.logger,
            currentAIProvider: this.aiManager.currentProvider,
            availableAIProviders: this.aiManager.getAvailableProviders(),
            aiProvidersInfo: aiInfo
        };
    }
}