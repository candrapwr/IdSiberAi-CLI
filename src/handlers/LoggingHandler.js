import chalk from 'chalk';

export class LoggingHandler {
    constructor(logger, aiManager) {
        this.logger = logger;
        this.aiManager = aiManager;
    }
    
    async logConversation(userInput, finalResponse, metadata) {
        if (!this.logger) return;
        
        try {
            await this.logger.logConversation(userInput, finalResponse, metadata);
        } catch (error) {
            console.error(chalk.red(`❌ Failed to log conversation: ${error.message}`));
        }
    }
    
    async logError(error, context) {
        if (!this.logger) return;
        
        try {
            await this.logger.logError(error, context);
        } catch (logError) {
            console.error(chalk.red(`❌ Failed to log error: ${logError.message}`));
        }
    }
    
    async getAPIUsage() {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            return await this.aiManager.getUsageStats();
        } catch (error) {
            return { error: error.message };
        }
    }
    
    async getRecentLogs(logType = 'conversation', lines = 50) {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            const files = await this.logger.getLogFiles();
            const logFiles = files.filter(file => file.startsWith(logType));
            
            if (logFiles.length === 0) {
                return { logs: [], message: `No ${logType} logs found` };
            }
            
            // Get the most recent log file
            const latestFile = logFiles.sort().pop();
            const logs = await this.logger.readLogFile(latestFile, lines);
            
            return {
                success: true,
                logs,
                file: latestFile,
                count: logs.length
            };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    async clearOldLogs(days = 7) {
        if (!this.logger) {
            return { error: 'Logging is not enabled' };
        }
        
        try {
            await this.logger.clearOldLogs(days);
            return { success: true, message: `Cleared logs older than ${days} days` };
        } catch (error) {
            return { error: error.message };
        }
    }
}