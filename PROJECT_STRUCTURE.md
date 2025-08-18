# IdSiberAi-CLI Project Structure

This document provides a comprehensive overview of the project's file and directory structure for reference and future development.

## Directory Structure

```
.
├── .env                        # Environment variables configuration
├── .env.example               # Example environment configuration
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT License file
├── README.md                  # Main project documentation
├── ai_chat_cli/              # CLI-specific components
│   └── providers/             # AI provider-specific CLI components
├── docs/                      # Documentation files
│   ├── AI_PROVIDERS.md        # AI providers documentation
│   ├── CHANGELOG.md           # Version history and changes
│   ├── EXAMPLES.md            # Usage examples
│   ├── INSTALLATION.md        # Installation instructions
│   ├── README.md              # Documentation index
│   ├── S3_GUIDE.md            # S3 integration guide
│   ├── TOOLS.md               # Available tools documentation
│   └── TROUBLESHOOTING.md     # Common issues and solutions
├── index.js                   # Main application entry point
├── logs/                      # Application logs
│   ├── api_2025-08-18.log     # API call logs
│   ├── conversation_2025-08-18.log # Conversation logs
│   ├── errors_2025-08-18.log  # Error logs
│   └── tools_2025-08-18.log   # Tool execution logs
├── node_modules/              # Node.js dependencies
├── package-lock.json          # Dependency lock file
├── package.json               # Project metadata and dependencies
└── src/                       # Source code
    ├── AI/                    # AI providers implementation
    │   ├── AIManager.js       # AI provider management
    │   ├── BaseAIProvider.js  # Base class for AI providers
    │   ├── ClaudeProvider.js  # Claude AI implementation
    │   ├── DeepSeekProvider.js # DeepSeek AI implementation
    │   ├── GrokProvider.js    # Grok AI implementation
    │   ├── OpenAIProvider.js  # OpenAI implementation
    │   ├── QwenAIProvider.js  # QwenAI implementation
    │   ├── ZhiPuAIProvider.js # ZhiPuAI implementation
    │   └── index.js           # AI module exports
    ├── DebugHelper.js         # Debugging utilities
    ├── GeneralTools.js        # General utility functions
    ├── Logger.js              # Logging implementation
    ├── handlers/              # Request and response handlers
    │   ├── ConversationHandler.js # Conversation management
    │   ├── GeneralMCPHandler.js # Main MCP (Multi-AI) handler
    │   ├── LoggingHandler.js  # Logging management
    │   ├── RequestHandler.js  # User request processing
    │   └── ToolCallHandler.js # Tool execution handling
    └── tools/                 # Tool implementations
        ├── AnalysisTools.js   # Code and file analysis tools
        ├── DirectoryTools.js  # Directory operation tools
        ├── FileTools.js       # File operation tools
        ├── S3Tools.js         # AWS S3 integration tools
        ├── SystemTools.js     # System operation tools
        └── ValidationHelper.js # Input validation utilities
```

## Key Components

### Core Application
- **index.js**: Main entry point that initializes the CLI interface and handles user interactions

### AI Providers
- **src/AI/**: Contains implementations for all supported AI providers
- **src/AI/AIManager.js**: Manages multiple AI providers, handles switching and fallback

### Handlers
- **src/handlers/GeneralMCPHandler.js**: Core handler that coordinates AI providers and tools
- **src/handlers/ToolCallHandler.js**: Processes tool calls from AI responses
- **src/handlers/RequestHandler.js**: Processes user requests

### Tools
- **src/tools/**: Contains all tool implementations grouped by category
- **src/tools/FileTools.js**: File operations (read, write, search, etc.)
- **src/tools/S3Tools.js**: AWS S3 cloud storage operations

### Utilities
- **src/Logger.js**: Comprehensive logging system
- **src/DebugHelper.js**: Debugging utilities

## Development Guidelines

### Adding New AI Providers
1. Create a new provider class in `src/AI/` extending `BaseAIProvider.js`
2. Implement required methods: `sendRequest`, `parseResponse`
3. Add the provider to `AIManager.js`
4. Update documentation in `docs/AI_PROVIDERS.md`

### Adding New Tools
1. Add tool implementation to appropriate file in `src/tools/`
2. Register the tool in `ToolCallHandler.js`
3. Update documentation in `docs/TOOLS.md`

### Logging Standards
- Use appropriate log levels: `debug`, `info`, `warn`, `error`
- Include context with all log entries
- Log all API calls, tool executions, and errors

## Future Development Areas

- Enhanced multi-language support
- Additional AI providers integration
- Extended file analysis capabilities
- Improved streaming performance
- Advanced S3 operations
- User authentication and permissions
- Plugin system for custom tools

---

*This structure document was automatically generated and should be updated when significant changes are made to the project architecture.*