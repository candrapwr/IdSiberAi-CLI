/**
 * ContextOptimizer.js
 * 
 * Class untuk mengoptimalkan konteks percakapan dengan menghapus 
 * pemanggilan tool yang berulang (terutama read_file) dan hasilnya,
 * sambil mempertahankan instance terakhir.
 */

export class ContextOptimizer {
    constructor(options = {}) {
        // Fitur diaktifkan atau tidak
        this.enabled = options.enabled !== false;
        
        // Daftar action tools yang akan dioptimasi
        this.optimizedActions = new Set(options.actions || ['read_file']);
        
        // Batas maksimum instance tool yang sama (nilai default 1 = hanya simpan yang terakhir)
        this.maxInstances = options.maxInstances || 1;
        
        // Log detail optimasi
        this.debug = options.debug || false;
        
        // Level logging (1-3, dengan 3 paling detail)
        this.debugLevel = options.debugLevel || 1; // Reduced to 1 untuk logging minimal

        // Pengaturan ringkasan konteks (mirip approach extension IDE)
        this.summaryEnabled = options.summaryEnabled !== false;
        this.summaryThreshold = options.summaryThreshold || 12; // Minimal panjang percakapan sebelum disingkat
        this.summaryRetention = options.summaryRetention || 6; // Jumlah pesan terbaru yang tetap utuh
        this.summaryRole = options.summaryRole || 'assistant';
        this.summaryPrefix = options.summaryPrefix || 'Context summary (auto-generated):';
        this.summaryMaxLineLength = options.summaryMaxLineLength || 200;

        // Penyimpanan ringkasan
        this.summaryLines = [];
        this.summaryFingerprints = new Set();
        this.lastSummaryContent = '';

        // Statistik optimasi
        this.stats = {
            messagesRemoved: 0,
            totalOptimizations: 0,
            lastOptimizationTime: null,
            tokensSaved: 0, // Estimasi
            summaryMessagesGenerated: 0,
            summaryLinesTracked: 0
        };
        
        // Version tracking (untuk membantu debugging)
        this.version = "1.3.0"; // Add contextual summarization support
        
        // Minimal log on initialization
        if (this.debug) {
            console.log(`[Context Optimizer] Initialized v${this.version}`);
        }
    }

    /**
     * Mengaktifkan atau menonaktifkan optimizer
     * @param {boolean} enabled Status enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        return this.enabled;
    }

    /**
     * Menambahkan action ke daftar yang dioptimasi
     * @param {string} action Nama action tool
     */
    addOptimizedAction(action) {
        this.optimizedActions.add(action);
        return Array.from(this.optimizedActions);
    }

    /**
     * Menghapus action dari daftar yang dioptimasi
     * @param {string} action Nama action tool
     */
    removeOptimizedAction(action) {
        this.optimizedActions.delete(action);
        return Array.from(this.optimizedActions);
    }

    /**
     * Mengatur daftar action yang akan dioptimasi
     * @param {Array<string>} actions Daftar nama action
     */
    setOptimizedActions(actions) {
        this.optimizedActions = new Set(actions);
        return Array.from(this.optimizedActions);
    }

    /**
     * Mendapatkan daftar action yang dioptimasi
     */
    getOptimizedActions() {
        return Array.from(this.optimizedActions);
    }

    /**
     * Mendapatkan statistik optimasi
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Mengaktifkan atau menonaktifkan logging
     * @param {boolean} enabled Status logging
     * @param {number} level Level detail logging (1-3)
     */
    setDebug(enabled, level = 1) {
        this.debug = enabled;
        this.debugLevel = level;
        return {
            debug: this.debug,
            debugLevel: this.debugLevel
        };
    }

    /**
     * Reset statistik optimasi
     */
    resetStats() {
        this.stats = {
            messagesRemoved: 0,
            totalOptimizations: 0,
            lastOptimizationTime: null,
            tokensSaved: 0,
            summaryMessagesGenerated: 0,
            summaryLinesTracked: 0
        };
        this.resetSummaryMemory();
        return this.stats;
    }

    /**
     * Mengosongkan memori ringkasan sehingga percakapan baru tidak bercampur
     */
    resetSummaryMemory() {
        this.summaryLines = [];
        this.summaryFingerprints = new Set();
        this.lastSummaryContent = '';
    }

