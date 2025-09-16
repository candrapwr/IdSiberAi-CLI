import inquirer from 'inquirer';
import chalk from 'chalk';
import { GeneralMCPHandler } from './src/handlers/GeneralMCPHandler.js';
import { WebServer } from './src/web/web_server.js';
import dotenv from 'dotenv';
import path from 'path';
import boxen from 'boxen';
import gradient from 'gradient-string';
import figlet from 'figlet';


// Load environment variables
dotenv.config();

class GeneralMCPCLI {
    constructor() {
        this.mcp = null;
        this.isRunning = false;
        this.streamMode = false;
        this.streamBuffer = '';
        this.activeJob = null;
    }

    async initialize() {
        // Use the shared initialize function
        this.mcp = await initializeMCPHandler();
        
        if (!this.mcp) {
            console.log(chalk.red('❌ Initialization failed. Exiting...'));
            return false;
        }
        
        // Configure stream mode
        this.streamMode = process.env.ENABLE_STREAMING === 'true';
        this.mcp.setStreamMode(this.streamMode, this.handleStreamChunk.bind(this));
        
        return true;
    }



    handleStreamChunk(chunk) {
        if (this.streamMode) {
            if (this.onStreamChunk) {
                this.onStreamChunk(chunk);
            } else {
                process.stdout.write(chalk.green(chunk));
            }
        }
    }

    async startChat() {
        this.isRunning = true;
        
        // Display chat mode welcome message with better formatting
        const chatWelcome = boxen(
            `${chalk.green.bold('💬 CHAT MODE ACTIVATED')}\n\n` +
            `${chalk.cyan('Ask me anything!')} I can help with ${chalk.yellow('files')}, ${chalk.yellow('code')}, ${chalk.yellow('automation')}, and more.\n\n` +
            `${chalk.magenta.bold('AI Commands:')} ${chalk.magenta('/ai')}, ${chalk.magenta('/switch')}, ${chalk.magenta('/test')}, ${chalk.magenta('/providers')}\n` +
            `${chalk.blue.bold('Other Commands:')} ${chalk.blue('/help')}, ${chalk.blue('/tools')}, ${chalk.blue('/logs')}, ${chalk.blue('/stream')}, ${chalk.blue('/stats')}, ${chalk.blue('/clear')}, ${chalk.blue('/history')}, ${chalk.blue('/exit')}`,
            {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: 'green',
                backgroundColor: '#111'
            }
        );
        
        console.log(chatWelcome);

        while (this.isRunning) {
            try {
                const { message } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'message',
                        message: chalk.blue('You:'),
                        validate: (input) => {
                            if (!input.trim()) {
                                return 'Please enter a message';
                            }
                            return true;
                        }
                    }
                ]);

                const userInput = message.trim();

                // Handle commands
                if (userInput.startsWith('/')) {
                    await this.handleCommand(userInput);
                    continue;
                }

                // Process user request
                if (this.streamMode) {
                    console.log(chalk.yellow('\n🤖 Assistant (streaming):'));
                } else {
                    console.log(chalk.yellow('\n🤖 Assistant is working...'));
                }
                
                const startTime = Date.now();
                
                // Fallback is now handled automatically in RequestHandler
                // based on ENABLE_AI_FALLBACK environment variable
                const useFallback = process.env.ENABLE_AI_FALLBACK === 'true';
                if (useFallback) {
                    console.log(chalk.gray(`🔄 Fallback enabled: Will try other providers if needed`));
                }
                
                // Create a cancellable job for this request
                const jobId = `cli-${Date.now()}`;
                this.activeJob = jobId;
                const result = await this.mcp.handleUserRequest(userInput, { jobId });
                this.activeJob = null;
                const endTime = Date.now();

                if (!this.streamMode) {
                    console.log(chalk.gray(`⏱️  ${endTime - startTime}ms`));
                    console.log(chalk.gray('-'.repeat(50)));

                    if (result.success) {
                        console.log(chalk.green('🤖 Done:'));
                        console.log(result.response);
                        if (result.toolsUsed && result.toolsUsed.length > 0) {
                            console.log(chalk.gray(`🔧 Used: ${result.toolsUsed.map(t => t.name).join(', ')}`));
                        }
                        if (result.aiProvider) {
                            console.log(chalk.gray(`🤖 Provider: ${result.aiProvider}`));
                        }
                        if (result.fallbackUsed) {
                            console.log(chalk.yellow(`⚠️  Fallback: ${result.originalProvider} → ${result.aiProvider}`));
                        }
                    } else {
                        console.log(chalk.red('❌ Error:'));
                        console.log(result.error);
                        if (result.provider) {
                            console.log(chalk.gray(`🤖 Provider: ${result.provider}`));
                        }
                    }
                } else {
                    console.log(chalk.gray(`⏱️  ${endTime - startTime}ms`));
                    if (result.success && result.toolsUsed && result.toolsUsed.length > 0) {
                        console.log(chalk.gray(`🔧 Used: ${result.toolsUsed.map(t => t.name).join(', ')}`));
                    }
                    if (result.aiProvider) {
                        console.log(chalk.gray(`🤖 Provider: ${result.aiProvider}`));
                    }
                }
                
