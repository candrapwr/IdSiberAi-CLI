import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { ValidationHelper } from './ValidationHelper.js';

export class FileTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
    }

    async searchFiles(pattern, directory = '') {
        try {
            const searchDir = directory 
                ? path.join(this.workingDirectory, directory) 
                : this.workingDirectory;
            
            // Check if directory exists
            try {
                await this.validator.validateDirectory(searchDir);
            } catch (dirError) {
                // If directory doesn't exist, create it first
                if (dirError.message.includes('not found')) {
                    console.log(chalk.yellow(`⚠️ Directory '${directory}' not found. Creating it...`));
                    try {
                        await fs.mkdir(searchDir, { recursive: true });
                        console.log(chalk.green(`✅ Created directory: ${directory}`));
                    } catch (mkdirError) {
                        return {
                            success: false,
                            error: `Failed to create directory: ${mkdirError.message}`
                        };
                    }
                } else {
                    throw dirError; // Re-throw other errors
                }
            }
            
            // Function to recursively search for files
            const searchRecursively = async (dir, pattern) => {
                const result = [];
                const files = await fs.readdir(dir, { withFileTypes: true });
                
                for (const file of files) {
                    const filePath = path.join(dir, file.name);
                    
                    if (file.isDirectory()) {
                        const nestedResults = await searchRecursively(filePath, pattern);
                        result.push(...nestedResults);
                    } else {
                        // Check if file matches pattern (glob or regex)
                        if (this.matchesPattern(file.name, pattern)) {
                            // Make path relative to working directory
                            const relativePath = path.relative(this.workingDirectory, filePath);
                            result.push(relativePath);
                        }
                    }
                }
                
                return result;
            };
            
            const files = await searchRecursively(searchDir, pattern);
            
            return {
                success: true,
                files,
                count: files.length,
                pattern,
                directory: directory || '.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async readFile(filePath) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateFile(fullPath);
            
            // Read file
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            
            // Get file extension
            const ext = path.extname(filePath).toLowerCase().slice(1);
            
            return {
                success: true,
                path: filePath,
                content,
                size: stats.size,
                extension: ext,
                lastModified: stats.mtime
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async writeFile(filePath, content) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateWritablePath(fullPath);
            
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Write file
            await fs.writeFile(fullPath, content);
            
            return {
                success: true,
                path: filePath,
                size: Buffer.from(content).length,
                message: `File created/updated: ${filePath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async appendToFile(filePath, content) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateWritablePath(fullPath);
            
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Append to file
            await fs.appendFile(fullPath, content);
            
            return {
                success: true,
                path: filePath,
                size: Buffer.from(content).length,
                message: `Content appended to file: ${filePath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteFile(filePath) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateFile(fullPath);
            
            // Delete file
            await fs.unlink(fullPath);
            
            return {
                success: true,
                path: filePath,
                message: `File deleted: ${filePath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async copyFile(sourcePath, destinationPath) {
        try {
            const sourceFullPath = path.join(this.workingDirectory, sourcePath);
            const destFullPath = path.join(this.workingDirectory, destinationPath);
            
            // Validate paths
            await this.validator.validateFile(sourceFullPath);
            await this.validator.validateWritablePath(destFullPath);
            
            // Ensure destination directory exists
            const destDir = path.dirname(destFullPath);
            await fs.mkdir(destDir, { recursive: true });
            
            // Copy file
            await fs.copyFile(sourceFullPath, destFullPath);
            
            return {
                success: true,
                source: sourcePath,
                destination: destinationPath,
                message: `File copied from ${sourcePath} to ${destinationPath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async moveFile(sourcePath, destinationPath) {
        try {
            const sourceFullPath = path.join(this.workingDirectory, sourcePath);
            const destFullPath = path.join(this.workingDirectory, destinationPath);
            
            // Validate paths
            await this.validator.validateFile(sourceFullPath);
            await this.validator.validateWritablePath(destFullPath);
            
            // Ensure destination directory exists
            const destDir = path.dirname(destFullPath);
            await fs.mkdir(destDir, { recursive: true });
            
            // Move file
            await fs.rename(sourceFullPath, destFullPath);
            
            return {
                success: true,
                source: sourcePath,
                destination: destinationPath,
                message: `File moved from ${sourcePath} to ${destinationPath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async editFile(filePath, edits) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateFile(fullPath);
            
            // Read the file
            let content = await fs.readFile(fullPath, 'utf8');
            
            // Apply edits
            let editsMade = 0;
            const originalContent = content; // Store original for diff
            
            // Make sure edits is an array
            if (!Array.isArray(edits)) {
                edits = [edits];
            }
            
            // Process each edit
            for (const edit of edits) {
                if (!edit.oldText || !edit.newText) {
                    continue; // Skip invalid edits
                }
                
                // Handle backticks dalam old dan new text
                const escapedOldText = this.sanitizeBackticks(edit.oldText);
                const escapedNewText = this.sanitizeBackticks(edit.newText);
                
                // Count how many times the old text appears
                const occurrences = (content.match(new RegExp(this.escapeRegExp(escapedOldText), 'g')) || []).length;
                
                if (occurrences === 0) {
                    // Text not found
                    continue;
                } else if (occurrences > 1) {
                    // Multiple occurrences found, warning but continue
                    console.warn(`Warning: Found ${occurrences} occurrences of the specified text in ${filePath}. All will be replaced.`);
                }
                
                // Replace the text
                content = content.replace(new RegExp(this.escapeRegExp(escapedOldText), 'g'), escapedNewText);
                editsMade += occurrences;
            }
            
            // Only write if changes were made
            if (editsMade > 0) {
                await fs.writeFile(fullPath, content);
                
                // Generate a simple diff
                const diff = this.generateDiff(originalContent, content);
                
                return {
                    success: true,
                    path: filePath,
                    editsApplied: editsMade,
                    diff: diff,
                    message: `File edited: ${filePath} (${editsMade} changes)`
                };
            } else {
                return {
                    success: false,
                    path: filePath,
                    error: 'No matching text found to edit',
                    message: 'No changes were made to the file'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Sanitize backticks in text to ensure proper handling
    sanitizeBackticks(text) {
        if (!text) return text;
        
        // 1. Ganti semua backtick yang tidak di-escape dengan yang di-escape
        let sanitized = text.replace(/`/g, '\\`');
        // 2. Perbaiki double escape yang mungkin terjadi
        sanitized = sanitized.replace(/\\\\`/g, '\\`');
        
        return sanitized;
    }

    // Helper function to match file against pattern (glob or regex)
    matchesPattern(fileName, pattern) {
        if (pattern.includes('*') || pattern.includes('?')) {
            // It's a glob pattern, convert to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')   // Escape dots
                .replace(/\*/g, '.*')    // * becomes .*
                .replace(/\?/g, '.');    // ? becomes .
            
            return new RegExp(`^${regexPattern}$`).test(fileName);
        } else {
            // Simple substring match
            return fileName.includes(pattern);
        }
    }
    
    // Helper function to escape regex special characters
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Generate a simple diff
    generateDiff(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const diff = [];
        
        // Find lines that have changed
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            if (i >= oldLines.length) {
                // Line added
                diff.push(`+ ${newLines[i]}`);
            } else if (i >= newLines.length) {
                // Line removed
                diff.push(`- ${oldLines[i]}`);
            } else if (oldLines[i] !== newLines[i]) {
                // Line changed
                diff.push(`- ${oldLines[i]}`);
                diff.push(`+ ${newLines[i]}`);
            }
        }
        
        return diff.join('\n');
    }
}