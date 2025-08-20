import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider.js';

export class GrokProvider extends BaseAIProvider {
    constructor(apiKey, enableLogging = true) {
        super(apiKey, enableLogging);
        this.baseURL = 'https://api.x.ai/v1/chat/completions';
    }

    getProviderName() {
        return 'Grok';
    }

    getDefaultModel() {
        return 'grok-3-mini';
    }

    async chat(messages, options = {}) {
        const startTime = Date.now();
        const request = {
            model: options.model || this.getDefaultModel(),
            messages: this.normalizeMessages(messages),
            temperature: 0.7,
            max_tokens: options.max_tokens || 10000,
            stream: options.stream || false,
            stream_options: options.stream ? {include_usage:true} : null
        };

        try {
            if (options.stream) {
                return await this.streamChat(request, startTime, options.metadata);
            } else {
                return await this.normalChat(request, startTime, options.metadata);
            }
        } catch (error) {
            let errorFinal = error;

            if (error.response && error.response.data) {
                const body = await readStreamErrorBody(error.response.data);
                errorFinal.body = body;
            }
            
            const response = this.createErrorResponse(error, options.stream);
            
            await this.logAPIRequest(request, response, {
                ...options.metadata,
                duration: Date.now() - startTime
            });
            await this.logError(error, { context: 'api_call', request });
            
            return response;
        }
    }

    async normalChat(request, startTime, metadata = {}) {
        const response = await axios.post(this.baseURL, request, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = this.normalizeResponse({
            message: response.data.choices[0].message.content,
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
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
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
                        
                            resolve(result);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;
                            
                            if (delta?.content) {
                                fullMessage += delta.content;
                                chunks.push({
                                    content: delta.content,
                                    timestamp: Date.now()
                                });
                                
                                // Emit chunk untuk real-time display
                                if (metadata.onChunk) {
                                    metadata.onChunk(delta.content);
                                }
                            }

                            if (parsed.usage) {
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

    // Override untuk menambahkan model-model Grok yang tersedia
    getAvailableModels() {
        return [
            'grok-4-0709',
            'grok-3',
            'grok-3-mini',
        ];
    }
}

async function readStreamErrorBody(stream) {
    return new Promise((resolve, reject) => {
        let raw = '';
        stream.on('data', chunk => raw += chunk.toString('utf8'));
        stream.on('end', () => {
            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(raw);
            }
        });
        stream.on('error', reject);
    });
}