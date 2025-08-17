import chalk from 'chalk';

export class ToolCallHandler {
    constructor(availableTools, logger, debug, sessionId, aiManager) {
        this.availableTools = availableTools;
        this.logger = logger;
        this.debug = debug;
        this.sessionId = sessionId;
        this.aiManager = aiManager;
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
                        // Bersihkan parameter JSON
                        let cleanedParameters = parametersMatch[1];
                        
                        // 1. Cek apakah ada backtick sebagai pembatas nilai (bukan JSON valid)
                        const backtickValuePattern = /"([^"]+)"\s*:\s*`((?:\\`|[^`])*?)`(?=\s*[,}])/g;
                        let match;
                        while ((match = backtickValuePattern.exec(cleanedParameters)) !== null) {
                            const [fullMatch, key, value] = match;
                            // Escape newlines, tanda kutip, dll. dalam nilai backtick
                            const escapedValue = JSON.stringify(value);
                            // Ganti backtick dengan tanda kutip yang benar menggunakan posisi match untuk presisi
                            const start = match.index;
                            const end = start + fullMatch.length;
                            cleanedParameters = cleanedParameters.slice(0, start) + `"${key}": ${escapedValue}` + cleanedParameters.slice(end);
                            console.log(chalk.gray(`🧹 Cleaned backtick-quoted value for '${key}' in ${actionMatch[1]} parameters`));
                        }
                        
                        // 2. Ganti semua backtick yang tersisa dengan yang di-escape (jika ada di luar nilai)
                        cleanedParameters = cleanedParameters.replace(/`/g, '\\`');
                        
                        // 3. Perbaiki double escape yang mungkin terjadi
                        cleanedParameters = cleanedParameters.replace(/\\\\`/g, '\\`');
                        
                        const parameters = JSON.parse(cleanedParameters);
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