# IdSiberAi-CLI: Intelligent AI-Powered Command Line Interface

IdSiberAi-CLI is a powerful and intuitive command-line interface (CLI) platform that integrates advanced AI chat capabilities with local system management. Designed for seamless interaction, it allows users to manage files, automate tasks, and engage in intelligent conversations, all from the comfort of their terminal.

## Features

- 🤖 **AI-Powered Assistant**: Uses DeepSeek AI to understand and execute complex tasks
- 🛠️ **15+ Powerful Tools**: File operations, code analysis, system automation
- 🔄 **Autonomous Workflow**: AI automatically determines and uses the right tools
- 💬 **Interactive Chat**: Natural language interface for any computing task
- 🔒 **Safe Operations**: Sandboxed working directory with proper validation
- 📊 **Smart Analysis**: Language-aware code structure analysis
- ⚡ **System Integration**: Execute commands and automate workflows

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

## Configuration

Edit `.env` file:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
WORKING_DIRECTORY=./workspace
MAX_ITERATIONS=15
```

Or configure during first run via CLI prompts.

## Usage

Start the interactive CLI:

```bash
npm start
```

### Chat Commands

- `/help` - Show available commands and examples
- `/tools` - Show all available tools
- `/clear` - Clear conversation history
- `/history` - Show conversation history
- `/exit` - Exit the application

### Example Requests

```
"create a new JavaScript project structure"
"find all Python files in this directory"
"analyze the code structure of index.js"
"search for TODO comments in all files"
"create a README file for my project"
"organize my files by file type"
"run npm install command"
"backup all my .js files to a backup folder"
"find and replace console.log with logger in all JS files"
"create a simple web server in Node.js"
"analyze this CSV file and show me the structure"
```

## Available Tools

### File Operations
- `search_files` - Find files matching patterns
- `read_file` - Read file content with metadata
- `write_file` - Create or update files
- `append_to_file` - Append content to files
- `delete_file` - Delete files safely
- `copy_file` - Copy files to new locations
- `move_file` - Move/rename files

### Directory Operations
- `list_directory` - List directory contents with details
- `create_directory` - Create directories recursively
- `delete_directory` - Delete directories and contents

### Analysis Tools
- `analyze_file_structure` - Smart code structure analysis
- `find_in_files` - Search text patterns in files
- `replace_in_files` - Replace text patterns across files

### System Operations
- `execute_command` - Run system commands safely
- `get_working_directory_info` - Get workspace information

## How It Works

### MCP Architecture

```
User Request → AI Assistant → Tool Selection → File System
     ↑                                ↓
  Final Result ← AI Processing ← Tool Results ← Operations
```

### Autonomous Workflow

1. **Natural Language Input**: User describes what they want
2. **AI Understanding**: Assistant analyzes the request and determines needed tools
3. **Tool Execution**: AI autonomously uses appropriate tools
4. **Smart Processing**: Results are processed and next steps determined
5. **Iterative Improvement**: Process continues until task completion
6. **Clear Response**: User gets comprehensive feedback

### Language Support

The assistant can analyze and work with:
- **JavaScript/TypeScript** - Functions, classes, imports, exports
- **Python** - Functions, classes, imports
- **PHP** - Classes, methods, namespaces
- **JSON** - Structure validation and parsing
- **Markdown** - Headers, code blocks, links
- **Plain Text** - General text processing
- **And more** - Extensible for any file type

## Example Session

```bash
$ npm start

🚀 General IdSiberAi-CLI CLI
AI-Powered File System & Automation Assistant
==================================================

⚙️  Configuration Setup
DeepSeek API Key: [hidden]
Working Directory Path: ./workspace
Maximum iterations per request: 15

✅ IdSiberAi-CLI initialized successfully!
Working Directory: /path/to/workspace
Available Tools: 14 tools

💬 Chat Mode Started
Ask me anything! I can help with files, code, automation, and more.
Commands: /help, /tools, /clear, /history, /exit

You: create a simple Node.js project with Express

🤖 Assistant is working...

🤔 Thinking: I need to create a Node.js project structure with Express
🔧 I'll create the basic project structure for a Node.js Express application
⚡ Executing: create_directory({"dir_path":"my-express-app"})
✅ Tool executed successfully
   Directory created: my-express-app

🤔 Thinking: Now I'll create the package.json file
🔧 Creating package.json with Express dependency...
⚡ Executing: write_file({"file_path":"my-express-app/package.json","content":"..."})
✅ Tool executed successfully
   File created/updated: my-express-app/package.json

