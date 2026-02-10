document.addEventListener('DOMContentLoaded', function () {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatHistory = document.getElementById('chatHistory');
    const emptyChatState = document.getElementById('emptyChatState');
    const bgVideo = document.getElementById('bg-video');
    const gifFallback = document.getElementById('gif-fallback');
    const userEmailElement = document.getElementById('user-email');

    const AI_CONFIG = {
        endpoint: '/api/ai/chat',
        maxHistoryLength: 10,
        timeout: 30000
    };

    let currentChatId = 'current';
    let chats = {};

    function initBackground() {
        if (!bgVideo || !gifFallback) return;

        bgVideo.style.display = 'block';
        bgVideo.play().catch(function (error) {
            bgVideo.style.display = 'none';
            gifFallback.style.display = 'block';
        });

        bgVideo.addEventListener('error', function () {
            bgVideo.style.display = 'none';
            gifFallback.style.display = 'block';
        });

        createFloatingStars();
    }

    function createFloatingStars() {
        const container = document.querySelector('.chat-messages');
        if (!container) return;

        const starsContainer = document.createElement('div');
        starsContainer.className = 'floating-stars';

        for (let i = 0; i < 15; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            starsContainer.appendChild(star);
        }

        container.appendChild(starsContainer);
    }

    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    }

    function createMessageElement(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;

        const glowDiv = document.createElement('div');
        glowDiv.className = type === 'ai' ? 'ai-glow' : 'user-glow';
        messageDiv.appendChild(glowDiv);

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        if (type === 'user') {
            const userImg = document.createElement('img');
            userImg.src = '/onion.jpg';
            userImg.alt = 'User';
            userImg.className = 'avatar-image';
            avatarDiv.appendChild(userImg);
        } else {
            const aiImg = document.createElement('img');
            aiImg.src = '/celestial-ai/bot.jpg';
            aiImg.alt = 'AI';
            aiImg.className = 'avatar-image';
            avatarDiv.appendChild(aiImg);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (type === 'ai') {
            contentDiv.innerHTML = formatAIText(message.content);
        } else {
            contentDiv.textContent = message.content;
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = message.time || getCurrentTime();

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        return messageDiv;
    }

    function formatAIText(text) {
        if (!text) return '';

        let formatted = text;

        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        formatted = formatted.replace(/\n/g, '<br>');

        formatted = formatted.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*)$/gm, '<h1>$1</h1>');

        formatted = formatted.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

        formatted = formatted.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        formatted = formatted.replace(/\n\s*\n/g, '</p><p>');
        formatted = '<p>' + formatted + '</p>';

        return formatted;
    }

    async function sendToAI(message, history = []) {
        try {
            const response = await fetch(AI_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: history.slice(-AI_CONFIG.maxHistoryLength)
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/';
                    throw new Error('Session expired');
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'AI service error');
            }

            return {
                success: true,
                content: data.message,
                timestamp: data.timestamp
            };

        } catch (error) {
            console.error('AI API Error:', error);
            return {
                success: false,
                content: `Error: ${error.message}. Please try again.`,
                timestamp: new Date().toISOString()
            };
        }
    }

    function addMessageToChat(content, type, metadata = {}) {
        const message = {
            type: type,
            content: content,
            time: getCurrentTime(),
            ...metadata
        };

        if (!chats[currentChatId]) {
            chats[currentChatId] = {
                id: currentChatId,
                title: content.length > 30 ? content.substring(0, 30) + '...' : content,
                messages: [],
                lastActivity: new Date().toISOString()
            };
        }

        chats[currentChatId].messages.push(message);
        chats[currentChatId].lastActivity = new Date().toISOString();

        renderChat(currentChatId);
        saveChatsToStorage();

        return message;
    }

    async function sendMessageToAI() {
        const content = messageInput.value.trim();
        if (!content) return;

        sendButton.disabled = true;
        messageInput.disabled = true;
        sendButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

        addMessageToChat(content, 'user');

        messageInput.value = '';
        autoResizeTextarea();

        typingIndicator.style.display = 'flex';
        scrollToBottom();

        try {
            const currentChat = chats[currentChatId];
            const chatHistory = currentChat ? currentChat.messages : [];

            const aiResult = await sendToAI(content, chatHistory);

            typingIndicator.style.display = 'none';

            addMessageToChat(aiResult.content, 'ai');

            if (currentChat && currentChat.messages.length === 2) {
                updateChatTitle(content);
            }

        } catch (error) {
            console.error('Error in sendMessageToAI:', error);
            typingIndicator.style.display = 'none';
            addMessageToChat(
                `Sorry, I encountered an error: ${error.message}. Please try again or contact support.`,
                'ai'
            );
        } finally {
            sendButton.disabled = false;
            messageInput.disabled = false;
            sendButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            messageInput.focus();
        }
    }

    function renderChat(chatId) {
        const chat = chats[chatId];

        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }

        createFloatingStars();

        if (!chat || chat.messages.length === 0) {
            emptyChatState.style.display = 'flex';
        } else {
            emptyChatState.style.display = 'none';

            chat.messages.forEach(message => {
                const messageElement = createMessageElement(message, message.type);
                chatMessages.appendChild(messageElement);
            });

            addActionButtons();
        }

        scrollToBottom();
        updateChatHistory();
    }

    function addActionButtons() {
        const lastAiMessage = chatMessages.querySelector('.message-ai:last-child');
        if (!lastAiMessage) return;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn copy-btn';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg> Copy';
        copyBtn.onclick = () => {
            const content = lastAiMessage.querySelector('.message-content').textContent;
            navigator.clipboard.writeText(content);
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg> Copy';
            }, 2000);
        };

        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'action-btn regenerate-btn';
        regenerateBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Regenerate';
        regenerateBtn.onclick = async () => {
            const lastUserMessage = chatMessages.querySelector('.message-user:last-child');
            if (lastUserMessage) {
                const userContent = lastUserMessage.querySelector('.message-content').textContent;
                messageInput.value = userContent;
                autoResizeTextarea();
                await sendMessageToAI();
            }
        };

        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(regenerateBtn);

        lastAiMessage.parentNode.insertBefore(actionsDiv, lastAiMessage.nextSibling);
    }

    function saveChatsToStorage() {
        try {
            const chatArray = Object.values(chats);
            chatArray.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

            const chatsToSave = {};
            chatArray.slice(0, 20).forEach(chat => {
                chatsToSave[chat.id] = chat;
            });

            localStorage.setItem('celestial_ai_chats', JSON.stringify(chatsToSave));
        } catch (e) {
            console.error('Error saving chats:', e);
        }
    }

    function loadChatsFromStorage() {
        try {
            const saved = localStorage.getItem('celestial_ai_chats');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    chats = parsed;

                    if (chats[currentChatId]) {
                        renderChat(currentChatId);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading chats:', e);
        }
    }

    function getCurrentTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0');
    }

    function formatChatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return diffDays + ' days ago';
        if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function scrollToBottom() {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }

    function updateChatHistory() {
        while (chatHistory.children.length > 0) {
            chatHistory.removeChild(chatHistory.firstChild);
        }

        const sortedChats = Object.values(chats).sort((a, b) =>
            new Date(b.lastActivity) - new Date(a.lastActivity)
        );

        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
            chatItem.dataset.chatId = chat.id;

            const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            iconSvg.setAttribute('class', 'chat-icon');
            iconSvg.setAttribute('viewBox', '0 0 24 24');

            const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            iconPath.setAttribute('d', 'M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z');
            iconPath.setAttribute('fill', 'none');
            iconPath.setAttribute('stroke', 'currentColor');
            iconPath.setAttribute('stroke-width', '1.5');

            iconSvg.appendChild(iconPath);

            const previewDiv = document.createElement('div');
            previewDiv.className = 'chat-preview';
            previewDiv.textContent = chat.title;

            const dateDiv = document.createElement('div');
            dateDiv.className = 'chat-date';
            dateDiv.textContent = formatChatDate(chat.lastActivity);

            chatItem.appendChild(iconSvg);
            chatItem.appendChild(previewDiv);
            chatItem.appendChild(dateDiv);

            chatItem.addEventListener('click', () => {
                switchToChat(chat.id);
            });

            chatHistory.appendChild(chatItem);
        });
    }

    function switchToChat(chatId) {
        currentChatId = chatId;
        renderChat(chatId);
    }

    function createNewChat() {
        const newChatId = 'chat_' + Date.now();
        currentChatId = newChatId;

        chats[newChatId] = {
            id: newChatId,
            title: 'New Chat',
            messages: [],
            lastActivity: new Date().toISOString()
        };

        renderChat(newChatId);
        messageInput.focus();
    }

    function updateChatTitle(firstMessage) {
        if (!chats[currentChatId]) return;

        let title = firstMessage.trim();
        if (title.length > 30) {
            title = title.substring(0, 30) + '...';
        }

        chats[currentChatId].title = title;
        updateChatHistory();
    }

    async function processQueryFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');

        if (query && query.trim()) {
            messageInput.value = query.trim();
            await sendMessageToAI();

            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    async function checkAuth() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (!data.authenticated) {
                window.location.href = '/';
            } else {
                userEmailElement.textContent = data.email || 'user@celestial.com';
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    function init() {
        initBackground();
        loadChatsFromStorage();
        renderChat(currentChatId);

        messageInput.addEventListener('input', autoResizeTextarea);

        chatForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await sendMessageToAI();
        });

        messageInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });

        newChatBtn.addEventListener('click', createNewChat);

        messageInput.focus();

        checkAuth().then(() => {
            processQueryFromURL();
        });

        console.log('Celestial AI initialized');
    }

    init();
});