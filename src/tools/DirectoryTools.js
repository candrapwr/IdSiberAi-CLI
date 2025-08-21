import fs from 'fs/promises';
import path from 'path';
import { ValidationHelper } from './ValidationHelper.js';

export class DirectoryTools {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.validator = new ValidationHelper(workingDirectory);
    }
    
    setWorkingDirectory(newDirectory) {
        this.workingDirectory = newDirectory;
        this.validator.setWorkingDirectory(newDirectory);
        return this.workingDirectory;
    }

    async listDirectory(dirPath = '', changeMode = false) {
        try {
            // Fix issue with path concatenation
            let fullPath;
            
            if(changeMode){
                if (path.isAbsolute(dirPath)) {
                    fullPath = dirPath;
                } else {
                    fullPath = path.join(this.workingDirectory, dirPath);
                }
            }else{
                fullPath = path.join(this.workingDirectory, dirPath);
            }
            
            // Validate path
            await this.validator.validateDirectory(fullPath);
            
            // Read directory
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            
            // Process entries
            const result = [];
            for (const entry of entries) {
                try {
                    const entryPath = path.join(fullPath, entry.name);
                    const stats = await fs.stat(entryPath);
                    
                    result.push({
                        name: entry.name,
                        type: entry.isDirectory() ? 'directory' : 'file',
                        size: stats.size,
                        lastModified: stats.mtime
                    });
                } catch (entryError) {
                    console.error(`Error processing entry ${entry.name}: ${entryError.message}`);
                }
            }
            
            return {
                success: true,
                path: dirPath || '.',
                entries: result,
                count: result.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createDirectory(dirPath) {
        try {
            let fullPath;

            fullPath = path.join(this.workingDirectory, dirPath);

            // Validate path
            await this.validator.validateWritablePath(fullPath);
            
            // Create directory
            await fs.mkdir(fullPath, { recursive: true });
            
            return {
                success: true,
                path: dirPath,
                message: `Directory created: ${dirPath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteDirectory(dirPath) {
        try {
            const fullPath = path.join(this.workingDirectory, dirPath);

            // Validate path
            await this.validator.validateDirectory(fullPath);
            
            // Check if not trying to delete the working directory
            if (path.resolve(fullPath) === path.resolve(this.workingDirectory)) {
                throw new Error('Cannot delete the working directory');
            }
            
            // Delete directory recursively
            await fs.rm(fullPath, { recursive: true, force: true });
            
            return {
                success: true,
                path: dirPath,
                message: `Directory deleted: ${dirPath}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}