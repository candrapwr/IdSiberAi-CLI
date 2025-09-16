// UI utilities and handlers
import { getCurrentProvider } from './handlers.js';

// Theme management
let isDarkMode = true; // Default to dark mode

// Initialize theme
export function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        updateThemeUI();
    }
}

// Toggle theme
export function toggleTheme() {
    isDarkMode = !isDarkMode;
    updateThemeUI();
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Update theme UI
export function updateThemeUI() {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    
    // Update icon
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = isDarkMode ? 
            '<i class="bi bi-sun"></i>' : 
            '<i class="bi bi-moon-stars"></i>';
        
        // Update button text
        themeToggleBtn.title = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

// Auto-resize textarea
export function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
}

// Show typing indicator
let currentlyTyping = false;
let autoScrollEnabled = true; // smart autoscroll state
// Expose for other modules' best-effort checks
window.__autoScrollEnabled = autoScrollEnabled;
export function showTypingIndicator() {
    if (currentlyTyping) return;
    
    currentlyTyping = true;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<i class="bi bi-three-dots"></i> IdSiberAi is processing...';
    
    document.getElementById('messagesContainer').appendChild(typingDiv);
    scrollToBottom();
}

// Hide typing indicator
export function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    currentlyTyping = false;
}

// Add message to UI
export function addMessage(role, content, metadata = {}) {
    const messagesContainer = document.getElementById('messagesContainer');
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
            ${role === 'assistant' && metadata.aiProvider ? `<span><i class="bi bi-cpu"></i> ${metadata.aiProvider}</span>` : ''}
            ${role === 'assistant' && metadata.processingTime ? `<span><i class="bi bi-clock"></i> ${metadata.processingTime}ms</span>` : ''}
            ${role === 'assistant' && metadata.toolsUsed && metadata.toolsUsed.length > 0 ? 
                `<div class="tools-used mt-1">
                    ${metadata.toolsUsed.map(tool => 
                        `<span class="tool-badge">${tool.name}</span>`).join('')}
                </div>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);

    // Smart auto-scroll: only if enabled
    if (autoScrollEnabled) {
        scrollToBottom();
    }
    
    // Apply syntax highlighting
    if (role === 'assistant') {
        setTimeout(() => {
            highlightCodeBlocks();
        }, 100);
    }
}

// Add system message
export function addSystemMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('messagesContainer');
    const systemMessageDiv = document.createElement('div');
    systemMessageDiv.className = `system-message ${type === 'error' ? 'alert-danger' : ''}`;
    systemMessageDiv.innerHTML = message;
    messagesContainer.appendChild(systemMessageDiv);
    scrollToBottom();
}

// Format assistant message (convert markdown to HTML)
// Markdown-it instance configured with highlight.js
const md = window.markdownit({
    html: false,
    linkify: true,
    breaks: true,
    highlight: function (str, lang) {
        try {
            if (lang && hljs.getLanguage(lang)) {
                const out = hljs.highlight(str, { language: lang }).value;
                return `<pre><code class="hljs language-${lang}">${out}</code></pre>`;
            }
        } catch (__) {}
        const esc = str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre><code class="hljs">${esc}</code></pre>`;
    }
});

export function formatAssistantMessage(content, stream = false) {
    if (!stream) {
        return md.render(content);
    } else {
        // Streaming-friendly lightweight formatter
        // - Render lines starting with TOOLCALL: as a JSON code block
        // - Render lines starting with THINK: as subtle text
        // - Escape other text and preserve line breaks

        const escapeHTML = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const lines = content.split(/\r?\n/);
        const parts = [];
        for (const line of lines) {
            const m = line.match(/^\s*TOOLCALL:\s*(\{.*\})\s*$/);
            if (m) {
                // Pretty print if possible
                let jsonText = m[1];
                try {
                    const obj = JSON.parse(jsonText);
                    jsonText = JSON.stringify(obj, null, 2);
                } catch (_) {
                    // keep as is
                }
                const block = `<pre><code class="hljs language-json">${escapeHTML('TOOLCALL: ' + jsonText)}</code></pre>`;
                parts.push(block);
                continue;
            }

            const think = line.match(/^\s*THINK:\s*(.*)$/);
            if (think) {
                parts.push(`<div class="text-muted small">${escapeHTML(think[1])}</div>`);
                continue;
            }

            // parts.push(`<div>${escapeHTML(line)}</div>`);
        }
        return parts.join('');
    }
}

// Highlight code blocks
export function highlightCodeBlocks() {
    document.querySelectorAll('pre code').forEach((block) => {
        if (hljs.highlightElement) {
            hljs.highlightElement(block);
        } else {
            // Backward compatibility
            hljs.highlightBlock(block);
        }
    });
}

