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

    // Helper method untuk membuat tool call error
    _createErrorToolCall(title, errorMessage, errorType, rawContent = '') {
        return {
            thinking: 'Error occurred during tool call extraction',
            action: 'parsing_error',
            parameters: {
                error_type: errorType,
                error_message: errorMessage,
                title: title,
                raw_content: rawContent
            }
        };
    }

    // Extract all tool calls from the response
    extractAllToolCalls(response) {
        try {
            // Pastikan response adalah string
            if (!response || typeof response !== 'string') {
                console.error(chalk.red('❌ Invalid response format in extractAllToolCalls:'), typeof response);
                // Buat tool call error khusus daripada return array kosong
                return [this._createErrorToolCall('Invalid response format', `Expected string but got ${typeof response}`, 'format_error')];
            }
            
            const toolCalls = [];

            // Preferred: parse single-line streaming-friendly TOOLCALL: { json }
            try {
                const lines = response.split(/\r?\n/);
                for (const line of lines) {
                    const m = line.match(/^\s*TOOLCALL:\s*(\{.*\})\s*$/);
                    if (m) {
                        try {
                            const obj = JSON.parse(m[1]);
                            if (obj && typeof obj === 'object' && typeof obj.action === 'string') {
                                toolCalls.push({
                                    thinking: obj.thinking || '',
                                    action: obj.action,
                                    parameters: obj.parameters || {}
                                });
                            }
                        } catch (jsonErr) {
                            toolCalls.push(this._createErrorToolCall(
                                'Malformed TOOLCALL JSON',
                                jsonErr.message,
                                'json_malformed',
                                line
                            ));
                        }
                    }
                }
            } catch (_) {
                // ignore and fallback
            }

            // Only new format supported; return TOOLCALL results (possibly empty)
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
            
            // Buat tool call error khusus daripada return array kosong
            return [this._createErrorToolCall(
                'Tool call extraction failed',
                `Error parsing tool calls: ${error.message}`,
                'extraction_error',
                response.substring(0, 500) // Kirim 500 karakter pertama dari respons untuk konteks
            )];
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
            let result = {};
            if(action == 'json_malformed'){
                result = {
                    success: false,
                    error: parameters.error
                };
            }else{
                result = {
                    success: false,
                    error: `Unknown tool: ${action}. Available tools: ${Object.keys(this.availableTools).join(', ')}`
                };
            }
            
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
