import { FileTools } from './tools/FileTools.js';
import { DirectoryTools } from './tools/DirectoryTools.js';
import { AnalysisTools } from './tools/AnalysisTools.js';
import { SystemTools } from './tools/SystemTools.js';
import { S3Tools } from './tools/S3Tools.js';
import { InternetTools } from './tools/InternetTools.js';
import { DatabaseTools } from './tools/DatabaseTools.js';

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
        this.internetTools = new InternetTools(workingDirectory);
        this.dbTools = new DatabaseTools;
    }
    
    // Working directory management
    getWorkingDirectory() {
        return this.workingDirectory;
    }
    
    setWorkingDirectory(newDirectory) {
        this.workingDirectory = newDirectory;
        
        // Update working directory in all tool classes
        this.fileTools.setWorkingDirectory(newDirectory);
        this.directoryTools.setWorkingDirectory(newDirectory);
        this.analysisTools.setWorkingDirectory(newDirectory);
        this.systemTools.setWorkingDirectory(newDirectory);
        this.s3Tools.setWorkingDirectory(newDirectory);
        this.internetTools.setWorkingDirectory(newDirectory);
        
        return this.workingDirectory;
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

    // Database Operations
    async executeQuery(query, database = null) {
        return await this.dbTools.executeQuery(query, database);
    }

    // Directory Operations
    async listDirectory(dirPath,changeMode) {
        return await this.directoryTools.listDirectory(dirPath,changeMode);
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

    // Internet Operations
    async accessUrl(url, options) {
        return await this.internetTools.accessUrl(url, options);
    }

    async testInternetConnection() {
        return await this.internetTools.testInternetConnection();
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