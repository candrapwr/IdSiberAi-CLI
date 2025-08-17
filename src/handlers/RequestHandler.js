import chalk from 'chalk';

export class RequestHandler {
    constructor(toolCallHandler, conversationHandler, loggingHandler, aiManager, sessionId, maxIterations, streamMode, onStreamChunk) {
        this.toolCallHandler = toolCallHandler;
        this.conversationHandler = conversationHandler;
        this.loggingHandler = loggingHandler;
        this.aiManager = aiManager;
        this.sessionId = sessionId;
        this.maxIterations = maxIterations;
        this.streamMode = streamMode;
        this.onStreamChunk = onStreamChunk;
    }

    async handleUserRequest(userInput) {
        // Add user input to conversation history
        this.conversationHandler.addUserMessage(userInput);

        let iterations = 0;
        let finalResponse = '';
        const toolsUsed = [];
        const startTime = Date.now();

        try {
            while (iterations < this.maxIterations) {
                iterations++;
                console.log(chalk.gray('-'.repeat(50)));
                // Get AI response with streaming support using AIManager
                const aiResponse = await this.aiManager.chat(this.conversationHandler.getConversationHistory(), {
                    stream: this.streamMode,
                    metadata: {
                        userInput,
                        sessionId: this.sessionId,
                        iteration: iterations,
                        onChunk: this.onStreamChunk
                    }
                });
                console.log(``);
                if (!aiResponse.success) {
                    return {
                        success: false,
                        error: `AI API Error: ${aiResponse.error}`,
                        provider: aiResponse.provider
                    };
                }

                const responseContent = aiResponse.message || '';
                if (!responseContent) {
                    console.warn(chalk.yellow('⚠️ Warning: Empty response content from AI'));
                }
                
                const responseUsage = aiResponse.usage;
                
                if(responseUsage){
                    console.log(chalk.yellow(`\nin: ${responseUsage.prompt_tokens ?? responseUsage.input_tokens} | out: ${responseUsage.completion_tokens ?? responseUsage.output_tokens}`));
                    console.log(chalk.gray('-'.repeat(50)));
                }

                try {
                    // Find all tool calls in the response
                    const allToolCalls = this.toolCallHandler.extractAllToolCalls(responseContent);
                    
                    // If no tool calls are found, it's a final response
                    if (!allToolCalls || allToolCalls.length === 0) {
                        // Add AI response to history
                        this.conversationHandler.addAssistantMessage(responseContent, responseUsage);
                        
                        // AI is done, no more tools needed
                        finalResponse = responseContent;
                        break;
                    }
                    
                    // Process all tool calls
                    const { toolResults, toolsUsed: newToolsUsed, consolidatedResults } = 
                        await this.toolCallHandler.processToolCalls(allToolCalls);
                    
                    // Add used tools to the list
                    toolsUsed.push(...newToolsUsed);
                    
                    // Penting: Tambahkan respons AI ke history SEBELUM hasil tool
                    // untuk menjaga urutan yang benar user -> assistant -> user -> assistant
                    this.conversationHandler.addAssistantMessage(responseContent, responseUsage);
                    
                    // Kemudian tambahkan hasil tool sebagai 'user' message
                    this.conversationHandler.addToolResult(consolidatedResults);
                } catch (toolError) {
                    console.error(chalk.red(`❌ Error processing tool calls: ${toolError.message}`));
                    // If there's an error processing tools, treat this as a final response
                    this.conversationHandler.addAssistantMessage(responseContent, responseUsage);
                    finalResponse = responseContent;
                    break;
                }
            }

            if (iterations >= this.maxIterations) {
                return {
                    success: false,
                    error: 'Maximum iterations reached. The task might be too complex or require manual intervention.'
                };
            }

            const processingTime = Date.now() - startTime;
            
            // Log conversation
            await this.loggingHandler.logConversation(userInput, finalResponse, {
                sessionId: this.sessionId,
                iterations,
                toolsUsed,
                processingTime,
                aiProvider: this.aiManager.currentProvider
            });

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
            await this.loggingHandler.logError(error, {
                context: 'user_request_handling',
                userInput,
                sessionId: this.sessionId,
                iterations,
                aiProvider: this.aiManager.currentProvider
            });
            
            return {
                success: false,
                error: `Unexpected error: ${error.message}`,
                iterations,
                aiProvider: this.aiManager.currentProvider
            };
        }
    }

    async handleUserRequestWithFallback(userInput, options = {}) {
        // Add user input to conversation history
        this.conversationHandler.addUserMessage(userInput);

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
                const aiResponse = await this.aiManager.chatWithFallback(this.conversationHandler.getConversationHistory(), {
                    stream: this.streamMode,
                    switchOnSuccess: options.switchOnSuccess || false,
                    metadata: {
                        userInput,
                        sessionId: this.sessionId,
                        iteration: iterations,
                        onChunk: this.onStreamChunk
                    }
                });
                console.log(``);
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

                const responseContent = aiResponse.message || '';
                if (!responseContent) {
                    console.warn(chalk.yellow('⚠️ Warning: Empty response content from AI'));
                }
                
                try {
                    // Find all tool calls in the response
                    const allToolCalls = this.toolCallHandler.extractAllToolCalls(responseContent);
                    
                    // If no tool calls are found, it's a final response
                    if (!allToolCalls || allToolCalls.length === 0) {
                        // Add AI response to history
                        this.conversationHandler.addAssistantMessage(responseContent);
                        
                        // AI is done, no more tools needed
                        finalResponse = responseContent;
                        break;
                    }
                    
                    // Process all tool calls
                    const { toolResults, toolsUsed: newToolsUsed, consolidatedResults } = 
                        await this.toolCallHandler.processToolCalls(allToolCalls);
                    
                    // Add used tools to the list
                    toolsUsed.push(...newToolsUsed);
                    
                    // Add consolidated tool results to conversation
                    this.conversationHandler.addToolResult(consolidatedResults);
                    
                    // Add AI response to history for reference
                    this.conversationHandler.addAssistantMessage(responseContent);
                } catch (toolError) {
                    console.error(chalk.red(`❌ Error processing tool calls: ${toolError.message}`));
                    // If there's an error processing tools, treat this as a final response
                    this.conversationHandler.addAssistantMessage(responseContent);
                    finalResponse = responseContent;
                    break;
                }
            }

            if (iterations >= this.maxIterations) {
                return {
                    success: false,
                    error: 'Maximum iterations reached. The task might be too complex or require manual intervention.'
                };
            }

            const processingTime = Date.now() - startTime;
            
            // Log conversation
            await this.loggingHandler.logConversation(userInput, finalResponse, {
                sessionId: this.sessionId,
                iterations,
                toolsUsed,
                processingTime,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: originalProvider,
                fallbackUsed: usedFallback
            });

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
            await this.loggingHandler.logError(error, {
                context: 'user_request_handling_with_fallback',
                userInput,
                sessionId: this.sessionId,
                iterations,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: originalProvider
            });
            
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