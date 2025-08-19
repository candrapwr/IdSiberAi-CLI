import chalk from 'chalk';

export class RequestHandler {
    constructor(toolCallHandler, conversationHandler, loggingHandler, aiManager, sessionId, maxIterations, streamMode, onStreamChunk, onToolExecution) {
        this.toolCallHandler = toolCallHandler;
        this.conversationHandler = conversationHandler;
        this.loggingHandler = loggingHandler;
        this.aiManager = aiManager;
        this.sessionId = sessionId;
        this.maxIterations = maxIterations;
        this.streamMode = streamMode;
        this.onStreamChunk = onStreamChunk;
        
        // Default settings for context optimization
        this.enableContextOptimization = process.env.ENABLE_CONTEXT_OPTIMIZATION === 'true';
        
        // If onToolExecution is provided, set it on the toolCallHandler
        if (onToolExecution) {
            this.toolCallHandler.setToolExecutionHandler(onToolExecution);
        }
    }
    
    // Metode tambahan untuk mengatur tool execution handler
    setToolExecutionHandler(onToolExecution) {
        // Pastikan handler diteruskan ke ToolCallHandler
        this.toolCallHandler.setToolExecutionHandler(onToolExecution);
        console.log('Tool execution handler diperbarui di RequestHandler');
    }
    
    // Metode untuk mengatur context optimization
    setContextOptimizationEnabled(enabled) {
        this.enableContextOptimization = enabled;
        this.conversationHandler.setContextOptimizationEnabled(enabled);
        return this.enableContextOptimization;
    }

    async handleUserRequest(userInput) {
        // Add user input to conversation history
        this.conversationHandler.addUserMessage(userInput);

        let iterations = 0;
        let finalResponse = '';
        const toolsUsed = [];
        const startTime = Date.now();
        // Check if fallback is enabled globally
        const enableFallback = process.env.ENABLE_AI_FALLBACK === 'true';
        let usedFallback = false;
        let originalProvider = this.aiManager.currentProvider;
        
        // Context optimization stats
        let contextOptimizationStats = null;

        try {
            while (iterations < this.maxIterations) {
                iterations++;
                console.log(chalk.gray('-'.repeat(50)));
                
                // Lakukan context optimization jika diaktifkan
                if (this.enableContextOptimization) {
                    // Optimasi dilakukan sebelum setiap chat dengan AI
                    const optimizationResult = this.conversationHandler.optimizeContext();
                    
                    if (optimizationResult.optimized) {
                        contextOptimizationStats = optimizationResult;
                        console.log(chalk.blue(`🧹 Context optimized: removed ${optimizationResult.messagesRemoved} redundant messages`));
                    }
                }
                
                // Use appropriate chat method based on fallback setting
                let aiResponse;
                if (enableFallback) {
                    // Use fallback if enabled
                    aiResponse = await this.aiManager.chatWithFallback(this.conversationHandler.getConversationHistory(), {
                        stream: this.streamMode,
                        switchOnSuccess: true, // Switch to working provider automatically
                        metadata: {
                            userInput,
                            sessionId: this.sessionId,
                            iteration: iterations,
                            onChunk: this.onStreamChunk
                        }
                    });
                    
                    // Show fallback notification if used
                    if (aiResponse.fallbackUsed) {
                        usedFallback = true;
                        console.log(chalk.yellow(`\n\n⚠️  Fallback used: switched to ${aiResponse.provider}`));
                    }
                } else {
                    // Use normal chat without fallback
                    aiResponse = await this.aiManager.chat(this.conversationHandler.getConversationHistory(), {
                        stream: this.streamMode,
                        metadata: {
                            userInput,
                            sessionId: this.sessionId,
                            iteration: iterations,
                            onChunk: this.onStreamChunk
                        }
                    });
                }
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
                    console.log(chalk.yellow(`\nin: ${responseUsage.prompt_tokens ?? responseUsage.input_tokens} | out: ${responseUsage.completion_tokens ?? responseUsage.output_tokens} | ${aiResponse.provider}`));
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
                aiProvider: this.aiManager.currentProvider,
                originalProvider: originalProvider,
                fallbackUsed: usedFallback,
                contextOptimized: contextOptimizationStats?.optimized || false,
                contextOptimizationStats: contextOptimizationStats
            });

            return {
                success: true,
                response: finalResponse,
                iterations,
                toolsUsed,
                processingTime,
                sessionId: this.sessionId,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: usedFallback ? originalProvider : null,
                fallbackUsed: usedFallback,
                contextOptimized: contextOptimizationStats?.optimized || false,
                contextOptimizationStats: contextOptimizationStats
            };

        } catch (error) {
            await this.loggingHandler.logError(error, {
                context: 'user_request_handling',
                userInput,
                sessionId: this.sessionId,
                iterations,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: usedFallback ? originalProvider : null,
                fallbackUsed: usedFallback
            });
            
            return {
                success: false,
                error: `Unexpected error: ${error.message}`,
                iterations,
                aiProvider: this.aiManager.currentProvider,
                originalProvider: usedFallback ? originalProvider : null,
                fallbackUsed: usedFallback
            };
        }
    }
}