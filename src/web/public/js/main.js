// Global variables
const socket = io();
let currentProvider = null;
let sessionInfo = null;
let currentlyTyping = false;

// DOM elements
const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const messageForm = document.getElementById('messageForm');
const providersList = document.getElementById('providersList');
const toolsList = document.getElementById('toolsList');
const currentProviderEl = document.getElementById('currentProvider');
const sessionIdEl = document.getElementById('sessionId');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statsBtn = document.getElementById('statsBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const testProvidersBtn = document.getElementById('testProvidersBtn');
const statsModal = new bootstrap.Modal(document.getElementById('statsModal'));
const providerTestModal = new bootstrap.Modal(document.getElementById('providerTestModal'));
const quickPromptBtns = document.querySelectorAll('.quick-prompt-btn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();
    
    // Load initial conversation history
    fetchConversationHistory();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    messageForm.addEventListener('submit', handleFormSubmit);
    
    // Auto-resize textarea
    userInput.addEventListener('input', autoResizeTextarea);
    
    // Clear history button
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Stats button
    statsBtn.addEventListener('click', showStats);
    
    // Toggle sidebar button
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    
    // Test providers button
    testProvidersBtn.addEventListener('click', testProviders);
    
    // Quick prompt buttons
    quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.textContent.trim();
            userInput.focus();
        });
    });
    
    // Socket.io event listeners
    setupSocketListeners();
}

// Socket.io event listeners
function setupSocketListeners() {
    // Session info
    socket.on('session-info', handleSessionInfo);
    
    // Stream chunks
    socket.on('stream-chunk', handleStreamChunk);
    
    // Reset stream state
    socket.on('reset-stream', handleResetStream);
    
    // Complete assistant response
    socket.on('assistant-response', handleAssistantResponse);
    
    // Typing indicator
    socket.on('assistant-typing', handleTypingIndicator);
    
    // Provider switched
    socket.on('provider-switched', handleProviderSwitched);
    
    // Command results
    socket.on('command-result', handleCommandResult);
    
    // Error handling
    socket.on('error', handleError);
    
    // Connection status
    socket.on('connect', () => {
        console.log('Socket connected successfully');
    });
    
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        // Try to reconnect
        setTimeout(() => {
            socket.connect();
        }, 1000);
    });
    
    socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
    });
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addMessage('user', message);
    
    // Send message to server
    socket.emit('user-message', { message });
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();
}

// Auto-resize textarea
function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
}

// Handle session info
function handleSessionInfo(data) {
    sessionInfo = data;
    currentProvider = data.currentAIProvider;
    
    // Update session info display
    currentProviderEl.innerHTML = `<strong>Provider:</strong> ${data.currentAIProvider}`;
    sessionIdEl.innerHTML = `<strong>Session:</strong> ${data.sessionId.substring(0, 8)}...`;
    
    // Populate providers list
    populateProvidersList(data.availableAIProviders, data.aiProvidersInfo, data.currentAIProvider);
    
    // Populate tools list
    if (data.toolsCount > 0) {
        fetchToolsList();
    }
}

