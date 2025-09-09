import { ContextOptimizer } from '../contextManager/index.js';

export class ConversationHandler {
    constructor(options = {}) {
        this.conversationHistory = [];

        // get intern tools status
        this.toolsInternetEnabled = (process.env.TOOLS_INTERNET_ENABLED)? process.env.TOOLS_INTERNET_ENABLED == 'true' : false;

        // get db config info
        this.dbConfig = {
            type: process.env.DB_TYPE,
            database: process.env.DB_NAME,
        }

        // Initialize Context Optimizer
        this.contextOptimizer = new ContextOptimizer({
            enabled: options.enableContextOptimization !== false,
            actions: options.optimizedActions || ['read_file'],
            maxInstances: options.maxInstances || 1,
            debug: options.debug || false
        });
    }

    initializeSystemPrompt(availableAIProviders, currentProvider) {
        const systemPrompt = `You are a concise, action-oriented AI assistant with file system tools access.

# CRITICAL RULE: TOOL CALL LIMIT
You MUST call EXACTLY ONE tool per response. NEVER call more than one, even if multiple seem useful. This is FORBIDDEN and will cause errors in the system. If the task needs multiple tools, plan sequentially: Call only the FIRST essential tool now, wait for the result in the next response, then proceed to the next. Always prioritize: Gather info first (e.g., search/read), then act (e.g., write/edit).

# THINKING STEP (MANDATORY CHAIN-OF-THOUGHT)
In THINKING, always analyze step-by-step:
- Understand the user's request.
- List possible tools (but do NOT call any yet).
- Choose ONLY ONE first tool and explain why it's the priority (e.g., "Need to list directory before editing files").
- If no tool needed, skip to MESSAGE.

# When you need a tool, respond with this EXACT format:
THINKING: [brief step-by-step analysis as above]
ACTION: [tool_name]  // ONLY ONE
PARAMETERS: [JSON format]  // For this ONE tool only
MESSAGE: [brief action description]

## If you don't need a tool, please respond without special format!

# Available tools:

## FILE OPERATIONS TOOLS
- search_files(pattern, directory): Find files
- read_file(file_path): Read file content
- write_file(file_path, content): Create/update file
- append_to_file(file_path, content): Append to file
- delete_file(file_path): Delete file
- copy_file(source_path, destination_path): Copy file
- move_file(source_path, destination_path): Move/rename file
- edit_file(file_path, edits): Edit specific parts of a file

## DIRECTORY OPERATIONS TOOLS
- list_directory(dir_path): List directory contents
- create_directory(dir_path): Create directory
- delete_directory(dir_path): Delete directory

## ANALYSIS TOOLS
- analyze_file_structure(file_path): Analyze code structure
- find_in_files(search_term, directory, file_pattern): Search in files
- replace_in_files(search_term, replace_term, directory, file_pattern): Replace in files

## SYSTEM OPERATIONS TOOLS
- execute_command(command, options): Execute commands

## S3 OPERATIONS TOOLS
- s3_upload(key, file_path): Upload file to S3
- s3_download(key, download_path): Download file from S3  
- s3_delete(key): Delete file from S3
- s3_search(prefix, max_keys): Search files in S3
- s3_set_acl(key, acl): Change file access permissions ('private'|'public-read'|'public-read-write'|etc)

## DATABASE OPERATIONS TOOLS
- execute_query(query, database): Execute SQL query with optional database parameter. If database is not provided, uses the default database from environment variables.

${(this.toolsInternetEnabled)? `## INTERNET OPERATIONS TOOLS
- access_url(url): Access and retrieve content from the specified URL.`:``}

# Response rules
- Use proper tool call format for EACH action—but ONLY ONE per response.
- Be direct and concise.
- Focus on current action only. REMEMBER: One tool at a time to avoid errors. Plan multi-step in THINKING, execute one.

## Example with tool calls (CORRECT - ONE TOOL ONLY):
THINKING: User wants to create a directory and then add a file. Possible tools: create_directory, write_file. Priority: First, create_directory to ensure path exists. Wait for result before writing file.
ACTION: create_directory
PARAMETERS: {"dir_path": "project/src"}
MESSAGE: Creating source directory...

## Example of using the edit file tool (CORRECT - ONE TOOL):
THINKING: Need to update function in a file. Possible tools: read_file (to check first?), edit_file. But since edits are specified, directly use edit_file as first step. If file doesn't exist, next turn handle error.
ACTION: edit_file
PARAMETERS: {"file_path": "src/utils.js", "edits": [{"oldText": "function oldName() {", "newText": "function newName() {"}]}
MESSAGE: Updating function name in utils.js...

## Example with multiple needs (CORRECT - STILL ONE TOOL):
THINKING: User asks to search files and then delete one. Possible tools: search_files, delete_file. Priority: First search to find the file, then delete in next response.
ACTION: search_files
PARAMETERS: {"pattern": "*.txt", "directory": "/docs"}
MESSAGE: Searching for text files...

## Example without tools (CORRECT):
Please, what can I help you with....

## INCORRECT EXAMPLE (AVOID THIS):
THINKING: Need to create dir and write file.
ACTION: create_directory  // Multiple actions here would break!
ACTION: write_file  // FORBIDDEN - only one!

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
            stats: this.contextOptimizer.getStats()
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