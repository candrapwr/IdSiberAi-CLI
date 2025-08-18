import chalk from 'chalk';

export class ToolCallHandler {
    constructor(availableTools, logger, debug, sessionId, aiManager) {
        this.availableTools = availableTools;
        this.logger = logger;
        this.debug = debug;
        this.sessionId = sessionId;
        this.aiManager = aiManager;
        this.onToolExecution = null;
    }
    
    // Set the tool execution handler
    setToolExecutionHandler(handler) {
        console.log('Setting tool execution handler in ToolCallHandler:', handler ? 'Handler provided' : 'No handler');
        this.onToolExecution = handler;
    }

    // Extract all tool calls from the response
    extractAllToolCalls(response) {
        try {
            // Pastikan response adalah string
            if (!response || typeof response !== 'string') {
                console.error(chalk.red('❌ Invalid response format in extractAllToolCalls:'), typeof response);
                return [];
            }
            
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
                        // Ambil string parameter mentah
                        let rawParams = parametersMatch[1];
                        let cleanedParameters = rawParams;

                        const stringValuePattern = /"([^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"/gs;
                        cleanedParameters = rawParams.replace(stringValuePattern, (match, key, value) => {
                            // FIX: Jangan gunakan JSON.stringify yang akan double-escape
                            // Cukup escape quotes dan backslashes yang memang perlu di-escape
                            let cleanValue = value
                                .replace(/\\\\/g, '\\')     // Unescape double backslashes
                                .replace(/\\"/g, '"')       // Unescape quotes
                                .replace(/\\n/g, '\n')      // Convert literal \n to actual newlines
                                .replace(/\\t/g, '\t')      // Convert literal \t to actual tabs
                                .replace(/\\r/g, '\r');     // Convert literal \r to actual carriage returns
                            
                            // Sekarang escape untuk JSON yang proper
                            cleanValue = cleanValue
                                .replace(/\\/g, '\\\\')     // Escape backslashes
                                .replace(/"/g, '\\"')       // Escape quotes
                                .replace(/\n/g, '\\n')      // Escape newlines
                                .replace(/\t/g, '\\t')      // Escape tabs
                                .replace(/\r/g, '\\r');     // Escape carriage returns
                            
                            return `"${key}": "${cleanValue}"`;
                        });

                        // 2. Sebagai fallback, jalankan logika lama Anda untuk kasus spesifik di mana
                        // nilai dibungkus dengan backtick, bukan tanda kutip (bukan JSON valid).
                        const backtickValuePattern = /"([^"]+)"\s*:\s*`((?:\\`|[^`])*?)`(?=\s*[,}])/g;
                        cleanedParameters = cleanedParameters.replace(backtickValuePattern, (match, key, value) => {
                            // FIX: Sama seperti di atas, jangan double-escape
                            let cleanValue = value
                                .replace(/\\`/g, '`')       // Unescape backticks
                                .replace(/\\n/g, '\n')      // Convert literal \n to actual newlines
                                .replace(/\\t/g, '\t')      // Convert literal \t to actual tabs
                                .replace(/\\r/g, '\r');     // Convert literal \r to actual carriage returns
                            
                            // Escape untuk JSON
                            cleanValue = cleanValue
                                .replace(/\\/g, '\\\\')     // Escape backslashes
                                .replace(/"/g, '\\"')       // Escape quotes
                                .replace(/\n/g, '\\n')      // Escape newlines
                                .replace(/\t/g, '\\t')      // Escape tabs
                                .replace(/\r/g, '\\r');     // Escape carriage returns
                            
                            return `"${key}": "${cleanValue}"`;
                        });

                        // String `cleanedParameters` sekarang seharusnya sudah menjadi JSON yang valid
                        const parameters = JSON.parse(cleanedParameters);
                        
                        const toolCall = {
                            thinking: thinkingMatch ? thinkingMatch[1].trim() : '',
                            action: actionMatch[1],
                            parameters,
                            message: messageMatch ? messageMatch[1].trim() : ''
                        };
                        
                        toolCalls.push(toolCall);

                    } catch (jsonError) {
                        // Blok catch Anda sudah bagus, tidak perlu diubah.
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
                console.log(chalk.blue(`🎯 Found ${toolCalls.length} tool calls: ${toolCalls.map(tc => tc.action).join(', ')}`));
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

    // For backward compatibility with code that still uses parseToolCall
    parseToolCall(response) {
        // Pastikan response adalah string
        if (!response || typeof response !== 'string') {
            console.error(chalk.red('❌ Invalid response format in parseToolCall:'), typeof response);
            return null;
        }
        
        const toolCalls = this.extractAllToolCalls(response);
        return toolCalls.length > 0 ? toolCalls[0] : null;
    }

    async executeTool(toolCall) {
        const { action, parameters } = toolCall;
        const startTime = Date.now();
        
        console.log(chalk.blue(`🔧 Executing: ${action} with parameters: ${JSON.stringify(parameters)}`));
        
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
            
            console.log(chalk.blue(`✅ Tool executed successfully in ${Date.now() - startTime}ms`));
            
            // Call the tool execution handler if available
            if (this.onToolExecution) {
                try {
                    this.onToolExecution(action, normalizedResult);
                } catch (handlerError) {
                    console.error('Error in tool execution handler:', handlerError.message);
                }
            }
            
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

    // Process multiple tool calls and return consolidated results
    async processToolCalls(toolCalls) {
        const toolResults = [];
        const toolsUsed = [];

        for (const toolCall of toolCalls) {
            // Show AI's thinking and message to user
            if (toolCall.thinking) {
                console.log(`🤔 ${toolCall.thinking}`);
            }
            if (toolCall.message) {
                console.log(chalk.blue(`⚡ ${toolCall.message}`));
            }

            // Execute tool
            console.log(chalk.blue(`🔧 ${toolCall.action}`));
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
                console.log(chalk.blue(`✅ Done`));
                
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
        
        return { 
            toolResults, 
            toolsUsed,
            // Consolidate results for conversation
            consolidatedResults: toolResults.map(tr => 
                `Tool result for ${tr.toolCall.action}:\n${JSON.stringify(tr.result, null, 2)}`
            ).join('\n\n')
        };
    }
}