// Populate providers list
function populateProvidersList(providers, providersInfo, currentProvider) {
    providersList.innerHTML = '';
    
    providers.forEach(provider => {
        const providerInfo = providersInfo[provider];
        const isActive = provider === currentProvider;
        const statusClass = providerInfo.isActive ? 'text-success' : 'text-muted';
        const statusIcon = providerInfo.isActive ? 'bi-check-circle-fill' : 'bi-dash-circle';
        
        const item = document.createElement('div');
        item.className = `list-group-item bg-transparent text-white provider-item ${isActive ? 'active' : ''}`;
        item.dataset.provider = provider;
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="bi ${statusIcon} ${statusClass} me-2"></i>
                    ${provider}
                </div>
                ${isActive ? '<span class="badge bg-primary">Current</span>' : ''}
            </div>
            <div class="small text-muted">
                ${providerInfo.defaultModel}
            </div>
        `;
        
        // Add click event to switch provider
        item.addEventListener('click', () => {
            if (provider !== currentProvider) {
                switchProvider(provider);
            }
        });
        
        providersList.appendChild(item);
    });
}

// Fetch tools list
function fetchToolsList() {
    // Get tools from the API
    fetch('/api/tools')
        .then(response => response.json())
        .then(data => {
            organizeToolsByCategory(data.tools);
        })
        .catch(error => {
            console.error('Error fetching tools:', error);
        });
}

// Organize tools by category
function organizeToolsByCategory(tools) {
    // Define tool categories
    const categories = {
        'File Operations': [
            'search_files', 'read_file', 'write_file', 'append_to_file',
            'delete_file', 'copy_file', 'move_file', 'edit_file'
        ],
        'Directory Operations': [
            'list_directory', 'create_directory', 'delete_directory'
        ],
        'Analysis Tools': [
            'analyze_file_structure', 'find_in_files', 'replace_in_files'
        ],
        'System Operations': [
            'execute_command', 'get_working_directory_info'
        ],
        'S3 Storage': [
            's3_upload', 's3_download', 's3_delete', 's3_search', 's3_get_client_info', 's3_set_acl'
        ],
        'AI Management': [
            'switch_ai_provider', 'list_ai_providers', 'get_ai_provider_info', 'test_ai_providers'
        ],
        'Logging': [
            'get_api_usage', 'get_recent_logs', 'clear_old_logs'
        ]
    };
    
    toolsList.innerHTML = '';
    
    // Create category sections
    Object.entries(categories).forEach(([category, categoryTools]) => {
        // Filter tools that are available
        const availableTools = categoryTools.filter(tool => tools.includes(tool));
        
        if (availableTools.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'tool-category';
            categoryDiv.innerHTML = `
                <div class="text-white-50 small mb-1">${category}</div>
                <ul class="tool-list">
                    ${availableTools.map(tool => `<li>${tool}</li>`).join('')}
                </ul>
            `;
            
            toolsList.appendChild(categoryDiv);
        }
    });
}

// Add message to UI
function addMessage(role, content, metadata = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    
    // Format content if it's from the assistant
    let formattedContent = content;
    if (role === 'assistant') {
        formattedContent = formatAssistantMessage(content);
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">${formattedContent}</div>
        <div class="message-meta">
            ${role === 'assistant' && metadata.aiProvider ? `Provider: ${metadata.aiProvider}` : ''}
            ${role === 'assistant' && metadata.processingTime ? `Time: ${metadata.processingTime}ms` : ''}
            ${role === 'assistant' && metadata.toolsUsed && metadata.toolsUsed.length > 0 ? 
                `<div class="tools-used mt-1">
                    Tools: ${metadata.toolsUsed.map(tool => 
                        `<span class="tool-badge">${tool.name}</span>`).join('')}
                </div>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to the bottom
    scrollToBottom();
    
    // Apply syntax highlighting
    if (role === 'assistant') {
        highlightCodeBlocks();
    }
}

// Format assistant message (convert markdown to HTML)
function formatAssistantMessage(content) {
    // Configure marked
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true
    });
    
    return marked.parse(content);
}

// Highlight code blocks
function highlightCodeBlocks() {
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}

// Show typing indicator
function showTypingIndicator() {
    if (currentlyTyping) return;
    
    currentlyTyping = true;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<i class="bi bi-three-dots"></i> Assistant is typing...';
    
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    currentlyTyping = false;
}

// Handle stream chunk
let currentMessageContent = '';
let streamMessageDiv = null;
let streamStarted = false;

// Reset stream state
function handleResetStream() {
    currentMessageContent = '';
    streamMessageDiv = null;
    streamStarted = false;
    console.log('Stream state reset');
}

