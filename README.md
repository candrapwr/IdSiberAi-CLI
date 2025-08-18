# IdSiberAi-CLI: Intelligent Multi-AI Command Line Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Multi-AI](https://img.shields.io/badge/AI-Multi--Provider-blue.svg)](./docs/AI_PROVIDERS.md)

> 🤖 **AI-Powered CLI** that integrates multiple AI providers with powerful local system management tools.

## ✨ Features

- 🤖 **Multi-AI Support** - DeepSeek, OpenAI, Claude, Grok, ZhiPuAI
- 🔄 **Provider Switching** - Switch AI providers on the fly
- 🛡️ **Auto Fallback** - Automatic provider switching on failures
- ☁️ **Cloud Storage** - Integrated S3 operations (AWS SDK v3)
- 🛠️ **20+ Tools** - File ops, analysis, system automation, S3
- 📊 **Smart Analysis** - Language-aware code structure analysis
- 🌊 **Real-time Streaming** - Live response generation
- 📝 **Comprehensive Logging** - Track all operations and performance
- 🔒 **Secure Operations** - Sandboxed working directory
- 💬 **Natural Language** - Chat interface for any computing task

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start the assistant
npm start

# 4. Start chatting!
You: "What can you help me with?"
```

## 📖 Documentation

- 📋 **[Installation & Setup](./docs/INSTALLATION.md)** - Complete setup guide
- 🤖 **[AI Providers](./docs/AI_PROVIDERS.md)** - Multi-AI configuration
- 🛠️ **[Available Tools](./docs/TOOLS.md)** - Complete tools reference
- ☁️ **[S3 Integration](./docs/S3_GUIDE.md)** - Cloud storage operations
- 💻 **[Usage Examples](./docs/EXAMPLES.md)** - Real-world use cases
- 🔧 **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues & solutions
- 📊 **[Performance](./docs/PERFORMANCE.md)** - Monitoring & optimization
- 🔨 **[Development](./docs/DEVELOPMENT.md)** - Contributing & extending

## 💡 Example Requests

### Development Workflow
```
"create a new React project with TypeScript"
"analyze all JavaScript files for best practices"
"upload my project files to S3 bucket"
"switch to Claude AI provider"
```

### File & Data Management
```
"organize my downloads folder by file type"
"find all Python files containing 'TODO' comments"
"backup all .js files to S3 with prefix 'backup/'"
"convert all .txt files to .md format"
```

### System Automation
```
"run npm install in all my projects"
"search S3 for files modified this week"
"test all AI providers connectivity"
"show me performance statistics"
```

## 🏗️ Architecture

```mermaid
flowchart TD
    A["👤 User Input"] --> B["🤖 Multi-AI Manager"]
    B --> C["🧠 AI Processing & Tool Selection"]
    C --> D{"🔧 Tool Execution Needed?"}
    
    D -->|"Yes"| E["⚙️ Tool Execution"]
    E --> F["📁 File Operations"]
    E --> G["☁️ S3 Operations"]
    E --> H["💻 System Operations"]
    E --> I["🔍 Analysis Tools"]
    
    F --> J["📊 Tool Results"]
    G --> J
    H --> J
    I --> J
    
    J --> K["🔄 Results Back to AI"]
    K --> L{"🤔 Need More Tools?"}
    L -->|"Yes"| C
    L -->|"No"| M["✅ Final AI Response"]
    
    D -->|"No"| M
    M --> N["👤 User Output"]
```

### 🔄 Key Flow Details:

1. **User Input** → Natural language request
2. **AI Processing** → Understands request & determines needed tools
3. **Tool Execution** → Runs appropriate operations (file, S3, system, analysis)
4. **Results Processing** → Tool results are sent back to AI (not directly to user)
5. **AI Analysis** → AI processes tool results and determines next steps
6. **Iteration** → May use more tools if needed based on results
7. **Final Response** → AI provides comprehensive response to user

## 🎯 Use Cases

| Category | Examples |
|----------|----------|
| **Development** | Project setup, code analysis, refactoring, testing |
| **File Management** | Organization, cleanup, backup, migration |
| **Cloud Operations** | S3 upload/download, backup, synchronization |
| **Data Processing** | Analysis, transformation, validation, reporting |
| **System Automation** | Build tasks, deployment, maintenance, monitoring |

## 🤖 Supported AI Providers

| Provider | Status | Features |
|----------|--------|----------|
| **DeepSeek** | ✅ Active | Fast responses, coding tasks |
| **OpenAI GPT** | ✅ Active | General purpose, advanced reasoning |
| **Claude** | ✅ Active | Long context, analysis tasks |
| **Grok** | ✅ Active | Real-time data, creative tasks |
| **ZhiPuAI** | ✅ Active | Multilingual, specialized tasks |

[→ See detailed AI provider guide](./docs/AI_PROVIDERS.md)

## ⚡ Performance

- **Response Time**: ~2.3s average
- **Tool Execution**: ~145ms average  
- **Success Rate**: 95%+ across all providers
- **Bundle Size**: Optimized with AWS SDK v3 (90% reduction)
- **Streaming**: Real-time response generation

[→ See performance details](./docs/PERFORMANCE.md)

## 📊 Statistics Dashboard

```bash
You: /stats

📊 Current Session:
  • Multi-AI: 5 providers available
  • Tools: 20+ operations ready
  • Success Rate: 98.5%
  • Streaming: Enabled
```

## 🛡️ Security & Safety

- ✅ **Sandboxed Operations** - Restricted to working directory
- ✅ **Path Validation** - Prevents directory traversal
- ✅ **Safe Command Execution** - Timeouts and filtering
- ✅ **Input Validation** - All inputs sanitized
- ✅ **Error Handling** - Comprehensive error management

## 📝 Changelog

### v2.1.0 (Latest) - Multi-AI & Cloud Edition
- ✨ **Multi-AI Support** - 5 AI providers with auto-switching
- ☁️ **S3 Integration** - Cloud storage operations (AWS SDK v3)
- 🌊 **Streaming Mode** - Real-time response generation  
- 📊 **Enhanced Logging** - Comprehensive monitoring
- 🔧 **Tool Expansion** - 20+ tools available
- 🛡️ **Auto Fallback** - Provider switching on failures

[→ See full changelog](./docs/CHANGELOG.md)

## 🤝 Contributing

We welcome contributions! See our [Development Guide](./docs/DEVELOPMENT.md) for:

- Adding new AI providers
- Creating custom tools
- Extending S3 operations
- Improving performance
- Writing documentation

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🎉 Ready to Get Started?

```bash
npm install && npm start
```

**Then just ask:** *"Help me set up a new project with cloud backup"*

The AI will handle the rest! 🚀

---

### 📞 Need Help?

- 📖 **[Documentation](./docs/)** - Comprehensive guides
- 🐛 **[Issues](https://github.com/candrapwr/IdSiberAi-CLI/issues)** - Bug reports & features  
- 💬 **[Discussions](https://github.com/candrapwr/IdSiberAi-CLI/discussions)** - Community support
- 📧 **Contact** - candrapwr@datasiber.com