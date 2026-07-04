// ===== State Management =====
const state = {
    currentTab: 'search',
    chatHistory: [],
    isLoading: false,
    availableFiles: [],
    selectedFile: null
};

// ===== DOM Elements =====
const elements = {
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Search
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    topKSelect: document.getElementById('top-k-select'),
    searchResults: document.getElementById('search-results'),
    
    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    useRagCheckbox: document.getElementById('use-rag'),
    exampleBtns: document.querySelectorAll('.example-btn'),
    fileSelect: document.getElementById('file-select'),
    manageFilesBtn: document.getElementById('manage-files-btn'),
    
    // Modal (kept for compatibility, though hidden in new UI)
    fileModal: document.getElementById('file-modal'),
    closeModal: document.getElementById('close-modal'),
    uploadBox: document.getElementById('upload-box'),
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    filesList: document.getElementById('files-list'),
    uploadProgress: document.getElementById('upload-progress'),
    
    // Loading
    loadingOverlay: document.getElementById('loading-overlay')
};

// ===== API Functions =====
const API = {
    baseURL: (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? window.location.origin 
        : 'https://rag-based-research-paper-search.onrender.com',
    
    async search(query, topK = 5) {
        const response = await fetch(`${this.baseURL}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK })
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        return await response.json();
    },
    
    async chat(message, useRag = true, topK = 3, selectedFile = null) {
        const response = await fetch(`${this.baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                use_rag: useRag,
                top_k: topK,
                selected_file: selectedFile
            })
        });
        
        if (!response.ok) {
            throw new Error('Chat failed');
        }
        
        return await response.json();
    },
    
    async clearChat() {
        const response = await fetch(`${this.baseURL}/api/chat/clear`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Clear chat failed');
        }
        
        return await response.json();
    },
    
    async getFiles() {
        const response = await fetch(`${this.baseURL}/api/files`);
        
        if (!response.ok) {
            throw new Error('Failed to get files');
        }
        
        return await response.json();
    },
    
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}/api/files/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('File upload failed');
        }
        
        return await response.json();
    },
    
    async processFile(filename) {
        const response = await fetch(`${this.baseURL}/api/files/process/${encodeURIComponent(filename)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('File processing failed');
        }
        
        return await response.json();
    }
};

// ===== UI Functions =====
const UI = {
    showLoading() {
        elements.loadingOverlay.classList.add('active');
        state.isLoading = true;
    },
    
    hideLoading() {
        elements.loadingOverlay.classList.remove('active');
        state.isLoading = false;
    },
    
    showChatTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-msg';
        typingDiv.innerHTML = `
            <div class="message-avatar"><span class="material-symbols-outlined">smart_toy</span></div>
            <div class="message-content">
                <div class="message-bubble typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        elements.chatMessages.appendChild(typingDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        state.isLoading = true;
    },
    
    hideChatTyping() {
        const typingMsg = elements.chatMessages.querySelector('.typing-msg');
        if (typingMsg) {
            typingMsg.remove();
        }
        state.isLoading = false;
    },
    
    showError(message) {
        this.showNotification(message, 'error');
    },
    
    switchTab(tabName) {
        // Update nav buttons
        elements.navBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab contents
        elements.tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        state.currentTab = tabName;

        // Custom Title Updates for Redesign
        const titleEl = document.getElementById('active-tab-title');
        const subtitleEl = document.getElementById('active-tab-subtitle');
        const clearBtn = document.getElementById('clear-chat-btn');
        
        if (tabName === 'search') {
            if (titleEl) titleEl.textContent = 'Semantic Search';
            if (subtitleEl) subtitleEl.textContent = 'Search research papers by meaning, not just keywords';
            if (clearBtn) clearBtn.style.display = 'none';
        } else if (tabName === 'chat') {
            if (titleEl) titleEl.textContent = 'AI Research Assistant';
            if (subtitleEl) subtitleEl.textContent = 'Ask questions about research papers and AI topics';
            if (clearBtn) clearBtn.style.display = 'inline-flex';
        }
    },
    
    renderSearchResults(results) {
        if (!results || results.length === 0) {
            elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">search</span>
                    <h3>No results found</h3>
                    <p>Try a different conceptual query or check database status</p>
                </div>
            `;
            return;
        }
        
        const html = results.map((result, index) => {
            const similarity = (result.similarity * 100).toFixed(1);
            const fileName = result.source.split('/').pop().split('\\').pop();
            
            return `
                <div class="result-card">
                    <div class="result-header">
                        <span class="result-number">Match Rank ${index + 1}</span>
                        <span class="similarity-badge">
                            <span class="material-symbols-outlined">analytics</span>
                            ${similarity}% Semantic Similarity
                        </span>
                    </div>
                    <div class="result-source">
                        <span class="material-symbols-outlined">menu_book</span>
                        <span>${fileName}</span>
                    </div>
                    <div class="result-content">
                        ${result.content}
                    </div>
                </div>
            `;
        }).join('');
        
        elements.searchResults.innerHTML = html;
    },
    
    addChatMessage(role, content, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' 
            ? '<span class="material-symbols-outlined">person</span>' 
            : '<span class="material-symbols-outlined">smart_toy</span>';
        
        let metaHtml = '';
        if (metadata.contextUsed) {
            let sourcesHtml = '';
            if (metadata.sources && metadata.sources.length > 0) {
                sourcesHtml = `
                    <div class="source-tags">
                        ${metadata.sources.map(source => {
                            const cleanName = source.split('/').pop().split('\\').pop();
                            return `<span class="source-tag">
                                <span class="material-symbols-outlined">picture_as_pdf</span>
                                <span>${cleanName}</span>
                            </span>`;
                        }).join('')}
                    </div>
                `;
            }
            
            metaHtml = `
                <div class="message-meta">
                    <span class="context-badge">
                        <span class="material-symbols-outlined">auto_stories</span>
                        RAG Augmentation
                    </span>
                    <span>${metadata.model || ''}</span>
                </div>
                ${sourcesHtml}
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${this.formatMessage(content)}</div>
                ${metaHtml}
            </div>
        `;
        
        // Remove welcome message if exists
        const welcomeMsg = elements.chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },
    
    formatMessage(text) {
        // Convert markdown-style formatting
        return text
            .replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass); margin: 0.5rem 0; overflow-x: auto; font-family: monospace;"><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 0.1rem 0.35rem; border-radius: 4px; font-family: monospace; color: var(--accent-cyan);">$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },
    
    clearChatMessages() {
        elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="bot-avatar-large">
                    <span class="material-symbols-outlined">smart_toy</span>
                </div>
                <h3>AI Research Assistant</h3>
                <p>I can help you understand research papers, summarize complex theories, and synthesize information from your uploaded library.</p>
                <div class="example-questions">
                    <span class="example-title">Quick Prompts:</span>
                    <button class="example-btn">Explain the attention mechanism in Transformers</button>
                    <button class="example-btn">What are the primary contributions of ResNet?</button>
                    <button class="example-btn">How does contrastive learning work in computer vision?</button>
                </div>
            </div>
        `;
        
        // Re-attach event listeners to new example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.chatInput.value = btn.textContent;
                elements.chatInput.focus();
            });
        });
    },
    
    showModal() {
        // For compatibility with app.js flow, we just refresh library files
        this.loadFiles();
    },
    
    hideModal() {
        // Compat placeholder
    },
    
    async loadFiles() {
        try {
            elements.filesList.innerHTML = '<p class="loading-text">Loading library...</p>';
            
            const response = await API.getFiles();
            state.availableFiles = response.files;
            
            this.renderFilesList();
            this.updateFileSelect();
        } catch (error) {
            elements.filesList.innerHTML = '<p class="loading-text">Error loading papers</p>';
            console.error('Error loading files:', error);
        }
    },
    
    renderFilesList() {
        if (!state.availableFiles || state.availableFiles.length === 0) {
            elements.filesList.innerHTML = `
                <div class="empty-state" style="padding: 1.5rem 1rem;">
                    <span class="material-symbols-outlined" style="font-size: 2.25rem;">description</span>
                    <h3 style="font-size: 1rem;">No papers found</h3>
                    <p style="font-size: 0.75rem;">Drag & drop a PDF above to start building your library</p>
                </div>
            `;
            return;
        }
        
        const html = state.availableFiles.map(file => {
            const sizeKB = Math.round(file.size / 1024);
            const badgeClass = file.type === 'uploaded' ? 'uploaded' : '';
            const isActive = state.selectedFile === file.name ? 'active' : '';
            
            return `
                <div class="file-item ${isActive}" data-filename="${file.name}">
                    <div class="file-info">
                        <span class="material-symbols-outlined file-icon">picture_as_pdf</span>
                        <div class="file-details">
                            <div class="file-name" title="${file.name}">${file.name}</div>
                            <div class="file-meta">
                                <span><span class="material-symbols-outlined">scale</span> ${sizeKB} KB</span>
                                <span class="file-badge ${badgeClass}">
                                    ${file.type === 'uploaded' ? 'Uploaded' : 'Stored'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="file-actions">
                        ${file.type === 'uploaded' ? `
                            <button class="btn btn-secondary btn-xs process-file-btn" data-filename="${file.name}">
                                <span class="material-symbols-outlined">settings</span>
                                <span>Process</span>
                            </button>
                        ` : `
                            <span class="material-symbols-outlined" style="color:var(--success-color); font-size: 1.15rem; margin-top: 2px;" title="Fully Indexed">check_circle</span>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        elements.filesList.innerHTML = html;
        
        // Add card selection listeners (clicking selects/deselects focus file)
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.process-file-btn')) {
                    return;
                }
                const filename = item.dataset.filename;
                if (state.selectedFile === filename) {
                    this.selectFile(null);
                } else {
                    this.selectFile(filename);
                }
            });
        });
        
        document.querySelectorAll('.process-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filename = btn.dataset.filename;
                this.processFile(filename);
            });
        });
    },
    
    updateFileSelect() {
        const select = elements.fileSelect;
        select.innerHTML = '<option value="">All papers</option>';
        
        state.availableFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            select.appendChild(option);
        });
        
        if (state.selectedFile) {
            select.value = state.selectedFile;
        }
    },
    
    selectFile(filename) {
        state.selectedFile = filename;
        elements.fileSelect.value = filename || '';
        
        // Refresh display highlights
        this.renderFilesList();
        
        if (filename) {
            this.showNotification(`Focused focus: ${filename}`, 'success');
        } else {
            this.showNotification('Focus cleared: Searching all papers', 'info');
        }
    },
    
    async processFile(filename) {
        try {
            UI.showLoading();
            const result = await API.processFile(filename);
            
            this.showNotification(
                `Processed ${filename}: ${result.chunks_inserted} vector chunks created`, 
                'success'
            );
            
            this.loadFiles(); // Refresh file list
        } catch (error) {
            this.showNotification(`Error processing ${filename}: ${error.message}`, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check_circle';
        if (type === 'error') icon = 'error';
        
        notification.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => notification.classList.add('show'), 50);
        
        // Remove after 3.5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, 3500);
    }
};

