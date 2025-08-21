// API communication functions
import { getSessionInfo } from './handlers.js';

// Fetch tools list
export function fetchToolsList() {
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

// Fetch conversation history
export function fetchConversationHistory() {
    fetch('/api/history')
        .then(response => response.json())
        .then(data => {
            if (typeof window.displayConversationHistory === 'function') {
                window.displayConversationHistory(data.history);
            }
        })
        .catch(error => {
            console.error('Error fetching conversation history:', error);
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('Failed to load conversation history', 'error');
            }
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
    
    const toolsList = document.getElementById('toolsList');
    toolsList.innerHTML = '';
    
    // Create category sections
    Object.entries(categories).forEach(([category, categoryTools]) => {
        // Filter tools that are available
        const availableTools = categoryTools.filter(tool => tools.includes(tool));
        
        if (availableTools.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'tool-category';
            categoryDiv.innerHTML = `
                <div class="tool-category-title">${category}</div>
                <ul class="tool-list">
                    ${availableTools.map(tool => `<li>${tool}</li>`).join('')}
                </ul>
            `;
            
            toolsList.appendChild(categoryDiv);
        }
    });
}

// Show stats
export function showStats() {
    // Show modal
    const statsModal = bootstrap.Modal.getInstance(document.getElementById('statsModal')) || 
                       new bootstrap.Modal(document.getElementById('statsModal'));
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
export function displayStats(data) {
    const sessionInfo = getSessionInfo();
    const modalBody = document.getElementById('statsModalBody');
    
    if (!sessionInfo) {
        modalBody.innerHTML = `<div class="alert alert-warning">Session information not available</div>`;
        return;
    }
    
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
export function testProviders() {
    // Show modal
    const providerTestModal = bootstrap.Modal.getInstance(document.getElementById('providerTestModal')) || 
                               new bootstrap.Modal(document.getElementById('providerTestModal'));
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
export function displayProviderTests(data) {
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

// Get working directory
export function getWorkingDirectory() {
    return fetch('/api/working-directory')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.directory;
            } else {
                throw new Error(data.error || 'Failed to get working directory');
            }
        });
}

// Change working directory
export function changeWorkingDirectory(directory) {
    return fetch('/api/change-working-directory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ directory })
    })
    .then(response => response.json());
}

// Get list of directories
export function getDirectoryList(path = '') {
    // For empty paths, just request root
    if (!path) {
        return fetch('/api/list-directories')
            .then(response => response.json());
    }
    
    // For absolute paths that would already contain the working directory,
    // we need to use them directly
    const queryParams = `?path=${encodeURIComponent(path)}`;
    return fetch(`/api/list-directories${queryParams}`)
        .then(response => response.json());
}

// Show working directory modal
export function showWorkingDirectoryModal() {
    // Show modal
    const workDirModal = bootstrap.Modal.getInstance(document.getElementById('workDirModal')) || 
                         new bootstrap.Modal(document.getElementById('workDirModal'));
    workDirModal.show();
    
    // Get current working directory
    getWorkingDirectory()
        .then(directory => {
            document.getElementById('currentWorkDir').value = directory;
            document.getElementById('newWorkDir').value = directory;
            // Hide any previous results
            const resultEl = document.getElementById('workDirResult');
            resultEl.classList.add('d-none');
            
            // Load directory list
            loadDirectoryList(directory);
        })
        .catch(error => {
            // Show error
            const resultEl = document.getElementById('workDirResult');
            resultEl.textContent = `Error: ${error.message}`;
            resultEl.classList.remove('d-none', 'alert-success');
            resultEl.classList.add('alert-danger');
        });
}

// Load directory list
export function loadDirectoryList(path = '') {
    const directoryList = document.getElementById('directoryList');
    const currentBrowserPath = document.getElementById('currentBrowserPath');
    
    // Show loading
    directoryList.innerHTML = `
        <div class="list-group-item text-center">
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="ms-2">Loading directories...</span>
        </div>
    `;
    
    // For debugging
    console.log(`Loading directory: '${path}'`);
    
    // Update path display - show simplified path
    const displayPath = path || 'Root Directory';
    currentBrowserPath.textContent = displayPath;
    
    // Load directories
    getDirectoryList(path)
        .then(result => {
            if (result.success) {
                // Store the working directory in a data attribute for easier reference
                if (result.absoluteWorkingDir) {
                    currentBrowserPath.dataset.workingDir = result.absoluteWorkingDir;
                    console.log(`Stored working directory: ${result.absoluteWorkingDir}`);
                }
                
                // Update path display with actual result path
                const displayPath = result.path === '.' ? 'Root Directory' : result.path;
                currentBrowserPath.textContent = displayPath;
                
                // For debugging
                console.log(`Directory listing successful:`);
                console.log(`- Request path: '${result.requestPath}'`);
                console.log(`- Working directory: '${result.absoluteWorkingDir}'`);
                console.log(`- Normalized path: '${result.path}'`);
                console.log(`- Directories found: ${result.count}`);
                
                // Update directory list with the working directory context
                renderDirectoryList(result.directories, result.path, result.absoluteWorkingDir);
            } else {
                // Show error
                directoryList.innerHTML = `
                    <div class="list-group-item text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error: ${result.error}
                    </div>
                `;
                console.error(`Error listing directory: ${result.error}`);
                
                // On error, clear the stored working directory to avoid issues
                if (currentBrowserPath.dataset.workingDir) {
                    console.log(`Clearing stored working directory due to error`);
                    delete currentBrowserPath.dataset.workingDir;
                }
            }
        })
        .catch(error => {
            // Show error
            directoryList.innerHTML = `
                <div class="list-group-item text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error: ${error.message}
                </div>
            `;
            console.error(`Error in API call: ${error.message}`);
        });
}

// Render directory list
function renderDirectoryList(directories, currentPath, workingDir) {
    const directoryList = document.getElementById('directoryList');
    
    if (directories.length === 0) {
        directoryList.innerHTML = `
            <div class="list-group-item text-muted">
                <i class="bi bi-info-circle me-2"></i>
                No subdirectories found
            </div>
        `;
        return;
    }
    
    // Sort directories alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create directory items
    let html = '';
    directories.forEach(dir => {
        // Construct path safely - always use relative paths
        let dirPath;
        if (currentPath === '.' || currentPath === '') {
            // We're at the root of the working directory
            dirPath = dir.name;
        } else {
            // We're in a subdirectory - make sure to not duplicate path separators
            dirPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${dir.name}`;
        }
        
        html += `
            <button type="button" class="list-group-item list-group-item-action directory-item" data-path="${dirPath}">
                <i class="bi bi-folder me-2"></i>${dir.name}
                <div class="small text-muted">
                    <i class="bi bi-clock me-1"></i>${new Date(dir.lastModified).toLocaleString()}
                </div>
            </button>
        `;
    });
    
    directoryList.innerHTML = html;
    
    // Add click event to directory items
    document.querySelectorAll('.directory-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            // Update both input and navigate
            document.getElementById('newWorkDir').value = path;
            loadDirectoryList(path);
        });
    });
}
