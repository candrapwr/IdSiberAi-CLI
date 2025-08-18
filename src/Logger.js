import fs from 'fs/promises';
import path from 'path';

export class Logger {
    constructor(logDirectory = './logs') {
        this.logDirectory = path.resolve(logDirectory);
        this.currentDate = new Date().toISOString().split('T')[0];
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logDirectory, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }

    getLogFileName(type) {
        return path.join(this.logDirectory, `${type}_${this.currentDate}.log`);
    }

    async writeLog(type, data) {
        try {
            // Ensure log directory exists
            await this.ensureLogDirectory();
            
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                ...data
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            const fileName = this.getLogFileName(type);
            
            await fs.appendFile(fileName, logLine, 'utf8');
        } catch (error) {
            // Fallback: log to console if file logging fails
            console.error(`Failed to write ${type} log:`, error.message);
            console.error('Log data:', JSON.stringify(data, null, 2));
        }
    }

    async logAPIRequest(request, response, metadata = {}) {
        await this.writeLog('api', {
            type: 'api_call',
            request: {
                messages: request.messages,
                model: request.model,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
                stream: request.stream || false
            },
            response: {
                success: response.success,
                message: response.message,
                usage: response.usage,
                error: response.error,
                streaming: response.streaming || false
            },
            metadata: {
                duration_ms: metadata.duration,
                user_input: metadata.userInput,
                tool_calls: metadata.toolCalls || [],
                iterations: metadata.iterations
            }
        });
    }

    async logToolExecution(toolName, parameters, result, metadata = {}) {
        await this.writeLog('tools', {
            type: 'tool_execution',
            tool: {
                name: toolName,
                parameters
            },
            result: {
                success: result?.success || false,
                data: result?.success ? { 
                    message: result.message,
                    path: result.path,
                    files: result.files ? result.files.length : undefined,
                    size: result.size,
                    count: result.count
                } : undefined,
                error: result?.error
            },
            metadata: {
                duration_ms: metadata.duration || 0,
                user_session: metadata.sessionId || 'unknown',
                currentAIProvider: metadata.currentAIProvider || 'unknown'
            }
        });
    }

    async logConversation(userInput, aiResponse, metadata = {}) {
        await this.writeLog('conversation', {
            type: 'conversation',
            user_input: userInput,
            ai_response: aiResponse,
            metadata: {
                session_id: metadata.sessionId,
                iterations: metadata.iterations,
                tools_used: metadata.toolsUsed || [],
                processing_time_ms: metadata.processingTime
            }
        });
    }

    async logError(error, context = {}) {
        await this.writeLog('errors', {
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code,
                status: error.status,
                config: error.config ? {
                    method: error.config.method,
                    url: error.config.url,
                    data: error.config.data
                } : undefined
            },
            response: error.response ? {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            } : undefined,
            request: error.request ? {
                method: error.request.method,
                path: error.request.path,
                headers: error.request.headers
            } : undefined,
            context: {
                ...context,
                timestamp: new Date().toISOString()
            }
        });
    }

    async getLogFiles() {
        try {
            const files = await fs.readdir(this.logDirectory);
            return files.filter(file => file.endsWith('.log'));
        } catch (error) {
            return [];
        }
    }

    async readLogFile(fileName, lines = 100) {
        try {
            const filePath = path.join(this.logDirectory, fileName);
            const content = await fs.readFile(filePath, 'utf8');
            const logLines = content.trim().split('\n').slice(-lines);
            
            return logLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { raw: line };
                }
            });
        } catch (error) {
            throw new Error(`Failed to read log file: ${error.message}`);
        }
    }

    async clearOldLogs(daysToKeep = 7) {
        try {
            const files = await this.getLogFiles();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            for (const file of files) {
                const match = file.match(/(\d{4}-\d{2}-\d{2})/);
                if (match) {
                    const fileDate = new Date(match[1]);
                    if (fileDate < cutoffDate) {
                        await fs.unlink(path.join(this.logDirectory, file));
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to clear old logs:', error.message);
        }
    }
}