function handleStreamChunk(data) {
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
                ${currentProvider ? `Provider: ${currentProvider}` : ''}
            </div>
        `;
        messagesContainer.appendChild(streamMessageDiv);
        console.log('Created new message div for streaming');
    }
    
    // Append chunk to current message
    if (data && data.chunk) {
        currentMessageContent += data.chunk;
        
        // Format and update the content
        const contentDiv = streamMessageDiv.querySelector('.message-content');
        contentDiv.innerHTML = formatAssistantMessage(currentMessageContent);
        
        // Apply syntax highlighting
        highlightCodeBlocks();
        
        // Scroll to the bottom
        scrollToBottom();
    } else {
        console.warn('Received empty chunk');
    }
}

// Handle complete assistant response
function handleAssistantResponse(data) {
    console.log('Received complete response:', data);
    
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
        console.log('Updating metadata for streamed message');
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('message-assistant')) {
            const metaDiv = lastMessage.querySelector('.message-meta');
            metaDiv.innerHTML = `
                Provider: ${data.aiProvider}
                ${data.processingTime ? `Time: ${data.processingTime}ms` : ''}
                ${data.toolsUsed && data.toolsUsed.length > 0 ? 
                    `<div class="tools-used mt-1">
                        Tools: ${data.toolsUsed.map(tool => 
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
function handleTypingIndicator(data) {
    if (data.typing) {
        showTypingIndicator();
    } else {
        hideTypingIndicator();
    }
}

// Switch provider
function switchProvider(provider) {
    // Show loading state
    const providerItems = document.querySelectorAll('.provider-item');
    providerItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.provider === provider) {
            item.classList.add('active');
            item.innerHTML += '<div class="text-center mt-2"><div class="spinner-border spinner-border-sm text-light" role="status"></div></div>';
        }
    });
    
    // Send switch request
    socket.emit('switch-provider', { provider });
}

// Handle provider switched
function handleProviderSwitched(data) {
    if (data.success) {
        // Update current provider
        currentProvider = data.currentProvider;
        
        // Add system message
        const systemMessageDiv = document.createElement('div');
        systemMessageDiv.className = 'alert alert-info small text-center my-2';
        systemMessageDiv.innerHTML = `Switched to <strong>${data.currentProvider}</strong> provider`;
        messagesContainer.appendChild(systemMessageDiv);
        
        // Scroll to bottom
        scrollToBottom();
    } else {
        // Show error
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.className = 'alert alert-danger small text-center my-2';
        errorMessageDiv.innerHTML = `Failed to switch provider: ${data.error}`;
        messagesContainer.appendChild(errorMessageDiv);
    }
    
    // Request updated session info
    socket.emit('execute-command', { command: 'get-session-info' });
}

// Handle command result
function handleCommandResult(data) {
    const { command, result } = data;
    
    switch (command) {
        case 'clear-history':
            if (result.success) {
                messagesContainer.innerHTML = '';
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
function handleError(data) {
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
    
    messagesContainer.appendChild(errorDiv);
    scrollToBottom();
    
    // Reset stream state
    streamMessageDiv = null;
    currentMessageContent = '';
    streamStarted = false;
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear the conversation history?')) {
        socket.emit('execute-command', { command: 'clear-history' });
    }
}

// Fetch conversation history
function fetchConversationHistory() {
    fetch('/api/history')
        .then(response => response.json())
        .then(data => {
            displayConversationHistory(data.history);
        })
        .catch(error => {
            console.error('Error fetching conversation history:', error);
        });
}

// Display conversation history
function displayConversationHistory(history) {
    // Clear messages container first
    messagesContainer.innerHTML = '';
    
    // If no history, show welcome message
    if (history.length === 0) return;
    
    // Add each message to the UI
    history.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
            addMessage(msg.role, msg.content, msg.metadata || {});
        }
    });
}

// Add system message
function addSystemMessage(message) {
    const systemMessageDiv = document.createElement('div');
    systemMessageDiv.className = 'alert alert-secondary small text-center my-2';
    systemMessageDiv.textContent = message;
    messagesContainer.appendChild(systemMessageDiv);
    scrollToBottom();
}

// Show stats
function showStats() {
    // Show modal
    statsModal.show();
    
    // Reset modal content
    document.getElementById('statsModalBody').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading statistics...</p>
        </div>
    `;
    
    // Fetch stats
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            displayStats(data);
        })
        .catch(error => {
            document.getElementById('statsModalBody').innerHTML = `
                <div class="alert alert-danger">
                    Error loading statistics: ${error.message}
                </div>
            `;
        });
}

