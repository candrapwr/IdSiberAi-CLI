import { ContextOptimizer } from '../contextManager/index.js';

export class ConversationHandler {
    constructor(options = {}) {
        this.conversationHistory = [];

        // get db config info
        this.dbConfig = {
            type: process.env.DB_TYPE,
            database: process.env.DB_NAME,
        }

        const parseBoolean = (value, defaultValue = true) => {
            if (value === undefined || value === null || value === '') {
                return defaultValue;
            }
            if (typeof value === 'boolean') {
                return value;
            }
            const normalized = String(value).trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off'].includes(normalized)) return false;
            return defaultValue;
        };

        const defaultToolGroups = {
            files: true,
            directories: true,
            analysis: true,
            system: true,
            s3: true,
            database: true,
            internet: false,
            aiManagement: true,
            logging: true
        };

        const envToolGroups = {
            files: parseBoolean(process.env.ENABLE_FILE_TOOLS, defaultToolGroups.files),
            directories: parseBoolean(process.env.ENABLE_DIRECTORY_TOOLS, defaultToolGroups.directories),
            analysis: parseBoolean(process.env.ENABLE_ANALYSIS_TOOLS, defaultToolGroups.analysis),
            system: parseBoolean(process.env.ENABLE_SYSTEM_TOOLS, defaultToolGroups.system),
            s3: parseBoolean(process.env.ENABLE_S3_TOOLS, defaultToolGroups.s3),
            database: parseBoolean(process.env.ENABLE_DATABASE_TOOLS, defaultToolGroups.database),
            internet: parseBoolean(process.env.ENABLE_INTERNET_TOOLS ?? process.env.TOOLS_INTERNET_ENABLED, defaultToolGroups.internet),
            aiManagement: parseBoolean(process.env.ENABLE_AI_MANAGEMENT_TOOLS, defaultToolGroups.aiManagement),
            logging: parseBoolean(process.env.ENABLE_LOGGING_TOOLS, defaultToolGroups.logging)
        };

        this.enabledToolGroups = {
            ...defaultToolGroups,
            ...envToolGroups,
            ...(options.enabledToolGroups || {})
        };

        this.toolsInternetEnabled = !!this.enabledToolGroups.internet;

        // Initialize Context Optimizer
        this.contextOptimizer = new ContextOptimizer({
            enabled: options.enableContextOptimization !== false,
            actions: options.optimizedActions || ['read_file'],
            maxInstances: options.maxInstances || 1,
            debug: options.debug || false,
            debugLevel: options.debugLevel,
            summaryEnabled: options.summaryEnabled !== false,
            summaryThreshold: options.summaryThreshold,
            summaryRetention: options.summaryRetention,
            summaryRole: options.summaryRole,
            summaryPrefix: options.summaryPrefix,
            summaryMaxLineLength: options.summaryMaxLineLength
        });
    }

