# Web Interface Guide

## Overview

The IdSiberAi Assistant Web Interface provides a modern, browser-based alternative to the command-line interface. This feature allows you to interact with all the powerful AI capabilities and tools through an intuitive web UI.

## Features

- 🌐 **Browser-based Interface** - Access from any device with a web browser
- 🔄 **Real-time Streaming** - See AI responses as they're being generated
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🤖 **Multi-AI Control** - Switch between AI providers with a click
- 🧰 **Tool Visualization** - See which tools are being used in real-time
- 📊 **Statistics Dashboard** - Monitor AI usage and performance
- 🔧 **Provider Testing** - Test all AI providers from the web interface

## Getting Started

1. Start the application with `npm start`
2. Select "Web Mode - Web Browser Interface" when prompted
3. The web server will start and display the URL (default: http://localhost:3000)
4. Open the URL in your web browser
5. Start chatting with the AI assistant!

## Interface Components

### Sidebar

- **Session Info**: Current session ID and active AI provider
- **AI Providers**: List of available AI providers with status indicators
- **Available Tools**: Categorized list of all available tools
- **Action Buttons**: Clear history, view statistics, etc.

### Main Chat Area

- **Chat Window**: Displays conversation history with the AI assistant
- **Input Area**: Type your messages and send them to the AI
- **Message Display**: Shows user messages and AI responses with formatting
- **Typing Indicator**: Shows when the AI is generating a response
- **Tool Badges**: Displays which tools were used in each AI response

### Modals and Dialogs

- **Statistics Modal**: Displays detailed usage statistics for all AI providers
- **Provider Test Modal**: Shows test results for all AI providers
- **Settings Dialog**: Configure interface preferences (coming soon)

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: Add new line in message
- **Esc**: Close any open modal or dialog

## Configuration

The web interface can be configured through environment variables:

- `WEB_PORT`: Set the port for the web server (default: 3000)
- `ENABLE_STREAMING`: Enable/disable streaming responses (default: true)
- `ENABLE_LOGGING`: Enable/disable activity logging (default: true)

## Troubleshooting

### Common Issues

**Issue**: Web server fails to start
**Solution**: Check if port 3000 is already in use. Set a different port with the WEB_PORT environment variable.

**Issue**: Streaming responses not working
**Solution**: Ensure ENABLE_STREAMING is set to "true" in your .env file

**Issue**: AI providers not showing up
**Solution**: Check your API keys in the .env file and ensure they're valid

For more detailed troubleshooting information, see the [Web Interface Troubleshooting Guide](./WEB_TROUBLESHOOTING.md).

## Coming Soon

- 🌙 Dark Mode
- 🔔 Notifications
- 🗂️ History Management
- 📁 File Upload Interface
- 📥 Export Conversations
- 🔐 User Authentication
- 👥 Multi-user Support

## Technical Details

The web interface is built with:

- **Express.js**: Web server framework
- **Socket.io**: Real-time bidirectional communication
- **Bootstrap 5**: UI framework for responsive design
- **Highlight.js**: Code syntax highlighting
- **Marked**: Markdown parsing for AI responses