🤔 Thinking: Let me create the main server file
🔧 Creating main server file with Express setup...
⚡ Executing: write_file({"file_path":"my-express-app/server.js","content":"..."})
✅ Tool executed successfully
   File created/updated: my-express-app/server.js

⏱️  Processing time: 8234ms
--------------------------------------------------

🤖 Assistant:
✅ I've created a complete Node.js Express project for you!

Project structure:
```
my-express-app/
├── package.json     # Dependencies and scripts
├── server.js        # Main Express server
└── public/          # Static files directory
    └── index.html   # Welcome page
```

Features included:
- Express server setup on port 3000
- Static file serving
- Basic error handling
- Welcome route and HTML page
- Development scripts

To get started:
1. cd my-express-app
2. npm install
3. npm start
4. Open http://localhost:3000

The server includes middleware for JSON parsing and static files, 
plus a basic route structure ready for expansion!

📊 Completed in 4 iteration(s)
--------------------------------------------------

You: analyze all JavaScript files in the project

🤖 Assistant is working...

🤔 Thinking: I need to find all JavaScript files first, then analyze each one
🔧 Searching for JavaScript files in the project...
⚡ Executing: search_files({"pattern":"*.js","directory":"my-express-app"})
✅ Tool executed successfully
   Found 1 files

🤔 Thinking: Found server.js, now I'll analyze its structure
🔧 Analyzing the structure of server.js...
⚡ Executing: analyze_file_structure({"file_path":"my-express-app/server.js"})
✅ Tool executed successfully
   Path: my-express-app/server.js

⏱️  Processing time: 3456ms
--------------------------------------------------

🤖 Assistant:
📊 JavaScript Files Analysis Report

**Files Found:** 1 JavaScript file

### server.js Analysis:
- **Language:** JavaScript
- **Lines:** 28 lines
- **Size:** 847 bytes
- **Functions:** 2 functions detected
- **Imports:** 2 modules (express, path)

**Code Structure:**
- Express application setup
- Middleware configuration
- Route definitions
- Server startup logic
- Error handling implementation

**Dependencies:**
- express (web framework)
- path (built-in Node.js module)

**Recommendations:**
✅ Good: Proper middleware setup
✅ Good: Static file serving configured
✅ Good: Basic error handling present
💡 Consider: Adding environment variables for port
💡 Consider: Adding request logging middleware
💡 Consider: Creating separate routes directory

The code follows Node.js/Express best practices and is ready for development!

📊 Completed in 2 iteration(s)
--------------------------------------------------

You: /exit

👋 Exiting chat...
👋 Goodbye! Thanks for using IdSiberAi-CLI.
```

## Use Cases

## 🎯 Use Cases

### Development Workflow
- **Project Setup**: "Create a React app with TypeScript and logging"
- **Code Analysis**: "Review my code for best practices and log the findings"
- **Refactoring**: "Rename all variables from camelCase to snake_case"
- **Documentation**: "Generate README for my project with usage examples"
- **Testing**: "Create unit tests for all my utility functions"

### File Management
- **Organization**: "Organize my downloads folder by file type"
- **Cleanup**: "Find and delete all .tmp files, log the cleanup"
- **Backup**: "Copy all my important files to backup folder"
- **Migration**: "Convert all .txt files to .md format"
- **Monitoring**: "Track file changes and log access patterns"

### Data Processing
- **Analysis**: "Analyze this CSV file and show statistics"
- **Transformation**: "Convert JSON to XML format"
- **Search**: "Find all files containing 'password' and log locations"
- **Reporting**: "Create summary of project file sizes"
- **Validation**: "Check data integrity across multiple files"

### System Automation
- **Build Tasks**: "Run npm build for all my projects"
- **Deployment**: "Deploy my app to the server with logging"
- **Testing**: "Run tests and generate coverage report"
- **Maintenance**: "Update all package.json dependencies"
- **Monitoring**: "Check system health and log metrics"

### Log Analysis
- **Performance**: "Analyze API response times from logs"
- **Error Tracking**: "Find patterns in error logs"
- **Usage Patterns**: "Show most used tools and commands"
- **Optimization**: "Identify slow operations from logs"

## 🚀 Advanced Features

### Smart Code Analysis
- Language detection based on file extensions
- Structure extraction (functions, classes, imports)
- Dependency analysis with logging
- Code quality suggestions
- Performance recommendations

### Batch Operations
- Process multiple files simultaneously
- Pattern-based file selection
- Bulk text replacement with logging
- Recursive directory operations
- Progress tracking and reporting

### System Integration
- Execute shell commands safely
- Environment variable support
- Cross-platform compatibility
- Process management with logging
- Resource monitoring

### Streaming Capabilities
- Real-time response generation
- Chunk-based processing
- Performance optimization
- Error handling in streams
- Bandwidth monitoring

## 🔧 Troubleshooting

### Common Issues

1. **API Key Problems**
   ```bash
   ❌ AI API Error: Invalid API key
   ```
   - Check your DeepSeek API key in `.env`
   - Verify API key permissions and quotas
   - Check logs: `/logs` → "View recent API calls"

2. **Directory Access**
   ```bash
   ❌ Path outside working directory not allowed
   ```
   - Ensure paths are relative to working directory
   - Check directory permissions
   - Review tool execution logs

3. **Streaming Issues**
   ```bash
   ❌ Stream connection interrupted
   ```
   - Toggle streaming mode: `/stream`
   - Check network connectivity
   - Review API logs for streaming errors

4. **Logging Problems**
   ```bash
   ❌ Failed to write log file
   ```
   - Check logs directory permissions
   - Verify disk space availability
   - Use `/logs` → "Clear old logs"

5. **Maximum Iterations**
   ```bash
   ❌ Maximum iterations reached
   ```
   - Increase MAX_ITERATIONS in `.env`
   - Break complex tasks into smaller requests
   - Check conversation logs for patterns

### Debug Mode

Enable verbose logging:

```bash
NODE_ENV=development npm start
```

### Log Analysis for Debugging

```bash
# View recent errors
You: /logs
? What would you like to do? View error logs

