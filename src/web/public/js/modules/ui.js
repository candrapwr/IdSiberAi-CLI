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
    
    // Scroll to the bottom
    scrollToBottom();
    
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
export function formatAssistantMessage(content) {
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
export function highlightCodeBlocks() {
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
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
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the conversation history?')) {
                socket.emit('execute-command', { command: 'clear-history' });
            }
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
