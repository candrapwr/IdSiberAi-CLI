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
        return 'claude-3-7-sonnet-latest';
    }

    async chat(messages, options = {}) {
        const startTime = Date.now();
        
        // Claude API menggunakan format yang berbeda
        const { system, messages: claudeMessages } = this.convertMessagesToClaudeFormat(messages);
        
        const request = {
            model: options.model || this.getDefaultModel(),
            max_tokens: 7900,
            temperature: 0.3,
            messages: claudeMessages,
            stream: options.stream || false
        };

        if (system) {
            request.system = system;
        }

        try {
            if (options.stream) {
                return await this.streamChat(request, startTime, options.metadata, options.signal);
            } else {
                return await this.normalChat(request, startTime, options.metadata, options.signal);
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
            await this.logError(errorFinal, { context: 'api_call', request });
            
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

    async normalChat(request, startTime, metadata = {}, signal) {
        const response = await axios.post(this.baseURL, request, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            signal
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

    async streamChat(request, startTime, metadata = {}, signal) {
        const response = await axios.post(this.baseURL, request, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            responseType: 'stream',
            signal
        });

        return new Promise((resolve, reject) => {
            let fullMessage = '';
            let usage = null;
            const chunks = [];

            if (signal) {
                const onAbort = () => { try { response.data.destroy(new Error('Aborted')); } catch(_){} };
                if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
            }

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        const eventType = line.slice(7).trim();
                        const nextLine = lines[lines.indexOf(line) + 1];
                        const data = nextLine?.startsWith('data: ') ? nextLine.slice(6).trim() : '';

                        if (!data) continue;

                        try {
                            const parsed = JSON.parse(data);

                            if (eventType === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
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

                            if (eventType === 'message_delta' && parsed.usage) {
                                usage = parsed.usage;
                            }

                            if (eventType === 'message_stop') {
                                const result = this.normalizeResponse({
                                    message: fullMessage,
                                    usage: usage
                                }, true);

                                result.chunks = chunks.length;

                                resolve(result);
                            }

                            // Abaikan event ping dan lainnya yang tidak relevan
                        } catch (error) {
                            // Skip malformed JSON
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

    getAvailableModels() {
        return [
            'claude-opus-4-0',
            'claude-sonnet-4-0',
            'claude-3-7-sonnet-latest',
            'claude-3-5-haiku-20241022',
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
