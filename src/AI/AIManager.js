import { DeepSeekProvider } from './DeepSeekProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { GrokProvider } from './GrokProvider.js';
import { ZhiPuAIProvider } from './ZhiPuAIProvider.js';
import { QwenAIProvider } from './QwenAIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import dotenv from 'dotenv';

export class AIManager {
    constructor(apiKeys = {}, enableLogging = true) {
        this.providers = new Map();
        this.currentProvider = null;
        this.defaultProvider = process.env.DEFAULT_AI_PROVIDER;
        this.enableLogging = enableLogging;
        this.logger = null;

        // Initialize providers berdasarkan API keys yang tersedia
        this.initializeProviders(apiKeys);
    }

    initializeProviders(apiKeys) {
        // DeepSeek
        if (apiKeys.deepseek) {
            const deepseek = new DeepSeekProvider(apiKeys.deepseek, this.enableLogging);
            this.providers.set('DeepSeek', deepseek);
        }

        // OpenAI
        if (apiKeys.openai) {
            const openai = new OpenAIProvider(apiKeys.openai, this.enableLogging);
            this.providers.set('OpenAI', openai);
        }

        // Claude
        if (apiKeys.claude) {
            const claude = new ClaudeProvider(apiKeys.claude, this.enableLogging);
            this.providers.set('Claude', claude);
        }

        // Grok
        if (apiKeys.grok) {
            const grok = new GrokProvider(apiKeys.grok, this.enableLogging);
            this.providers.set('Grok', grok);
        }

        // ZhiPuAI
        if (apiKeys.zhipuai) {
            const zhipuai = new ZhiPuAIProvider(apiKeys.zhipuai, this.enableLogging);
            this.providers.set('ZhiPuAI', zhipuai);
        }

        // QwenAI
        if (apiKeys.qwen) {
            const qwen = new QwenAIProvider(apiKeys.qwen, this.enableLogging);
            this.providers.set('QwenAI', qwen);
        }

        // Gemini
        if (apiKeys.qwen) {
            const qwen = new GeminiProvider(apiKeys.gemini, this.enableLogging);
            this.providers.set('Gemini', qwen);
        }

        // Set provider pertama yang tersedia sebagai default
        if (this.providers.size > 0) {
            if (this.providers.has(this.defaultProvider)) {
                this.currentProvider = this.defaultProvider;
            } else {
                const firstProvider = Array.from(this.providers.keys())[0];
                this.currentProvider = firstProvider;
                
                // Jika DeepSeek tersedia, jadikan default
                if (this.providers.has('DeepSeek')) {
                    this.currentProvider = 'DeepSeek';
                }
            }
        }
    }

    setLogger(logger) {
        this.logger = logger;
        // Set logger untuk semua providers
        for (const provider of this.providers.values()) {
            provider.setLogger(logger);
        }
    }

    // Mendapatkan provider yang sedang aktif
    getCurrentProvider() {
        return this.providers.get(this.currentProvider);
    }

    // Mengubah provider yang aktif
    setCurrentProvider(providerName) {
        if (!this.providers.has(providerName)) {
            throw new Error(`Provider ${providerName} tidak tersedia. Provider yang tersedia: ${this.getAvailableProviders().join(', ')}`);
        }
        
        this.currentProvider = providerName;
        return true;
    }

    // Mendapatkan daftar provider yang tersedia
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    // Mendapatkan informasi semua providers
    getProvidersInfo() {
        const info = {};
        for (const [name, provider] of this.providers) {
            info[name] = {
                ...provider.getProviderInfo(),
                isActive: name === this.currentProvider
            };
        }
        return info;
    }
    
    // Fallback status management
    isFallbackEnabled() {
        return process.env.ENABLE_AI_FALLBACK === 'true';
    }

    // Chat menggunakan provider yang aktif
    async chat(messages, options = {}) {
        const provider = this.getCurrentProvider();
        if (!provider) {
            throw new Error('Tidak ada provider AI yang tersedia. Pastikan setidaknya satu API key dikonfigurasi.');
        }

        return await provider.chat(messages, options);
    }

