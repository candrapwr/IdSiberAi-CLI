import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GeneralTools {
    constructor(workingDirectory) {
        this.workingDirectory = path.resolve(workingDirectory);
        this.ensureWorkingDirectory();
    }

    async ensureWorkingDirectory() {
        try {
            await fs.mkdir(this.workingDirectory, { recursive: true });
        } catch (error) {
            // Directory already exists or other error
        }
    }

    async validatePath(filePath) {
        const fullPath = path.resolve(this.workingDirectory, filePath);
        if (!fullPath.startsWith(this.workingDirectory)) {
            throw new Error('Path outside working directory not allowed');
        }
        return fullPath;
    }

    // File System Operations
    async searchFiles(pattern, directory = '') {
        try {
            const searchPath = path.join(this.workingDirectory, directory);
            const files = await glob(pattern, { 
                cwd: searchPath,
                nodir: true 
            });
            
            return {
                success: true,
                files: files.map(f => path.join(directory, f)),
                count: files.length
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
            const fullPath = await this.validatePath(filePath);
            console.log(fullPath)
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            
            return {
                success: true,
                content,
                path: filePath,
                size: stats.size,
                modified: stats.mtime
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    async writeFile(filePath, content) {
        try {
            const fullPath = await this.validatePath(filePath);
            
            // Create directory if it doesn't exist
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            
            await fs.writeFile(fullPath, content, 'utf8');
            
            return {
                success: true,
                message: `File created/updated: ${filePath}`,
                path: filePath,
                size: Buffer.byteLength(content, 'utf8')
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    async appendToFile(filePath, content) {
        try {
            const fullPath = await this.validatePath(filePath);
            await fs.appendFile(fullPath, content, 'utf8');
            
            return {
                success: true,
                message: `Content appended to: ${filePath}`,
                path: filePath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    async deleteFile(filePath) {
        try {
            const fullPath = await this.validatePath(filePath);
            await fs.unlink(fullPath);
            
            return {
                success: true,
                message: `File deleted: ${filePath}`,
                path: filePath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    async copyFile(sourcePath, destinationPath) {
        try {
            const fullSourcePath = await this.validatePath(sourcePath);
            const fullDestPath = await this.validatePath(destinationPath);
            
            // Create destination directory if needed
            await fs.mkdir(path.dirname(fullDestPath), { recursive: true });
            
            await fs.copyFile(fullSourcePath, fullDestPath);
            
            return {
                success: true,
                message: `File copied from ${sourcePath} to ${destinationPath}`,
                source: sourcePath,
                destination: destinationPath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                source: sourcePath,
                destination: destinationPath
            };
        }
    }

    async moveFile(sourcePath, destinationPath) {
        try {
            const fullSourcePath = await this.validatePath(sourcePath);
            const fullDestPath = await this.validatePath(destinationPath);
            
            // Create destination directory if needed
            await fs.mkdir(path.dirname(fullDestPath), { recursive: true });
            
            await fs.rename(fullSourcePath, fullDestPath);
            
            return {
                success: true,
                message: `File moved from ${sourcePath} to ${destinationPath}`,
                source: sourcePath,
                destination: destinationPath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                source: sourcePath,
                destination: destinationPath
            };
        }
    }

    async listDirectory(dirPath = '') {
        try {
            const fullPath = await this.validatePath(dirPath);
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            
            const files = [];
            const directories = [];
            
            for (const entry of entries) {
                const itemPath = path.join(dirPath, entry.name);
                const stats = await fs.stat(path.join(fullPath, entry.name));
                
                const item = {
                    name: entry.name,
                    path: itemPath,
                    size: stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime
                };
                
                if (entry.isDirectory()) {
                    directories.push(item);
                } else {
                    files.push(item);
                }
            }
            
            return {
                success: true,
                files,
                directories,
                path: dirPath,
                total: files.length + directories.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: dirPath
            };
        }
    }

    async createDirectory(dirPath) {
        try {
            const fullPath = await this.validatePath(dirPath);
            await fs.mkdir(fullPath, { recursive: true });
            
            return {
                success: true,
                message: `Directory created: ${dirPath}`,
                path: dirPath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: dirPath
            };
        }
    }

    async deleteDirectory(dirPath) {
        try {
            const fullPath = await this.validatePath(dirPath);
            await fs.rmdir(fullPath, { recursive: true });
            
            return {
                success: true,
                message: `Directory deleted: ${dirPath}`,
                path: dirPath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: dirPath
            };
        }
    }

    // Code Analysis
    async analyzeFileStructure(filePath) {
        try {
            const result = await this.readFile(filePath);
            if (!result.success) return result;
            
            const content = result.content;
            const extension = path.extname(filePath).toLowerCase();
            const lines = content.split('\n');
            
            const analysis = {
                extension,
                lines: lines.length,
                characters: content.length,
                words: content.split(/\s+/).length,
                encoding: 'utf8',
                language: this.detectLanguage(extension),
                structure: {}
            };
            
            // Language-specific analysis
            switch (extension) {
                case '.js':
                case '.mjs':
                    analysis.structure = this.analyzeJavaScript(content);
                    break;
                case '.py':
                    analysis.structure = this.analyzePython(content);
                    break;
                case '.php':
                    analysis.structure = this.analyzePHP(content);
                    break;
                case '.json':
                    try {
                        analysis.structure = { valid_json: true, data: JSON.parse(content) };
                    } catch {
                        analysis.structure = { valid_json: false };
                    }
                    break;
                case '.md':
                    analysis.structure = this.analyzeMarkdown(content);
                    break;
                default:
                    analysis.structure = { type: 'text', preview: content.substring(0, 200) };
            }
            
            return {
                success: true,
                analysis,
                path: filePath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    detectLanguage(extension) {
        const languageMap = {
            '.js': 'JavaScript',
            '.mjs': 'JavaScript (ES Module)',
            '.ts': 'TypeScript',
            '.py': 'Python',
            '.php': 'PHP',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.cs': 'C#',
            '.go': 'Go',
            '.rs': 'Rust',
            '.rb': 'Ruby',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SASS',
            '.json': 'JSON',
            '.xml': 'XML',
            '.md': 'Markdown',
            '.txt': 'Plain Text'
        };
        return languageMap[extension] || 'Unknown';
    }

    analyzeJavaScript(content) {
        const functions = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:\(.*?\)\s*=>|\w+\s*=>|function))/g) || [];
        const classes = content.match(/class\s+\w+/g) || [];
        const imports = content.match(/import\s+.*?from\s+['"`].*?['"`]/g) || [];
        const exports = content.match(/export\s+(?:default\s+)?(?:class|function|const|let|var)\s+\w+/g) || [];
        
        return { functions, classes, imports, exports };
    }

    analyzePython(content) {
        const functions = content.match(/def\s+\w+\s*\(/g) || [];
        const classes = content.match(/class\s+\w+/g) || [];
        const imports = content.match(/(?:import\s+\w+|from\s+\w+\s+import\s+.*)/g) || [];
        
        return { functions, classes, imports };
    }

    analyzePHP(content) {
        const functions = content.match(/function\s+\w+\s*\(/g) || [];
        const classes = content.match(/class\s+\w+/g) || [];
        const methods = content.match(/(?:public|private|protected)\s+function\s+\w+/g) || [];
        const namespaces = content.match(/namespace\s+[\w\\]+;/g) || [];
        
        return { functions, classes, methods, namespaces };
    }

    analyzeMarkdown(content) {
        const headings = content.match(/^#{1,6}\s+.*/gm) || [];
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        const links = content.match(/\[.*?\]\(.*?\)/g) || [];
        const images = content.match(/!\[.*?\]\(.*?\)/g) || [];
        
        return { headings, codeBlocks, links, images };
    }

    // System Operations
    async executeCommand(command, options = {}) {
        try {
            const { cwd = this.workingDirectory, timeout = 30000 } = options;
            
            const { stdout, stderr } = await execAsync(command, {
                cwd,
                timeout,
                encoding: 'utf8'
            });
            
            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                command
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                command
            };
        }
    }

    // Text Processing
    async findInFiles(searchTerm, directory = '', filePattern = '*') {
        try {
            const searchPath = path.join(this.workingDirectory, directory);
            const files = await glob(filePattern, { 
                cwd: searchPath,
                nodir: true 
            });
            
            const results = [];
            
            for (const file of files) {
                const filePath = path.join(directory, file);
                const result = await this.readFile(filePath);
                
                if (result.success && result.content.includes(searchTerm)) {
                    const lines = result.content.split('\n');
                    const matches = [];
                    
                    lines.forEach((line, index) => {
                        if (line.includes(searchTerm)) {
                            matches.push({
                                line: index + 1,
                                content: line.trim(),
                                context: lines.slice(Math.max(0, index - 1), index + 2)
                            });
                        }
                    });
                    
                    if (matches.length > 0) {
                        results.push({
                            file: filePath,
                            matches
                        });
                    }
                }
            }
            
            return {
                success: true,
                results,
                searchTerm,
                totalFiles: files.length,
                matchingFiles: results.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                searchTerm
            };
        }
    }

    async replaceInFiles(searchTerm, replaceTerm, directory = '', filePattern = '*') {
        try {
            const searchResult = await this.findInFiles(searchTerm, directory, filePattern);
            
            if (!searchResult.success) {
                return searchResult;
            }
            
            const replacements = [];
            
            for (const result of searchResult.results) {
                const readResult = await this.readFile(result.file);
                
                if (readResult.success) {
                    const newContent = readResult.content.replaceAll(searchTerm, replaceTerm);
                    const writeResult = await this.writeFile(result.file, newContent);
                    
                    if (writeResult.success) {
                        replacements.push({
                            file: result.file,
                            matches: result.matches.length
                        });
                    }
                }
            }
            
            return {
                success: true,
                replacements,
                searchTerm,
                replaceTerm,
                filesModified: replacements.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                searchTerm,
                replaceTerm
            };
        }
    }

    // Utility
    async getWorkingDirectoryInfo() {
        try {
            const result = await this.listDirectory('');
            
            return {
                success: true,
                path: this.workingDirectory,
                files: result.files?.length || 0,
                directories: result.directories?.length || 0,
                details: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
