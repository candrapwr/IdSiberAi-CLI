// Base class untuk semua AI providers
export class BaseAIProvider {
    constructor(apiKey, enableLogging = true) {
        this.apiKey = apiKey;
        this.enableLogging = enableLogging;
        this.logger = null;
        
        if (enableLogging) {
            // Logger akan diinjeksi dari handler utama
        }
    }

    setLogger(logger) {
        this.logger = logger;
    }

    // Abstract method - harus diimplementasi oleh subclass
    async chat(messages, options = {}) {
        throw new Error('chat method must be implemented by subclass');
    }

    // Abstract method - harus diimplementasi oleh subclass  
    getProviderName() {
        throw new Error('getProviderName method must be implemented by subclass');
    }

    // Abstract method - harus diimplementasi oleh subclass
    getDefaultModel() {
        throw new Error('getDefaultModel method must be implemented by subclass');
    }

    // Method untuk mendapatkan informasi provider
    getProviderInfo() {
        return {
            name: this.getProviderName(),
            defaultModel: this.getDefaultModel(),
            hasApiKey: !!this.apiKey,
            loggingEnabled: this.enableLogging
        };
    }

    // Helper method untuk logging API requests
    async logAPIRequest(request, response, metadata = {}) {
        if (this.logger) {
            await this.logger.logAPIRequest(request, response, {
                provider: this.getProviderName(),
                ...metadata
            });
        }
    }

    // Helper method untuk logging errors
    async logError(error, context = {}) {
        if (this.logger) {
            await this.logger.logError(error, {
                provider: this.getProviderName(),
                ...context
            });
        }
    }

    // Helper method untuk normalisasi pesan
    normalizeMessages(messages) {
        return messages.map(msg => {
            // Base message format
            const normalizedMsg = {
                role: msg.role,
                content: msg.content
            };
            
            // Handle special roles like 'function'
            if (msg.role === 'function' && msg.name) {
                normalizedMsg.name = msg.name;
            }
            
            return normalizedMsg;
        });
    }

    // Helper method untuk normalisasi response
    normalizeResponse(response, streaming = false) {
        return {
            success: true,
            message: response.message || response.content,
            usage: response.usage || null,
            streaming: streaming,
            provider: this.getProviderName()
        };
    }

    // Helper method untuk error response
    createErrorResponse(error, streaming = false) {
        return {
            success: false,
            error: error.message || error.toString(),
            streaming: streaming,
            provider: this.getProviderName()
        };
    }
}