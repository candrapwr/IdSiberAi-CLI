// Socket.io event handlers
import { addMessage, addSystemMessage, formatAssistantMessage, highlightCodeBlocks, scrollToBottom, showTypingIndicator, hideTypingIndicator } from './ui.js';
import { fetchToolsList, displayStats, displayProviderTests } from './api.js';

// Global variables
let currentProvider = null;
let sessionInfo = null;
let currentMessageContent = '';
let streamMessageDiv = null;
let streamStarted = false;

// Setup Socket.io listeners
export function setupSocketListeners(socket) {
    // Session info
    socket.on('session-info', (data) => handleSessionInfo(data, socket));
    
    // Stream chunks
    socket.on('stream-chunk', handleStreamChunk);
    
    // Tool execution
    socket.on('tool-execution', handleToolExecution);
    
    // Reset stream state
    socket.on('reset-stream', handleResetStream);
    
    // Complete assistant response
    socket.on('assistant-response', handleAssistantResponse);
    
    // Typing indicator
    socket.on('assistant-typing', handleTypingIndicator);
    
    // Provider switched
    socket.on('provider-switched', (data) => handleProviderSwitched(data, socket));
    
    // Command results
    socket.on('command-result', handleCommandResult);
    
    // Error handling
    socket.on('error', handleError);
    
    // Connection status
    socket.on('connect', () => {
        console.log('Socket connected successfully');
        addSystemMessage('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        addSystemMessage('Disconnected from server. Reconnecting...');
        // Try to reconnect
        setTimeout(() => {
            socket.connect();
        }, 1000);
    });
    
    socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        addSystemMessage('Connection error. Please check your network.');
    });
}

// Handle session info
export function handleSessionInfo(data, socket) {
    sessionInfo = data;
    currentProvider = data.currentAIProvider;
    
    // Update session info display
    document.getElementById('currentProvider').innerHTML = `<strong>Provider:</strong> <span class="text-primary">${data.currentAIProvider}</span>`;
    document.getElementById('sessionId').innerHTML = `<strong>Session:</strong> <span class="text-primary">${data.sessionId.substring(0, 8)}...</span>`;
    
    // Populate providers list
    populateProvidersList(data.availableAIProviders, data.aiProvidersInfo, data.currentAIProvider, socket);
    
    // Populate tools list
    if (data.toolsCount > 0) {
        fetchToolsList();
    }
}

// Reset stream state
export function handleResetStream() {
    currentMessageContent = '';
    streamMessageDiv = null;
    streamStarted = false;
    console.log('Stream state reset');
}

// Handle tool execution
export function handleToolExecution(data) {    
    // Create a system message for the tool execution
    const systemMessageDiv = document.createElement('div');
    systemMessageDiv.className = 'system-message';
    
    // Format the message based on success/failure
    if (data.result.success) {
        systemMessageDiv.innerHTML = `<i class="bi bi-tools me-2"></i> Tool <strong>${data.tool}</strong> executed successfully`;
    } else {
        systemMessageDiv.classList.add('alert-danger');
        systemMessageDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i> Tool <strong>${data.tool}</strong> failed: ${data.result.error || 'Unknown error'}`;
    }
    
    // Add tool result details if interesting
    if (data.result.success && data.result.message) {
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'small mt-1';
        detailsDiv.textContent = data.result.message;
        systemMessageDiv.appendChild(detailsDiv);
    }
    
    // Add to messages container
    document.getElementById('messagesContainer').appendChild(systemMessageDiv);
    scrollToBottom();
    
    // Hide typing indicator and show a new one
    hideTypingIndicator();
    showTypingIndicator();
}

// Handle stream chunk
export function handleStreamChunk(data) {
    // Mark streaming as started
    streamStarted = true;
    
    // Hide typing indicator if it exists
    hideTypingIndicator();
    
    // If this is the first chunk, create a new message div
    if (!streamMessageDiv) {
        streamMessageDiv = document.createElement('div');
        streamMessageDiv.className = 'message message-assistant';
        streamMessageDiv.innerHTML = `
            <div class="message-content"></div>
            <div class="message-meta">
                ${currentProvider ? `<span><i class="bi bi-cpu"></i> ${currentProvider}</span>` : ''}
            </div>
        `;
        document.getElementById('messagesContainer').appendChild(streamMessageDiv);
    }
    
    // Append chunk to current message
    if (data && data.chunk) {
        if(data.chunk != 'newMessageAssistant'){
            currentMessageContent += data.chunk;
            
            // Format and update the content
            const contentDiv = streamMessageDiv.querySelector('.message-content');
            console.log(currentMessageContent)
            contentDiv.innerHTML = formatAssistantMessage(currentMessageContent);
            
            // Apply syntax highlighting
            highlightCodeBlocks();
            
            // Scroll to the bottom
            scrollToBottom();
        }else{
            streamMessageDiv = null;
            currentMessageContent = '';
        }
    } else {
        console.warn('Received empty chunk');
    }
}

// Handle complete assistant response
export function handleAssistantResponse(data) {

    // Hide typing indicator
    hideTypingIndicator();
    
    // If streaming was never started or failed, add the complete message
    if (!streamStarted || !streamMessageDiv) {
        console.log('Streaming was not used, adding complete message');
        addMessage('assistant', data.response, {
            aiProvider: data.aiProvider,
            processingTime: data.processingTime,
            toolsUsed: data.toolsUsed
        });
    } else {
        // Update the metadata of the streamed message
        const lastMessage = document.getElementById('messagesContainer').lastElementChild;
        if (lastMessage && lastMessage.classList.contains('message-assistant')) {
            const metaDiv = lastMessage.querySelector('.message-meta');
            metaDiv.innerHTML = `
                <span><i class="bi bi-cpu"></i> ${data.aiProvider}</span>
                ${data.processingTime ? `<span><i class="bi bi-clock"></i> ${data.processingTime}ms</span>` : ''}
                ${data.toolsUsed && data.toolsUsed.length > 0 ? 
                    `<div class="tools-used mt-1">
                        ${data.toolsUsed.map(tool => 
                            `<span class="tool-badge">${tool.name}</span>`).join('')}
                    </div>` : ''}
            `;
        }
    }
    
    // Reset streaming state after handling the response
    streamMessageDiv = null;
    currentMessageContent = '';
    streamStarted = false;
}

// Handle typing indicator
export function handleTypingIndicator(data) {
    if (data.typing) {
        showTypingIndicator();
    } else {
        hideTypingIndicator();
    }
}

// Populate providers list
function populateProvidersList(providers, providersInfo, currentProvider, socket) {
    const providersList = document.getElementById('providersList');
    providersList.innerHTML = '';
    
    providers.forEach(provider => {
        const providerInfo = providersInfo[provider];
        const isActive = provider === currentProvider;
        const statusClass = providerInfo.isActive ? 'text-success' : 'text-muted';
        const statusIcon = providerInfo.isActive ? 'bi-check-circle-fill' : 'bi-dash-circle';
        
        const item = document.createElement('div');
        item.className = `provider-item ${isActive ? 'active' : ''}`;
        item.dataset.provider = provider;
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="bi ${statusIcon} ${statusClass} me-2"></i>
                    ${provider}
                </div>
                ${isActive ? '<span class="badge bg-primary">Current</span>' : ''}
            </div>
            <div class="small session-details">
                ${providerInfo.defaultModel}
            </div>
        `;
        
        // Add click event to switch provider
        item.addEventListener('click', () => {
            if (provider !== currentProvider) {
                switchProvider(provider, socket);
            }
        });
        
        providersList.appendChild(item);
    });
}