// ===== Event Handlers =====
const handlers = {
    async handleSearch() {
        const query = elements.searchInput.value.trim();
        
        if (!query) {
            UI.showError('Please enter a semantic search term');
            return;
        }
        
        const topK = parseInt(elements.topKSelect.value);
        
        try {
            UI.showLoading();
            const results = await API.search(query, topK);
            UI.renderSearchResults(results);
        } catch (error) {
            UI.showError(error.message);
        } finally {
            UI.hideLoading();
        }
    },
    
    async handleChat() {
        const message = elements.chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        const useRag = elements.useRagCheckbox.checked;
        const selectedFile = elements.fileSelect.value;
        
        // Add user message to UI
        UI.addChatMessage('user', message);
        
        // Clear input
        elements.chatInput.value = '';
        elements.chatInput.style.height = 'auto';
        
        try {
            UI.showChatTyping();
            const response = await API.chat(message, useRag, 3, selectedFile);
            
            UI.hideChatTyping();
            UI.addChatMessage('assistant', response.response, {
                contextUsed: response.context_used,
                model: response.model,
                sources: response.sources
            });
            
            state.chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response.response }
            );
        } catch (error) {
            UI.hideChatTyping();
            UI.showError(error.message);
            UI.addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            state.isLoading = false;
        }
    },
    
    async handleClearChat() {
        if (!confirm('Are you sure you want to clear the assistant chat history?')) {
            return;
        }
        
        try {
            await API.clearChat();
            UI.clearChatMessages();
            state.chatHistory = [];
            this.showNotification('Chat history cleared', 'success');
        } catch (error) {
            UI.showError(error.message);
        }
    },
    
    handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            UI.showError('Please select a PDF research document');
            return;
        }
        
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            UI.showError('File size limits are 50MB maximum');
            return;
        }
        
        this.uploadFile(file);
    },
    
    async uploadFile(file) {
        try {
            // Show upload progress
            elements.uploadProgress.style.display = 'block';
            const progressFill = elements.uploadProgress.querySelector('.progress-fill');
            const progressText = elements.uploadProgress.querySelector('.progress-text');
            
            progressText.textContent = 'Uploading...';
            progressFill.style.width = '30%';
            
            const result = await API.uploadFile(file);
            
            progressFill.style.width = '100%';
            progressText.textContent = 'Upload complete!';
            
            UI.showNotification(`Uploaded: ${result.filename}`, 'success');
            
            // Refresh files list
            UI.loadFiles();
            
            // Hide progress after delay
            setTimeout(() => {
                elements.uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 2000);
            
        } catch (error) {
            elements.uploadProgress.style.display = 'none';
            UI.showError(`Upload failed: ${error.message}`);
        }
    }
};