    // Chat menggunakan provider tertentu
    async chatWithProvider(providerName, messages, options = {}) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} tidak tersedia`);
        }

        return await provider.chat(messages, options);
    }

    // Mendapatkan model yang tersedia untuk provider aktif
    getAvailableModels(providerName = null) {
        const provider = providerName ? 
            this.providers.get(providerName) : 
            this.getCurrentProvider();
            
        if (!provider) {
            return [];
        }

        return provider.getAvailableModels ? provider.getAvailableModels() : [provider.getDefaultModel()];
    }

    // Mendapatkan semua model dari semua providers
    getAllAvailableModels() {
        const allModels = {};
        for (const [name, provider] of this.providers) {
            allModels[name] = this.getAvailableModels(name);
        }
        return allModels;
    }

    // Mendapatkan statistik usage dari semua providers
    async getUsageStats() {
        const stats = {};
        
        for (const [name, provider] of this.providers) {
            try {
                if (provider.getAPIUsage) {
                    stats[name] = await provider.getAPIUsage();
                } else {
                    stats[name] = {
                        provider: name,
                        message: 'Usage stats not available for this provider'
                    };
                }
            } catch (error) {
                stats[name] = {
                    provider: name,
                    error: error.message
                };
            }
        }
        
        return stats;
    }

    // Menambah provider baru secara dinamis
    addProvider(name, apiKey, providerType) {
        let provider;
        
        switch (providerType.toLowerCase()) {
            case 'deepseek':
                provider = new DeepSeekProvider(apiKey, this.enableLogging);
                break;
            case 'openai':
                provider = new OpenAIProvider(apiKey, this.enableLogging);
                break;
            case 'claude':
                provider = new ClaudeProvider(apiKey, this.enableLogging);
                break;
            case 'grok':
                provider = new GrokProvider(apiKey, this.enableLogging);
                break;
            case 'zhipuai':
                provider = new ZhiPuAIProvider(apiKey, this.enableLogging);
                break;
            case 'qwen':
                provider = new QwenAIProvider(apiKey, this.enableLogging);
                break;
            default:
                throw new Error(`Provider type ${providerType} tidak didukung`);
        }

        if (this.logger) {
            provider.setLogger(this.logger);
        }

        this.providers.set(name, provider);
        
        // Jika ini adalah provider pertama, jadikan sebagai current
        if (this.providers.size === 1) {
            this.currentProvider = name;
        }

        return true;
    }

    // Menghapus provider
    removeProvider(name) {
        if (!this.providers.has(name)) {
            return false;
        }

        this.providers.delete(name);
        
        // Jika provider yang dihapus adalah current provider, ganti ke yang lain
        if (this.currentProvider === name) {
            const availableProviders = this.getAvailableProviders();
            this.currentProvider = availableProviders.length > 0 ? availableProviders[0] : null;
        }

        return true;
    }

    // Auto-fallback: coba provider lain jika yang aktif gagal
    async chatWithFallback(messages, options = {}) {
        const providers = this.getAvailableProviders();
        const errors = [];
        
        // Coba provider aktif terlebih dahulu
        if (this.currentProvider) {
            try {
                const result = await this.chat(messages, options);
                if (result.success) {
                    return result;
                }
                errors.push({
                    provider: this.currentProvider,
                    error: result.error
                });
            } catch (error) {
                errors.push({
                    provider: this.currentProvider,
                    error: error.message
                });
            }
        }
        
        // Coba provider lain jika aktif gagal
        for (const providerName of providers) {
            if (providerName === this.currentProvider) continue; // Skip yang sudah dicoba
            
            try {
                const result = await this.chatWithProvider(providerName, messages, options);
                if (result.success) {
                    // Optional: switch ke provider yang berhasil
                    if (options.switchOnSuccess) {
                        this.currentProvider = providerName;
                    }
                    
                    result.fallbackUsed = true;
                    result.originalProvider = this.currentProvider;
                    return result;
                }
                errors.push({
                    provider: providerName,
                    error: result.error
                });
            } catch (error) {
                errors.push({
                    provider: providerName,
                    error: error.message
                });
            }
        }
        
        // Semua provider gagal
        return {
            success: false,
            error: 'Semua AI provider gagal',
            providerErrors: errors
        };
    }

    // Test koneksi semua providers
    async testAllProviders() {
        const results = {};
        const testMessage = [{ role: 'user', content: 'Hello, test connection' }];
        
        for (const [name, provider] of this.providers) {
            try {
                const startTime = Date.now();
                const result = await provider.chat(testMessage, { max_tokens: 10 });
                const endTime = Date.now();
                
                results[name] = {
                    success: result.success,
                    responseTime: endTime - startTime,
                    error: result.error || null
                };
            } catch (error) {
                results[name] = {
                    success: false,
                    responseTime: null,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    // Smart provider selection berdasarkan preferensi dan availability
    async smartChat(messages, options = {}) {
        const preferences = options.providerPreferences || [];
        const fallback = options.enableFallback !== false; // Default true
        
        // Coba berdasarkan preferensi user
        for (const preferredProvider of preferences) {
            if (this.providers.has(preferredProvider)) {
                try {
                    const result = await this.chatWithProvider(preferredProvider, messages, options);
                    if (result.success) {
                        return result;
                    }
                } catch (error) {
                    // Continue ke provider berikutnya
                }
            }
        }
        
        // Fallback ke sistem normal atau fallback
        if (fallback) {
            return await this.chatWithFallback(messages, options);
        } else {
            return await this.chat(messages, options);
        }
    }

    // Export konfigurasi saat ini
    exportConfig() {
        return {
            currentProvider: this.currentProvider,
            availableProviders: this.getAvailableProviders(),
            providersInfo: this.getProvidersInfo(),
            defaultProvider: this.defaultProvider
        };
    }

    // Import konfigurasi
    importConfig(config) {
        if (config.currentProvider && this.providers.has(config.currentProvider)) {
            this.currentProvider = config.currentProvider;
        }
        
        if (config.defaultProvider) {
            this.defaultProvider = config.defaultProvider;
        }
    }
}