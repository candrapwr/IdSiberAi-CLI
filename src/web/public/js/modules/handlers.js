// Socket.io event handlers
import { addMessage, addSystemMessage, formatAssistantMessage, highlightCodeBlocks, scrollToBottom, showTypingIndicator, hideTypingIndicator, upgradeToolcallBlocks, buildToolResultCard, upgradeToolResultBlocks } from './ui.js';
import { fetchToolsList, displayStats, displayProviderTests } from './api.js';

// Global variables
let currentProvider = null;
let sessionInfo = null;
let currentMessageContent = '';
let streamMessageDiv = null;
let streamStarted = false;
// TOOLCALL streaming state
let toolcallActive = false;
let toolcallStartIndex = -1;
let toolcallCodeEl = null;
let lastRenderedIndex = 0;
let activeSocket = null;

// Setup Socket.io listeners
export function setupSocketListeners(socket) {
    activeSocket = socket;
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

    // Stop event: ensure any toolcall spinners are cleared
    socket.on('stopped', () => {
        try { document.querySelectorAll('.toolcall-loading').forEach(el => el.remove()); } catch(_) {}
    });
    
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
    const providerEl = document.getElementById('currentProvider');
    if (providerEl) {
        providerEl.innerHTML = `<i class='bi bi-lightning'></i> <strong>Provider:</strong> <span class="text-primary">${data.currentAIProvider}</span>`;
    }
    const sessionEl = document.getElementById('sessionId');
    if (sessionEl) {
        sessionEl.innerHTML = `<i class='bi bi-file-earmark-text'></i> <strong>Session:</strong> <span class='text-primary'>${data.sessionId.substring(0, 8)}...</span>`;
    }
    
    // Populate providers list
    populateProvidersList(
        data.availableAIProviders,
        data.aiProvidersInfo,
        data.currentAIProvider,
        socket || activeSocket
    );
    
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
    toolcallActive = false;
    toolcallStartIndex = -1;
    toolcallCodeEl = null;
    lastRenderedIndex = 0;
    console.log('Stream state reset');
    // Clear any lingering toolcall spinners from previous cycle
    try { document.querySelectorAll('.toolcall-loading').forEach(el => el.remove()); } catch(_) {}
}

