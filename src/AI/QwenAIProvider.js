import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider.js';

export class QwenAIProvider extends BaseAIProvider {
    constructor(apiKey, enableLogging = true) {
        super(apiKey, enableLogging);
        this.baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
    }

    getProviderName() {
        return 'QwenAI';
    }

    getDefaultModel() {
        return 'qwen-turbo';
    }

    async chat(messages, options = {}) {
        const startTime = Date.now();
        const request = {
            model: options.model || this.getDefaultModel(),
            messages: this.normalizeMessages(messages),
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 10000,
            stream: options.stream || false
        };

        if(options.stream){
            request.stream_options = {include_usage:true};
        }

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
            let buffer = '';
            const chunks = [];

            response.data.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                buffer += chunkStr;
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    // Handle SSE format
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        
                        if (data === '[DONE]') {
                            continue; // We'll handle completion in the 'end' event
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            
                            if (delta) {
                                fullMessage += delta;
                                chunks.push({
                                    content: delta,
                                    timestamp: Date.now()
                                });
                                
                                if (metadata.onChunk) {
                                    metadata.onChunk(delta);
                                }
                            }

                            if (parsed.usage) {
                                usage = parsed.usage;
                            }
                        } catch (error) {
                            // Skip malformed JSON chunks
                            // console.error('Failed to parse chunk:', error.message);
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
                // Process any remaining data in the buffer
                if (buffer.trim() !== '') {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '' || !line.startsWith('data: ')) continue;
                        
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            
                            if (delta) {
                                fullMessage += delta;
                            }
                            
                            if (parsed.usage) {
                                usage = parsed.usage;
                            }
                        } catch (error) {
                            // Skip malformed JSON
                        }
                    }
                }
                
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

    getAvailableModels() {
        return [
            'qwen-turbo',
            'qwen-plus',
            'qwen-max'
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