// Display stats
function displayStats(data) {
    const modalBody = document.getElementById('statsModalBody');
    
    let statsHtml = '<div class="row">';
    
    // Session stats
    statsHtml += `
        <div class="col-md-12 mb-4">
            <h6 class="border-bottom pb-2">Session Information</h6>
            <div class="row">
                <div class="col-md-6">
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Session ID
                            <span class="badge bg-primary rounded-pill">${sessionInfo.sessionId}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Current Provider
                            <span class="badge bg-primary rounded-pill">${sessionInfo.currentAIProvider}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Available Providers
                            <span class="badge bg-primary rounded-pill">${sessionInfo.availableAIProviders.length}</span>
                        </li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Conversation Length
                            <span class="badge bg-primary rounded-pill">${sessionInfo.conversationLength}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Available Tools
                            <span class="badge bg-primary rounded-pill">${sessionInfo.toolsCount}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Stream Mode
                            <span class="badge ${sessionInfo.streamMode ? 'bg-success' : 'bg-secondary'} rounded-pill">
                                ${sessionInfo.streamMode ? 'Enabled' : 'Disabled'}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Provider usage stats
    statsHtml += '<div class="col-md-12 mb-4"><h6 class="border-bottom pb-2">AI Provider Usage</h6>';
    
    // Check if we have provider stats
    const hasProviderStats = Object.keys(data).some(provider => 
        data[provider] && !data[provider].error && !data[provider].message);
    
    if (hasProviderStats) {
        statsHtml += '<div class="table-responsive"><table class="table table-striped table-sm">';
        statsHtml += `
            <thead>
                <tr>
                    <th>Provider</th>
                    <th>Total Calls</th>
                    <th>Success</th>
                    <th>Failed</th>
                    <th>Success Rate</th>
                    <th>Tokens</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        Object.entries(data).forEach(([provider, stats]) => {
            if (stats.error || stats.message) {
                statsHtml += `
                    <tr>
                        <td>${provider}</td>
                        <td colspan="5" class="text-muted">
                            ${stats.error || stats.message || 'No data available'}
                        </td>
                    </tr>
                `;
            } else {
                statsHtml += `
                    <tr>
                        <td>${provider}</td>
                        <td>${stats.totalCalls || 0}</td>
                        <td>${stats.successfulCalls || 0}</td>
                        <td>${stats.failedCalls || 0}</td>
                        <td>${stats.successRate || '0%'}</td>
                        <td>${stats.totalTokens || 'N/A'}</td>
                    </tr>
                `;
            }
        });
        
        statsHtml += '</tbody></table></div>';
    } else {
        statsHtml += '<div class="alert alert-info">No usage statistics available yet.</div>';
    }
    
    statsHtml += '</div></div>'; // Close row div
    
    // Update modal content
    modalBody.innerHTML = statsHtml;
}

// Test providers
function testProviders() {
    // Show modal
    providerTestModal.show();
    
    // Reset modal content
    document.getElementById('providerTestModalBody').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Testing providers...</p>
        </div>
    `;
    
    // Send test request
    fetch('/api/test-providers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        displayProviderTests(data);
    })
    .catch(error => {
        document.getElementById('providerTestModalBody').innerHTML = `
            <div class="alert alert-danger">
                Error testing providers: ${error.message}
            </div>
        `;
    });
}

// Display provider tests
function displayProviderTests(data) {
    const modalBody = document.getElementById('providerTestModalBody');
    
    if (!data.success) {
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                Error testing providers: ${data.error}
            </div>
        `;
        return;
    }
    
    let testsHtml = `
        <div class="alert alert-success">
            Test completed for ${Object.keys(data.testResults).length} providers
        </div>
        <div class="list-group">
    `;
    
    Object.entries(data.testResults).forEach(([provider, result]) => {
        const statusClass = result.success ? 'list-group-item-success' : 'list-group-item-danger';
        const statusIcon = result.success ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        
        testsHtml += `
            <div class="list-group-item ${statusClass}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi ${statusIcon} me-2"></i>
                        <strong>${provider}</strong>
                    </div>
                    <span class="badge bg-${result.success ? 'success' : 'danger'} rounded-pill">
                        ${result.success ? 'PASS' : 'FAIL'}
                    </span>
                </div>
                <div class="small mt-1">
                    ${result.success ? 
                        `Response Time: ${result.responseTime}ms` : 
                        `Error: ${result.error}`}
                </div>
            </div>
        `;
    });
    
    testsHtml += '</div>';
    
    modalBody.innerHTML = testsHtml;
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('show');
    
    if (window.innerWidth <= 767) {
        if (sidebar.classList.contains('show')) {
            mainContent.style.display = 'none';
        } else {
            mainContent.style.display = 'flex';
        }
    }
}

// Scroll to bottom of chat window
function scrollToBottom() {
    const chatWindow = document.querySelector('.chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
