import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider.js';

export class ClaudeProvider extends BaseAIProvider {
    constructor(apiKey, enableLogging = true) {
        super(apiKey, enableLogging);
        this.baseURL = 'https://api.anthropic.com/v1/messages';
    }

    getProviderName() {
        return 'Claude';
    }

    getDefaultModel() {
        return 'claude-3-5-haiku-20241022';
    }

    async chat(messages, options = {}) {
        const startTime = Date.now();
        
        // Claude API menggunakan format yang berbeda
        const { system, messages: claudeMessages } = this.convertMessagesToClaudeFormat(messages);
        
        const request = {
            model: options.model || this.getDefaultModel(),
            max_tokens: options.max_tokens || 2000,
            temperature: 0.3,
            messages: claudeMessages,
            stream: options.stream || false
        };

        if (system) {
            request.system = system;
        }

        try {
            if (options.stream) {
                return await this.streamChat(request, startTime, options.metadata);
            } else {
                return await this.normalChat(request, startTime, options.metadata);
            }
        } catch (error) {
            const response = this.createErrorResponse(error, options.stream);
            
            await this.logAPIRequest(request, response, {
                ...options.metadata,
                duration: Date.now() - startTime
            });
            await this.logError(error, { context: 'api_call', request });
            
            return response;
        }
    }

    convertMessagesToClaudeFormat(messages) {
        let system = '';
        const claudeMessages = [];
        
        for (const msg of messages) {
            if (msg.role === 'system') {
                system = msg.content;
            } else if (msg.role === 'user' || msg.role === 'assistant') {
                claudeMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }
        
        return { system, messages: claudeMessages };
    }

    async normalChat(request, startTime, metadata = {}) {
        const response = await axios.post(this.baseURL, request, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        const result = this.normalizeResponse({
            message: response.data.content[0].text,
            usage: response.data.usage
        }, false);

        await this.logAPIRequest(request, result, {
            ...metadata,
            duration: Date.now() - startTime
        });

        return result;
    }

    async streamChat(request, startTime, metadata = {}) {
        const response = await axios.post(this.baseURL, request, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            let fullMessage = '';
            let usage = null;
            const chunks = [];

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            const result = this.normalizeResponse({
                                message: fullMessage,
                                usage: usage
                            }, true);
                            
                            result.chunks = chunks.length;
                            
                            this.logAPIRequest(request, result, {
                                ...metadata,
                                duration: Date.now() - startTime
                            });

                            resolve(result);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                fullMessage += parsed.delta.text;
                                chunks.push({
                                    content: parsed.delta.text,
                                    timestamp: Date.now()
                                });
                                
                                // Emit chunk untuk real-time display
                                if (metadata.onChunk) {
                                    metadata.onChunk(parsed.delta.text);
                                }
                            }

                            if (parsed.type === 'message_delta' && parsed.usage) {
                                usage = parsed.usage;
                            }
                        } catch (error) {
                            // Skip malformed JSON chunks
                        }
                    }
                }
            });

            response.data.on('error', (error) => {
                const result = this.createErrorResponse(error, true);
                
                this.logAPIRequest(request, result, {
                    ...metadata,
                    duration: Date.now() - startTime
                });
                this.logError(error, { context: 'stream_api_call', request });

                reject(error);
            });

            response.data.on('end', () => {
                if (fullMessage) {
                    const result = this.normalizeResponse({
                        message: fullMessage,
                        usage: usage
                    }, true);
                    
                    result.chunks = chunks.length;

                    this.logAPIRequest(request, result, {
                        ...metadata,
                        duration: Date.now() - startTime
                    });

                    resolve(result);
                } else {
                    reject(new Error('No content received from stream'));
                }
            });
        });
    }

    // Override untuk menambahkan model-model Claude yang tersedia
    getAvailableModels() {
        return [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
        ];
    }
}