    initializeSystemPrompt(availableAIProviders, currentProvider) {
        // Reset ringkasan setiap kali sesi baru dimulai
        this.contextOptimizer.resetSummaryMemory();

        const toolSections = [];

        if (this.enabledToolGroups.files) {
            toolSections.push(`## FILE OPERATIONS TOOLS
- search_files(pattern, directory): Find files
- read_file(file_path): Read file content
- write_file(file_path, content): Create/update file
- append_to_file(file_path, content): Append to file
- delete_file(file_path): Delete file
- copy_file(source_path, destination_path): Copy file
- move_file(source_path, destination_path): Move/rename file
- edit_file(file_path, edits): Edit specific parts of a file`);
        }

        if (this.enabledToolGroups.directories) {
            toolSections.push(`## DIRECTORY OPERATIONS TOOLS
- list_directory(dir_path): List directory contents
- create_directory(dir_path): Create directory
- delete_directory(dir_path): Delete directory`);
        }

        if (this.enabledToolGroups.analysis) {
            toolSections.push(`## ANALYSIS TOOLS
- analyze_file_structure(file_path): Analyze code structure
- find_in_files(search_term, directory, file_pattern): Search in files
- replace_in_files(search_term, replace_term, directory, file_pattern): Replace in files`);
        }

        if (this.enabledToolGroups.system) {
            toolSections.push(`## SYSTEM OPERATIONS TOOLS
- execute_command(command, options): Execute commands`);
        }

        if (this.enabledToolGroups.s3) {
            toolSections.push(`## S3 OPERATIONS TOOLS
- s3_upload(key, file_path): Upload file to S3
- s3_download(key, download_path): Download file from S3  
- s3_delete(key): Delete file from S3
- s3_search(prefix, max_keys): Search files in S3
- s3_set_acl(key, acl): Change file access permissions ('private'|'public-read'|'public-read-write'|etc)`);
        }

        if (this.enabledToolGroups.database) {
            toolSections.push(`## DATABASE OPERATIONS TOOLS
- execute_query(query, database): Execute SQL query with optional database parameter. If database is not provided, uses the default database from environment variables.`);
        }

        if (this.enabledToolGroups.internet) {
            toolSections.push(`## INTERNET OPERATIONS TOOLS
- internet_search(query, options): Perform a live search, supported engine (duckduckgo) and return top organic results. Gunakan dorking operators seperti site:, intitle:, inurl:, filetype:, intext:, "frasa eksak", -kata, OR untuk query lebih presisi. Contoh: node.js current version site:nodejs.org
- access_url(url): Access and retrieve content from the specified URL.`);
        }

        const toolSectionText = toolSections.length > 0
            ? toolSections.join('\n\n')
            : '- No tool categories enabled (all tool groups disabled).';

        const availableToolsSection = `# Available tools:\n\n${toolSectionText}`;

        const internetExampleSection = this.toolsInternetEnabled
            ? `\n\n## Example of using the internet serach tool (CORRECT - ONE TOOL):\nTHINK: Search first, delete later\nTOOLCALL: {"action":"internet_search","parameters":{"query":"news today","options":{"engine":"bing","limit":5}}}`
            : '';

        const systemPrompt = `# AI ASSISTANT PROTOCOL: STREAM-FRIENDLY SINGLE ACTION

## IDENTITY & BEHAVIOR
You are a concise, action-oriented AI assistant with multiple tool capabilities. You execute EXACTLY ONE tool per response.

## MANDATORY EXECUTION RULES
1. **ONE TOOL PER RESPONSE** - Never call multiple tools. This will break the system.
2. **THINKING-FIRST APPROACH** - Always analyze before acting
3. **INFO GATHERING PRIORITY** - Read/search before modify/write
4. **STRICT FORMAT COMPLIANCE** - Follow the exact response format

# Streaming-friendly tool call format (preferred)
# Emit ONE single-line JSON tool call prefixed with TOOLCALL: so it is easy to parse while streaming.
# Keep it on a SINGLE LINE, no line breaks inside the JSON.
# Example:
# TOOLCALL: {"action":"read_file","parameters":{"file_path":"src/app.js"}}

# Optional: you may also stream brief thinking lines prefixed with THINK: which are free text for display only.
# Example:
# THINK: Need to read file before editing

# If you don't need a tool, just reply normally without TOOLCALL.

${availableToolsSection}

# Response rules
- Preferred: a SINGLE-LINE TOOLCALL: { ... } with strictly valid JSON.
- Only ONE action per response. No multiple tools in one response.
- Keep parameters JSON strict (double quotes, no dangling commas, no backticks).
- Be concise. Stream optional THINK: lines, then the TOOLCALL: line when ready.

## Example with tool call (CORRECT - ONE TOOL ONLY):
THINK: Creating directory first, then file later
TOOLCALL: {"action":"create_directory","parameters":{"dir_path":"project/src"}}

## Example of using the edit file tool (CORRECT - ONE TOOL):
THINK: Directly apply edit, fallback if file missing
TOOLCALL: {"action":"edit_file","parameters":{"file_path":"src/utils.js","edits":[{"oldText":"function oldName() {","newText":"function newName() {","oldText":"one","newText":"two"}]}}

## Example with multiple needs (CORRECT - STILL ONE TOOL):
THINK: Search first, delete later
TOOLCALL: {"action":"search_files","parameters":{"pattern":"*.txt","directory":"/docs"}}

## Example without tools (CORRECT):
Please, what can I help you with....

## INCORRECT EXAMPLE (AVOID THIS):
THINK: Need to create dir and write file.
TOOLCALL: {"action":"create_directory"}
TOOLCALL: {"action":"write_file"}  // FORBIDDEN - only one per response!${internetExampleSection}

## The following is configuration information for the database name and database type on this system:
${JSON.stringify(this.dbConfig)}

## Task: Execute user requests efficiently

# FINAL REMINDER: You can only call one tool or action in a single response. To use multiple tools, plan them sequentially in THINKING - do one, wait for the result, then move on to the next! Violating this will break the system.`;

        this.conversationHistory = [
            { role: 'system', content: systemPrompt }
        ];
        return this.conversationHistory;
    }
    
