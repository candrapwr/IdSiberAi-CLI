// Main application file
import { setupSocketListeners, displayConversationHistory } from './modules/handlers.js';
import { initializeTheme, setupDOMEventHandlers } from './modules/ui.js';
import { fetchConversationHistory, showStats, testProviders, showWorkingDirectoryModal } from './modules/api.js';

// Set up global variables
const socket = io();

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing IdSiberAi Terminal...');
    
    // Set up global functions for cross-module access
    window.displayConversationHistory = displayConversationHistory;
    
    // Initialize theme
    initializeTheme();
    
    // Setup Socket.io listeners
    setupSocketListeners(socket);
    
    // Setup DOM event handlers
    setupDOMEventHandlers(socket);
    
    // Setup additional button handlers
    setupAdditionalHandlers();
    
    // Load initial conversation history
    fetchConversationHistory();
    
    // Focus input on page load
    setTimeout(() => {
        const userInput = document.getElementById('userInput');
        if (userInput) userInput.focus();
    }, 500);
    
    console.log('IdSiberAi Terminal initialized successfully.');
});

// Setup additional button handlers
function setupAdditionalHandlers() {
    // Stats button
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', showStats);
    }
    
    // Test providers button
    const testProvidersBtn = document.getElementById('testProvidersBtn');
    if (testProvidersBtn) {
        testProvidersBtn.addEventListener('click', testProviders);
    }
    
    // Working directory button
    const workDirBtn = document.getElementById('workDirBtn');
    if (workDirBtn) {
        workDirBtn.addEventListener('click', showWorkingDirectoryModal);
    }
}
