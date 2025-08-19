import { ContextOptimizer } from '../contextManager/index.js';

export class ConversationHandler {
    constructor(options = {}) {
        this.conversationHistory = [];
        
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

# When you need a tool, respond with this EXACT format:
THINKING: [brief analysis]
ACTION: [tool_name]
PARAMETERS: [JSON format]
MESSAGE: [brief action description]

# If you don't need a tool, please respond without special format!

## Available tools

# FILE OPERATIONS TOOLS
- search_files(pattern, directory): Find files
- read_file(file_path): Read file content
- write_file(file_path, content): Create/update file
- append_to_file(file_path, content): Append to file
- delete_file(file_path): Delete file
- copy_file(source_path, destination_path): Copy file
- move_file(source_path, destination_path): Move/rename file
- edit_file(file_path, edits): Edit specific parts of a file

# DIRECTORY OPERATIONS TOOLS
- list_directory(dir_path): List directory contents
- create_directory(dir_path): Create directory
- delete_directory(dir_path): Delete directory

# ANALYSIS TOOLS
- analyze_file_structure(file_path): Analyze code structure
- find_in_files(search_term, directory, file_pattern): Search in files
- replace_in_files(search_term, replace_term, directory, file_pattern): Replace in files

# SYSTEM OPERATIONS TOOLS
- execute_command(command, options): Execute commands

# S3 OPERATIONS TOOLS
- s3_upload(key, file_path): Upload file to S3
- s3_download(key, download_path): Download file from S3  
- s3_delete(key): Delete file from S3
- s3_search(prefix, max_keys): Search files in S3
- s3_set_acl(key, acl): Change file access permissions ('private'|'public-read'|'public-read-write'|etc)

# DATABASE OPERATIONS TOOLS
- execute_query(query, database): Execute SQL query with optional database parameter. If database is not provided, uses the default database from environment variables.

# Database Connection Information
This system is connected to a database with the following configuration:
- When using database tools, you can override the default database by providing the 'database' parameter
- For multiple databases, specify the database name in the query parameter

# Response rules
- Use proper tool call format for each action
- Be direct and concise
- You can only use one tool in a single response, to use multiple tools, plan them sequentially - do one, wait for the results, then move on to the next!
- Focus on current action only

## Example with tool calls (CORRECT):
THINKING: Need to create a directory first
ACTION: create_directory
PARAMETERS: {"dir_path": "project/src"}
MESSAGE: Creating source directory...

## Example of using the edit file tool:
THINKING: Need to update function in a file
ACTION: edit_file
PARAMETERS: {"file_path": "src/utils.js", "edits": [{"oldText": "function oldName() {", "newText": "function newName() {"}]}
MESSAGE: Updating function name in utils.js...

## Example of database operations:
THINKING: Need to query users from the default database
ACTION: execute_query
PARAMETERS: {"query": "SELECT * FROM users LIMIT 10"}
MESSAGE: Fetching user data from default database...

## Example of database operations with specific database:
THINKING: Need to query products from a specific database
ACTION: execute_query
PARAMETERS: {"query": "SELECT * FROM products LIMIT 5", "database": "ecommerce_db"}
MESSAGE: Fetching product data from ecommerce_db database...

## Example without tools (CORRECT):
Please, what can I help you with....

## Task: Execute user requests efficiently and follow database connection guidelines`;

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