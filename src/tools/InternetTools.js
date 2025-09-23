import axios from 'axios';
import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { ValidationHelper } from './ValidationHelper.js';
import * as cheerio from 'cheerio';

export class InternetTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
        this.allowedDomains = []; // Optional: bisa diisi dengan domain yang diizinkan
        this.blockedDomains = []; // Optional: bisa diisi dengan domain yang diblokir
    }
    
    setWorkingDirectory(newDirectory) {
        this.workingDirectory = newDirectory;
        this.validator.setWorkingDirectory(newDirectory);
        return this.workingDirectory;
    }

    async accessUrl(url, options = {}) {
        const shouldExtract = options.extractContent !== false;
        const contentLimit = options.contentLimit || 10000;
        let browser;
        let page;
        let requestHandler;
        let interceptionEnabled = false;

        try {
            if (!url || typeof url !== 'string') {
                return {
                    success: false,
                    error: 'URL parameter is required and must be a string'
                };
            }

            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                return {
                    success: false,
                    error: 'Invalid URL format. Please provide a valid URL including protocol (http:// or https://)'
                };
            }

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

            const method = (options.method || 'GET').toUpperCase();
            const launchOptions = {
                headless: options.headless ?? true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', ...(options.launchArgs || [])]
            };

            if (options.executablePath) {
                launchOptions.executablePath = options.executablePath;
            }

            if (options.defaultViewport) {
                launchOptions.defaultViewport = options.defaultViewport;
            }

            browser = await puppeteer.launch(launchOptions);
            page = await browser.newPage();

            if (options.viewport && typeof options.viewport === 'object') {
                await page.setViewport(options.viewport);
            }

            const userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);

            const baseHeaders = {
                'Accept': options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': options.acceptLanguage || 'en-US,en;q=0.9',
                ...options.headers
            };

            await page.setExtraHTTPHeaders(baseHeaders);

            if (method !== 'GET') {
                interceptionEnabled = true;
                await page.setRequestInterception(true);

                requestHandler = request => {
                    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                        const overrides = {
                            method,
                            headers: {
                                ...request.headers(),
                                ...baseHeaders
                            }
                        };

                        if (options.data) {
                            overrides.postData = typeof options.data === 'string'
                                ? options.data
                                : JSON.stringify(options.data);

                            const headerKey = Object.keys(overrides.headers).find(key => key.toLowerCase() === 'content-type');
                            if (!headerKey) {
                                overrides.headers['Content-Type'] = 'application/json';
                            }
                        }

                        request.continue(overrides);
                        page.off('request', requestHandler);
                    } else {
                        request.continue();
                    }
                };

                page.on('request', requestHandler);
            }

            console.log(chalk.blue(`🌐 Accessing URL: ${url}`));

            const startTime = Date.now();
            const response = await page.goto(url, {
                waitUntil: options.waitUntil || 'networkidle2',
                timeout: options.timeout || 30000
            });
            const duration = Date.now() - startTime;

            if (!response) {
                throw new Error('No response received from server');
            }

            if (options.waitForSelector) {
                await page.waitForSelector(options.waitForSelector, {
                    timeout: options.selectorTimeout || 10000
                });
            }

            const responseHeaders = response.headers();
            const status = response.status();
            const statusText = response.statusText();
            const contentType = responseHeaders['content-type'] || '';
            const headerLength = responseHeaders['content-length'];
            let contentLength = headerLength ? parseInt(headerLength, 10) : undefined;

            let pageInfo = {};
            let content = '';
            let extracted = false;
            let extractionMethod = 'none';
            let originalSize = 0;
            let rawHtml;
            let domExtractionResult = null;
            let processedContent = '';

            if (contentType.includes('text/html') || (!contentType && method === 'GET')) {
                rawHtml = await page.content();
                originalSize = rawHtml.length;
                contentLength = contentLength ?? originalSize;

                pageInfo = this.extractHtmlInfo(rawHtml);

                if (shouldExtract) {
                    const extractResult = this.extractReadableContent(rawHtml, contentLimit);
                    processedContent = extractResult.content;
                    content = processedContent.replace(/"/g, '\\"');
                    extracted = extractResult.extracted;
                    extractionMethod = extractResult.extracted ? 'html-extraction' : 'none';
                } else {
                    processedContent = rawHtml;
                    content = processedContent.replace(/"/g, '\\"');
                }

                const requiresDomExtraction = options.forceDomExtraction === true
                    || (shouldExtract && rawHtml && /<noscript[\s>]/i.test(rawHtml) && /requires javascript/i.test(rawHtml))
                    || (shouldExtract && typeof processedContent === 'string' && /requires javascript/i.test(processedContent));

                if (requiresDomExtraction) {
                    domExtractionResult = await this.extractDomText(page, {
                        selector: options.domSelector || options.textSelector || options.waitForSelector || null
                    }, contentLimit);

                    if (domExtractionResult && domExtractionResult.content) {
                        processedContent = domExtractionResult.content;
                        content = processedContent.replace(/"/g, '\\"');
                        extracted = true;
                        extractionMethod = domExtractionResult.method || 'dom-body';
                    }
                }
            } else if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('xml')) {
                const textContent = await response.text();
                originalSize = textContent.length;
                contentLength = contentLength ?? originalSize;
                processedContent = textContent;
                content = textContent.replace(/"/g, '\\"');

                if (shouldExtract && content.length > contentLimit) {
                    content = `${content.substring(0, contentLimit)}\n[Content truncated due to size limit...]`;
                    extracted = true;
                    extractionMethod = 'truncation';
                }
            } else {
                const bufferContent = await response.buffer();
                originalSize = bufferContent.length;
                contentLength = contentLength ?? originalSize;

                const base64Content = bufferContent.toString('base64');
                const truncatedBase64 = base64Content.length > contentLimit
                    ? `${base64Content.substring(0, contentLimit)}...[truncated base64]`
                    : base64Content;

                processedContent = truncatedBase64;
                content = `Binary content fetched (${contentType || 'unknown'}). Base64 (truncated): ${truncatedBase64}`;
                extracted = true;
                extractionMethod = 'binary-base64';
            }

            const finalContentLength = Number.isFinite(contentLength) ? contentLength : originalSize;

            const result = {
                success: true,
                url,
                status,
                contentType,
                contentLength: finalContentLength,
                responseTime: duration,
                content
            };

            if (options.includeHtml === true && rawHtml) {
                result.rawHtml = rawHtml;
            }

            if (options.includeMetadata === true) {
                const metadata = {
                    statusText,
                    headers: responseHeaders,
                    pageInfo,
                    originalSize,
                    extracted,
                    extractionMethod
                };

                if (domExtractionResult) {
                    metadata.domExtraction = {
                        method: domExtractionResult.method,
                        selector: options.domSelector || options.textSelector || options.waitForSelector || null,
                        truncated: domExtractionResult.truncated === true
                    };
                }

                result.metadata = metadata;
            }

            if (options.screenshotPath) {
                await page.screenshot({ path: options.screenshotPath, fullPage: true });
                result.screenshotPath = options.screenshotPath;
            }

            console.log(chalk.green(`✅ URL accessed successfully in ${duration}ms`));
            console.log(chalk.gray(`   Status: ${status} ${statusText}`));
            console.log(chalk.gray(`   Content-Type: ${contentType || 'unknown'}`));
            console.log(chalk.gray(`   Original Size: ${this.formatSize(originalSize)}`));

            if (extracted) {
                const newSize = typeof processedContent === 'string' ? processedContent.length : (typeof content === 'string' ? content.length : 0);
                const percentage = originalSize > 0 ? Math.round((newSize / originalSize) * 100) : 0;
                console.log(chalk.gray(`   Extracted Size: ${this.formatSize(newSize)} (${percentage}% of original)`));
                console.log(chalk.gray(`   Extraction Method: ${extractionMethod}`));
            }

            return result;

        } catch (error) {
            console.error(chalk.red(`❌ Error accessing URL: ${error.message}`));

            return {
                success: false,
                error: error.message,
                url
            };
        } finally {
            if (page && requestHandler) {
                try {
                    page.off('request', requestHandler);
                } catch {
                    // Ignore cleanup errors
                }
            }

            if (page && interceptionEnabled) {
                try {
                    await page.setRequestInterception(false);
                } catch {
                    // Ignore cleanup errors
                }
            }

            if (browser) {
                await browser.close();
            }
        }
    }

    // Extract readable content dari HTML dengan Cheerio
    extractReadableContent(html, limit = 50000) {
        try {
            const $ = cheerio.load(html);
            
            // Hapus elemen yang umumnya tidak mengandung konten penting
            $('script, style, iframe, nav, footer, aside, noscript, ad, .ad, .ads, .advertisement, [class*="cookie"], [class*="banner"], [id*="cookie"], [id*="banner"]').remove();
            
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

    async extractDomText(page, extractionOptions = {}, limit = 50000) {
        try {
            const selector = extractionOptions.selector || null;
            const attribute = extractionOptions.attribute || null;

            const { text } = await page.evaluate(({ selector, attribute }) => {
                const target = selector ? document.querySelector(selector) : document.body;
                if (!target) {
                    return { text: '' };
                }

                if (attribute && target.getAttribute) {
                    return { text: target.getAttribute(attribute) || '' };
                }

                const innerText = target.innerText !== undefined ? target.innerText : target.textContent;
                return { text: innerText || '' };
            }, { selector, attribute });

            const normalized = this.normalizeTextContent(text, limit);

            return {
                content: normalized.content,
                truncated: normalized.truncated,
                method: selector ? 'dom-selector' : 'dom-body'
            };
        } catch (error) {
            console.warn(chalk.yellow(`⚠️ DOM extraction failed: ${error.message}`));
            return {
                content: '',
                truncated: false,
                error: error.message,
                method: 'dom-error'
            };
        }
    }

    normalizeTextContent(text, limit = 50000) {
        if (typeof text !== 'string' || text.length === 0) {
            return {
                content: '',
                truncated: false
            };
        }

        let normalized = text
            .replace(/\r\n/g, '\n')
            .replace(/\t+/g, ' ')
            .replace(/\u00a0/g, ' ');

        normalized = normalized
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .join('\n');

        let truncated = false;
        if (limit && normalized.length > limit) {
            normalized = normalized.substring(0, limit) + '\n[Content truncated due to size limit...]';
            truncated = true;
        }

        return {
            content: normalized,
            truncated
        };
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
            const includeMetadata = extractOptions.includeMetadata !== false;
            const metadata = includeMetadata ? (result.metadata || {}) : {};
            const pageInfo = metadata.pageInfo || {};
            const wasExtracted = metadata.extracted ?? false;

            if (includeMetadata && wasExtracted && extractOptions.articleMode && typeof result.content === 'string') {
                // Format ulang konten jika mode artikel diaktifkan
                try {
                    const $ = cheerio.load(result.content);
                    
                    // Tambahkan summary singkat jika tersedia
                    const description = pageInfo.description || '';
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

            if (includeMetadata) {
                result.metadata = {
                    ...metadata,
                    pageInfo
                };
            }

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

    async internetSearch(query, options = {}) {
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';
        if (!trimmedQuery) {
            return {
                success: false,
                error: 'Search query is required and must be a non-empty string'
            };
        }

        const engine = (options.engine || 'bing').toLowerCase();
        const limit = Number.isFinite(options.limit) ? Math.min(Math.max(Math.floor(options.limit), 1), 25) : 10;

        let browser;
        try {
            const launchOptions = {
                headless: options.headless ?? true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', ...(options.launchArgs || [])]
            };

            if (options.executablePath) {
                launchOptions.executablePath = options.executablePath;
            }

            browser = await puppeteer.launch(launchOptions);
            const page = await browser.newPage();

            if (options.viewport && typeof options.viewport === 'object') {
                await page.setViewport(options.viewport);
            }

            const userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);

            let searchUrl;
            switch (engine) {
                case 'bing':
                    searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(trimmedQuery)}`;
                    await page.setExtraHTTPHeaders({
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': options.acceptLanguage || 'en-US,en;q=0.9,id;q=0.8',
                        'Ect': '4g',
                        'Priority': 'u=0, i',
                        'Sec-Ch-Ua': '"Chromium";v="140", "Not-A?Brand";v="24", "Google Chrome";v="140"',
                        'Sec-Ch-Ua-Arch': '"arm"',
                        'Sec-Ch-Ua-Bitness': '"64"',
                        'Sec-Ch-Ua-Full-Version': '"140.0.7339.186"',
                        'Sec-Ch-Ua-Full-Version-List': '"Chromium";v="140.0.7339.186", "Not-A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.186"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Model': '""',
                        'Sec-Ch-Ua-Platform': '"macOS"',
                        'Sec-Ch-Ua-Platform-Version': '"26.0.0"',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'Referer': 'https://www.bing.com/',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                    });
                    break;
                case 'duckduckgo':
                default: {
                    const safeSearchParam = options.safeSearch === false ? '&kp=-2' : '';
                    searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}${safeSearchParam}`;
                    await page.setExtraHTTPHeaders({
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                    });
                    break;
                }
            }

            console.log(chalk.blue(`🔎 Internet search (${engine}) for: ${trimmedQuery}`));

            const startedAt = Date.now();
            await page.goto(searchUrl, {
                waitUntil: options.waitUntil || 'networkidle2',
                timeout: options.timeout || 20000
            });

            const selectors = {
                result: options.resultSelector || (engine === 'bing' ? 'li.b_algo' : 'div.result'),
                title: options.titleSelector || (engine === 'bing' ? 'h2 > a' : 'a.result__a'),
                link: options.linkSelector || (engine === 'bing' ? 'h2 > a' : 'a.result__a'),
                snippet: options.snippetSelector || (engine === 'bing' ? 'div.b_caption p' : '.result__snippet')
            };

            if (options.waitForSelector !== false) {
                try {
                    await page.waitForSelector(selectors.result, {
                        timeout: options.selectorTimeout || 8000
                    });
                } catch (waitError) {
                    console.warn(chalk.yellow(`⚠️ Search results selector '${selectors.result}' not found within timeout`));
                }
            }

            const rawResults = await page.evaluate(config => {
                const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
                const truncate = (value, max) => value.length > max ? `${value.substring(0, max)}...` : value;

                return Array.from(document.querySelectorAll(config.result)).map(element => {
                    const titleEl = element.querySelector(config.title);
                    const linkEl = element.querySelector(config.link);
                    const snippetEl = element.querySelector(config.snippet);

                    const title = normalize(titleEl ? titleEl.textContent : '');
                    const href = linkEl ? linkEl.getAttribute('href') || '' : '';
                    const snippet = truncate(normalize(snippetEl ? snippetEl.textContent : ''), config.maxSnippetLength);

                    return { title, href, snippet };
                }).filter(item => item.title && item.href);
            }, {
                ...selectors,
                maxSnippetLength: options.maxSnippetLength || 400
            });

            const normalizeLink = href => {
                try {
                    if (!href) return '';
                    if (href.includes('ad_domain')) {
                        return `ADS Link`;
                    }
                    
                    if (href.includes('duckduckgo.com/l/?uddg=')) {
                        const urlObj = new URL(`https:${href}`);
                        const encoded = urlObj.searchParams.get('uddg');
                        if (encoded) {
                            return `${decodeURIComponent(encoded)}`;
                        }
                    }
                    if (href.startsWith('//')) {
                        return `https:${href}`;
                    }
                    if (href.startsWith('/')) {
                        return new URL(href, searchUrl).toString();
                    }
                    return href;
                } catch (error) {
                    return href;
                }
            };

            const cleanedResults = rawResults.map(item => ({
                title: item.title,
                url: normalizeLink(item.href),
                snippet: item.snippet.replace(/"/g, '\\"')
            })).filter(item => item.url);

            const limitedResults = cleanedResults.slice(0, limit);
            const duration = Date.now() - startedAt;

            const response = {
                success: limitedResults.length > 0,
                engine,
                query: trimmedQuery,
                limit,
                responseTime: duration,
                results: limitedResults,
                totalResults: cleanedResults.length
            };

            if (options.includeHtml === true) {
                response.rawHtml = await page.content();
            }

            if (options.screenshotPath) {
                await page.screenshot({
                    path: options.screenshotPath,
                    fullPage: options.fullPageScreenshot === true
                });
                response.screenshotPath = options.screenshotPath;
            }

            console.log(chalk.green(`✅ Internet search completed in ${duration}ms (${limitedResults.length} results returned)`));

            return response;

        } catch (error) {
            console.error(chalk.red(`❌ Internet search error: ${error.message}`));
            return {
                success: false,
                error: error.message,
                query: trimmedQuery,
                engine
            };
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch {
                    // Ignore cleanup errors
                }
            }
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
            const metadata = result.metadata || {};
            const pageInfo = metadata.pageInfo || {};
            const wasExtracted = metadata.extracted ?? false;

            if (result.success && wasExtracted) {
                // Tambahkan metadata ke hasil
                result.articleData = {
                    title: pageInfo.title,
                    description: pageInfo.description,
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
