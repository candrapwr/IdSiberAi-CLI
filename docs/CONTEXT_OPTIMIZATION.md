# Context Optimization Documentation

## Overview

Context Optimization is a feature designed to manage conversation context by removing redundant tool calls while preserving context integrity. This helps reduce token usage and improve AI response quality by keeping the context focused on relevant information.

## How It Works

The Context Optimizer identifies and removes duplicate tool calls (and their results) from the conversation history while preserving the most recent occurrence of each unique tool call.

For example, if you've called `read_file("config.json")` three times in a conversation, the optimizer will keep only the most recent call and remove the earlier ones, significantly reducing token usage.

### Context Summaries

When the conversation grows beyond the configured threshold, the optimizer now rewrites the oldest turns into a single **summary bubble**. This bubble captures:

- Latest intent of each user request in that window
- Tool calls that were executed (action + relevant parameters)
- High level results returned by the tools (file names, counts, short messages)
- Assistant replies that concluded the turn

Only the most recent `CONTEXT_SUMMARY_RETENTION` messages stay verbatim. Everything older is expressed as concise bullet points that mimic how editor assistants (e.g., VSCode Codex) keep the chat light while preserving meaning.

## Key Features

- **Selective Action Optimization**: Configure which tool actions should be optimized (e.g., `read_file`, `list_directory`)
- **Auto Summaries (Codex style)**: Older conversation turns are collapsed into a compact summary bubble with tool usage notes
- **Preserve Recent Context**: Always keeps the most recent instance of each tool call alongside the latest user/assistant turns
- **Token Savings**: Reduces token usage by eliminating redundant information and long tool outputs
- **Statistics Tracking**: Monitors optimization performance, token savings, and summary metrics
- **Manual Trigger**: Manually trigger optimization when needed

## Configuration

Context Optimization can be configured through:

1. **Environment Variables**:
   ```
   # Enable/disable context optimization
   ENABLE_CONTEXT_OPTIMIZATION=true
   
   # Comma-separated list of actions to optimize
   CONTEXT_OPTIMIZATION_ACTIONS=read_file,list_directory

    # Enable or disable auto summaries (default: true)
    ENABLE_CONTEXT_SUMMARY=true

    # Optional fine-tuning for summaries
    CONTEXT_SUMMARY_THRESHOLD=12          # Start summarizing when more than 12 messages (excluding system)
    CONTEXT_SUMMARY_RETENTION=6           # Keep the most recent 6 messages verbatim
    CONTEXT_SUMMARY_ROLE=assistant        # Role used for injected summary bubble
    CONTEXT_SUMMARY_PREFIX="Context summary (auto-generated):"
    CONTEXT_SUMMARY_MAX_LINE_LENGTH=200   # Max characters per summary bullet
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

// (Optional) provide custom summary behaviour when constructing the handler
const mcp = new GeneralMCPHandler(apiKeys, workdir, 15, {
  enableContextOptimization: true,
  summaryThreshold: 14,
  summaryRetention: 6,
  summaryPrefix: 'Session digest:'
});

// Manually trigger optimization
const result = mcp.optimizeContext();
console.log(`Removed ${result.messagesRemoved} messages`);

// Get optimization statistics
const stats = mcp.getContextOptimizationStats();
```

### Summary Metrics

Optimization statistics now include:

- `summaryMessagesGenerated` – how many times the summary bubble changed
- `summaryLinesTracked` – number of bullet points kept in the summary

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