    addUserMessage(message) {
        this.conversationHistory.push({
            role: 'user',
            content: message
        });
    }
    
    addAssistantMessage(message, usage = null) {
        this.conversationHistory.push({
            role: 'assistant',
            content: message,
            usage: usage
        });
    }
    
    // Function untuk menambahkan hasil eksekusi tool
    addToolResult(result) {
        this.conversationHistory.push({
            role: 'user',
            content: result
        });
    }
    
    clearHistory() {
        const systemPrompt = this.conversationHistory[0].content;
        this.conversationHistory = [
            { role: 'system', content: systemPrompt }
        ];
        this.contextOptimizer.resetSummaryMemory();
    }
    
    getConversationHistory() {
        return [...this.conversationHistory];
    }
    
    getNonSystemMessages() {
        return this.conversationHistory.filter(msg => msg.role !== 'system');
    }
    
    getMessageCount() {
        return this.conversationHistory.length;
    }
    
    /**
     * Mengoptimalkan konteks percakapan dengan menghapus redundant tool calls
     * @returns {Object} Hasil optimasi
     */
    optimizeContext() {
        // Clone history terlebih dahulu
        const originalHistory = [...this.conversationHistory];
        const systemPrompt = originalHistory[0]; // Simpan system prompt
        
        // Optimasi dilakukan pada semua pesan kecuali system prompt
        const messagesForOptimization = originalHistory.slice(1);
        
        // Lakukan optimasi
        const result = this.contextOptimizer.optimizeConversation(messagesForOptimization);
        
        if (result.optimized) {
            // Gabungkan kembali system prompt dengan hasil optimasi
            this.conversationHistory = [systemPrompt, ...result.messages];
        }
        
        return {
            optimized: result.optimized,
            messagesRemoved: result.removed,
            newLength: this.conversationHistory.length,
            originalLength: originalHistory.length,
            stats: this.contextOptimizer.getStats(),
            summary: result.summary
        };
    }
    
    /**
     * Mengaktifkan atau menonaktifkan context optimization
     * @param {boolean} enabled Status enabled
     */
    setContextOptimizationEnabled(enabled) {
        return this.contextOptimizer.setEnabled(enabled);
    }
    
    /**
     * Mengatur action mana yang akan dioptimasi
     * @param {Array<string>} actions Daftar nama action
     */
    setOptimizedActions(actions) {
        return this.contextOptimizer.setOptimizedActions(actions);
    }
    
    /**
     * Mendapatkan daftar action yang dioptimasi
     */
    getOptimizedActions() {
        return this.contextOptimizer.getOptimizedActions();
    }
    
    /**
     * Mendapatkan statistik optimasi
     */
    getContextOptimizationStats() {
        return this.contextOptimizer.getStats();
    }
    
    /**
     * Reset statistik optimasi
     */
    resetContextOptimizationStats() {
        return this.contextOptimizer.resetStats();
    }

    /**
     * Replace entire conversation history with provided messages
     * @param {Array} messages
     */
    setConversationHistory(messages = []) {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Conversation history must include at least one message');
        }

        const firstMessage = messages[0];
        if (!firstMessage || firstMessage.role !== 'system') {
            throw new Error('Conversation history must start with a system message');
        }

        // clone to avoid accidental mutation from outside
        this.conversationHistory = messages.map(message => ({ ...message }));
        this.contextOptimizer.resetSummaryMemory();
        return this.conversationHistory;
    }

    /**
     * Mendapatkan status konteks optimasi
     */
    getContextOptimizerStatus() {
        return {
            enabled: this.contextOptimizer.enabled,
            optimizedActions: this.contextOptimizer.getOptimizedActions(),
            maxInstances: this.contextOptimizer.maxInstances,
            stats: this.contextOptimizer.getStats(),
            version: this.contextOptimizer.version || 'unknown',
            debug: this.contextOptimizer.debug,
            debugLevel: this.contextOptimizer.debugLevel
        };
    }
    
    /**
     * Mengatur debug mode pada context optimizer
     */
    setContextOptimizerDebug(enabled, level = 1) {
        return this.contextOptimizer.setDebug(enabled, level);
    }
}
