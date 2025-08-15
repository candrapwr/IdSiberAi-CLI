import chalk from 'chalk';

export class DebugHelper {
    constructor(enabled = false) {
        this.enabled = enabled || process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    }

    log(message, data = null) {
        if (!this.enabled) return;
        
        console.log(chalk.blue('🐛 DEBUG:'), message);
        if (data) {
            console.log(chalk.gray(JSON.stringify(data, null, 2)));
        }
    }

    error(message, error = null) {
        if (!this.enabled) return;
        
        console.log(chalk.red('🐛 DEBUG ERROR:'), message);
        if (error) {
            console.log(chalk.red('Error:'), error.message);
            console.log(chalk.red('Stack:'), error.stack);
        }
    }

    toolExecution(toolName, parameters, result) {
        if (!this.enabled) return;
        
        console.log(chalk.green('🐛 TOOL DEBUG:'), `Executing ${toolName}`);
        console.log(chalk.gray('Parameters:'), JSON.stringify(parameters, null, 2));
        console.log(chalk.gray('Result:'), JSON.stringify(result, null, 2));
    }

    aiResponse(provider, response) {
        if (!this.enabled) return;
        
        console.log(chalk.yellow('🐛 AI DEBUG:'), `Response from ${provider}`);
        console.log(chalk.gray('Success:'), response.success);
        if (response.message) {
            console.log(chalk.gray('Message length:'), response.message.length);
            console.log(chalk.gray('First 200 chars:'), response.message.substring(0, 200));
        }
        if (response.error) {
            console.log(chalk.red('Error:'), response.error);
        }
    }
}