// Handle tool execution
export function handleToolExecution(data) {    
    // Add a compact header-like system message (muted)
    const systemMessageDiv = document.createElement('div');
    systemMessageDiv.className = 'system-message';
    systemMessageDiv.innerHTML = `<i class="bi bi-tools me-2"></i>Tool <strong>${data.tool}</strong> ${data.result.success ? 'executed successfully' : 'failed'}`;
    document.getElementById('messagesContainer').appendChild(systemMessageDiv);

    // try {
    //     const details = typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : (data.result?.message || '');
    //     const summary = data.result?.message || (data.result.success ? 'Tool executed successfully' : (data.result.error || 'Tool failed'));
    //     const card = buildToolResultCard({ name: data.tool, success: !!data.result.success, summary, details });
    //     document.getElementById('messagesContainer').appendChild(card);
    // } catch(_) {}

    try {
        if (window.__autoScrollEnabled !== false) scrollToBottom();
    } catch (_) { scrollToBottom(); }
    
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
            <div class="message-content"><div class="stream_content"></div></div>
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
            const contentDiv = streamMessageDiv.querySelector('.stream_content');

            // Detect TOOLCALL start if not already active
            if (!toolcallActive) {
                const match = currentMessageContent.match(/(^|\n)\s*TOOLCALL:\s*/);
                if (match) {
                    // Render text before TOOLCALL
                    const before = currentMessageContent.slice(lastRenderedIndex, match.index);
                    if (before) {
                        contentDiv.innerHTML += formatAssistantMessage(before, true);
                        lastRenderedIndex = match.index;
                    }
                    // Skip the TOOLCALL label so it doesn't render as plaintext
                    lastRenderedIndex = match.index + match[0].length;
                    // Create collapsible accordion for TOOLCALL
                    const accordion = document.createElement('div');
                    accordion.className = 'toolcall-accordion';
                    const header = document.createElement('div');
                    header.className = 'toolcall-header';
                    header.innerHTML = '<div class="toolcall-title"><span>Tool Call</span></div>\n+                    <div class="d-flex align-items-center gap-2">\n+                        <button class="btn btn-sm btn-outline-secondary toolcall-toggle"><i class="bi bi-caret-right-fill me-1"></i>Click to expand</button>\n+                        <span class="toolcall-loading ms-2"><span class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span></span>\n+                    </div>';

                    // Rebuild header via DOM nodes to avoid stray '+' artifacts
                    header.textContent = '';
                    const titleEl = document.createElement('div');
                    titleEl.className = 'toolcall-title';
                    titleEl.innerHTML = '<span>Tool Call</span>';
                    const toolcallToggleBtn = document.createElement('button');
                    toolcallToggleBtn.className = 'btn btn-sm btn-outline-secondary toolcall-toggle';
                    toolcallToggleBtn.innerHTML = '<i class="bi bi-caret-down-fill me-1"></i>Click to collapse';
                    const loadingEl = document.createElement('span');
                    loadingEl.className = 'toolcall-loading ms-2';
                    loadingEl.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>';
                    header.appendChild(titleEl);
                    header.appendChild(toolcallToggleBtn);
                    header.appendChild(loadingEl);
                    const body = document.createElement('div');
                    body.className = 'toolcall-body collapse show';
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.className = 'hljs language-json';
                    pre.appendChild(code);
                    body.appendChild(pre);
                    accordion.appendChild(header);
                    accordion.appendChild(body);
                    contentDiv.appendChild(accordion);

                    // Toggle behavior
                    const toggleBtn = toolcallToggleBtn;
                    toggleBtn.addEventListener('click', () => {
                        const isShown = body.classList.toggle('show');
                        const icon = toggleBtn.querySelector('i');
                        if (icon) icon.className = isShown ? 'bi bi-caret-down-fill me-1' : 'bi bi-caret-right-fill me-1';
                        toggleBtn.innerHTML = `${icon ? icon.outerHTML : ''}${isShown ? 'Click to collapse' : 'Click to expand'}`;
                        if (isShown) {
                            body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    });

                    toolcallCodeEl = code;
                    toolcallActive = true;
                    toolcallStartIndex = match.index + match[0].length; // after TOOLCALL:
                    // Seed label (kept for progressive rendering, but hidden in accordion title)
                    toolcallCodeEl.textContent = '';
                }
            }

            if (toolcallActive && toolcallCodeEl) {
                const afterText = currentMessageContent.slice(toolcallStartIndex);
                let rendered = afterText;
                // Try to pretty print if JSON is complete
                try {
                    const firstBrace = afterText.indexOf('{');
                    if (firstBrace !== -1) {
                        const jsonCandidate = afterText.slice(firstBrace);
                        const obj = JSON.parse(jsonCandidate);
                        rendered = JSON.stringify(obj, null, 2);
                    }
                } catch (_) {}
                rendered = rendered.replace(/\\n/g, '\n');
                toolcallCodeEl.textContent = rendered;
                if (window.hljs && window.hljs.highlightElement) {
                    window.hljs.highlightElement(toolcallCodeEl);
                }
            } else {
                // No TOOLCALL yet: render whole streaming content normally
                const slice = currentMessageContent.slice(lastRenderedIndex);
                if (slice) {
                    contentDiv.innerHTML = formatAssistantMessage(currentMessageContent, true);
                    lastRenderedIndex = currentMessageContent.length;
                }
            }

            try {
                if (window.__autoScrollEnabled !== false) scrollToBottom();
            } catch (_) { scrollToBottom(); }
        }else{
            // New assistant message cycle: ensure previous cycle spinners are removed
            try { document.querySelectorAll('.toolcall-loading').forEach(el => el.remove()); } catch(_) {}
            streamMessageDiv = null;
            currentMessageContent = '';
            toolcallActive = false;
            toolcallStartIndex = -1;
            toolcallCodeEl = null;
            lastRenderedIndex = 0;
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
    
    // Remove any toolcall loading indicators (stream finished)
    document.querySelectorAll('.toolcall-loading').forEach(el => el.remove());

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
        const providerInfo = providersInfo[provider] || {};
        const isActive = provider === currentProvider;
        const statusDot = providerInfo.isActive ? 'status-online' : 'status-offline';
        const statusLabel = providerInfo.isActive ? 'Available' : 'Unavailable';

        const metaPills = [];
        if (providerInfo.defaultModel) {
            metaPills.push(`<span class="provider-meta-pill"><i class="bi bi-cpu"></i>${providerInfo.defaultModel}</span>`);
        }

        const item = document.createElement('div');
        item.className = `provider-item ${isActive ? 'active' : ''}`;
        item.dataset.provider = provider;
        item.innerHTML = `
            <div class="provider-header">
                <div class="provider-main">
                    <span class="provider-status-dot ${statusDot}" title="${statusLabel}"></span>
                    <span class="provider-name">${provider}</span>
                </div>
                ${isActive ? '<span class="provider-current">Current</span>' : ''}
            </div>
            ${metaPills.length ? `<div class="provider-meta">${metaPills.join('')}</div>` : ''}
        `;

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
    const active = socket || activeSocket;
    if (!active) {
        console.error('Socket connection unavailable, cannot switch provider');
        addSystemMessage('Cannot switch provider: socket unavailable', 'error');
        return;
    }
    // Show loading state
    const providerItems = document.querySelectorAll('.provider-item');
    providerItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.provider === provider) {
            item.classList.add('active');
            item.innerHTML += '<div class="text-center mt-2"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
        }
    });
    
    // Send switch request
    active.emit('switch-provider', { provider });
}

// Handle provider switched
export function handleProviderSwitched(data, socket) {
    const active = socket || activeSocket;
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
    if (active) {
        active.emit('execute-command', { command: 'get-session-info' });
    }
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
                handleSessionInfo(result, activeSocket);
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
    try {
        if (window.__autoScrollEnabled !== false) scrollToBottom();
    } catch (_) { scrollToBottom(); }

    // Stop any TOOLCALL loading indicators on error
    document.querySelectorAll('.toolcall-loading').forEach(el => el.remove());
    
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
                    addMessage('assistant', `${msg.content.slice(0, 10000000)}`, msg.metadata || {});
                }else{
                    addMessage(msg.role, msg.content, msg.metadata || {});
                }
            }else{
                addMessage(msg.role, msg.content, msg.metadata || {});
            }
        }
    });

    // Rehydrate assistant messages: upgrade TOOLCALL blocks and re-highlight code
    const container = document.getElementById('messagesContainer');
    upgradeToolcallBlocks(container);
    upgradeToolResultBlocks(container);
    highlightCodeBlocks();
}

// Export important variables
export function getCurrentProvider() {
    return currentProvider;
}

export function getSessionInfo() {
    return sessionInfo;
}