    /**
     * Mengecek apakah pesan merupakan ringkasan yang dihasilkan optimizer
     * @param {Object} message
     * @returns {boolean}
     */
    isSummaryMessage(message = {}) {
        if (!message) return false;
        if (message.metadata && message.metadata.isSummary) return true;
        if (typeof message.content !== 'string') return false;
        return message.content.startsWith(this.summaryPrefix);
    }

    normalizeWhitespace(value = '') {
        return value.replace(/\s+/g, ' ').trim();
    }

    truncate(value = '', max = this.summaryMaxLineLength) {
        if (!value) return '';
        if (value.length <= max) return value;
        return `${value.substring(0, max - 3)}...`;
    }

    createFingerprint(role, descriptor) {
        return `${role}:${descriptor}`.toLowerCase();
    }

    formatParameters(parameters) {
        if (!parameters) return '';
        try {
            const parsed = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
            if (parsed && typeof parsed === 'object') {
                const keys = Object.keys(parsed);
                if (keys.length === 0) return '';
                return keys
                    .slice(0, 3)
                    .map(key => `${key}=${this.truncate(String(parsed[key]), 60)}`)
                    .join(', ');
            }
        } catch (_) {
            // Abaikan parsing error, fallback ke string mentah
        }
        return typeof parameters === 'string' ? this.truncate(parameters, 80) : '';
    }

    extractAssistantToolCalls(message) {
        const calls = [];
        if (!message || message.role !== 'assistant') return calls;

        if (Array.isArray(message.tool_calls)) {
            for (const toolCall of message.tool_calls) {
                const action = toolCall?.function?.name;
                if (!action) continue;
                calls.push({
                    action,
                    parameters: toolCall.function.arguments
                });
            }
        }

        if (typeof message.content === 'string') {
            const lines = message.content.split(/\r?\n/);
            for (const line of lines) {
                const match = line.match(/^\s*TOOLCALL:\s*(\{.*\})\s*$/);
                if (!match) continue;
                try {
                    const payload = JSON.parse(match[1]);
                    if (payload?.action) {
                        calls.push({
                            action: payload.action,
                            parameters: payload.parameters
                        });
                    }
                } catch (_) {
                    continue;
                }
            }
        }

        return calls;
    }

    summarizeAssistantMessage(message) {
        if (!message || message.role !== 'assistant') return null;

        const toolCalls = this.extractAssistantToolCalls(message);
        if (toolCalls.length > 0) {
            const summaries = toolCalls.map(call => {
                const params = this.formatParameters(call.parameters);
                return params
                    ? `Used ${call.action} (${params})`
                    : `Used ${call.action}`;
            });
            return summaries.join(' | ');
        }

        if (typeof message.content === 'string' && message.content.trim()) {
            const normalized = this.normalizeWhitespace(message.content);
            return normalized ? `Assistant replied: ${this.truncate(normalized)}` : null;
        }

        return null;
    }

    summarizeUserMessage(message) {
        if (!message || message.role !== 'user') return null;
        if (typeof message.content !== 'string') return null;

        // Tool result format: "Tool result for <action>:\n{json}"
        const toolResultMatch = message.content.match(/^Tool result for\s+([\w_-]+):\s*\n([\s\S]*)$/);
        if (toolResultMatch) {
            const action = toolResultMatch[1];
            const jsonPart = toolResultMatch[2] || '';
            let descriptor = '';
            try {
                const parsed = JSON.parse(jsonPart);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.file_path) {
                        descriptor = `file=${this.truncate(parsed.file_path, 80)}`;
                    } else if (parsed.directory) {
                        descriptor = `dir=${this.truncate(parsed.directory, 80)}`;
                    } else if (parsed.message) {
                        descriptor = this.truncate(parsed.message);
                    } else if (parsed.files && Array.isArray(parsed.files)) {
                        descriptor = `${parsed.files.length} files`;
                    }
                }
            } catch (_) {
                descriptor = this.truncate(jsonPart);
            }