# Check API call history
You: /logs
? What would you like to do? View recent API calls

# Monitor tool performance
You: /logs
? What would you like to do? View recent tool executions
```

### Getting Help

In the CLI:
- `/help` - Show available commands
- `/tools` - List all tools
- `/stats` - Session and usage statistics
- `/logs` - Comprehensive log management
- `/history` - Review conversation

## 📈 Performance Monitoring

### Metrics Tracked

- **API Performance**: Response times, token usage, success rates
- **Tool Execution**: Duration, success/failure rates, resource usage
- **Conversation Flow**: Iterations per request, complexity metrics
- **System Resources**: Memory usage, disk space, network bandwidth
- **Error Patterns**: Frequency, types, resolution times

### Usage Statistics

```bash
You: /stats

📊 Statistics
========================================
Current Session:
  Session ID: abc-123-def
  Stream Mode: ✅
  Max Iterations: 15
  Conversation Length: 25
  Tools Available: 17
  Logging: ✅

API Usage:
  Total Calls: 47
  Successful: 45
  Failed: 2
  Streaming: 30
  Total Tokens: 15,847
  Success Rate: 95.74%
  Streaming Rate: 63.83%

Performance:
  Avg Response Time: 2.3s
  Avg Tool Execution: 145ms
  Cache Hit Rate: 78%
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Adding New Tools

1. Add method to `GeneralTools.js`
2. Register in `GeneralMCPHandler.js` availableTools
3. Update system prompt with tool description
4. Add logging for the new tool
5. Update documentation

### Tool Development Guidelines

- Always return `{success: boolean, ...}` format
- Include comprehensive error handling
- Validate all inputs
- Provide detailed result information
- Follow async/await patterns
- Add appropriate logging
- Include performance metrics

### Adding Log Types

1. Define new log type in `Logger.js`
2. Add logging methods for the new type
3. Update CLI commands to support new log type
4. Add log viewing capabilities
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details.

## 📝 Changelog

### v2.0.0 (Latest)
- ✨ Added comprehensive logging system
- 🌊 Implemented streaming mode support
- 📊 Added usage statistics and monitoring
- 🔧 Enhanced tool execution with logging
- 📈 Performance metrics and tracking
- 🛠️ Extended to 17 tools total
- 🎯 Improved error handling and debugging
- 📱 Enhanced CLI with new commands
- 🔒 Better security and validation
- 📚 Comprehensive documentation

### v1.0.0
- Initial release
- 14 core tools implemented
- Interactive CLI interface
- General-purpose AI assistant
- File system operations
- Code analysis capabilities
- System automation tools

---

## 🚀 **Ready to supercharge your workflow?**

