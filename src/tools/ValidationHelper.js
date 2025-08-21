import fs from 'fs/promises';
import path from 'path';

export class ValidationHelper {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        this.restrictToWorkingDirectory = false; // Set to true to restrict to working directory only
    }
    
    setWorkingDirectory(newDirectory) {
        this.workingDirectory = newDirectory;
        return this.workingDirectory;
    }
    
    setRestriction(restrict) {
        this.restrictToWorkingDirectory = restrict;
        return this.restrictToWorkingDirectory;
    }

    async validatePath(filePath) {
        // Check if path is absolute or trying to escape working directory
        const normalizedPath = path.normalize(filePath);
        let resolvedPath;
        
        // Handle absolute paths
        if (path.isAbsolute(normalizedPath)) {
            // For absolute paths, use it directly
            resolvedPath = normalizedPath;
        } else {
            // For relative paths, resolve against working directory
            resolvedPath = path.resolve(this.workingDirectory, normalizedPath);
        }
        
        // Make sure we're still within safe boundaries if restriction is enabled
        if (this.restrictToWorkingDirectory && !resolvedPath.startsWith(this.workingDirectory)) {
            throw new Error(`Path outside working directory not allowed: ${filePath}`);
        }
        
        // Basic safety check that path is valid
        if (!resolvedPath.startsWith('/')) {
            throw new Error(`Invalid path: ${filePath}`);
        }
        
        return resolvedPath;
    }

    async validateFile(filePath) {
        const resolvedPath = await this.validatePath(filePath);
        
        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isFile()) {
                throw new Error(`Not a file: ${filePath}`);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
        
        return resolvedPath;
    }

    async validateDirectory(dirPath) {
        const resolvedPath = await this.validatePath(dirPath);
        
        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory()) {
                throw new Error(`Not a directory: ${dirPath}`);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Directory not found: ${dirPath}`);
            }
            throw error;
        }
        
        return resolvedPath;
    }

    async validateWritablePath(filePath) {
        const resolvedPath = await this.validatePath(filePath);
        
        // Check if parent directory exists
        const dirPath = path.dirname(resolvedPath);
        
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error(`Parent path is not a directory: ${dirPath}`);
            }
        } catch (error) {
            // If directory doesn't exist, we'll create it later
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        return resolvedPath;
    }
}