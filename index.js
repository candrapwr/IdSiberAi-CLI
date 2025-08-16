import inquirer from 'inquirer';
import chalk from 'chalk';
import { GeneralMCPHandler } from './src/GeneralMCPHandler.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

class GeneralMCPCLI {
    constructor() {
        this.mcp = null;
        this.isRunning = false;
        this.streamMode = false;
        this.streamBuffer = '';
    }

    async initialize() {
        console.log(chalk.blue.bold('🚀 General MCP Assistant CLI - Multi-AI Edition'));
        console.log(chalk.gray('AI-Powered File System & Automation Assistant with Multiple AI Providers'));
        console.log(chalk.gray('='.repeat(70)));
        
        // Get configuration
        const config = await this.getConfiguration();
        
        if (!config) {
            console.log(chalk.red('❌ Configuration cancelled. Exiting...'));
            return false;
        }

        // Initialize MCP Handler
        try {
            this.mcp = new GeneralMCPHandler(
                config.apiKeys,
                config.workingDirectory,
                config.maxIterations,
                {
                    enableLogging: config.enableLogging,
                    streamMode: config.streamMode,
                    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
                    onStreamChunk: this.handleStreamChunk.bind(this)
                }
            );
            
            this.streamMode = config.streamMode;
            
            console.log(chalk.green('✅ MCP Assistant initialized successfully!'));
            console.log(chalk.gray(`Working Directory: ${config.workingDirectory}`));
            console.log(chalk.gray(`Available Tools: ${this.mcp.getToolsList().length} tools`));
            console.log(chalk.gray(`Logging: ${config.enableLogging ? '✅ Enabled' : '❌ Disabled'}`));
            console.log(chalk.gray(`Stream Mode: ${config.streamMode ? '✅ Enabled' : '❌ Disabled'}`));
            
            const sessionInfo = this.mcp.getSessionInfo();
            console.log(chalk.gray(`Session ID: ${sessionInfo.sessionId}`));
            console.log(chalk.gray(`Current AI Provider: ${sessionInfo.currentAIProvider || 'None'}`));
            console.log(chalk.gray(`Available AI Providers: ${sessionInfo.availableAIProviders.join(', ') || 'None'}`));
            console.log(chalk.gray('='.repeat(70)));
            
            return true;
        } catch (error) {
            console.log(chalk.red(`❌ Error initializing MCP: ${error.message}`));
            return false;
        }
    }

    async getConfiguration() {
        console.log(chalk.yellow('⚙️  Configuration Setup - Multi-AI Edition'));
        console.log(chalk.gray('Configure your AI providers and system settings:'));
        
        const aiConfig = await this.configureAIProviders();
        if (!aiConfig || Object.keys(aiConfig).length === 0) {
            console.log(chalk.red('❌ At least one AI provider must be configured'));
            return null;
        }

        try {
            return {
                apiKeys: aiConfig,
                workingDirectory: path.resolve(process.env.WORKING_DIRECTORY || './workspace'),
                maxIterations: parseInt(process.env.MAX_ITERATIONS) || 15,
                enableLogging: process.env.ENABLE_LOGGING === 'true',
                streamMode: process.env.ENABLE_STREAMING === 'true'
            };
        } catch (error) {
            return null;
        }
    }

    async configureAIProviders() {
        const providers = [
            { name: 'DeepSeek', key: 'deepseek', envVar: 'DEEPSEEK_API_KEY' },
            { name: 'OpenAI', key: 'openai', envVar: 'OPENAI_API_KEY' },
            { name: 'Claude', key: 'claude', envVar: 'CLAUDE_API_KEY' },
            { name: 'Grok', key: 'grok', envVar: 'GROK_API_KEY' },
            { name: 'ZhiPuAI', key: 'zhipuai', envVar: 'ZHIPUAI_API_KEY' }
        ];

        const apiKeys = {};
        
        console.log(chalk.cyan('\n🤖 AI Provider Configuration'));
        console.log(chalk.gray('Configure your AI providers (leave empty to skip):'));

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
                return await this.configureAIProviders();
            }
            return null;
        }

        console.log(chalk.green(`\n✅ ${Object.keys(apiKeys).length} AI provider(s) configured successfully!`));
        return apiKeys;
    }

    handleStreamChunk(chunk) {
        if (this.streamMode) {
            process.stdout.write(chalk.green(chunk));
        }
    }

    async startChat() {
        this.isRunning = true;
        
        console.log(chalk.green.bold('\n💬 Chat Mode Started - Multi-AI Edition'));
        console.log(chalk.gray('Ask me anything! I can help with files, code, automation, and more.'));
        console.log(chalk.gray('New AI Commands: /ai, /switch, /test, /providers'));
        console.log(chalk.gray('Other Commands: /help, /tools, /logs, /stream, /stats, /clear, /history, /exit'));
        console.log(chalk.gray('-'.repeat(70)));

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
                const result = await this.mcp.handleUserRequest(userInput);
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

            // New AI management commands
            case '/ai':
            case '/providers':
                await this.showAIProviders();
                break;

            case '/switch':
                await this.switchAIProvider();
                break;

            case '/test':
                await this.testAIProviders();
                break;
            
            case '/exit':
            case '/quit':
                console.log(chalk.yellow('👋 Exiting chat...'));
                this.isRunning = false;
                break;
            
            default:
                console.log(chalk.red(`❌ Unknown command: ${command}`));
                console.log(chalk.gray('Type /help for available commands'));
                break;
        }
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
        console.log('  /stats    - Show usage statistics');
        console.log('  /clear    - Clear conversation history');
        console.log('  /history  - Show conversation history');
        
        console.log(chalk.yellow('\nAI Management Commands:'));
        console.log('  /ai       - Show AI providers information');
        console.log('  /providers- Show AI providers information');
        console.log('  /switch   - Switch between AI providers');
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

// Main execution
async function main() {
    const cli = new GeneralMCPCLI();
    
    // Initialize the CLI
    const initialized = await cli.initialize();
    
    if (initialized) {
        // Start chat mode
        await cli.startChat();
    }
    
    process.exit(0);
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
