import axios from 'axios';
import chalk from 'chalk';
import { ValidationHelper } from './ValidationHelper.js';
import * as cheerio from 'cheerio';

export class InternetTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
        this.allowedDomains = []; // Optional: bisa diisi dengan domain yang diizinkan
        this.blockedDomains = []; // Optional: bisa diisi dengan domain yang diblokir
    }

    async accessUrl(url, options = {}) {
        // Auto-extract content option (default: true)
        const shouldExtract = options.extractContent !== false;
        // Content length limit in characters (default: 50000 ~ approx 12500 tokens)
        const contentLimit = options.contentLimit || 2000;
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
            let originalSize = content.length || 0;
            let extracted = false;

            // Untuk HTML content, extract informasi berguna dan konten
            let pageInfo = {};
            if (contentType.includes('text/html') && typeof content === 'string') {
                pageInfo = this.extractHtmlInfo(content);
                
                // Extract readable content jika diinginkan
                if (shouldExtract) {
                    const extractResult = this.extractReadableContent(content, contentLimit);
                    content = extractResult.content;
                    extracted = extractResult.extracted;
                }
            } else if (shouldExtract && typeof content === 'string' && content.length > contentLimit) {
                // Jika bukan HTML tapi masih text, limit ukurannya
                content = content.substring(0, contentLimit) + '\n[Content truncated due to size limit...]';
                extracted = true;
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
                message: `Successfully accessed URL: ${url} (${response.status} ${response.statusText})`,
                originalSize: originalSize,
                extracted: extracted,
                extractionMethod: extracted ? (contentType.includes('text/html') ? 'html-extraction' : 'truncation') : 'none'
            };

            // Jika content terlalu panjang, truncate untuk logging
            if (typeof content === 'string' && content.length > 1000) {
                result.contentPreview = content.substring(0, 1000) + '...';
            }

            console.log(chalk.green(`✅ URL accessed successfully in ${duration}ms`));
            console.log(chalk.gray(`   Status: ${response.status} ${response.statusText}`));
            console.log(chalk.gray(`   Content-Type: ${contentType}`));
            console.log(chalk.gray(`   Original Size: ${this.formatSize(originalSize)}`));
            
            if (extracted) {
                const newSize = typeof content === 'string' ? content.length : 0;
                console.log(chalk.gray(`   Extracted Size: ${this.formatSize(newSize)} (${Math.round((newSize/originalSize)*100)}% of original)`));
                console.log(chalk.gray(`   Extraction Method: ${result.extractionMethod}`));
            }

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

    // Extract readable content dari HTML dengan Cheerio
    extractReadableContent(html, limit = 50000) {
        try {
            const $ = cheerio.load(html);
            
            // Hapus elemen yang umumnya tidak mengandung konten penting
            $('script, style, iframe, nav, footer, aside, ad, .ad, .ads, .advertisement, [class*="cookie"], [class*="banner"], [id*="cookie"], [id*="banner"]').remove();
            
            // Dapatkan judul halaman
            const title = $('title').text().trim();
            let extractedContent = '';
            
            // Extract article content jika ada
            const article = $('article').first();
            if (article.length) {
                extractedContent = `# ${title}\n\n${article.text().trim()}`;
            } else {
                // Alternatif: cari main content
                const mainContent = $('main').first();
                if (mainContent.length) {
                    extractedContent = `# ${title}\n\n${mainContent.text().trim()}`;
                } else {
                    // Alternatif: cari content dengan class atau id yang mengindikasikan main content
                    const potentialContent = $('[id*="content"], [class*="content"], [id*="main"], [class*="main"], [id*="article"], [class*="article"]').first();
                    if (potentialContent.length) {
                        extractedContent = `# ${title}\n\n${potentialContent.text().trim()}`;
                    } else {
                        // Fallback: ambil semua paragraph dan heading
                        let sections = [];
                        
                        // Extract headings dan paragraphs
                        $('h1, h2, h3, h4, h5, h6, p').each((i, el) => {
                            const tagName = $(el).prop('tagName').toLowerCase();
                            const text = $(el).text().trim();
                            
                            if (text) {
                                if (tagName.startsWith('h')) {
                                    // Tambahkan heading dengan markdown formatting
                                    const level = parseInt(tagName.substring(1));
                                    const prefix = '#'.repeat(level);
                                    sections.push(`${prefix} ${text}`);
                                } else {
                                    // Tambahkan paragraph
                                    sections.push(text);
                                }
                            }
                        });
                        
                        extractedContent = `# ${title}\n\n${sections.join('\n\n')}`;
                    }
                }
            }
            
            // Hapus whitespace berlebih dan normalize teks
            extractedContent = extractedContent
                .replace(/\s+/g, ' ')           // Gabungkan multiple whitespace
                .replace(/\n\s+/g, '\n')       // Hapus whitespace di awal baris
                .replace(/\s+\n/g, '\n')       // Hapus whitespace di akhir baris
                .replace(/\n{3,}/g, '\n\n')    // Batasi maksimal double newlines
                .trim();
            
            // Batasi panjang konten
            if (extractedContent.length > limit) {
                extractedContent = extractedContent.substring(0, limit) + '\n\n[Content truncated due to size limit...]';
            }
            
            return {
                content: extractedContent,
                extracted: true,
                originalLength: html.length,
                extractedLength: extractedContent.length
            };
            
        } catch (error) {
            console.error(chalk.red(`Error extracting content: ${error.message}`));
            // Fallback: return truncated original HTML
            return {
                content: html.substring(0, limit) + '\n[Content truncated due to size limit...]',
                extracted: true,
                error: error.message
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

    // Method khusus untuk mengakses URL dan mengekstrak konten dengan opsi lanjutan
    async accessUrlAndExtract(url, options = {}) {
        try {
            // Default options dengan pengaturan ekstraksi yang lebih detail
            const extractOptions = {
                // Basic options
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || 30000,
                
                // Content extraction options
                extractContent: true,  // Selalu ekstrak konten (bisa dioverride)
                contentLimit: options.contentLimit || 50000,
                extractImages: options.extractImages === true,
                extractLinks: options.extractLinks === true,
                format: options.format || 'markdown', // 'markdown', 'text', atau 'html'
                
                // Special options
                includeMetadata: options.includeMetadata !== false,
                includeTables: options.includeTables !== false,
                articleMode: options.articleMode || false, // Fokus pada artikelnya saja
            };
            
            // Call standar accessUrl dengan parameter URL dan options
            const result = await this.accessUrl(url, extractOptions);
            
            // Jika gagal, return errornya langsung
            if (!result.success) {
                return result;
            }
            
            // Tambahan: jika perlu ekstra processing untuk konten yang diekstrak
            if (result.extracted && extractOptions.articleMode && typeof result.content === 'string') {
                // Format ulang konten jika mode artikel diaktifkan
                try {
                    const $ = cheerio.load(result.content);
                    
                    // Tambahkan summary singkat jika tersedia
                    const description = result.pageInfo.description || '';
                    if (description) {
                        result.summary = description;
                    }
                    
                    // Tambahan processing khusus mode artikel jika diperlukan
                } catch (error) {
                    console.warn(chalk.yellow(`⚠️ Error processing article content: ${error.message}`));
                }
            }
            
            // Info tambahan khusus format
            result.format = extractOptions.format;
            
            return result;
        } catch (error) {
            console.error(chalk.red(`❌ Error accessing and extracting from URL: ${error.message}`));
            return {
                success: false,
                error: error.message,
                url: url
            };
        }
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

    // Metode khusus untuk mengakses dan meringkas artikel berita atau blog
    async accessArticle(url, options = {}) {
        try {
            // Set opsi default untuk artikel
            const articleOptions = {
                extractContent: true,
                articleMode: true,
                contentLimit: options.contentLimit || 100000, // Limit lebih besar untuk artikel
                includeTables: true,
                includeMetadata: true,
                format: 'markdown'
            };
            
            // Gabungkan dengan opsi custom
            const mergedOptions = { ...articleOptions, ...options };
            
            // Gunakan metode accessUrlAndExtract
            const result = await this.accessUrlAndExtract(url, mergedOptions);
            
            // Format hasil khusus untuk artikel
            if (result.success && result.extracted) {
                // Tambahkan metadata ke hasil
                result.articleData = {
                    title: result.pageInfo.title,
                    description: result.pageInfo.description,
                    author: this.extractAuthor(result.content, url),
                    publishDate: this.extractPublishDate(result.content, url),
                    wordCount: this.countWords(result.content),
                    readingTime: this.calculateReadingTime(result.content)
                };
                
                // Limit konten untuk artikel yang sangat panjang
                if (typeof result.content === 'string' && result.content.length > mergedOptions.contentLimit) {
                    const truncated = result.content.substring(0, mergedOptions.contentLimit);
                    result.content = `${truncated}\n\n[Content truncated - original length: ${result.content.length} characters]`;
                }
                
                // Format output
                if (options.formatArticle !== false) {
                    const formattedContent = `# ${result.articleData.title || 'Untitled Article'}\n\n` +
                        `${result.articleData.description ? `> ${result.articleData.description}\n\n` : ''}` +
                        `${result.articleData.author ? `**Author:** ${result.articleData.author}\n` : ''}` +
                        `${result.articleData.publishDate ? `**Published:** ${result.articleData.publishDate}\n` : ''}` +
                        `**Reading time:** ${result.articleData.readingTime} minutes\n\n` +
                        `---\n\n` +
                        `${result.content}`;
                    
                    result.originalContent = result.content;
                    result.content = formattedContent;
                }
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red(`❌ Error accessing article: ${error.message}`));
            return {
                success: false,
                error: error.message,
                url: url
            };
        }
    }
    
    // Helper untuk ekstrak informasi author dari artikel
    extractAuthor(content, url) {
        try {
            // Coba ekstrak author dari URL atau content
            // Ini adalah implementasi sederhana dan bisa ditingkatkan
            // berdasarkan pola yang umum ditemukan di berbagai situs
            const authorRegex = /author[:\s]*([^\n\r]+)/i;
            const match = content.match(authorRegex);
            if (match && match[1]) {
                return match[1].trim();
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // Helper untuk ekstrak tanggal publikasi dari artikel
    extractPublishDate(content, url) {
        try {
            // Coba ekstrak tanggal dari content
            // Pattern untuk tanggal, bisa disesuaikan dengan format yang umum
            const dateRegex = /published[:\s]*([^\n\r]+)|date[:\s]*([^\n\r]+)/i;
            const match = content.match(dateRegex);
            if (match && (match[1] || match[2])) {
                return (match[1] || match[2]).trim();
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // Hitung jumlah kata dalam konten
    countWords(text) {
        try {
            return text.split(/\s+/).filter(word => word.length > 0).length;
        } catch (error) {
            return 0;
        }
    }
    
    // Hitung perkiraan waktu baca (dalam menit)
    calculateReadingTime(text) {
        try {
            const wordsPerMinute = 200; // Rata-rata kecepatan baca
            const wordCount = this.countWords(text);
            const readingTime = Math.ceil(wordCount / wordsPerMinute);
            return Math.max(1, readingTime); // Minimal 1 menit
        } catch (error) {
            return 1;
        }
    }
}