            return descriptor
                ? `Result of ${action}: ${descriptor}`
                : `Result of ${action}`;
        }

        if (message.content.startsWith('Context summary')) {
            return null;
        }

        const normalized = this.normalizeWhitespace(message.content);
        return normalized ? `User said: ${this.truncate(normalized)}` : null;
    }

    extractSummaryLines(messages) {
        const newLines = [];
        for (const message of messages) {
            if (this.isSummaryMessage(message)) continue;
            let summaryLine = null;
            if (message.role === 'assistant') {
                summaryLine = this.summarizeAssistantMessage(message);
            } else if (message.role === 'user') {
                summaryLine = this.summarizeUserMessage(message);
            } else if (message.role === 'system') {
                // Sistem prompt di luar lingkup ringkasan
                continue;
            }

            if (!summaryLine) continue;

            const fingerprint = this.createFingerprint(message.role, summaryLine);
            if (this.summaryFingerprints.has(fingerprint)) continue;
            this.summaryFingerprints.add(fingerprint);
            this.summaryLines.push(summaryLine);
            newLines.push(summaryLine);
        }
        return newLines;
    }

    composeSummaryContent() {
        if (!this.summaryEnabled || this.summaryLines.length === 0) {
            return '';
        }

        const bulletLines = this.summaryLines.map(line => `- ${line}`);
        return `${this.summaryPrefix}\n${bulletLines.join('\n')}`;
    }

    applySummarization(messages) {
        if (!this.summaryEnabled) {
            return { messages, summaryChanged: false };
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            return { messages, summaryChanged: false };
        }

        // Pisahkan ringkasan yang sudah ada agar tidak diduplikasi
        let existingSummaryMessage = null;
        const workingMessages = [];
        for (const message of messages) {
            if (!existingSummaryMessage && this.isSummaryMessage(message)) {
                existingSummaryMessage = message;
            } else {
                workingMessages.push(message);
            }
        }

        if (workingMessages.length <= this.summaryThreshold) {
            if (existingSummaryMessage) {
                return {
                    messages: [existingSummaryMessage, ...workingMessages],
                    summaryChanged: false
                };
            }
            return { messages: workingMessages, summaryChanged: false };
        }

        const slicePoint = Math.max(workingMessages.length - this.summaryRetention, 0);
        const oldMessages = workingMessages.slice(0, slicePoint);
        const recentMessages = workingMessages.slice(slicePoint);

        const newLines = this.extractSummaryLines(oldMessages);
        const summaryContent = this.composeSummaryContent();

        if (!summaryContent && existingSummaryMessage) {
            return {
                messages: [existingSummaryMessage, ...recentMessages],
                summaryChanged: false
            };
        }

        if (!summaryContent) {
            return { messages: recentMessages, summaryChanged: false };
        }

        const summaryMessage = {
            role: this.summaryRole,
            content: summaryContent,
            metadata: {
                isSummary: true,
                totalLines: this.summaryLines.length
            }
        };

        const summaryChanged = summaryContent !== this.lastSummaryContent || newLines.length > 0;
        this.lastSummaryContent = summaryContent;

        return {
            messages: [summaryMessage, ...recentMessages],
            summaryChanged,
            summaryLinesAdded: newLines.length,
            summaryMessage
        };
    }

    /**
     * Mengoptimalkan daftar pesan dengan menghapus tool calls yang berulang
     * @param {Array} messages Daftar pesan percakapan
     * @returns {Object} Result dari optimasi dan pesan yang diperbarui
     */
    optimizeConversation(messages) {
        if (!this.enabled || !messages || messages.length < 3) {
            if (this.debug) console.log("[Context Optimizer] Skipping optimization: disabled or too few messages");
            return { 
                optimized: false, 
                messages: messages,
                removed: 0
            };
        }

        // Validasi: Periksa apakah messages array kosong atau tidak valid
        if (!Array.isArray(messages) || messages.length === 0) {
            if (this.debug) console.log("[Context Optimizer] Invalid messages array");
            return {
                optimized: false,
                messages: messages,
                removed: 0
            };
        }

        // Validasi: Jika hanya ada sistem prompt atau tidak ada pesan user/assistant, skip
        let hasUserMessages = false;
        let hasAssistantMessages = false;
        for (const msg of messages) {
            if (msg.role === 'user') hasUserMessages = true;
            if (msg.role === 'assistant') hasAssistantMessages = true;
            if (hasUserMessages && hasAssistantMessages) break;
        }
        
        if (!hasUserMessages || !hasAssistantMessages) {
            if (this.debug) console.log("[Context Optimizer] Insufficient message types for optimization");
            return {
                optimized: false,
                messages: messages,
                removed: 0
            };
        }

        const startTime = Date.now();
        
        // Reset processed patterns
        this.processedPatterns = new Set();
        
        // Clone messages agar tidak mengubah array asli
        let optimizedMessages = [...messages];
        
        // Map untuk melacak tool calls
        // Key: action name + JSON.stringify(parameters)
        // Value: array of indices dalam array messages
        const toolCallMap = new Map();
        
        // Set untuk melacak indeks pesan yang akan dihapus
        const indicesToRemove = new Set();
        
        if (this.debug && this.debugLevel > 1) {
            console.log(`[Context Optimizer] Scanning ${optimizedMessages.length} messages for optimization...`);
            console.log(`[Context Optimizer] Looking for actions: ${Array.from(this.optimizedActions).join(', ')}`);
        }

        // Menambahkan fungsi debugging untuk melihat pesan
        const debugMessage = (i, message) => {
            if (!this.debug || this.debugLevel < 3) return;
            
            const preview = message.content 
                ? message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '')
                : '[No content]';
            
            console.log(`[Context Optimizer] Message #${i}: role=${message.role}, content preview="${preview}"`);
            
            // Jika ini adalah pesan asisten, cek format tool calls
            if (message.role === 'assistant') {
                if (message.tool_calls) {
                    console.log(`[Context Optimizer] Message has ${message.tool_calls.length} tool_calls in OpenAI format`);
                } else if (message.content && message.content.includes('TOOLCALL:')) {
                    console.log(`[Context Optimizer] Message has TOOLCALL pattern`);
                } else if (message.content && message.content.includes('read_file')) {
                    console.log(`[Context Optimizer] Message may contain read_file calls`);
                }
            }
        };
        
        // Debug pesan yang terlibat untuk memahami struktur
        if (this.debug && this.debugLevel > 2) {
            console.log(`[Context Optimizer] Debugging first 5 messages:`);
            for (let i = 0; i < Math.min(5, optimizedMessages.length); i++) {
                debugMessage(i, optimizedMessages[i]);
            }
            
            // Debug pesan terakhir juga
            if (optimizedMessages.length > 5) {
                console.log(`[Context Optimizer] Debugging last 3 messages:`);
                for (let i = optimizedMessages.length - 3; i < optimizedMessages.length; i++) {
                    if (i >= 0) debugMessage(i, optimizedMessages[i]);
                }
            }
        }
        
        // Langkah 1: Identifikasi semua tool calls yang relevan
        for (let i = 0; i < optimizedMessages.length; i++) {
            const message = optimizedMessages[i];
            
            // Cari tool call dalam pesan asisten (dengan format yang berbeda-beda tergantung provider)
            if (message.role === 'assistant') {
                // OpenAI format
                if (message.tool_calls && Array.isArray(message.tool_calls)) {
                    for (const toolCall of message.tool_calls) {
                        if (toolCall.function && 
                            this.optimizedActions.has(toolCall.function.name)) {
                            
                            const key = `${toolCall.function.name}:${toolCall.function.arguments}`;
                            if (this.debug && this.debugLevel > 1) {
                                console.log(`[Context Optimizer] Found OpenAI tool call: ${toolCall.function.name} at index ${i}`);
                            }
                            
                            if (!toolCallMap.has(key)) {
                                toolCallMap.set(key, []);
                            }
                            toolCallMap.get(key).push(i);
                        }
                    }
                } 
                // Format custom DeepSeek/Claude
                else if (message.content) {
                    // Cari pola tool call dalam teks
                    // Tambahan: dukung format streaming single-line
                    //   TOOLCALL: {"action":"read_file","parameters":{...}}
                    try {
                        const lines = message.content.split(/\r?\n/);
                        for (const line of lines) {
                            const m = line.match(/^\s*TOOLCALL:\s*(\{.*\})\s*$/);
                            if (m) {
                                try {
                                    const obj = JSON.parse(m[1]);
                                    const action = obj?.action;
                                    if (action && this.optimizedActions.has(action)) {
                                        const paramsText = JSON.stringify(obj.parameters || {});
                                        const key = `${action}:${paramsText}`;
                                        if (this.debug && this.debugLevel > 1) {
                                            console.log(`[Context Optimizer] Found TOOLCALL line for ${action} at index ${i}`);
                                        }
                                        if (!toolCallMap.has(key)) {
                                            toolCallMap.set(key, []);
                                        }
                                        toolCallMap.get(key).push(i);
                                    }
                                } catch (_) {
                                    // ignore malformed TOOLCALL
                                }
                            }
                        }
                    } catch (_) {
                        // ignore
                    }

                    // Format naratif lama: "I'll use the read_file tool to ..." atau sejenisnya
                    
                    // Cek setiap action yang dioptimasi
                    for (const action of this.optimizedActions) {
                        // Pola umum untuk mendeteksi tool call (tanpa ACTION/THINKING/PARAMETERS)
                        const patterns = [
                            // Naratif: "I'll use read_file to... {json}"
                            new RegExp(`(I'll use|I will use|Using|Let me use|Let's use)\\s+(?:the\\s+)?${action}\\s+(?:tool\\s+)?(?:to|function|action)[\\s\\S]+?(\\{[\\s\\S]+?\\})`, 'i'),
                            
                            // Bentuk fungsi: read_file({ ... })
                            new RegExp(`${action}\\s*\\(([\\s\\S]+?)\\)`, 'i'),
                            
                            // Naratif lain: "I need to use read_file ... {json}"
                            new RegExp(`(I need to|I should|I can|I will)\\s+(?:use\\s+)?${action}\\s+(?:to|for)[\\s\\S]+?(\\{[\\s\\S]+?\\})`, 'i')
                        ];
                        
                        // Coba setiap pola
                        for (const regex of patterns) {
                            const match = message.content.match(regex);
                            
                            if (match) {
                                try {
                                    // Coba ekstrak parameter dari JSON
                                    let paramsText = match[1].trim();
                                    
                                    // Coba temukan JSON dalam teks
                                    const startBrace = paramsText.indexOf('{');
                                    const endBrace = paramsText.lastIndexOf('}');
                                    
                                    if (startBrace !== -1 && endBrace !== -1) {
                                        paramsText = paramsText.substring(startBrace, endBrace + 1);
                                    }
                                    
                                    // Buat key berdasarkan action dan parameter
                                    const key = `${action}:${paramsText}`;
                                    if (this.debug && this.debugLevel > 1) {
                                        console.log(`[Context Optimizer] Found text-based tool call: ${action} at index ${i}`);
                                        console.log(`[Context Optimizer] Parameter text: ${paramsText.substring(0, 50)}...`);
                                    }
                                    
                                    // Hanya tambahkan ke map jika pattern ini belum diproses untuk message ini
                                    const messageKey = `${i}:${key}`;
                                    if (!this.processedPatterns) {
                                        this.processedPatterns = new Set();
                                    }
                                    
                                    if (!this.processedPatterns.has(messageKey)) {
                                        this.processedPatterns.add(messageKey);
                                        
                                        if (!toolCallMap.has(key)) {
                                            toolCallMap.set(key, []);
                                        }
                                        toolCallMap.get(key).push(i);
                                    } else if (this.debug && this.debugLevel > 1) {
                                        console.log(`[Context Optimizer] Skipping duplicate pattern match for message ${i}`);
                                    }
                                } catch (error) {
                                    // Abaikan jika parsing gagal
                                    if (this.debug && this.debugLevel > 1) {
                                        console.log(`[Context Optimizer] Error parsing tool parameters: ${error.message}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Langkah 2: Untuk setiap tool call dengan key yang sama, 
        // hapus semua kecuali instance terakhir
        if (this.debug) {
            console.log(`[Context Optimizer] Found ${toolCallMap.size} unique tool calls`);
        }
        
        for (const [key, indices] of toolCallMap.entries()) {
            if (this.debug && this.debugLevel > 1) {
                console.log(`[Context Optimizer] Tool call "${key.split(':')[0]}" appears ${indices.length} times`);
            }
            
            if (indices.length > this.maxInstances) {
                // Sorting indices ascending untuk memastikan kita menghapus yang paling lama
                indices.sort((a, b) => a - b);
                
                // Ambil semua kecuali maxInstances terakhir yang akan dihapus
                // Catatan: Kita hanya menyimpan instance yang paling terbaru
                const indicesToDelete = indices.slice(0, indices.length - this.maxInstances);
                if (this.debug && this.debugLevel > 1) {
                    console.log(`[Context Optimizer] Deleting ${indicesToDelete.length} oldest instances at indices: ${indicesToDelete.join(', ')}`);
                    console.log(`[Context Optimizer] Keeping only the most recent ${this.maxInstances} instance(s) at index: ${indices.slice(indices.length - this.maxInstances).join(', ')}`);
                }
                
                // Tandai semua instance lama untuk dihapus
                for (const assistantIndex of indicesToDelete) {
                    indicesToRemove.add(assistantIndex);
                    
                    // Cari juga hasil tool setelah pesan asisten ini
                    if (assistantIndex + 1 < optimizedMessages.length && 
                        optimizedMessages[assistantIndex + 1].role === 'user' &&
                        (optimizedMessages[assistantIndex + 1].content.startsWith('Tool result for') ||
                         optimizedMessages[assistantIndex + 1].content.includes('Tool result:'))) {
                        
                        indicesToRemove.add(assistantIndex + 1);
                        if (this.debug && this.debugLevel > 2) {
                            console.log(`[Context Optimizer] Marking for removal: assistant message at ${assistantIndex} and tool result at ${assistantIndex + 1}`);
                        }
                    } else if (this.debug && this.debugLevel > 2) {
                        console.log(`[Context Optimizer] Marking for removal: assistant message at ${assistantIndex} (no tool result found)`);
                    }
                }
            } else if (this.debug && this.debugLevel > 1) {
                console.log(`[Context Optimizer] No optimization needed for this tool call (instances <= maxInstances)`);
            }
        }
        
        // Filter untuk pesan yang akan dihapus
        // Pastikan kita tidak menghapus pesan terlalu banyak
        const safeGuard = (index) => {
            // Jangan hapus pesan sistem atau pesan sangat awal
            if (index < 1) { // Index 0 biasanya sistem prompt
                if (this.debug && this.debugLevel > 2) {
                    console.log(`[Context Optimizer] Safe guard: Not removing system message at index ${index}`);
                }
                return false;
            }
            
            // Jangan hapus jika hanya sedikit pesan (biarkan paling tidak 5 pesan tersisa)
            if (optimizedMessages.length - indicesToRemove.size <= 5) {
                if (this.debug && this.debugLevel > 2) {
                    console.log(`[Context Optimizer] Safe guard: Preserving minimum context length`);
                }
                return false;
            }
            
            // Secara default, izinkan penghapusan
            return true;
        };
        
        // Terapkan safe guard ke indicesToRemove
        const finalIndicesToRemove = new Set();
        for (const index of indicesToRemove) {
            if (safeGuard(index)) {
                finalIndicesToRemove.add(index);
            }
        }
        
        let removedCount = 0;
        if (finalIndicesToRemove.size > 0) {
            if (this.debug) {
                console.log(`[Context Optimizer] Removing ${finalIndicesToRemove.size} messages after safe guard check`);
                if (this.debugLevel > 1) {
                    console.log(`[Context Optimizer] Indices to remove: ${Array.from(finalIndicesToRemove).join(', ')}`);
                }
            }

            optimizedMessages = optimizedMessages.filter((_, index) => !finalIndicesToRemove.has(index));
            removedCount = finalIndicesToRemove.size;

            this.stats.messagesRemoved += removedCount;
            this.stats.tokensSaved += removedCount * 100; // Estimasi kasar
        }

        const summaryResult = this.applySummarization(optimizedMessages);
        optimizedMessages = summaryResult.messages;

        const endTime = Date.now();

        const summaryChanged = summaryResult.summaryChanged || false;
        if (summaryChanged) {
            this.stats.summaryMessagesGenerated++;
        }
        this.stats.summaryLinesTracked = this.summaryLines.length;

        const optimizedOccurred = removedCount > 0 || summaryChanged;
        if (optimizedOccurred) {
            this.stats.totalOptimizations++;
            this.stats.lastOptimizationTime = new Date();
        }

        if (this.debug) {
            console.log(`[Context Optimizer] Optimization completed in ${endTime - startTime}ms`);
            console.log(`[Context Optimizer] Removed ${removedCount} redundant messages`);
            
            if (this.debugLevel > 1) {
                console.log(`[Context Optimizer] New message count: ${optimizedMessages.length}`);
                console.log(`[Context Optimizer] Total optimizations: ${this.stats.totalOptimizations}`);
                console.log(`[Context Optimizer] Total messages removed: ${this.stats.messagesRemoved}`);
                console.log(`[Context Optimizer] Estimated tokens saved: ${this.stats.tokensSaved}`);
                if (summaryChanged) {
                    console.log(`[Context Optimizer] Summary updated with ${summaryResult.summaryLinesAdded || 0} new line(s)`);
                }
            }
        }
        
        return {
            optimized: optimizedOccurred,
            messages: optimizedMessages,
            removed: removedCount,
            processingTime: endTime - startTime,
            summary: {
                updated: summaryChanged,
                lines: this.summaryLines.length
            }
        };
    }
}
