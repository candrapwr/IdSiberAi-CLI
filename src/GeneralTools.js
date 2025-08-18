import { FileTools } from './tools/FileTools.js';
import { DirectoryTools } from './tools/DirectoryTools.js';
import { AnalysisTools } from './tools/AnalysisTools.js';
import { SystemTools } from './tools/SystemTools.js';
import { S3Tools } from './tools/S3Tools.js';

/**
 * GeneralTools - Main class that combines all tools
 * This acts as a facade for all the specific tool implementations
 */
export class GeneralTools {
    constructor(workingDirectory) {
        // Ensure working directory exists
        this.workingDirectory = workingDirectory;
        
        // Initialize tool classes
        this.fileTools = new FileTools(workingDirectory);
        this.directoryTools = new DirectoryTools(workingDirectory);
        this.analysisTools = new AnalysisTools(workingDirectory);
        this.systemTools = new SystemTools(workingDirectory);
        this.s3Tools = new S3Tools(workingDirectory);
    }

    // File System Operations
    async searchFiles(pattern, directory) {
        return await this.fileTools.searchFiles(pattern, directory);
    }

    async readFile(filePath) {
        return await this.fileTools.readFile(filePath);
    }

    async writeFile(filePath, content) {
        return await this.fileTools.writeFile(filePath, content);
    }

    async appendToFile(filePath, content) {
        return await this.fileTools.appendToFile(filePath, content);
    }

    async deleteFile(filePath) {
        return await this.fileTools.deleteFile(filePath);
    }

    async copyFile(sourcePath, destinationPath) {
        return await this.fileTools.copyFile(sourcePath, destinationPath);
    }

    async moveFile(sourcePath, destinationPath) {
        return await this.fileTools.moveFile(sourcePath, destinationPath);
    }

    async editFile(filePath, edits) {
        return await this.fileTools.editFile(filePath, edits);
    }

    // Directory Operations
    async listDirectory(dirPath) {
        return await this.directoryTools.listDirectory(dirPath);
    }

    async createDirectory(dirPath) {
        return await this.directoryTools.createDirectory(dirPath);
    }

    async deleteDirectory(dirPath) {
        return await this.directoryTools.deleteDirectory(dirPath);
    }

    // Analysis Tools
    async analyzeFileStructure(filePath) {
        return await this.analysisTools.analyzeFileStructure(filePath);
    }

    async findInFiles(searchTerm, directory, filePattern) {
        return await this.analysisTools.findInFiles(searchTerm, directory, filePattern);
    }

    async replaceInFiles(searchTerm, replaceTerm, directory, filePattern) {
        return await this.analysisTools.replaceInFiles(searchTerm, replaceTerm, directory, filePattern);
    }

    // System Operations
    async executeCommand(command, options) {
        return await this.systemTools.executeCommand(command, options);
    }

    async getWorkingDirectoryInfo() {
        return await this.systemTools.getWorkingDirectoryInfo();
    }

    // S3 Operations
    async s3Upload(key, filePath) {
        return await this.s3Tools.upload(key, filePath);
    }

    async s3Download(key, downloadPath) {
        return await this.s3Tools.download(key, downloadPath);
    }

    async s3Delete(key) {
        return await this.s3Tools.delete(key);
    }

    async s3Search(prefix = '', maxKeys = 1000) {
        return await this.s3Tools.search(prefix, maxKeys);
    }

    async s3GetClientInfo() {
        return await this.s3Tools.getClientInfo();
    }

    async s3SetAcl(key, acl = 'private') {
        return await this.s3Tools.setAcl(key, acl);
    }
}