import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider.js';

export class GeminiProvider extends BaseAIProvider {
    constructor(apiKey, enableLogging = true) {
        super(apiKey, enableLogging);
        this.baseURL = `https://generativelanguage.googleapis.com/v1beta/models/`;
    }

    getProviderName() {
        return 'Gemini';
    }

    getDefaultModel() {
        return 'gemini-2.0-flash-lite';
    }

    /**
     * Overrides the base method to format messages for the Gemini API.
     * Maps 'assistant' role to 'model' and structures the content within 'parts'.
     * @param {Array<Object>} messages The standard messages array.
     * @returns {Array<Object>} Messages formatted for Gemini.
     */
    normalizeMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === 'system' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        }));
    }

    async chat(messages, options = {}) {
        const startTime = Date.now();
        const model = options.model || this.getDefaultModel();
        
        const requestBody = {
            contents: this.normalizeMessages(messages),
            generationConfig: {
                temperature: 0.7,
                ...(options.max_tokens && { maxOutputTokens: options.max_tokens })
            }
        };

        try {
            if (options.stream) {
                return await this.streamChat(requestBody, model, startTime, options.metadata);
            } else {
                return await this.normalChat(requestBody, model, startTime, options.metadata);
            }
        } catch (error) {
            let errorFinal = error;

            if (error.response && error.response.data) {
                const body = await readStreamErrorBody(error.response.data);
                errorFinal.body = body;
            }

            const response = this.createErrorResponse(error, options.stream);
            
            await this.logAPIRequest(requestBody, response, {
                ...options.metadata,
                duration: Date.now() - startTime
            });
            await this.logError(errorFinal, { context: 'api_call', request: requestBody });
            
            return response;
        }
    }

    async normalChat(requestBody, model, startTime, metadata = {}) {
        const requestUrl = `${this.baseURL}${model}:generateContent?key=${this.apiKey}`;
        
        const response = await axios.post(requestUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = this.normalizeResponse({
            message: response.data.candidates[0].content.parts[0].text,
            usage: {
                prompt_tokens: response.data.usageMetadata.promptTokenCount,
                completion_tokens: response.data.usageMetadata.candidatesTokenCount,
                total_tokens: response.data.usageMetadata.totalTokenCount
            }
        }, false);

        await this.logAPIRequest(requestBody, result, {
            ...metadata,
            duration: Date.now() - startTime
        });

        return result;
    }

    async streamChat(requestBody, model, startTime, metadata = {}) {
        const requestUrl = `${this.baseURL}${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
        
        const response = await axios.post(requestUrl, requestBody, {
            headers: {
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
                        const data = line.slice(6).trim();
                        if (data.length === 0) continue;

                        try {
                            const parsed = JSON.parse(data);
                            const deltaContent = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            
                            if (deltaContent) {
                                fullMessage += deltaContent;
                                chunks.push({
                                    content: deltaContent,
                                    timestamp: Date.now()
                                });
                                
                                if (metadata.onChunk) {
                                    metadata.onChunk(deltaContent);
                                }
                            }

                            if (parsed.usageMetadata) {
                                usage = {
                                    prompt_tokens: parsed.usageMetadata.promptTokenCount,
                                    completion_tokens: parsed.usageMetadata.candidatesTokenCount,
                                    total_tokens: parsed.usageMetadata.totalTokenCount
                                };
                            }
                        } catch (error) {
                            // Skip malformed JSON chunks
                            console.warn('Could not parse JSON line from Gemini stream:', data, error);
                        }
                    }
                }
            });

            response.data.on('error', (error) => {
                const result = this.createErrorResponse(error, true);
                
                this.logAPIRequest(requestBody, result, {
                    ...metadata,
                    duration: Date.now() - startTime
                });
                this.logError(error, { context: 'stream_api_call', request: requestBody });

                reject(error);
            });

            response.data.on('end', () => {
                if (fullMessage) {
                    const result = this.normalizeResponse({
                        message: fullMessage,
                        usage: usage
                    }, true);
                    
                    result.chunks = chunks.length;

                    this.logAPIRequest(requestBody, result, {
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