// Build a collapsible accordion for a TOOLCALL JSON string
export function buildToolcallAccordion(jsonText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'toolcall-accordion';

    const header = document.createElement('div');
    header.className = 'toolcall-header';
    header.innerHTML = '<button class="btn btn-sm btn-outline-secondary toolcall-toggle"><i class="bi bi-caret-right-fill me-1"></i>Tool Call (click to expand)</button>';

    const body = document.createElement('div');
    body.className = 'toolcall-body collapse';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'hljs language-json';
    code.textContent = jsonText;
    pre.appendChild(code);
    body.appendChild(pre);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    const toggleBtn = header.querySelector('.toolcall-toggle');
    toggleBtn.addEventListener('click', () => {
        const isShown = body.classList.toggle('show');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = isShown ? 'bi bi-caret-down-fill me-1' : 'bi bi-caret-right-fill me-1';
        toggleBtn.textContent = isShown ? 'Tool Call (click to collapse)' : 'Tool Call (click to expand)';
        toggleBtn.prepend(icon);
    });

    return wrapper;
}

// Upgrade any TOOLCALL text/blocks in a container into accordions
export function upgradeToolcallBlocks(container) {
    if (!container) return;

    // Case 1: Lines starting with "TOOLCALL: { ... }" inside assistant messages
    container.querySelectorAll('.message-assistant .message-content').forEach(contentEl => {
        // If it already contains an accordion, skip
        if (contentEl.querySelector('.toolcall-accordion')) return;

        // Look for pre/code that contains TOOLCALL or plain text nodes
        const html = contentEl.innerHTML;
        if (html.includes('TOOLCALL:')) {
            // Extract JSON after TOOLCALL:
            const text = contentEl.textContent || '';
            const idx = text.indexOf('TOOLCALL:');
            if (idx !== -1) {
                const after = text.slice(idx + 'TOOLCALL:'.length).trim();
                // Try to find a JSON object
                let jsonStr = after;
                try {
                    const firstBrace = after.indexOf('{');
                    if (firstBrace !== -1) {
                        const candidate = after.slice(firstBrace);
                        const obj = JSON.parse(candidate);
                        jsonStr = JSON.stringify(obj, null, 2);
                    }
                } catch (_) {}

                // Rebuild content: keep text before TOOLCALL, insert accordion, drop raw TOOLCALL text
                const beforeText = text.slice(0, idx);
                contentEl.innerHTML = '';
                if (beforeText.trim()) {
                    const beforeDiv = document.createElement('div');
                    beforeDiv.innerHTML = formatAssistantMessage(beforeText, true);
                    contentEl.appendChild(beforeDiv);
                }
                contentEl.appendChild(buildToolcallAccordion(jsonStr));
            }
        }
    });

    // Highlight any new code blocks created
    setTimeout(highlightCodeBlocks, 0);
}

// Build a collapsible card for Tool Result
export function buildToolResultCard({ name = 'Tool', success = true, summary = '', details = '' }) {
    const card = document.createElement('div');
    card.className = 'toolresult-card card mb-2';

    const header = document.createElement('div');
    header.className = 'card-header d-flex justify-content-between align-items-center';
    const title = document.createElement('div');
    title.innerHTML = `<i class="bi bi-tools me-2"></i>${name}`;
    const badge = document.createElement('span');
    badge.className = `badge ${success ? 'bg-success' : 'bg-danger'}`;
    badge.textContent = success ? 'Success' : 'Error';
    header.appendChild(title);
    header.appendChild(badge);

    const body = document.createElement('div');
    body.className = 'card-body';
    const summaryEl = document.createElement('div');
    summaryEl.className = 'mb-2';
    summaryEl.textContent = summary || (success ? 'Tool executed successfully.' : 'Tool execution failed.');

    const toggle = document.createElement('button');
    toggle.className = 'btn btn-sm btn-outline-secondary';
    toggle.innerHTML = '<i class="bi bi-caret-right-fill me-1"></i>Show details';

    const detailsWrap = document.createElement('div');
    detailsWrap.className = 'collapse';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'hljs';
    code.textContent = details || '';
    pre.appendChild(code);
    detailsWrap.appendChild(pre);

    toggle.addEventListener('click', () => {
        const shown = detailsWrap.classList.toggle('show');
        const iconClass = shown ? 'bi bi-caret-down-fill me-1' : 'bi bi-caret-right-fill me-1';
        toggle.innerHTML = `<i class="${iconClass}"></i>${shown ? 'Hide details' : 'Show details'}`;
    });

    body.appendChild(summaryEl);
    if (details && details.trim().length > 0) {
        body.appendChild(toggle);
        body.appendChild(detailsWrap);
    }

    card.appendChild(header);
    card.appendChild(body);

    // highlight details if present
    setTimeout(highlightCodeBlocks, 0);
    return card;
}

