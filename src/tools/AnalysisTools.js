import fs from 'fs/promises';
import path from 'path';
import { ValidationHelper } from './ValidationHelper.js';

export class AnalysisTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
    }

    async analyzeFileStructure(filePath) {
        try {
            const fullPath = path.join(this.workingDirectory, filePath);
            
            // Validate path
            await this.validator.validateFile(fullPath);
            
            // Read file
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            const ext = path.extname(filePath).toLowerCase().slice(1);
            
            let structure = {};
            
            // Analyze based on file type
            switch (ext) {
                case 'js':
                    structure = this.analyzeJavaScript(content);
                    break;
                case 'py':
                    structure = this.analyzePython(content);
                    break;
                case 'php':
                    structure = this.analyzePHP(content);
                    break;
                case 'json':
                    structure = this.analyzeJSON(content);
                    break;
                case 'md':
                    structure = this.analyzeMarkdown(content);
                    break;
                default:
                    structure = this.analyzeGeneric(content);
            }
            
            return {
                success: true,
                path: filePath,
                size: stats.size,
                lines: content.split('\n').length,
                type: ext || 'text',
                lastModified: stats.mtime,
                structure
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async findInFiles(searchTerm, directory = '', filePattern = '*') {
        try {
            const searchDir = directory 
                ? path.join(this.workingDirectory, directory) 
                : this.workingDirectory;
            
            // Validate path
            await this.validator.validateDirectory(searchDir);
            
            // Function to recursively search in files
            const searchInFiles = async (dir, pattern, term) => {
                const results = [];
                const files = await fs.readdir(dir, { withFileTypes: true });
                
                for (const file of files) {
                    const filePath = path.join(dir, file.name);
                    
                    if (file.isDirectory()) {
                        const nestedResults = await searchInFiles(filePath, pattern, term);
                        results.push(...nestedResults);
                    } else {
                        // Check if file matches pattern
                        if (this.matchesPattern(file.name, pattern)) {
                            try {
                                // Read file content
                                const content = await fs.readFile(filePath, 'utf8');
                                
                                // Search for term
                                const matches = this.findMatches(content, term);
                                
                                if (matches.length > 0) {
                                    // Make path relative to working directory
                                    const relativePath = path.relative(this.workingDirectory, filePath);
                                    
                                    results.push({
                                        file: relativePath,
                                        matches: matches,
                                        count: matches.length
                                    });
                                }
                            } catch (readError) {
                                console.error(`Error reading file ${filePath}: ${readError.message}`);
                            }
                        }
                    }
                }
                
                return results;
            };
            
            const results = await searchInFiles(searchDir, filePattern, searchTerm);
            
            return {
                success: true,
                searchTerm,
                directory: directory || '.',
                filePattern,
                results,
                totalFiles: results.length,
                totalMatches: results.reduce((sum, file) => sum + file.count, 0)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async replaceInFiles(searchTerm, replaceTerm, directory = '', filePattern = '*') {
        try {
            const searchDir = directory 
                ? path.join(this.workingDirectory, directory) 
                : this.workingDirectory;
            
            // Validate path
            await this.validator.validateDirectory(searchDir);
            
            // Function to recursively replace in files
            const replaceInFiles = async (dir, pattern, search, replace) => {
                const results = [];
                const files = await fs.readdir(dir, { withFileTypes: true });
                
                for (const file of files) {
                    const filePath = path.join(dir, file.name);
                    
                    if (file.isDirectory()) {
                        const nestedResults = await replaceInFiles(filePath, pattern, search, replace);
                        results.push(...nestedResults);
                    } else {
                        // Check if file matches pattern
                        if (this.matchesPattern(file.name, pattern)) {
                            try {
                                // Read file content
                                let content = await fs.readFile(filePath, 'utf8');
                                
                                // Count matches
                                const matches = this.findMatches(content, search);
                                
                                if (matches.length > 0) {
                                    // Make path relative to working directory
                                    const relativePath = path.relative(this.workingDirectory, filePath);
                                    
                                    // Replace all occurrences
                                    const newContent = content.replace(new RegExp(this.escapeRegExp(search), 'g'), replace);
                                    
                                    // Write back to file
                                    await fs.writeFile(filePath, newContent);
                                    
                                    results.push({
                                        file: relativePath,
                                        replacements: matches.length
                                    });
                                }
                            } catch (fileError) {
                                console.error(`Error processing file ${filePath}: ${fileError.message}`);
                            }
                        }
                    }
                }
                
                return results;
            };
            
            const results = await replaceInFiles(searchDir, filePattern, searchTerm, replaceTerm);
            
            return {
                success: true,
                searchTerm,
                replaceTerm,
                directory: directory || '.',
                filePattern,
                results,
                totalFiles: results.length,
                totalReplacements: results.reduce((sum, file) => sum + file.replacements, 0)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper function to match file against pattern (glob or regex)
    matchesPattern(fileName, pattern) {
        if (pattern === '*') {
            return true;
        } else if (pattern.includes('*') || pattern.includes('?')) {
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

    // Helper function to find matches of a term in content with line numbers
    findMatches(content, term) {
        const lines = content.split('\n');
        const matches = [];
        
        lines.forEach((line, index) => {
            if (line.includes(term)) {
                matches.push({
                    line: index + 1,
                    content: line.trim()
                });
            }
        });
        
        return matches;
    }

    // Helper function to escape regex special characters
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Analysis functions based on file type
    analyzeJavaScript(content) {
        const structure = {
            functions: [],
            classes: [],
            imports: []
        };
        
        // Extract functions
        const functionMatches = content.match(/function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)/g) || [];
        const arrowFunctions = content.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g) || [];
        
        structure.functions = [
            ...functionMatches.map(f => f.match(/function\s+([a-zA-Z0-9_$]+)/)[1]),
            ...arrowFunctions.map(f => f.match(/const\s+([a-zA-Z0-9_$]+)/)[1])
        ];
        
        // Extract classes
        const classMatches = content.match(/class\s+([a-zA-Z0-9_$]+)(\s+extends\s+([a-zA-Z0-9_$]+))?/g) || [];
        structure.classes = classMatches.map(c => {
            const match = c.match(/class\s+([a-zA-Z0-9_$]+)(\s+extends\s+([a-zA-Z0-9_$]+))?/);
            return {
                name: match[1],
                extends: match[3] || null
            };
        });
        
        // Extract imports
        const importMatches = content.match(/import\s+.*?from\s+['"].*?['"]/g) || [];
        structure.imports = importMatches.map(i => i.match(/from\s+['"](.+?)['"]/)[1]);
        
        return structure;
    }

    analyzePython(content) {
        const structure = {
            functions: [],
            classes: [],
            imports: []
        };
        
        // Extract functions
        const functionMatches = content.match(/def\s+([a-zA-Z0-9_]+)\s*\([^)]*\):/g) || [];
        structure.functions = functionMatches.map(f => f.match(/def\s+([a-zA-Z0-9_]+)/)[1]);
        
        // Extract classes
        const classMatches = content.match(/class\s+([a-zA-Z0-9_]+)(\([^)]*\))?:/g) || [];
        structure.classes = classMatches.map(c => {
            const match = c.match(/class\s+([a-zA-Z0-9_]+)(\(([^)]*)\))?:/);
            return {
                name: match[1],
                inherits: match[3] ? match[3].split(',').map(s => s.trim()) : []
            };
        });
        
        // Extract imports
        const importMatches = content.match(/import\s+[a-zA-Z0-9_.]+|from\s+[a-zA-Z0-9_.]+\s+import/g) || [];
        structure.imports = importMatches.map(i => {
            if (i.startsWith('import ')) {
                return i.replace('import ', '');
            } else {
                return i.match(/from\s+([a-zA-Z0-9_.]+)/)[1];
            }
        });
        
        return structure;
    }

    analyzePHP(content) {
        const structure = {
            functions: [],
            classes: [],
            namespaces: []
        };
        
        // Extract functions
        const functionMatches = content.match(/function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)/g) || [];
        structure.functions = functionMatches.map(f => f.match(/function\s+([a-zA-Z0-9_]+)/)[1]);
        
        // Extract classes
        const classMatches = content.match(/class\s+([a-zA-Z0-9_]+)(\s+extends\s+([a-zA-Z0-9_\\]+))?/g) || [];
        structure.classes = classMatches.map(c => {
            const match = c.match(/class\s+([a-zA-Z0-9_]+)(\s+extends\s+([a-zA-Z0-9_\\]+))?/);
            return {
                name: match[1],
                extends: match[3] || null
            };
        });
        
        // Extract namespaces
        const namespaceMatches = content.match(/namespace\s+([a-zA-Z0-9_\\]+);/g) || [];
        structure.namespaces = namespaceMatches.map(n => n.match(/namespace\s+([a-zA-Z0-9_\\]+);/)[1]);
        
        return structure;
    }

    analyzeJSON(content) {
        try {
            const json = JSON.parse(content);
            return {
                type: 'json',
                keys: Object.keys(json),
                structure: typeof json === 'object' ? this.getJSONStructure(json) : null
            };
        } catch (error) {
            return {
                type: 'json',
                error: 'Invalid JSON: ' + error.message
            };
        }
    }

    getJSONStructure(json, depth = 2, currentDepth = 0) {
        if (currentDepth >= depth) return typeof json;
        
        if (Array.isArray(json)) {
            if (json.length === 0) return '[]';
            return `Array(${json.length})`;
        } else if (typeof json === 'object' && json !== null) {
            const result = {};
            for (const key in json) {
                result[key] = this.getJSONStructure(json[key], depth, currentDepth + 1);
            }
            return result;
        } else {
            return typeof json;
        }
    }

    analyzeMarkdown(content) {
        const structure = {
            headers: [],
            codeBlocks: [],
            links: []
        };
        
        // Extract headers
        const headerMatches = content.match(/^#+\s+.+$/gm) || [];
        structure.headers = headerMatches.map(h => {
            const level = (h.match(/^#+/)[0] || '').length;
            const text = h.replace(/^#+\s+/, '');
            return { level, text };
        });
        
        // Extract code blocks
        const codeBlockMatches = content.match(/```[a-zA-Z]*\n[\s\S]*?```/g) || [];
        structure.codeBlocks = codeBlockMatches.map(block => {
            const language = (block.match(/```([a-zA-Z]*)\n/) || ['', ''])[1];
            return { language: language || 'text' };
        });
        
        // Extract links
        const linkMatches = content.match(/\[.*?\]\(.*?\)/g) || [];
        structure.links = linkMatches.map(link => {
            const match = link.match(/\[(.*?)\]\((.*?)\)/);
            return {
                text: match[1],
                url: match[2]
            };
        });
        
        return structure;
    }

    analyzeGeneric(content) {
        const lines = content.split('\n');
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        
        return {
            type: 'text',
            lines: lines.length,
            words: wordCount,
            empty_lines: lines.filter(line => line.trim() === '').length,
            avg_line_length: lines.length > 0 ? 
                lines.reduce((sum, line) => sum + line.length, 0) / lines.length : 0
        };
    }
}