// ===== Event Listeners =====
function initEventListeners() {
    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            UI.switchTab(btn.dataset.tab);
        });
    });
    
    // Search
    elements.searchBtn.addEventListener('click', handlers.handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handlers.handleSearch();
        }
    });
    
    // Chat
    elements.sendBtn.addEventListener('click', handlers.handleChat);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlers.handleChat();
        }
    });
    
    // Synchronize selector drop down change with sidebar active highlight
    elements.fileSelect.addEventListener('change', (e) => {
        state.selectedFile = e.target.value || null;
        UI.renderFilesList();
    });
    
    // Auto-resize textarea
    elements.chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    elements.clearChatBtn.addEventListener('click', () => handlers.handleClearChat());
    
    // File management
    elements.manageFilesBtn.addEventListener('click', () => UI.showModal());
    elements.closeModal.addEventListener('click', () => UI.hideModal());
    
    // Modal close on backdrop click
    elements.fileModal.addEventListener('click', (e) => {
        if (e.target === elements.fileModal) {
            UI.hideModal();
        }
    });
    
    // File upload
    elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });
    elements.fileInput.addEventListener('change', (e) => {
        handlers.handleFileUpload(e.target.files);
        e.target.value = '';
    });
    
    // Drag and drop
    elements.uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadBox.classList.add('drag-over');
    });
    
    elements.uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.uploadBox.classList.remove('drag-over');
    });
    
    elements.uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadBox.classList.remove('drag-over');
        handlers.handleFileUpload(e.dataTransfer.files);
    });
    
    elements.uploadBox.addEventListener('click', (e) => {
        if (e.target !== elements.fileInput && e.target !== elements.browseBtn) {
            elements.fileInput.click();
        }
    });
    
    // Example questions
    elements.exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.chatInput.value = btn.textContent;
            elements.chatInput.focus();
        });
    });
}

// ===== Initialize App =====
function init() {
    initEventListeners();
    
    // Load available files on startup
    UI.loadFiles().catch(console.error);
    
    console.log('Research AI Assistant initialized');
    
    // Show initialization message
    const initMsg = document.createElement('div');
    initMsg.className = 'notification notification-info show';
    initMsg.style.bottom = '2rem';
    initMsg.style.right = '2rem';
    initMsg.innerHTML = `
        <span class="material-symbols-outlined">online_prediction</span>
        <span>Research AI Ready!</span>
    `;
    document.body.appendChild(initMsg);
    
    setTimeout(() => {
        initMsg.classList.remove('show');
        setTimeout(() => initMsg.remove(), 400);
    }, 2500);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
