# IdSiberAi-CLI Project Structure

**IdSiberAi-CLI** is a Multi-Provider AI Assistant with dual interface support (CLI & Web) that integrates 7 different AI providers (OpenAI, Claude, DeepSeek, Grok, QwenAI, ZhiPuAI) with comprehensive file system tools, database operations, and cloud storage capabilities.

This document provides an overview of the project's file and directory structure.

## Directory Structure

```
IdSiberAi-CLI/
├── .env                        # Environment variables configuration
├── .env.example               # Example environment configuration
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT License file
├── README.md                  # Main project documentation
├── PROJECT_STRUCTURE.md       # This file - project structure overview
├── index.js                   # Main application entry point (CLI mode)
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Dependency lock file
├── demo/                      # Demo files and examples
│   ├── abc.txt                # Sample text file for testing
│   ├── game_project/          # Sample game project directory
│   └── game_project.zip       # Sample project archive
├── docs/                      # Documentation files
│   ├── AI_PROVIDERS.md        # AI providers documentation
│   ├── CHANGELOG.md           # Version history and changes
│   ├── CONTEXT_OPTIMIZATION.md # Context optimization strategies
│   ├── EXAMPLES.md            # Usage examples and tutorials
│   ├── INSTALLATION.md        # Installation instructions
│   ├── README.md              # Documentation index
│   ├── S3_GUIDE.md            # AWS S3 integration guide
│   ├── TOOLS.md               # Available tools documentation
│   ├── TROUBLESHOOTING.md     # CLI troubleshooting guide
│   ├── WEB_INTERFACE.md       # Web interface documentation
│   └── WEB_TROUBLESHOOTING.md # Web interface troubleshooting
├── logs/                      # Application logs (auto-generated)
│   ├── api_YYYY-MM-DD.log     # API call logs
│   ├── conversation_YYYY-MM-DD.log # Conversation logs
│   ├── errors_YYYY-MM-DD.log  # Error logs
│   └── tools_YYYY-MM-DD.log   # Tool execution logs
├── node_modules/              # Node.js dependencies (auto-generated)
└── src/                       # Source code directory
    ├── AI/                    # AI provider implementations
    │   ├── AIManager.js       # Multi-provider management and switching
    │   ├── BaseAIProvider.js  # Base class for all AI providers
    │   ├── ClaudeProvider.js  # Anthropic Claude implementation
    │   ├── DeepSeekProvider.js # DeepSeek AI implementation
    │   ├── GrokProvider.js    # X Grok AI implementation
    │   ├── OpenAIProvider.js  # OpenAI GPT implementation
    │   ├── QwenAIProvider.js  # Alibaba Qwen AI implementation
    │   ├── ZhiPuAIProvider.js # ZhiPu GLM AI implementation
    │   └── index.js           # AI module exports and initialization
    ├── contextManager/        # Context optimization system
    │   ├── ContextOptimizer.js # Smart context management and compression
    │   └── index.js           # Context manager exports
    ├── handlers/              # Request and response processing
    │   ├── ConversationHandler.js # Conversation state management
    │   ├── GeneralMCPHandler.js # Main MCP handler
    │   ├── LoggingHandler.js  # Logging management
    │   ├── RequestHandler.js  # User request processing and routing
    │   └── ToolCallHandler.js # AI tool execution and response handling
    ├── tools/                 # Tool implementations by category
    │   ├── AnalysisTools.js   # Code analysis and file inspection tools
    │   ├── DatabaseTools.js   # Database operations (MySQL, PostgreSQL)
    │   ├── DirectoryTools.js  # Directory operations and management
    │   ├── FileTools.js       # File operations (CRUD, search, manipulation)
    │   ├── S3Tools.js         # AWS S3 cloud storage integration
    │   ├── SystemTools.js     # System information and operations
    │   ├── ValidationHelper.js # Input validation and sanitization
    │   └── index.js           # Tools module exports
    ├── web/                   # Web interface components
    │   ├── web_server.js      # Express.js web server with Socket.IO
    │   └── public/            # Static web assets
    │       ├── index.html     # Main web interface HTML
    │       ├── favicon.svg    # Web interface favicon
    │       ├── css/           # Stylesheets
    │       │   └── style.css  # Main stylesheet for web UI
    │       └── js/            # Client-side JavaScript
    │           ├── main.js    # Main web application logic
    │           └── modules/   # Modular client-side components
    │               ├── api.js     # API communication module
    │               ├── handlers.js # Client-side event handlers
    │               └── ui.js      # UI management and interactions
    ├── DebugHelper.js         # Debugging utilities and helpers
    ├── GeneralTools.js        # General utility functions
    └── Logger.js              # Centralized logging system
```

## Core Components

### Entry Points
- **index.js** - CLI application entry point
- **src/web/web_server.js** - Web interface server

### AI Providers (7 providers)
- OpenAI, Claude, DeepSeek, Grok, QwenAI, ZhiPuAI
- Managed by **AIManager.js** with **BaseAIProvider.js** as base class

### Handlers
- **GeneralMCPHandler.js** - Main MCP coordination
- **ToolCallHandler.js** - Tool execution management
- **RequestHandler.js** - Request processing
- **ConversationHandler.js** - Conversation state
- **LoggingHandler.js** - Logging operations

### Tools Categories
- **FileTools.js** - File operations
- **DirectoryTools.js** - Directory operations  
- **DatabaseTools.js** - MySQL/PostgreSQL operations
- **S3Tools.js** - AWS S3 operations
- **SystemTools.js** - System information
- **AnalysisTools.js** - Code/file analysis
- **ValidationHelper.js** - Input validation

### Web Interface
- **Frontend**: HTML/CSS/JS in `public/` directory
- **Backend**: Express + Socket.IO server
- **Modular JS**: Organized in `modules/` for API, handlers, UI

### Documentation
Complete documentation available in `docs/` directory covering installation, usage, troubleshooting for both CLI and web interfaces.

---

*Updated for version 2.0.0 - Multi-provider AI CLI and Web Assistant*