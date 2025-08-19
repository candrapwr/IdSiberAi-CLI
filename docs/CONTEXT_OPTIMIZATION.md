# Context Optimization Documentation

## Overview

Context Optimization is a feature designed to manage conversation context by removing redundant tool calls while preserving context integrity. This helps reduce token usage and improve AI response quality by keeping the context focused on relevant information.

## How It Works

The Context Optimizer identifies and removes duplicate tool calls (and their results) from the conversation history while preserving the most recent occurrence of each unique tool call.

For example, if you've called `read_file("config.json")` three times in a conversation, the optimizer will keep only the most recent call and remove the earlier ones, significantly reducing token usage.

## Key Features

- **Selective Action Optimization**: Configure which tool actions should be optimized (e.g., `read_file`, `list_directory`)
- **Preserve Recent Context**: Always keeps the most recent instance of each tool call
- **Token Savings**: Reduces token usage by eliminating redundant information
- **Statistics Tracking**: Monitors optimization performance and token savings
- **Manual Trigger**: Manually trigger optimization when needed

## Configuration

Context Optimization can be configured through:

1. **Environment Variables**:
   ```
   # Enable/disable context optimization
   ENABLE_CONTEXT_OPTIMIZATION=true
   
   # Comma-separated list of actions to optimize
   CONTEXT_OPTIMIZATION_ACTIONS=read_file,list_directory
   ```

2. **Command Line Interface**:
   Use `/context` or `/ctx` command to manage context optimization settings:
   - Toggle optimization on/off
   - Configure which actions to optimize
   - Manually trigger optimization
   - View optimization statistics

## Usage

### CLI Commands

- `/context` or `/ctx`: Access the Context Optimization menu
  - Toggle optimization on/off
  - Configure optimized actions
  - Manually optimize now
  - Reset statistics

### Programmatic API

```javascript
// Enable/disable context optimization
mcp.setContextOptimizationEnabled(true);

// Configure which actions to optimize
mcp.setOptimizedActions(['read_file', 'list_directory']);

// Manually trigger optimization
const result = mcp.optimizeContext();
console.log(`Removed ${result.messagesRemoved} messages`);

// Get optimization statistics
const stats = mcp.getContextOptimizationStats();
```

## Recommended Actions to Optimize

The following actions are good candidates for optimization:

- `read_file`: Reading the same file multiple times
- `list_directory`: Listing the same directory multiple times
- `search_files`: Searching with the same pattern multiple times
- `analyze_file_structure`: Analyzing the same file structure multiple times

## How to Customize

You can customize the optimization behavior:

1. **Environment Variables**: Update `.env` file
2. **CLI Interface**: Use `/context` command
3. **Initialization Options**: Pass options when initializing the MCP handler:
   ```javascript
   const mcp = new GeneralMCPHandler(apiKeys, workingDirectory, maxIterations, {
     enableContextOptimization: true,
     optimizedActions: ['read_file', 'list_directory'],
     debug: true
   });
   ```

## Benefits

- **Reduced Token Usage**: Fewer tokens means lower costs and faster responses
- **Improved Context Quality**: More relevant context for the AI model
- **Better Performance**: More efficient conversations with less redundancy
- **Longer Effective Conversations**: Maintain longer conversations without hitting token limits