                console.log(chalk.gray('-'.repeat(50)));

            } catch (error) {
                if (error.name === 'ExitPromptError') {
                    // User pressed Ctrl+C
                    break;
                } else {
                    console.log(chalk.red(`❌ Unexpected error: ${error.message}`));
                }
            }
        }

        console.log(chalk.blue('👋 Goodbye! Thanks for using MCP Assistant.'));
    }

    async handleCommand(command) {
        const cmd = command.toLowerCase();

        switch (cmd) {
            case '/help':
                this.showHelp();
                break;
            
            case '/tools':
                this.showTools();
                break;
            
            case '/logs':
                await this.showLogs();
                break;
                
            case '/stream':
                await this.toggleStreamMode();
                break;
            case '/stop':
                await this.stopActiveJob();
                break;
                
            case '/context':
            case '/ctx':
                await this.manageContextOptimization();
                break;
                
            case '/stats':
                await this.showStats();
                break;
            
            case '/clear':
                console.log(chalk.yellow('🧹 Clearing conversation history...'));
                this.mcp.clearHistory();
                console.log(chalk.green('✅ History cleared!'));
                break;
            
            case '/history':
                this.showHistory();
                break;
                
            case '/workdir':
                await this.changeWorkingDirectory();
                break;

            // New AI management commands
            case '/ai':
            case '/providers':
                await this.showAIProviders();
                break;

            case '/switch':
                await this.switchAIProvider();
                break;

            case '/fallback':
                await this.toggleFallbackMode();
                break;

            case '/test':
                await this.testAIProviders();
                break;
            
            case '/exit':
            case '/quit':
                console.log(chalk.yellow('👋 Exiting chat...'));
                this.isRunning = false;
                break;
            case '/stop':
                await this.stopActiveJob();
                break;
            
            default:
                console.log(chalk.red(`❌ Unknown command: ${command}`));
                console.log(chalk.gray('Type /help for available commands'));
                break;
        }
    }

    async stopActiveJob() {
        if (!this.activeJob) {
            console.log(chalk.yellow('⚠️ No active job to stop.'));
            return;
        }
        const res = await this.mcp.stopJob(this.activeJob);
        if (res.success) console.log(chalk.green(`🛑 Stopped job ${this.activeJob}`));
        else console.log(chalk.red(`❌ Failed to stop: ${res.message}`));
    }

    // New AI management command handlers
    async showAIProviders() {
        console.log(chalk.cyan.bold('\n🤖 AI Providers Information'));
        console.log(chalk.gray('='.repeat(50)));
        
        const sessionInfo = this.mcp.getSessionInfo();
        const providersInfo = sessionInfo.aiProvidersInfo;
        
        console.log(chalk.cyan(`Current Provider: ${sessionInfo.currentAIProvider || 'None'}`));
        console.log(chalk.cyan(`Available Providers: ${sessionInfo.availableAIProviders.length}`));
        console.log();

        for (const [name, info] of Object.entries(providersInfo)) {
            const status = info.isActive ? chalk.green('● ACTIVE') : chalk.gray('○ Available');
            console.log(`${status} ${chalk.bold(name)}`);
            console.log(`   Default Model: ${info.defaultModel}`);
            console.log(`   Has API Key: ${info.hasApiKey ? '✅' : '❌'}`);
            console.log(`   Logging: ${info.loggingEnabled ? '✅' : '❌'}`);
            console.log();
        }
        
        console.log(chalk.gray('-'.repeat(50)));
    }

    async switchAIProvider() {
        const sessionInfo = this.mcp.getSessionInfo();
        const providers = sessionInfo.availableAIProviders;

        if (providers.length === 0) {
            console.log(chalk.red('❌ No AI providers available'));
            return;
        }

        if (providers.length === 1) {
            console.log(chalk.yellow(`⚠️  Only one provider available: ${providers[0]}`));
            return;
        }

        const { selectedProvider } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedProvider',
                message: 'Select AI Provider:',
                choices: providers.map(provider => ({
                    name: provider === sessionInfo.currentAIProvider ? 
                        `${provider} (current)` : provider,
                    value: provider
                }))
            }
        ]);

        if (selectedProvider === sessionInfo.currentAIProvider) {
            console.log(chalk.yellow(`⚠️  ${selectedProvider} is already the current provider`));
            return;
        }

        console.log(chalk.yellow(`🔄 Switching to ${selectedProvider}...`));
        
        try {
            const result = await this.mcp.switchAIProvider(selectedProvider);
            if (result.success) {
                console.log(chalk.green(`✅ Successfully switched to ${selectedProvider}`));
            } else {
                console.log(chalk.red(`❌ Failed to switch: ${result.error}`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error switching provider: ${error.message}`));
        }
    }

    async testAIProviders() {
        console.log(chalk.cyan.bold('\n🧪 Testing AI Providers'));
        console.log(chalk.gray('='.repeat(40)));
        
        console.log(chalk.yellow('🔄 Testing all providers...'));
        
        try {
            const result = await this.mcp.testAIProviders();
            
            if (result.success) {
                console.log(chalk.green(`✅ Test completed for ${Object.keys(result.testResults).length} providers\n`));
                
                for (const [provider, testResult] of Object.entries(result.testResults)) {
                    const status = testResult.success ? 
                        chalk.green('✅ PASS') : 
                        chalk.red('❌ FAIL');
                    
                    console.log(`${status} ${chalk.bold(provider)}`);
                    
                    if (testResult.success) {
                        console.log(`   Response Time: ${testResult.responseTime}ms`);
                    } else {
                        console.log(`   Error: ${testResult.error}`);
                    }
                    console.log();
                }
            } else {
                console.log(chalk.red(`❌ Test failed: ${result.error}`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error testing providers: ${error.message}`));
        }
        
        console.log(chalk.gray('-'.repeat(40)));
    }
    
    async changeWorkingDirectory() {
        console.log(chalk.cyan.bold('\n📂 Working Directory Management'));
        console.log(chalk.gray('='.repeat(50)));
        
        // Get current working directory
        const currentDir = this.mcp.getWorkingDirectory();
        console.log(chalk.cyan(`Current Working Directory: ${currentDir}`));
        console.log();
        
        // Ask for new directory
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Change working directory', value: 'change' },
                    { name: 'View directory info', value: 'info' },
                    { name: 'Back to chat', value: 'back' }
                ]
            }
        ]);
        
        if (action === 'back') {
            return;
        }
        
        if (action === 'info') {
            // Show directory info
            const info = await this.mcp.tools.getWorkingDirectoryInfo();
            if (info.success) {
                console.log(chalk.cyan('\nDirectory Information:'));
                console.log(`  Path: ${info.path}`);
                console.log(`  Files: ${info.files}`);
                console.log(`  Directories: ${info.directories}`);
                console.log(`  Total Size: ${info.humanSize}`);
                console.log(chalk.cyan('\nFile Extensions:'));
                for (const [ext, count] of Object.entries(info.filesByExtension)) {
                    console.log(`  ${ext}: ${count} files`);
                }
            } else {
                console.log(chalk.red(`❌ Error: ${info.error}`));
            }
            return;
        }
        
        // Change directory
        const { newDirectory } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newDirectory',
                message: 'Enter new working directory path:',
                default: currentDir,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Please enter a directory path';
                    }
                    return true;
                }
            }
        ]);
        
        // Confirm change
        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Change working directory to: ${newDirectory}?`,
                default: true
            }
        ]);
        
        if (!confirmed) {
            console.log(chalk.yellow('⚠️ Working directory change cancelled.'));
            return;
        }
        
        // Process the change
        console.log(chalk.yellow(`🔄 Changing working directory to: ${newDirectory}...`));
        
        const result = await this.mcp.changeWorkingDirectory(newDirectory);
        
        if (result.success) {
            console.log(chalk.green(`✅ ${result.message}`));
        } else {
            console.log(chalk.red(`❌ Error: ${result.error}`));
        }
    }

    async toggleStreamMode() {
        this.streamMode = !this.streamMode;
        this.mcp.setStreamMode(this.streamMode, this.handleStreamChunk.bind(this));
        
        console.log(chalk.cyan(`🌊 Stream Mode: ${this.streamMode ? 'Enabled' : 'Disabled'}`));
        if (this.streamMode) {
            console.log(chalk.gray('AI responses will now stream in real-time'));
        } else {
            console.log(chalk.gray('AI responses will be shown after completion'));
        }
    }
    
    async toggleFallbackMode() {
        const currentValue = process.env.ENABLE_AI_FALLBACK === 'true';
        const newValue = !currentValue;
        process.env.ENABLE_AI_FALLBACK = newValue.toString();
        
        console.log(chalk.cyan(`🛡️ AI Fallback Mode: ${newValue ? 'Enabled' : 'Disabled'}`));
        if (newValue) {
            console.log(chalk.gray('System will automatically try other providers if the current one fails'));
            console.log(chalk.gray('Note: This setting is temporary and will reset when the application restarts'));
            console.log(chalk.gray('To make it permanent, edit the ENABLE_AI_FALLBACK value in your .env file'));
        } else {
            console.log(chalk.gray('System will only use the currently selected provider'));
        }
    }
    
    async manageContextOptimization() {
        console.log(chalk.cyan.bold('\n🧠 Context Optimization Manager'));
        console.log(chalk.gray('='.repeat(50)));
        
        // Get current status first
        const status = this.mcp.getContextOptimizerStatus();
        console.log(chalk.cyan(`Current Status: ${status.enabled ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled')}`));
        console.log(chalk.cyan(`Version: ${status.version || '1.0.0'}`));
        console.log(chalk.cyan(`Debug: ${status.debug ? chalk.green(`✅ Enabled (Level ${status.debugLevel})`) : chalk.gray('❌ Disabled')}`));
        console.log(chalk.cyan(`Optimized Actions: ${status.optimizedActions.join(', ')}`));
        console.log(chalk.cyan(`Max Instances: ${status.maxInstances}`));
        
        if (status.stats.totalOptimizations > 0) {
            console.log(chalk.cyan('\nOptimization Stats:'));
            console.log(`  Total Optimizations: ${status.stats.totalOptimizations}`);
            console.log(`  Messages Removed: ${status.stats.messagesRemoved}`);
            console.log(`  Estimated Tokens Saved: ${status.stats.tokensSaved}`);
            console.log(`  Last Optimization: ${status.stats.lastOptimizationTime ? new Date(status.stats.lastOptimizationTime).toLocaleString() : 'Never'}`);
        }
        
        console.log();
        
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Choose an action:',
                choices: [
                    { name: `${status.enabled ? 'Disable' : 'Enable'} Context Optimization`, value: 'toggle' },
                    { name: 'Configure Optimized Actions', value: 'actions' },
                    { name: 'Toggle Debug Logging', value: 'debug' },
                    { name: 'Manual Optimize Now', value: 'optimize' },
                    { name: 'Reset Statistics', value: 'reset' },
                    { name: 'Back to Chat', value: 'back' }
                ]
            }
        ]);
        
        switch(action) {
            case 'toggle':
                const newStatus = !status.enabled;
                this.mcp.setContextOptimizationEnabled(newStatus);
                console.log(chalk.green(`✅ Context Optimization ${newStatus ? 'Enabled' : 'Disabled'}`));
                break;
                
            case 'actions':
                await this.configureOptimizedActions();
                break;
                
            case 'optimize':
                console.log(chalk.yellow('🔄 Manually optimizing context...'));
                const result = this.mcp.optimizeContext();
                if (result.optimized) {
                    console.log(chalk.green(`✅ Optimization successful! Removed ${result.messagesRemoved} messages.`));
                    console.log(chalk.gray(`Original: ${result.originalLength} messages → New: ${result.newLength} messages`));
                } else {
                    console.log(chalk.yellow('⚠️ No redundant messages found to optimize.'));
                }
                break;
                
            case 'debug':
                await this.toggleDebugLogging();
                break;
                
            case 'reset':
                this.mcp.resetContextOptimizationStats();
                console.log(chalk.green('✅ Optimization statistics reset.'));
                break;
                
            case 'back':
                // Do nothing, return to chat
                break;
        }
    }
    
    async toggleDebugLogging() {
        const status = this.mcp.getContextOptimizerStatus();
        const currentDebug = status.debug || false;
        const currentLevel = status.debugLevel || 1;
        
        // Pilihan debug level
        const { debugOption } = await inquirer.prompt([
            {
                type: 'list',
                name: 'debugOption',
                message: 'Debug logging:',
                choices: [
                    { name: 'Disable debug logging', value: 'off' },
                    { name: 'Minimal logging (level 1)', value: 'min' },
                    { name: 'Detailed logging (level 2)', value: 'med' },
                    { name: 'Verbose logging (level 3)', value: 'max' }
                ],
                default: currentDebug ? 
                    (currentLevel === 3 ? 'max' : (currentLevel === 2 ? 'med' : 'min')) : 
                    'off'
            }
        ]);
        
        let newDebug = false;
        let newLevel = 1;
        
        switch(debugOption) {
            case 'off':
                newDebug = false;
                break;
            case 'min':
                newDebug = true;
                newLevel = 1;
                break;
            case 'med':
                newDebug = true;
                newLevel = 2;
                break;
            case 'max':
                newDebug = true;
                newLevel = 3;
                break;
        }
        
        // Atur debug setting
        this.mcp.setContextOptimizerDebug(newDebug, newLevel);
        
        const statusString = newDebug ? 
            `Enabled (level ${newLevel})` : 
            'Disabled';
        
        console.log(chalk.green(`✅ Debug logging set to: ${statusString}`));
    }
    
    async configureOptimizedActions() {
        const currentActions = this.mcp.getOptimizedActions();
        const allTools = this.mcp.getToolsList();
        
        const { selectedActions } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedActions',
                message: 'Select actions to optimize:',
                choices: allTools.map(tool => ({
                    name: tool,
                    value: tool,
                    checked: currentActions.includes(tool)
                })),
                validate: (input) => input.length > 0 ? true : 'Select at least one action'
            }
        ]);
        
        this.mcp.setOptimizedActions(selectedActions);
        console.log(chalk.green(`✅ Updated optimized actions: ${selectedActions.join(', ')}`));
    }

    async showLogs() {
        console.log(chalk.cyan.bold('\n📜 Logs Management'));
        console.log(chalk.gray('='.repeat(40)));
        
        const logChoice = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    'View recent conversations',
                    'View recent API calls',
                    'View recent tool executions',
                    'View error logs',
                    'Clear old logs',
                    'Back to chat'
                ]
            }
        ]);

        switch (logChoice.action) {
            case 'View recent conversations':
                await this.viewLogs('conversation');
                break;
            case 'View recent API calls':
                await this.viewLogs('api');
                break;
            case 'View recent tool executions':
                await this.viewLogs('tools');
                break;
            case 'View error logs':
                await this.viewLogs('errors');
                break;
            case 'Clear old logs':
                await this.clearLogs();
                break;
        }
    }

    async viewLogs(logType) {
        const result = await this.mcp.getRecentLogs(logType, 20);
        
        if (result.error) {
            console.log(chalk.red(`❌ Error: ${result.error}`));
            return;
        }

        console.log(chalk.cyan(`\n📝 Recent ${logType} logs (${result.count} entries):`));
        console.log(chalk.gray('-'.repeat(50)));
        
        result.logs.forEach((log, index) => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            console.log(chalk.gray(`${index + 1}. [${timestamp}]`));
            
            if (logType === 'conversation') {
                console.log(chalk.blue(`   User: ${log.user_input?.substring(0, 100)}...`));
                console.log(chalk.green(`   AI: ${log.ai_response?.substring(0, 100)}...`));
                if (log.aiProvider) {
                    console.log(chalk.gray(`   Provider: ${log.aiProvider}`));
                }
            } else if (logType === 'api') {
                console.log(chalk.blue(`   Provider: ${log.provider || log.request?.model}`));
                console.log(chalk.green(`   Success: ${log.response?.success}`));
                console.log(chalk.gray(`   Tokens: ${log.response?.usage?.total_tokens || 'N/A'}`));
            } else if (logType === 'tools') {
                console.log(chalk.blue(`   Tool: ${log.tool?.name}`));
                console.log(chalk.green(`   Success: ${log.result?.success}`));
                if (log.currentAIProvider) {
                    console.log(chalk.gray(`   AI Provider: ${log.currentAIProvider}`));
                }
            } else if (logType === 'errors') {
                console.log(chalk.red(`   Error: ${log.error?.message}`));
                console.log(chalk.gray(`   Context: ${log.context?.context}`));
                if (log.context?.currentAIProvider) {
                    console.log(chalk.gray(`   AI Provider: ${log.context.currentAIProvider}`));
                }
            }
            console.log();
        });
    }

    async clearLogs() {
        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Clear logs older than 7 days?',
                default: false
            }
        ]);

        if (confirm.confirmed) {
            const result = await this.mcp.clearOldLogs(7);
            if (result.error) {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            } else {
                console.log(chalk.green(`✅ ${result.message}`));
            }
        }
    }

    async showStats() {
        console.log(chalk.cyan.bold('\n📊 Statistics'));
        console.log(chalk.gray('='.repeat(40)));
        
        // Session info
        const sessionInfo = this.mcp.getSessionInfo();
        console.log(chalk.cyan('Current Session:'));
        console.log(`  Session ID: ${sessionInfo.sessionId}`);
        console.log(`  Stream Mode: ${sessionInfo.streamMode ? '✅' : '❌'}`);
        console.log(`  AI Fallback: ${process.env.ENABLE_AI_FALLBACK === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`  Max Iterations: ${sessionInfo.maxIterations}`);
        console.log(`  Conversation Length: ${sessionInfo.conversationLength}`);
        console.log(`  Tools Available: ${sessionInfo.toolsCount}`);
        console.log(`  Logging: ${sessionInfo.loggingEnabled ? '✅' : '❌'}`);
        console.log(`  Current AI Provider: ${sessionInfo.currentAIProvider || 'None'}`);
        console.log(`  Available AI Providers: ${sessionInfo.availableAIProviders.length}`);
        
        // API usage stats for all providers
        const apiUsage = await this.mcp.getAPIUsage();
        if (!apiUsage.error) {
            console.log(chalk.cyan('\nAI Provider Usage Stats:'));
            
            for (const [provider, stats] of Object.entries(apiUsage)) {
                if (stats.error) {
                    console.log(chalk.red(`  ${provider}: Error - ${stats.error}`));
                } else if (stats.message) {
                    console.log(chalk.gray(`  ${provider}: ${stats.message}`));
                } else {
                    console.log(chalk.green(`  ${provider}:`));
                    console.log(`    Total Calls: ${stats.totalCalls || 0}`);
                    console.log(`    Successful: ${stats.successfulCalls || 0}`);
                    console.log(`    Failed: ${stats.failedCalls || 0}`);
                    console.log(`    Success Rate: ${stats.successRate || '0%'}`);
                    if (stats.totalTokens) {
                        console.log(`    Total Tokens: ${stats.totalTokens}`);
                    }
                }
            }
        }
        
        console.log(chalk.gray('-'.repeat(40)));
    }

    showHelp() {
        console.log(chalk.cyan.bold('\n📖 Help - General MCP Assistant Multi-AI Edition'));
        console.log(chalk.gray('='.repeat(60)));
        
        console.log(chalk.cyan('Available Commands:'));
        console.log('  /help     - Show this help message');
        console.log('  /tools    - Show available tools');
        console.log('  /logs     - Manage and view logs');
        console.log('  /stream   - Toggle streaming mode');
        console.log('  /context  - Manage context optimization');
        console.log('  /ctx      - Shortcut for context management');
        console.log('  /stats    - Show usage statistics');
        console.log('  /clear    - Clear conversation history');
        console.log('  /history  - Show conversation history');
        console.log('  /workdir  - Change working directory');
        
        console.log(chalk.yellow('\nAI Management Commands:'));
        console.log('  /ai       - Show AI providers information');
        console.log('  /providers- Show AI providers information');
        console.log('  /switch   - Switch between AI providers');
        console.log('  /fallback - Toggle AI fallback mode');
        console.log('  /test     - Test all AI providers');
        
        console.log('  /exit     - Exit the application');
        
        console.log(chalk.cyan('\nExample Requests:'));
        console.log('  "create a new JavaScript project structure"');
        console.log('  "find all Python files in this directory"');
        console.log('  "analyze the code structure of index.js"');
        console.log('  "search for TODO comments in all files"');
        console.log('  "create a README file for my project"');
        console.log('  "organize my files by file type"');
        console.log('  "run npm install command"');
        console.log('  "upload file.txt to S3 bucket"');
        console.log('  "download myfile.json from S3"');
        console.log('  "search S3 for files with prefix data/"');
        console.log('  "execute SQL query: SELECT * FROM users"');
        console.log('  "backup all my .js files to a backup folder"');
        console.log('  "switch to OpenAI provider"');
        console.log('  "test all AI providers"');
        
        console.log(chalk.cyan('\nWhat I can help with:'));
        console.log('  🗂️  File and directory management');
        console.log('  🔍  Code analysis and structure review');
        console.log('  📝  Text processing and search/replace');
        console.log('  🏗️  Project organization and setup');
        console.log('  ⚙️  System automation and commands');
        console.log('  📊  Data processing and manipulation');
        console.log('  🔧  Development workflow assistance');
        console.log('  ☁️  Cloud storage management (S3)');
        console.log('  🗃️  Database operations (MySQL/PostgreSQL)');
        console.log('  📜  Logging and usage monitoring');
        console.log('  🤖  Multi-AI provider management');
        
        console.log(chalk.cyan('\nMulti-AI Features:'));
        console.log('  ✨ Multiple AI Providers - DeepSeek, OpenAI, Claude, Grok');
        console.log('  🔄 Provider Switching - Change providers on the fly');
        console.log('  🛡️ Automatic Fallback - Switch providers if one fails');
        console.log('  🧪 Provider Testing - Test connectivity of all providers');
        console.log('  📊 Per-Provider Stats - Track usage for each provider');
        console.log('  📝 Enhanced Logging - Track which provider was used');
        
        console.log(chalk.gray('-'.repeat(60)));
    }

    showTools() {
        console.log(chalk.cyan.bold('\n🛠️  Available Tools'));
        console.log(chalk.gray('='.repeat(40)));
        
        const tools = this.mcp.getToolsList();
        const categories = {
            'File Operations': [
                'search_files', 'read_file', 'write_file', 'append_to_file',
                'delete_file', 'copy_file', 'move_file'
            ],
            'Directory Operations': [
                'list_directory', 'create_directory', 'delete_directory'
            ],
            'Analysis Tools': [
                'analyze_file_structure', 'find_in_files', 'replace_in_files'
            ],
            'System Operations': [
                'execute_command', 'get_working_directory_info'
            ],
            'S3 Cloud Storage Operations': [
                's3_upload', 's3_download', 's3_delete', 's3_search', 's3_get_client_info'
            ],
            'Database Operations': [
                'execute_query'
            ],
            'Internet Operations': [
                'access_url'
            ],
            'AI Management Operations': [
                'switch_ai_provider', 'list_ai_providers', 'get_ai_provider_info', 'test_ai_providers'
            ],
            'Logging Operations': [
                'get_api_usage', 'get_recent_logs', 'clear_old_logs'
            ]
        };

        Object.entries(categories).forEach(([category, categoryTools]) => {
            console.log(chalk.cyan(`\n${category}:`));
            categoryTools.forEach(tool => {
                if (tools.includes(tool)) {
                    console.log(`  ✅ ${tool}`);
                }
            });
        });
        
        console.log(chalk.gray(`\nTotal: ${tools.length} tools available`));
        console.log(chalk.gray('-'.repeat(40)));
    }

    showHistory() {
        console.log(chalk.cyan.bold('\n📚 Conversation History'));
        console.log(chalk.gray('='.repeat(40)));
        
        const history = this.mcp.getConversationHistory();
        
        if (history.length === 0) {
            console.log(chalk.gray('No conversation history yet.'));
            return;
        }

        history.forEach((msg, index) => {
            const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('Assistant');
            const content = msg.content.length > 100 
                ? msg.content.substring(0, 100) + '...' 
                : msg.content;
            
            console.log(`${index + 1}. ${role}: ${content}`);
        });
        
        console.log(chalk.gray(`\nTotal messages: ${history.length}`));
        console.log(chalk.gray('-'.repeat(40)));
    }
}

// Display welcome banner
function displayWelcomeBanner() {
    // Create ASCII art title with gradient colors
    const title = figlet.textSync('IdSiberAi', {
        font: 'Standard',
        horizontalLayout: 'full'
    });
    
    // Apply gradient colors to title
    const titleGradient = gradient(['#00c6ff', '#0072ff', '#00c6ff']).multiline(title);
    
    // Create subtitle
    const subtitle = ' Terminal & CLI - Multi-Provider AI Assistant ';
    
    // Create version and author info
    const version = '  v2.2.0  ';
    const author = ' by DataSiber Technology ';
    
    // Create boxed welcome message
    const welcomeBox = boxen(
        `${titleGradient}\n\n${chalk.bold(subtitle)}\n\n` +
        `${chalk.cyan('•')} 7 AI Models ${chalk.gray('|')} ${chalk.cyan('•')} 25+ Tools ${chalk.gray('|')} ${chalk.cyan('•')} Dual Interface\n\n` +
        `${chalk.bgBlue(version)}${chalk.gray(author)}`,
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'blue',
            backgroundColor: '#111'
        }
    );
    
    console.log(welcomeBox);
}

// Main execution
async function main() {
    // Display welcome banner
    displayWelcomeBanner();
    
    console.log(chalk.gray('='.repeat(70)));
    
    // Ask user for mode selection with stylish prompt
    console.log(chalk.cyan.bold('\n🔹 SELECT INTERFACE MODE'));
    
    const modeChoices = [
        {
            name: `${chalk.bold.green('💻 CLI Mode')} - ${chalk.gray('Native Terminal Experience')}`,
            value: 'cli'
        },
        {
            name: `${chalk.bold.blue('🌐 Web Mode')} - ${chalk.gray('Browser-based Dashboard')}`,
            value: 'web'
        }
    ];
    
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Which interface would you like to use?',
            choices: modeChoices,
            prefix: '🔹',
            default: 'cli'
        }
    ]);
    
    if (mode === 'cli') {
        
        const cli = new GeneralMCPCLI();
        const initialized = await cli.initialize();
        
        if (initialized) {
            // Start chat mode
            await cli.startChat();
        }
    } else {
        // Initialize Web mode with nice loading effect
        console.log();
        console.log(chalk.blue.bold('🌐 WEB MODE SELECTED'));
        console.log(chalk.gray('Initializing IdSiberAi Terminal web interface...'));
        
        try {
            // Get web server port from environment or use default
            const port = parseInt(process.env.WEB_PORT) || 3000;
            
            // Initialize MCP handler first
            const mcpHandler = await initializeMCPHandler();
            
            if (mcpHandler) {
                // Initialize and start web server
                const webServer = new WebServer(mcpHandler, port);
                await webServer.start();
                
                console.log(chalk.green.bold(`✅ IdSiberAi Terminal is now available at http://localhost:${port}`));
                console.log(chalk.gray('Press Ctrl+C to stop the server'));
                
                // Keep the process running
                process.stdin.resume();
            } else {
                console.log(chalk.red('❌ Failed to initialize MCP Handler'));
                process.exit(1);
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error initializing web interface: ${error.message}`));
            process.exit(1);
        }
    }
}

// Initialize MCP Handler (shared function for both modes)
async function initializeMCPHandler() {
    try {
        // Configure AI providers
        const aiConfig = await configureAIProviders();
        if (!aiConfig || Object.keys(aiConfig).length === 0) {
            console.log(chalk.red('❌ At least one AI provider must be configured'));
            return null;
        }
        
        // Create configuration
        const config = {
            apiKeys: aiConfig,
            workingDirectory: path.resolve(process.env.WORKING_DIRECTORY || './workspace'),
            maxIterations: parseInt(process.env.MAX_ITERATIONS) || 15,
            enableLogging: process.env.ENABLE_LOGGING === 'true',
            streamMode: process.env.ENABLE_STREAMING === 'true',
            enableAIFallback: process.env.ENABLE_AI_FALLBACK === 'true'
        };
        
        // Initialize MCP Handler
        const mcpHandler = new GeneralMCPHandler(
            config.apiKeys,
            config.workingDirectory,
            config.maxIterations,
            {
                enableLogging: config.enableLogging,
                streamMode: config.streamMode,
                debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
            }
        );
        
        console.log(chalk.green('✅ MCP Assistant initialized successfully!'));
        console.log(chalk.gray(`Working Directory: ${config.workingDirectory}`));
        console.log(chalk.gray(`Available Tools: ${mcpHandler.getToolsList().length} tools`));
        
        const sessionInfo = mcpHandler.getSessionInfo();
        console.log(chalk.gray(`Current AI Provider: ${sessionInfo.currentAIProvider || 'None'}`));
        console.log(chalk.gray(`Available AI Providers: ${sessionInfo.availableAIProviders.join(', ') || 'None'}`));
        
        return mcpHandler;
    } catch (error) {
        console.log(chalk.red(`❌ Error initializing MCP: ${error.message}`));
        return null;
    }
}

// Configure AI providers (shared function)
async function configureAIProviders() {
    const providers = [
        { name: 'DeepSeek', key: 'deepseek', envVar: 'DEEPSEEK_API_KEY' },
        { name: 'OpenAI', key: 'openai', envVar: 'OPENAI_API_KEY' },
        { name: 'Claude', key: 'claude', envVar: 'CLAUDE_API_KEY' },
        { name: 'Grok', key: 'grok', envVar: 'GROK_API_KEY' },
        { name: 'ZhiPuAI', key: 'zhipuai', envVar: 'ZHIPUAI_API_KEY' },
        { name: 'QwenAI', key: 'qwen', envVar: 'QWEN_API_KEY' },
        { name: 'Gemini', key: 'gemini', envVar: 'GEMINI_API_KEY' }
    ];

    const apiKeys = {};
    
    console.log(chalk.cyan('\n🤖 AI Provider Configuration'));
    console.log(chalk.gray('Configure your AI providers (using environment variables):'));

    for (const provider of providers) {
        const defaultKey = process.env[provider.envVar] || '';
        const apiKey = defaultKey;

        if (apiKey && apiKey.trim()) {
            apiKeys[provider.key] = apiKey.trim();
            console.log(chalk.green(`✅ ${provider.name} configured`));
        } else {
            console.log(chalk.gray(`⏭️  ${provider.name} skipped`));
        }
    }

    if (Object.keys(apiKeys).length === 0) {
        console.log(chalk.red('\n❌ No AI providers configured!'));
        const { retry } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'retry',
                message: 'Would you like to try again?',
                default: true
            }
        ]);

        if (retry) {
            return await configureAIProviders();
        }
        return null;
    }

    console.log(chalk.green(`\n✅ ${Object.keys(apiKeys).length} AI provider(s) configured successfully!`));
    return apiKeys;
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('❌ Unhandled Rejection at:', promise, 'reason:', reason));
    process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log(chalk.blue('\n👋 Goodbye! Thanks for using MCP Assistant.'));
    process.exit(0);
});

// Run the application
main().catch(error => {
    console.log(chalk.red('❌ Fatal error:', error.message));
    process.exit(1);
});
