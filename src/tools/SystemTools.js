import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { ValidationHelper } from './ValidationHelper.js';

export class SystemTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
        this.notAllowedCommands = [
            'sudo'
        ];
    }

    async executeCommand(command, options = {}) {
        try {
            // Validate command
            const commandParts = command.split(/\s+/);
            const baseCommand = commandParts[0];
            
            if (this.notAllowedCommands.includes(baseCommand)) {
                return {
                    success: false,
                    error: `Command '${baseCommand}' is not allowed}`
                };
            }
            
            // Set default options
            const execOptions = {
                cwd: this.workingDirectory,
                timeout: options.timeout || 30000,
                maxBuffer: 1024 * 1024 * 10, // 10MB
                ...options
            };
            
            // Execute command
            return new Promise((resolve) => {
                exec(command, execOptions, (error, stdout, stderr) => {
                    if (error) {
                        resolve({
                            success: false,
                            error: error.message,
                            command,
                            stderr: stderr,
                            code: error.code
                        });
                    } else {
                        resolve({
                            success: true,
                            command,
                            stdout: stdout,
                            stderr: stderr,
                            message: `Command executed successfully: ${command}`
                        });
                    }
                });
            });
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getWorkingDirectoryInfo() {
        try {
            // Get directory size
            const getDirSize = async (dirPath) => {
                let size = 0;
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                
                for (const file of files) {
                    const filePath = path.join(dirPath, file.name);
                    
                    if (file.isDirectory()) {
                        size += await getDirSize(filePath);
                    } else {
                        const stats = await fs.stat(filePath);
                        size += stats.size;
                    }
                }
                
                return size;
            };
            
            // Get top-level files and directories
            const entries = await fs.readdir(this.workingDirectory, { withFileTypes: true });
            
            const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
            const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);
            
            // Get file counts by extension
            const filesByExtension = {};
            
            for (const file of files) {
                const ext = path.extname(file).toLowerCase() || 'no-extension';
                filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;
            }
            
            const totalSize = await getDirSize(this.workingDirectory);
            
            return {
                success: true,
                path: this.workingDirectory,
                files: files.length,
                directories: directories.length,
                filesByExtension,
                totalSize,
                humanSize: this.formatSize(totalSize),
                topDirectories: directories.slice(0, 10),
                topFiles: files.slice(0, 10)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper to format size in human-readable format
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
}