// Upgrade any "Tool result" messages into cards
export function upgradeToolResultBlocks(container) {
    if (!container) return;
    container.querySelectorAll('.message .message-content').forEach(contentEl => {
        const text = (contentEl.textContent || '').trim();
        if (!text.startsWith('Tool result')) return;
        if (contentEl.querySelector('.toolresult-card')) return; // already upgraded

        // Basic parse: first line as summary, rest as details
        const lines = text.split(/\r?\n/);
        const first = lines.shift() || 'Tool result';
        const details = lines.join('\n');

        // Try extract tool name from first line e.g., "Tool result (read_file): ..."
        let name = 'Tool';
        const m = first.match(/Tool result\s*\(([^)]+)\)/i);
        if (m) name = m[1];

        // success/error detection
        const success = !/error|fail/i.test(first);

        // Replace content with card
        contentEl.innerHTML = '';
        contentEl.appendChild(buildToolResultCard({ name, success, summary: first, details }));
    });
}

// Scroll to bottom of chat window
export function scrollToBottom() {
    const chatWindow = document.querySelector('.chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Toggle sidebar
export function toggleSidebar() {
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

// Set up event handlers for DOM elements
export function setupDOMEventHandlers(socket) {
    // Form submission
    const messageForm = document.getElementById('messageForm');
    const userInput = document.getElementById('userInput');
    
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            handleFormSubmit(e, socket);
        });
    }
    
    if (userInput) {
        // Enter key submission
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (messageForm) {
                    handleFormSubmit(new Event('submit'), socket);
                }
            }
        });
        
        // Auto-resize
        userInput.addEventListener('input', autoResizeTextarea);
    }
    
    // Clear history button
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            socket.emit('stop');
        });
    }

    // Clear history button
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the conversation history?')) {
                socket.emit('execute-command', { command: 'clear-history' });
            }
        });
    }
    
    // Working directory button
    const workDirBtn = document.getElementById('workDirBtn');
    if (workDirBtn) {
        workDirBtn.addEventListener('click', () => {
            import('./api.js').then(module => {
                module.showWorkingDirectoryModal();
            });
        });
    }
    
    // Refresh working directory button
    const refreshWorkDirBtn = document.getElementById('refreshWorkDirBtn');
    if (refreshWorkDirBtn) {
        refreshWorkDirBtn.addEventListener('click', () => {
            import('./api.js').then(module => {
                module.getWorkingDirectory()
                    .then(directory => {
                        document.getElementById('currentWorkDir').value = directory;
                        // Hide any previous results
                        const resultEl = document.getElementById('workDirResult');
                        resultEl.classList.add('d-none');
                        
                        // Reload directory list
                        module.loadDirectoryList(directory);
                    })
                    .catch(error => {
                        // Show error
                        const resultEl = document.getElementById('workDirResult');
                        resultEl.textContent = `Error: ${error.message}`;
                        resultEl.classList.remove('d-none', 'alert-success');
                        resultEl.classList.add('alert-danger');
                    });
            });
        });
    }
    
    // Parent directory button
    const parentDirBtn = document.getElementById('parentDirBtn');
    if (parentDirBtn) {
        parentDirBtn.addEventListener('click', () => {
            try {
                // Get the current path and working directory
                const currentBrowserPath = document.getElementById('currentBrowserPath');
                const workingDir = currentBrowserPath?.dataset?.workingDir || '';
                
                console.log(`Current working directory: ${workingDir}`);
                
                // Get current path from input
                let currentPath = document.getElementById('newWorkDir').value;
                console.log(`Current path before processing: ${currentPath}`);
                
                // If no path, we're already at root
                if (!currentPath) {
                    console.log('Already at root, nothing to do');
                    return;
                }
                
                // Handle special case: if currentPath is the working directory itself
                if (currentPath === workingDir) {
                    console.log('At working directory, navigating to parent...');
                    
                    // Get parent of working directory
                    const pathParts = workingDir.split('/');
                    // Remove last part
                    pathParts.pop();
                    const parentPath = pathParts.join('/');
                    
                    // Update input and load
                    document.getElementById('newWorkDir').value = parentPath;
                    console.log(`Navigating to parent of working directory: ${parentPath}`);
                    
                    import('./api.js').then(module => {
                        module.loadDirectoryList(parentPath);
                    });
                    return;
                }
                
                // Use Node.js path module logic to get parent directory
                // First normalize path (replace backslashes with forward slashes)
                currentPath = currentPath.replace(/\\/g, '/');
                
                // Remove trailing slash if exists
                if (currentPath.endsWith('/')) {
                    currentPath = currentPath.slice(0, -1);
                }
                
                // Get the parent directory path
                const lastSlashIndex = currentPath.lastIndexOf('/');
                
                let parentPath;
                if (lastSlashIndex === -1) {
                    // No slashes, already at root of current context
                    parentPath = '';
                } else if (lastSlashIndex === 0) {
                    // Root directory
                    parentPath = '/';
                } else {
                    // Normal case: get parent path
                    parentPath = currentPath.substring(0, lastSlashIndex);
                }
                
                console.log(`Calculated parent path: ${parentPath}`);
                
                // Update input and load
                document.getElementById('newWorkDir').value = parentPath;
                import('./api.js').then(module => {
                    module.loadDirectoryList(parentPath);
                });
            } catch (error) {
                console.error(`Error navigating to parent directory: ${error.message}`);
                alert(`Error navigating to parent directory: ${error.message}`);
            }
        });
    }
    
    // Change working directory button
    const changeWorkDirBtn = document.getElementById('changeWorkDirBtn');
    if (changeWorkDirBtn) {
        changeWorkDirBtn.addEventListener('click', () => {
            const newDirectory = document.getElementById('newWorkDir').value;
            if (!newDirectory) {
                alert('Please enter a directory path');
                return;
            }
            
            // Show loading state
            changeWorkDirBtn.disabled = true;
            changeWorkDirBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';
            
            import('./api.js').then(module => {
                module.changeWorkingDirectory(newDirectory)
                    .then(result => {
                        // Reset button
                        changeWorkDirBtn.disabled = false;
                        changeWorkDirBtn.innerHTML = 'Change';
                        
                        // Show result
                        const resultEl = document.getElementById('workDirResult');
                        if (result.success) {
                            document.getElementById('currentWorkDir').value = result.directory;
                            resultEl.textContent = result.message;
                            resultEl.classList.remove('d-none', 'alert-danger');
                            resultEl.classList.add('alert-success');
                        } else {
                            resultEl.textContent = `Error: ${result.error}`;
                            resultEl.classList.remove('d-none', 'alert-success');
                            resultEl.classList.add('alert-danger');
                        }
                    })
                    .catch(error => {
                        // Reset button
                        changeWorkDirBtn.disabled = false;
                        changeWorkDirBtn.innerHTML = 'Change';
                        
                        // Show error
                        const resultEl = document.getElementById('workDirResult');
                        resultEl.textContent = `Error: ${error.message}`;
                        resultEl.classList.remove('d-none', 'alert-success');
                        resultEl.classList.add('alert-danger');
                    });
            });
        });
    }
    
    // Toggle sidebar button
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }
    
    // Theme toggle button
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Attach smart autoscroll listener
    const chatWindow = document.querySelector('.chat-window');
    if (chatWindow) {
        chatWindow.addEventListener('scroll', handleChatScroll, { passive: true });
    }
    
    // Quick prompt buttons
    const quickPromptBtns = document.querySelectorAll('.quick-prompt-btn');
    quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (userInput) {
                userInput.value = btn.textContent.trim();
                userInput.focus();
                autoResizeTextarea.call(userInput);
            }
        });
    });
    
    // Mobile sidebar handling
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 767 && 
                sidebar.classList.contains('show') && 
                !sidebar.contains(e.target) && 
                e.target !== toggleSidebarBtn) {
                sidebar.classList.remove('show');
                document.querySelector('.main-content').style.display = 'flex';
            }
        });
    }
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.activeElement === userInput) {
                messageForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            // Close any open modals
            const openModals = document.querySelectorAll('.modal.show');
            if (openModals.length > 0) {
                openModals.forEach(modal => {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                });
            }
            // Close sidebar on mobile
            else if (window.innerWidth <= 767 && sidebar && sidebar.classList.contains('show')) {
                toggleSidebar();
            }
        }
    });
}

// Smart autoscroll handlers
function handleChatScroll() {
    const chatWindow = document.querySelector('.chat-window');
    if (!chatWindow) return;

    const threshold = 16; // px tolerance from bottom
    const distanceFromBottom = chatWindow.scrollHeight - chatWindow.clientHeight - chatWindow.scrollTop;
    const atBottom = distanceFromBottom <= threshold;

    // If user scrolls up from bottom, disable autoscroll
    if (!atBottom && autoScrollEnabled) {
        autoScrollEnabled = false;
        window.__autoScrollEnabled = false;
        setAutoScrollIndicator(false);
    }

    // If user scrolls back to bottom, enable autoscroll
    if (atBottom && !autoScrollEnabled) {
        autoScrollEnabled = true;
        window.__autoScrollEnabled = true;
        setAutoScrollIndicator(true);
    }
}

function setAutoScrollIndicator(enabled) {
    // Optional: could update a subtle UI indicator; noop for now
}

// Handle form submission
function handleFormSubmit(e, socket) {
    e.preventDefault();
    const userInput = document.getElementById('userInput');
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
