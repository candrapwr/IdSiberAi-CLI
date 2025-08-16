import { GeneralTools } from './GeneralTools.js';
import { AIManager } from './AI/AIManager.js';
import { Logger } from './Logger.js';
import { DebugHelper } from './DebugHelper.js';
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
        this.conversationHistory = [];
        this.streamMode = options.streamMode || false;
        this.onStreamChunk = options.onStreamChunk || null;
        
        this.debug.log('Initializing GeneralMCPHandler', {
            sessionId: this.sessionId,
            workingDirectory,
            maxIterations,
            availableProviders: this.aiManager.getAvailableProviders(),
            currentProvider: this.aiManager.currentProvider,
            loggingEnabled: !!this.logger
        });
        
        // Set logger untuk AIManager
        if (this.logger) {
            this.aiManager.setLogger(this.logger);
        }
        
        this.availableTools = {
            // File System Operations
            search_files: this.tools.searchFiles.bind(this.tools),
            read_file: this.tools.readFile.bind(this.tools),
            write_file: this.tools.writeFile.bind(this.tools),
            append_to_file: this.tools.appendToFile.bind(this.tools),
            delete_file: this.tools.deleteFile.bind(this.tools),
            copy_file: this.tools.copyFile.bind(this.tools),
            move_file: this.tools.moveFile.bind(this.tools),
            
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
        this.initializeSystemPrompt();
    }

    initializeSystemPrompt() {
        const availableProviders = this.aiManager.getAvailableProviders();
        const currentProvider = this.aiManager.currentProvider;
        
        const systemPrompt = `You are a concise, action-oriented AI assistant with file system tools access.

# When you need a tool, respond with this EXACT format:
THINKING: [brief analysis]
ACTION: [tool_name]
PARAMETERS: [JSON format]
MESSAGE: [brief action description]

# If you don't need a tool, please respond without special format!

# IMPORTANT: For multiple operations, you can now include MULTIPLE tool calls in one response
# Format for multiple tool calls:
THINKING: [first analysis]
ACTION: [first_tool_name]
PARAMETERS: [JSON format]
MESSAGE: [first action description]

THINKING: [second analysis]
ACTION: [second_tool_name]
PARAMETERS: [JSON format]
MESSAGE: [second action description]

## Available tools

# FILE OPERATIONS TOOLS
- search_files(pattern, directory): Find files
- read_file(file_path): Read file content
- write_file(file_path, content): Create/update file
- append_to_file(file_path, content): Append to file
- delete_file(file_path): Delete file
- copy_file(source_path, destination_path): Copy file
- move_file(source_path, destination_path): Move/rename file

# DIRECTORY OPERATIONS TOOLS
- list_directory(dir_path): List directory contents
- create_directory(dir_path): Create directory
- delete_directory(dir_path): Delete directory

# ANALYSIS TOOLS
- analyze_file_structure(file_path): Analyze code structure
- find_in_files(search_term, directory, file_pattern): Search in files
- replace_in_files(search_term, replace_term, directory, file_pattern): Replace in files

# SYSTEM OPERATIONS TOOLS
- execute_command(command, options): Execute commands

# Response rules
- You can use MULTIPLE tools in a single response
- Use proper tool call format for each action
- Be direct and concise
- For multi-step operations that depend on previous results, submit them one at a time
- For independent operations, include them all in one response

## Example with multiple tool calls (CORRECT):
THINKING: Need to create a directory first
ACTION: create_directory
PARAMETERS: {"dir_path": "project/src"}
MESSAGE: Creating source directory...

THINKING: Need to create a file in the directory
ACTION: write_file
PARAMETERS: {"file_path": "project/src/index.js", "content": "console.log('Hello World!');"}
MESSAGE: Creating index.js file...

## Example without tools (CORRECT):
Please, what can I help you with....

## Task: Execute user requests efficiently`;

        this.conversationHistory = [
            { role: 'system', content: systemPrompt }
        ];
    }

    setStreamMode(enabled, onChunk = null) {
        this.streamMode = enabled;
        this.onStreamChunk = onChunk;
    }

    // New AI Management Methods
    async switchAIProvider(providerName) {
        try {
            const success = this.aiManager.setCurrentProvider(providerName);
            if (success) {
                // Update system prompt dengan provider baru
                this.initializeSystemPrompt();
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

    // Extract all tool calls from the response
    extractAllToolCalls(response) {
        try {
            const toolCalls = [];
            
            // Find all ACTION blocks in the response
            const actionBlocks = response.split(/(?=THINKING:|ACTION:)/);
            
            for (const block of actionBlocks) {
                const actionMatch = block.match(/ACTION:\s*(\w+)/);
                if (!actionMatch) continue;
                
                const parametersMatch = block.match(/PARAMETERS:\s*({.*?})(?=\n(?:THINKING|ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                const messageMatch = block.match(/MESSAGE:\s*(.*?)(?=\n(?:THINKING|ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                const thinkingMatch = block.match(/THINKING:\s*(.*?)(?=\n(?:ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                
                if (actionMatch && parametersMatch) {
                    try {
                        const parameters = JSON.parse(parametersMatch[1]);
                        const toolCall = {
                            thinking: thinkingMatch ? thinkingMatch[1].trim() : '',
                            action: actionMatch[1],
                            parameters,
                            message: messageMatch ? messageMatch[1].trim() : ''
                        };
                        
                        toolCalls.push(toolCall);
                    } catch (jsonError) {
                        console.error(chalk.red(`❌ Error parsing parameters JSON for ${actionMatch[1]}:`), jsonError.message);
                        console.error(chalk.red('Raw parameters:'), parametersMatch[1]);
                        
                        // Log parsing error
                        if (this.logger) {
                            this.logger.logError(jsonError, {
                                context: 'tool_call_parsing',
                                rawResponse: block,
                                rawParameters: parametersMatch[1],
                                sessionId: this.sessionId
                            }).catch(logError => {
                                console.error(chalk.red('❌ Failed to log parsing error:'), logError.message);
                            });
                        }
                    }
                }
            }
            
            if (toolCalls.length > 0) {
                console.log(chalk.gray(`🎯 Found ${toolCalls.length} tool calls: ${toolCalls.map(tc => tc.action).join(', ')}`));
            }
            
            return toolCalls;
        } catch (error) {
            console.error(chalk.red('❌ Error in extractAllToolCalls:'), error.message);
            
            // Log general parsing error
            if (this.logger) {
                this.logger.logError(error, {
                    context: 'extract_all_tool_calls',
                    rawResponse: response,
                    sessionId: this.sessionId
                }).catch(logError => {
                    console.error(chalk.red('❌ Failed to log parsing error:'), logError.message);
                });
            }
            
            return [];
        }
    }

    parseToolCall(response) {
        try {
            // Detect all tool calls in the response
            const toolCalls = [];
            
            // Find all ACTION blocks in the response
            const actionBlocks = response.split(/(?=THINKING:|ACTION:)/);
            
            for (const block of actionBlocks) {
                const actionMatch = block.match(/ACTION:\s*(\w+)/);
                if (!actionMatch) continue;
                
                const parametersMatch = block.match(/PARAMETERS:\s*({.*?})(?=\n(?:THINKING|ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                const messageMatch = block.match(/MESSAGE:\s*(.*?)(?=\n(?:THINKING|ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                const thinkingMatch = block.match(/THINKING:\s*(.*?)(?=\n(?:ACTION|PARAMETERS|MESSAGE|$)|$)/s);
                
                if (actionMatch && parametersMatch) {
                    try {
                        const parameters = JSON.parse(parametersMatch[1]);
                        const toolCall = {
                            thinking: thinkingMatch ? thinkingMatch[1].trim() : '',
                            action: actionMatch[1],
                            parameters,
                            message: messageMatch ? messageMatch[1].trim() : ''
                        };
                        
                        toolCalls.push(toolCall);
                        console.log(chalk.gray(`🎯 Parsed tool call: ${toolCall.action}`));
                    } catch (jsonError) {
                        console.error(chalk.red('❌ Error parsing parameters JSON:'), jsonError.message);
                        console.error(chalk.red('Raw parameters:'), parametersMatch[1]);
                        
                        // Log parsing error
                        if (this.logger) {
                            this.logger.logError(jsonError, {
                                context: 'tool_call_parsing',
                                rawResponse: block,
                                rawParameters: parametersMatch[1],
                                sessionId: this.sessionId
                            }).catch(logError => {
                                console.error(chalk.red('❌ Failed to log parsing error:'), logError.message);
                            });
                        }
                    }
                }
            }
            
            // If we found any tool calls, return the first one (backward compatibility)
            // The remaining tool calls will be processed in handleUserRequest
            if (toolCalls.length > 0) {
                return toolCalls[0];
            }
            
            // No tool calls found - this is normal for final responses
            return null;
        } catch (error) {
            console.error(chalk.red('❌ Error in parseToolCall:'), error.message);
            
            // Log general parsing error
            if (this.logger) {
                this.logger.logError(error, {
                    context: 'tool_call_parsing_general',
                    rawResponse: response,
                    sessionId: this.sessionId
                }).catch(logError => {
                    console.error(chalk.red('❌ Failed to log parsing error:'), logError.message);
                });
            }
            
            return null;
        }
    }

    async executeTool(toolCall) {
        const { action, parameters } = toolCall;
        const startTime = Date.now();
        
        console.log(chalk.gray(`🔧 Executing: ${action} with parameters: ${JSON.stringify(parameters)}`));
        
        if (!this.availableTools[action]) {
            const result = {
                success: false,
                error: `Unknown tool: ${action}. Available tools: ${Object.keys(this.availableTools).join(', ')}`
            };
            
            // Log the error
            if (this.logger) {
                try {
                    await this.logger.logToolExecution(action, parameters, result, {
                        duration: Date.now() - startTime,
                        sessionId: this.sessionId,
                        currentAIProvider: this.aiManager.currentProvider
                    });
                } catch (logError) {
                    console.error(chalk.red('❌ Failed to log tool execution:'), logError.message);
                }
            }
            
            return result;
        }

        try {
            // Execute the tool
            this.debug.log(`Executing tool ${action}`, { parameters });
            const result = await this.availableTools[action](...Object.values(parameters));
            
            // Ensure result has proper structure
            const normalizedResult = {
                success: result && result.success !== false,
                ...result
            };
            
            this.debug.toolExecution(action, parameters, normalizedResult);
            
            // Log successful execution
            if (this.logger) {
                try {
                    await this.logger.logToolExecution(action, parameters, normalizedResult, {
                        duration: Date.now() - startTime,
                        sessionId: this.sessionId,
                        currentAIProvider: this.aiManager.currentProvider
                    });
                } catch (logError) {
                    console.error(chalk.red('❌ Failed to log tool execution:'), logError.message);
                    this.debug.error('Logging failed', logError);
                }
            }
            
            console.log(chalk.gray(`✅ Tool executed successfully in ${Date.now() - startTime}ms`));
            return normalizedResult;
            
        } catch (error) {
            console.error(chalk.red(`❌ Tool execution error: ${error.message}`));
            console.error(chalk.red(`❌ Stack: ${error.stack}`));
            
            const result = {
                success: false,
                error: error.message,
                stack: error.stack
            };
            
            // Log the error
            if (this.logger) {
                try {
                    await this.logger.logToolExecution(action, parameters, result, {
                        duration: Date.now() - startTime,
                        sessionId: this.sessionId,
                        currentAIProvider: this.aiManager.currentProvider
                    });
                    
                    await this.logger.logError(error, { 
                        context: 'tool_execution', 
                        tool: action, 
                        parameters,
                        sessionId: this.sessionId,
                        currentAIProvider: this.aiManager.currentProvider
                    });
                } catch (logError) {
                    console.error(chalk.red('❌ Failed to log error:'), logError.message);
                }
            }
            
            return result;
        }
    }

    async handleUserRequest(userInput) {
        // Add user input to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: userInput
        });

        let iterations = 0;
        let finalResponse = '';
        const toolsUsed = [];
        const startTime = Date.now();

        try {
            while (iterations < this.maxIterations) {
                iterations++;
                
                // Get AI response with streaming support using AIManager
                const aiResponse = await this.aiManager.chat(this.conversationHistory, {
                    stream: this.streamMode,
                    metadata: {
                        userInput,
                        sessionId: this.sessionId,
                        iteration: iterations,
                        onChunk: this.onStreamChunk
                    }
                });
                if (!aiResponse.success) {
                    return {
                        success: false,
                        error: `AI API Error: ${aiResponse.error}`,
                        provider: aiResponse.provider
                    };
                }

                const responseContent = aiResponse.message;
                const responseUsage = aiResponse.usage;
                
                if(responseUsage){
                    console.log(chalk.yellow(`\nin: ${responseUsage.prompt_tokens} | out: ${responseUsage.completion_tokens}`));
                    console.log(chalk.gray('-'.repeat(50)));
                }

                // Find all tool calls in the response
                const allToolCalls = this.extractAllToolCalls(responseContent);
                
                // If no tool calls are found, it's a final response
                if (allToolCalls.length === 0) {
                    // Add AI response to history
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: responseContent,
                        usage: responseUsage
                    });
                    
                    // AI is done, no more tools needed
                    finalResponse = responseContent;
                    break;
                }
                
                // Process all tool calls
                const toolResults = [];
                for (const toolCall of allToolCalls) {
                    // Show AI's thinking and message to user
                    if (toolCall.thinking) {
                        console.log(`🤔 ${toolCall.thinking}`);
                    }
                    if (toolCall.message) {
                        console.log(`⚡ ${toolCall.message}`);
                    }

                    // Execute tool
                    console.log(`🔧 ${toolCall.action}`);
                    const toolResult = await this.executeTool(toolCall);
                    toolsUsed.push({
                        name: toolCall.action,
                        success: toolResult.success
                    });
                    
                    toolResults.push({
                        toolCall,
                        result: toolResult
                    });

                    // Show tool result summary
                    if (toolResult.success) {
                        console.log(`✅ Done`);
                        
                        // Show relevant result info concisely
                        if (toolResult.files && Array.isArray(toolResult.files)) {
                            console.log(`   ${toolResult.files.length} files`);
                        }
                        if (toolResult.message && toolResult.message.length < 50) {
                            console.log(`   ${toolResult.message}`);
                        }
                    } else {
                        console.log(`❌ ${toolResult.error}`);
                    }
                }
                
                // Add consolidated tool results to conversation
                const consolidatedResults = toolResults.map(tr => 
                    `Tool result for ${tr.toolCall.action}:\n${JSON.stringify(tr.result, null, 2)}`
                ).join('\n\n');
                
                this.conversationHistory.push({
                    role: 'user',
                    content: consolidatedResults
                });
                
                // Add AI response to history for reference
                // We add it after the tool results to maintain proper conversation flow
                this.conversationHistory.push({
                    role: 'assistant',
                    content: responseContent,
                    usage: responseUsage
                });
            }

            if (iterations >= this.maxIterations) {
                return {
                    success: false,
                    error: 'Maximum iterations reached. The task might be too complex or require manual intervention.'
                };
            }

            const processingTime = Date.now() - startTime;
            
            // Log conversation
            if (this.logger) {
                await this.logger.logConversation(userInput, finalResponse, {
                    sessionId: this.sessionId,
                    iterations,
                    toolsUsed,
                    processingTime,
                    aiProvider: this.aiManager.currentProvider
                });
            }

            return {
                success: true,
                response: finalResponse,
                iterations,
                toolsUsed,
                processingTime,
                sessionId: this.sessionId,
                aiProvider: this.aiManager.currentProvider
            };

        } catch (error) {
            if (this.logger) {
                await this.logger.logError(error, {
                    context: 'user_request_handling',
                    userInput,
                    sessionId: this.sessionId,
                    iterations,
                    aiProvider: this.aiManager.currentProvider
                });
            }
            
            return {
                success: false,
                error: `Unexpected error: ${error.message}`,
                iterations,
                aiProvider: this.aiManager.currentProvider
            };
        }
    }

    async getAPIUsage() {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            return await this.aiManager.getUsageStats();
        } catch (error) {
            return { error: error.message };
        }
    }

    async getRecentLogs(logType = 'conversation', lines = 50) {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            const files = await this.logger.getLogFiles();
            const logFiles = files.filter(file => file.startsWith(logType));
            
            if (logFiles.length === 0) {
                return { logs: [], message: `No ${logType} logs found` };
            }
            
            // Get the most recent log file
            const latestFile = logFiles.sort().pop();
            const logs = await this.logger.readLogFile(latestFile, lines);
            
            return {
                success: true,
                logs,
                file: latestFile,
                count: logs.length
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async clearOldLogs(days = 7) {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            await this.logger.clearOldLogs(days);
            return { success: true, message: `Cleared logs older than ${days} days` };
        } catch (error) {
            return { error: error.message };
        }
    }

    clearHistory() {
        this.initializeSystemPrompt();
    }

    getToolsList() {
        return Object.keys(this.availableTools);
    }

    getConversationHistory() {
        return this.conversationHistory.filter(msg => msg.role !== 'system');
    }

    getSessionInfo() {
        const aiInfo = this.aiManager.getProvidersInfo();
        
        return {
            sessionId: this.sessionId,
            streamMode: this.streamMode,
            maxIterations: this.maxIterations,
            toolsCount: Object.keys(this.availableTools).length,
            conversationLength: this.conversationHistory.length - 1,
            loggingEnabled: !!this.logger,
            currentAIProvider: this.aiManager.currentProvider,
            availableAIProviders: this.aiManager.getAvailableProviders(),
            aiProvidersInfo: aiInfo
        };
    }

    // Method untuk chat dengan fallback automatic
    async handleUserRequestWithFallback(userInput, options = {}) {
        // Add user input to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: userInput
        });

        let iterations = 0;
        let finalResponse = '';
        const toolsUsed = [];
        const startTime = Date.now();
        let usedFallback = false;
        let originalProvider = this.aiManager.currentProvider;

        try {
            while (iterations < this.maxIterations) {
                iterations++;
                
                // Get AI response with fallback support
                const aiResponse = await this.aiManager.chatWithFallback(this.conversationHistory, {
                    stream: this.streamMode,
                    switchOnSuccess: options.switchOnSuccess || false,
                    metadata: {
                        userInput,
                        sessionId: this.sessionId,
                        iteration: iterations,
                        onChunk: this.onStreamChunk
                    }
                });
                
                if (!aiResponse.success) {
                    return {
                        success: false,
                        error: `All AI providers failed: ${aiResponse.error}`,
                        providerErrors: aiResponse.providerErrors
                    };
                }

                if (aiResponse.fallbackUsed) {
                    usedFallback = true;
                    console.log(chalk.yellow(`⚠️  Fallback used: switched from ${originalProvider} to ${aiResponse.provider}`));
                }

                const responseContent = aiResponse.message;
                
                // Find all tool calls in the response
                const allToolCalls = this.extractAllToolCalls(responseContent);
                
                // If no tool calls are found, it's a final response
                if (allToolCalls.length === 0) {
                    // Add AI response to history
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: responseContent
                    });
                    
                    // AI is done, no more tools needed
                    finalResponse = responseContent;
                    break;
                }
                
                // Process all tool calls
                const toolResults = [];
                for (const toolCall of allToolCalls) {
                    // Show AI's thinking and message to user
                    if (toolCall.thinking) {
                        console.log(`🤔 ${toolCall.thinking}`);
                    }
                    if (toolCall.message) {
                        console.log(`⚡ ${toolCall.message}`);
                    }

                    // Execute tool
                    console.log(`🔧 ${toolCall.action}`);
                    const toolResult = await this.executeTool(toolCall);
                    toolsUsed.push({
                        name: toolCall.action,
                        success: toolResult.success
                    });
                    
                    toolResults.push({
                        toolCall,
                        result: toolResult
                    });

                    // Show tool result summary
                    if (toolResult.success) {
                        console.log(`✅ Done`);
                        
                        // Show relevant result info concisely
                        if (toolResult.files && Array.isArray(toolResult.files)) {
                            console.log(`   ${toolResult.files.length} files`);
                        }
                        if (toolResult.message && toolResult.message.length < 50) {
                            console.log(`   ${toolResult.message}`);
                        }
                    } else {
                        console.log(`❌ ${toolResult.error}`);
                    }
                }
                
                // Add consolidated tool results to conversation
                const consolidatedResults = toolResults.map(tr => 
                    `Tool result for ${tr.toolCall.action}:\n${JSON.stringify(tr.result, null, 2)}`
                ).join('\n\n');
                
                this.conversationHistory.push({
                    role: 'user',
                    content: consolidatedResults
                });
                
                // Add AI response to history for reference
                this.conversationHistory.push({
                    role: 'assistant',
                    content: responseContent
                });
            }

            if (iterations >= this.maxIterations) {
                return {
                    success: false,
                    error: 'Maximum iterations reached. The task might be too complex or require manual intervention.'
                };
            }

            const processingTime = Date.now() - startTime;
            
            // Log conversation
            if (this.logger) {
                await this.logger.logConversation(userInput, finalResponse, {
                    sessionId: this.sessionId,
                    iterations,
                    toolsUsed,
                    processingTime,
                    aiProvider: this.aiManager.currentProvider,
                    originalProvider: originalProvider,
                    fallbackUsed: usedFallback
                });
            }

            return {
                success: true,
                response: finalResponse,
                iterations,
                toolsUsed,
                processingTime,
                sessionId: this.sessionId,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: originalProvider,
                fallbackUsed: usedFallback
            };

        } catch (error) {
            if (this.logger) {
                await this.logger.logError(error, {
                    context: 'user_request_handling_with_fallback',
                    userInput,
                    sessionId: this.sessionId,
                    iterations,
                    aiProvider: this.aiManager.currentProvider,
                    originalProvider: originalProvider
                });
            }
            
            return {
                success: false,
                error: `Unexpected error: ${error.message}`,
                iterations,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: originalProvider
            };
        }
    }
}