### Quick Start:
```bash
# 1. Install dependencies
npm install

# 2. Configure your environment
cp .env.example .env
# Edit .env with your DeepSeek API key

# 3. Start the assistant
npm start

# 4. Enable logging and streaming
✅ Enable API and conversation logging? Yes
🌊 Enable streaming mode? Yes

# 5. Start chatting!
You: "What can you help me with?"
```

### Pro Tips:

- 🌊 **Use Streaming Mode** for real-time responses
- 📝 **Check Logs Regularly** with `/logs` command
- 📊 **Monitor Usage** with `/stats` command
- 🔧 **Explore Tools** with `/tools` command
- 💡 **Ask Complex Questions** - AI will break them down
- 🎯 **Be Specific** for better results
- 📈 **Track Performance** through statistics

**Experience the power of AI-driven automation with comprehensive logging and real-time streaming! 🎉** **Project Setup**: "Create a React app with TypeScript"
- **Code Analysis**: "Review my code for best practices"
- **Refactoring**: "Rename all variables from camelCase to snake_case"
- **Documentation**: "Generate README for my project"

### File Management
- **Organization**: "Organize my downloads folder by file type"
- **Cleanup**: "Find and delete all .tmp files"
- **Backup**: "Copy all my important files to backup folder"
- **Migration**: "Convert all .txt files to .md format"

### Data Processing
- **Analysis**: "Analyze this CSV file and show statistics"
- **Transformation**: "Convert JSON to XML format"
- **Search**: "Find all files containing 'password'"
- **Reporting**: "Create summary of project file sizes"

### System Automation
- **Build Tasks**: "Run npm build for all my projects"
- **Deployment**: "Deploy my app to the server"
- **Testing**: "Run tests and generate coverage report"
- **Maintenance**: "Update all package.json dependencies"

## Project Structure

```
APP/
├── package.json              # Dependencies and scripts
├── index.js                 # Main CLI application
├── .env                     # Environment configuration
├── .env.example             # Configuration template
├── src/
│   ├── GeneralMCPHandler.js # Core MCP logic and conversation
│   ├── DeepSeekAPI.js       # AI API integration
│   └── GeneralTools.js      # All tools implementation
├── README.md                # This documentation
├── LICENSE                  # MIT License
└── .gitignore              # Git ignore rules
```

## Security Features

- **Sandboxed Operations**: All operations restricted to working directory
- **Path Validation**: Prevents directory traversal attacks
- **Command Filtering**: Safe command execution with timeouts
- **Error Handling**: Comprehensive error management
- **Input Validation**: All inputs validated before processing

## Advanced Features

### Smart Code Analysis
- Language detection based on file extensions
- Structure extraction (functions, classes, imports)
- Dependency analysis
- Code quality suggestions

### Batch Operations
- Process multiple files simultaneously
- Pattern-based file selection
- Bulk text replacement
- Recursive directory operations

### System Integration
- Execute shell commands safely
- Environment variable support
- Cross-platform compatibility
- Process management

## Troubleshooting

### Common Issues

1. **API Key Problems**
   ```bash
   ❌ AI API Error: Invalid API key
   ```
   - Verify DeepSeek API key in `.env`
   - Check API key permissions and quotas

2. **Directory Access**
   ```bash
   ❌ Path outside working directory not allowed
   ```
   - Ensure paths are relative to working directory
   - Check directory permissions

3. **Tool Execution Errors**
   ```bash
   ❌ Tool error: ENOENT: no such file or directory
   ```
   - Verify file/directory exists
   - Check path syntax and spelling

4. **Maximum Iterations**
   ```bash
   ❌ Maximum iterations reached
   ```
   - Increase MAX_ITERATIONS in `.env`
   - Break complex tasks into smaller requests

### Debug Mode

Enable verbose logging:

```bash
NODE_ENV=development npm start
```

### Getting Help

In the CLI:
- `/help` - Show available commands
- `/tools` - List all tools
- `/history` - Review conversation

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Adding New Tools

1. Add method to `GeneralTools.js`
2. Register in `GeneralMCPHandler.js` availableTools
3. Update system prompt with tool description
4. Add to documentation

### Tool Development Guidelines

- Always return `{success: boolean, ...}` format
- Include comprehensive error handling
- Validate all inputs
- Provide detailed result information
- Follow async/await patterns

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- 14 core tools implemented
- Interactive CLI interface
- General-purpose AI assistant
- File system operations
- Code analysis capabilities
- System automation tools
- Comprehensive documentation

---

**Ready to supercharge your workflow? 🚀**

Get started:
```bash
npm install
npm start
```

Then just ask: *"What would you like me to help you with?"*