// Switch provider
function switchProvider(provider, socket) {
    // Show loading state
    const providerItems = document.querySelectorAll('.provider-item');
    providerItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.provider === provider) {
            item.classList.add('active');
            item.innerHTML += '<div class="text-center mt-2"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
        }
    });
    
    // Add system message indicating switch
    addSystemMessage(`Switching to ${provider} AI provider...`);
    
    // Send switch request
    socket.emit('switch-provider', { provider });
}

// Handle provider switched
export function handleProviderSwitched(data, socket) {
    if (data.success) {
        // Update current provider
        currentProvider = data.currentProvider;
        
        // Add system message
        addSystemMessage(`Switched to <strong>${data.currentProvider}</strong> provider`);
        
        // Scroll to bottom
        scrollToBottom();
    } else {
        // Show error
        addSystemMessage(`Failed to switch provider: ${data.error}`, 'error');
    }
    
    // Request updated session info
    socket.emit('execute-command', { command: 'get-session-info' });
}

// Handle command result
export function handleCommandResult(data) {
    const { command, result } = data;
    
    switch (command) {
        case 'clear-history':
            if (result.success) {
                document.getElementById('messagesContainer').innerHTML = '';
                addSystemMessage('Conversation history cleared');
            }
            break;
            
        case 'get-history':
            if (result.success) {
                displayConversationHistory(result.history);
            }
            break;
            
        case 'get-session-info':
            if (result.success) {
                handleSessionInfo(result);
            }
            break;
    }
}

// Handle error
export function handleError(data) {
    console.error('Socket error:', data);
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add error message to chat
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger my-2';
    errorDiv.textContent = data.message || 'An error occurred';
    if (data.error) {
        const errorDetails = document.createElement('div');
        errorDetails.className = 'small mt-1';
        errorDetails.textContent = `Details: ${data.error}`;
        errorDiv.appendChild(errorDetails);
    }
    
    document.getElementById('messagesContainer').appendChild(errorDiv);
    scrollToBottom();
    
    // Reset stream state
    streamMessageDiv = null;
    currentMessageContent = '';
    streamStarted = false;
}

// Display conversation history
export function displayConversationHistory(history) {
    // Clear messages container first
    document.getElementById('messagesContainer').innerHTML = '';
    
    // If no history, show welcome message
    if (!history || history.length === 0) return;
    
    // Add each message to the UI
    history.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
            if(msg.role === 'user'){
                if(msg.content.startsWith("Tool result")){
                    addMessage(msg.role, `${msg.content.slice(0, 100)}...`, msg.metadata || {});
                }else{
                    addMessage(msg.role, msg.content, msg.metadata || {});
                }
            }else{
                addMessage(msg.role, msg.content, msg.metadata || {});
            }
        }
    });
}

// Export important variables
export function getCurrentProvider() {
    return currentProvider;
}

export function getSessionInfo() {
    return sessionInfo;
}
