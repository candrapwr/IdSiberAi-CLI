import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { ValidationHelper } from './ValidationHelper.js';

export class FileTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
    }
    
    setWorkingDirectory(newDirectory) {
        this.workingDirectory = newDirectory;
        this.validator.setWorkingDirectory(newDirectory);
        return this.workingDirectory;
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
            const editResults = []; // Track each edit result
            
            // Make sure edits is an array
            if (!Array.isArray(edits)) {
                edits = [edits];
            }
            
            // Process each edit
            for (let i = 0; i < edits.length; i++) {
                const edit = edits[i];
                
                // Validate edit parameters
                if (!edit || typeof edit !== 'object') {
                    editResults.push({
                        index: i,
                        success: false,
                        error: 'Invalid edit object',
                        oldText: 'N/A',
                        newText: 'N/A'
                    });
                    continue;
                }
                
                if (!edit.oldText) {
                    editResults.push({
                        index: i,
                        success: false,
                        error: 'Missing oldText parameter',
                        oldText: edit.oldText || 'N/A',
                        newText: edit.newText || 'N/A'
                    });
                    continue;
                }
                
                if (edit.newText === undefined || edit.newText === null) {
                    editResults.push({
                        index: i,
                        success: false,
                        error: 'Missing newText parameter',
                        oldText: edit.oldText || 'N/A',
                        newText: 'N/A'
                    });
                    continue;
                }
                
                // Clean the text - remove the problematic sanitization
                const oldText = String(edit.oldText);
                const newText = String(edit.newText);
                
                console.log(chalk.blue(`🔍 Searching for text: "${oldText.substring(0, 50)}${oldText.length > 50 ? '...' : ''}"`));
                
                // Try multiple matching strategies
                let occurrences = 0;
                let replacedContent = content;
                let matchStrategy = 'none';
                
                // Strategy 1: Exact match
                const exactMatches = (content.match(new RegExp(this.escapeRegExp(oldText), 'g')) || []).length;
                if (exactMatches > 0) {
                    replacedContent = content.replace(new RegExp(this.escapeRegExp(oldText), 'g'), newText);
                    occurrences = exactMatches;
                    matchStrategy = 'exact';
                    console.log(chalk.green(`✅ Exact match found: ${exactMatches} occurrence(s)`));
                } else {
                    // Strategy 2: Whitespace-flexible match
                    const flexibleRegex = new RegExp(this.escapeRegExp(oldText).replace(/\\\s+/g, '\\s+'), 'g');
                    const flexibleMatches = (content.match(flexibleRegex) || []).length;
                    
                    if (flexibleMatches > 0) {
                        replacedContent = content.replace(flexibleRegex, newText);
                        occurrences = flexibleMatches;
                        matchStrategy = 'flexible_whitespace';
                        console.log(chalk.yellow(`⚡ Flexible whitespace match found: ${flexibleMatches} occurrence(s)`));
                    } else {
                        // Strategy 3: Line-based match (remove leading/trailing whitespace)
                        const trimmedOldText = oldText.trim();
                        const lineRegex = new RegExp(this.escapeRegExp(trimmedOldText), 'g');
                        const lineMatches = (content.match(lineRegex) || []).length;
                        
                        if (lineMatches > 0) {
                            replacedContent = content.replace(lineRegex, newText);
                            occurrences = lineMatches;
                            matchStrategy = 'trimmed';
                            console.log(chalk.yellow(`📝 Trimmed match found: ${lineMatches} occurrence(s)`));
                        } else {
                            // Strategy 4: Case-insensitive match (as last resort)
                            const caseInsensitiveRegex = new RegExp(this.escapeRegExp(oldText), 'gi');
                            const caseMatches = (content.match(caseInsensitiveRegex) || []).length;
                            
                            if (caseMatches > 0) {
                                replacedContent = content.replace(caseInsensitiveRegex, newText);
                                occurrences = caseMatches;
                                matchStrategy = 'case_insensitive';
                                console.log(chalk.yellow(`🔤 Case-insensitive match found: ${caseMatches} occurrence(s)`));
                            }
                        }
                    }
                }
                
                if (occurrences > 0) {
                    content = replacedContent;
                    editsMade += occurrences;
                    
                    if (occurrences > 1) {
                        console.warn(chalk.yellow(`⚠️ Multiple occurrences (${occurrences}) found and replaced`));
                    }
                    
                    editResults.push({
                        index: i,
                        success: true,
                        occurrences: occurrences,
                        oldText: oldText.substring(0, 100),
                        newText: newText.substring(0, 100),
                        strategy: matchStrategy
                    });
                } else {
                    // Provide detailed debugging info
                    const lines = content.split('\n');
                    const oldTextLines = oldText.split('\n');
                    
                    console.log(chalk.red(`❌ Text not found: "${oldText.substring(0, 100)}${oldText.length > 100 ? '...' : ''}"`));
                    console.log(chalk.gray(`📄 File has ${lines.length} lines, search text has ${oldTextLines.length} lines`));
                    
                    // Show similar lines for debugging
                    const similarLines = lines.filter(line => 
                        line.toLowerCase().includes(oldText.toLowerCase().substring(0, 20))
                    ).slice(0, 3);
                    
                    if (similarLines.length > 0) {
                        console.log(chalk.gray(`🔍 Similar lines found:`));
                        similarLines.forEach(line => {
                            console.log(chalk.gray(`   "${line.substring(0, 80)}${line.length > 80 ? '...' : ''}"`));
                        });
                    }
                    
                    editResults.push({
                        index: i,
                        success: false,
                        error: 'Text not found in file',
                        oldText: oldText.substring(0, 100),
                        newText: newText.substring(0, 100),
                        suggestions: similarLines.length > 0 ? 'Similar text found (see console)' : 'No similar text found'
                    });
                }
            }
            
            // Only write if changes were made
            if (editsMade > 0) {
                await fs.writeFile(fullPath, content);
                
                // Generate a simple diff
                const diff = this.generateDiff(originalContent, content);
                
                const successfulEdits = editResults.filter(r => r.success);
                const failedEdits = editResults.filter(r => !r.success);
                
                return {
                    success: true,
                    path: filePath,
                    editsApplied: editsMade,
                    totalEdits: edits.length,
                    successfulEdits: successfulEdits.length,
                    failedEdits: failedEdits.length,
                    editResults: editResults,
                    diff: diff,
                    message: `File edited: ${filePath} (${editsMade} changes from ${successfulEdits.length}/${edits.length} edits)`
                };
            } else {
                const failedEdits = editResults.filter(r => !r.success);
                
                return {
                    success: false,
                    path: filePath,
                    error: 'No matching text found to edit',
                    totalEdits: edits.length,
                    failedEdits: failedEdits.length,
                    editResults: editResults,
                    message: `No changes were made to the file. ${failedEdits.length} edits failed.`,
                    suggestions: 'Check the exact text to be replaced, including whitespace and capitalization'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    // Sanitize backticks in text to ensure proper handling (updated to be less aggressive)
    sanitizeBackticks(text, shouldSanitize = false) {
        if (!text || !shouldSanitize) return text;
        
        // Only sanitize if explicitly requested
        let sanitized = text.replace(/`/g, '\\`');
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