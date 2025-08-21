import axios from 'axios';
import chalk from 'chalk';
import { ValidationHelper } from './ValidationHelper.js';

export class InternetTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
        this.allowedDomains = []; // Optional: bisa diisi dengan domain yang diizinkan
        this.blockedDomains = []; // Optional: bisa diisi dengan domain yang diblokir
    }

    async accessUrl(url, options = {}) {
        try {
            // Validasi URL
            if (!url || typeof url !== 'string') {
                return {
                    success: false,
                    error: 'URL parameter is required and must be a string'
                };
            }

            // Validasi format URL
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                return {
                    success: false,
                    error: 'Invalid URL format. Please provide a valid URL including protocol (http:// or https://)'
                };
            }

            // Security checks (opsional)
            if (this.blockedDomains.includes(parsedUrl.hostname)) {
                return {
                    success: false,
                    error: `Access to domain '${parsedUrl.hostname}' is blocked`
                };
            }

            if (this.allowedDomains.length > 0 && !this.allowedDomains.includes(parsedUrl.hostname)) {
                return {
                    success: false,
                    error: `Access to domain '${parsedUrl.hostname}' is not allowed`
                };
            }

            // Konfigurasi axios
            const axiosConfig = {
                method: options.method || 'GET',
                url: url,
                timeout: options.timeout || 30000,
                maxContentLength: options.maxContentLength || 10 * 1024 * 1024, // 10MB
                headers: {
                    'User-Agent': options.userAgent || 'IdSiberAi-CLI/2.0.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    ...options.headers
                },
                responseType: options.responseType || 'text',
                validateStatus: function (status) {
                    return status >= 200 && status < 400; // Terima status 2xx dan 3xx
                }
            };

            // Tambahkan data untuk POST/PUT requests
            if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
                axiosConfig.data = options.data;
            }

            console.log(chalk.blue(`🌐 Accessing URL: ${url}`));
            
            // Eksekusi request
            const startTime = Date.now();
            const response = await axios(axiosConfig);
            const duration = Date.now() - startTime;

            // Process response
            let content = response.data;
            let contentType = response.headers['content-type'] || '';
            let contentLength = response.headers['content-length'] || Buffer.from(content).length;

            // Untuk HTML content, extract informasi berguna
            let pageInfo = {};
            if (contentType.includes('text/html') && typeof content === 'string') {
                pageInfo = this.extractHtmlInfo(content);
            }

            const result = {
                success: true,
                url: url,
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                contentLength: contentLength,
                responseTime: duration,
                headers: response.headers,
                pageInfo: pageInfo,
                content: content,
                message: `Successfully accessed URL: ${url} (${response.status} ${response.statusText})`
            };

            // Jika content terlalu panjang, truncate untuk logging
            if (typeof content === 'string' && content.length > 1000) {
                result.contentPreview = content.substring(0, 1000) + '...';
            }

            console.log(chalk.green(`✅ URL accessed successfully in ${duration}ms`));
            console.log(chalk.gray(`   Status: ${response.status} ${response.statusText}`));
            console.log(chalk.gray(`   Content-Type: ${contentType}`));
            console.log(chalk.gray(`   Size: ${this.formatSize(contentLength)}`));

            return result;

        } catch (error) {
            console.error(chalk.red(`❌ Error accessing URL: ${error.message}`));
            
            let errorMessage = error.message;
            let errorDetails = {};

            if (error.response) {
                // Server responded with error status
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
                errorDetails = {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    headers: error.response.headers
                };
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'No response received from server';
                errorDetails = { request: error.request };
            }

            return {
                success: false,
                error: errorMessage,
                url: url,
                details: errorDetails,
                code: error.code
            };
        }
    }

    // Helper untuk extract informasi dari HTML
    extractHtmlInfo(html) {
        const info = {
            title: '',
            description: '',
            keywords: '',
            language: '',
            charset: '',
            links: 0,
            images: 0
        };

        try {
            // Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            if (titleMatch) info.title = titleMatch[1].trim();

            // Extract meta description
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
            if (descMatch) info.description = descMatch[1].trim();

            // Extract meta keywords
            const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i);
            if (keywordsMatch) info.keywords = keywordsMatch[1].trim();

            // Extract language
            const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i);
            if (langMatch) info.language = langMatch[1].trim();

            // Extract charset
            const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["'][^>]*>/i);
            if (charsetMatch) info.charset = charsetMatch[1].trim();

            // Count links and images
            info.links = (html.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || []).length;
            info.images = (html.match(/<img[^>]*src=["'][^"']*["'][^>]*>/gi) || []).length;

        } catch (parseError) {
            console.warn(chalk.yellow('⚠️ Error parsing HTML:', parseError.message));
        }

        return info;
    }

    // Helper untuk format size
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    // Method untuk mengatur domain yang diizinkan (opsional)
    setAllowedDomains(domains) {
        this.allowedDomains = Array.isArray(domains) ? domains : [domains];
        return {
            success: true,
            allowedDomains: this.allowedDomains
        };
    }

    // Method untuk mengatur domain yang diblokir (opsional)
    setBlockedDomains(domains) {
        this.blockedDomains = Array.isArray(domains) ? domains : [domains];
        return {
            success: true,
            blockedDomains: this.blockedDomains
        };
    }

    // Method untuk test koneksi internet
    async testInternetConnection() {
        try {
            const testUrls = [
                'https://www.google.com',
                'https://www.cloudflare.com',
                'https://httpbin.org/get'
            ];

            const results = [];
            
            for (const url of testUrls) {
                try {
                    const startTime = Date.now();
                    const response = await axios.head(url, { timeout: 10000 });
                    const duration = Date.now() - startTime;
                    
                    results.push({
                        url: url,
                        success: true,
                        status: response.status,
                        responseTime: duration
                    });
                } catch (error) {
                    results.push({
                        url: url,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successfulTests = results.filter(r => r.success);
            
            return {
                success: successfulTests.length > 0,
                tests: results,
                successRate: `${successfulTests.length}/${results.length}`,
                averageResponseTime: successfulTests.length > 0 
                    ? successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length 
                    : 0,
                message: successfulTests.length > 0 
                    ? `Internet connection test completed: ${successfulTests.length}/${results.length} successful`
                    : 'Internet connection test failed'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}