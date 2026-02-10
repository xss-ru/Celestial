document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('login-screen');
    const blockScreen = document.getElementById('block-screen');
    const contentScreen = document.getElementById('content-screen');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailElement = document.getElementById('user-email');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const bgVideo = document.getElementById('bg-video');
    const gifFallback = document.getElementById('gif-fallback');
    const mainSearchForm = document.querySelector('.minimal-search-form');
    const mainSearchInput = document.querySelector('.minimal-search-input');

    const loggedInElements = document.querySelectorAll('.logged-in-only');

    loginScreen.style.display = 'flex';
    blockScreen.style.display = 'none';
    contentScreen.style.display = 'none';
    errorMessage.style.display = 'none';
    loggedInElements.forEach(el => el.style.display = 'none');
    if (welcomeOverlay) welcomeOverlay.style.display = 'none';

    function initBackground() {
        if (!bgVideo || !gifFallback) return;

        bgVideo.style.display = 'block';

        bgVideo.addEventListener('error', function () {
            bgVideo.style.display = 'none';
            gifFallback.style.display = 'block';
        });

        bgVideo.play().catch(function (error) {
            bgVideo.style.display = 'none';
            gifFallback.style.display = 'block';
        });
    }

    async function login(email, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                userEmailElement.textContent = email;
                showContentScreen();
                showWelcomeMessage();
                errorMessage.style.display = 'none';
                return true;
            } else {
                showError(data.message || 'Invalid email or password');
                showBlock(10);
                return false;
            }
        } catch (error) {
            showError('Network error');
            showBlock(5);
            return false;
        }
    }

    function showLoggedInElements() {
        loggedInElements.forEach(element => {
            element.style.display = 'block';
            element.style.opacity = '0';
        });

        const siteName = document.querySelector('.site-name-container');
        const searchBar = document.querySelector('.search-bar-container');
        const logoutButton = document.querySelector('.logout-button');

        if (siteName) {
            siteName.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                siteName.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                siteName.style.opacity = '1';
                siteName.style.transform = 'translateX(-50%) translateY(0)';
            }, 200);
        }

        if (searchBar) {
            searchBar.style.transform = 'translate(-50%, -10px)';
            setTimeout(() => {
                searchBar.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                searchBar.style.opacity = '1';
                searchBar.style.transform = 'translate(-50%, 0)';
            }, 500);
        }

        if (logoutButton) {
            setTimeout(() => {
                logoutButton.style.transition = 'opacity 0.5s ease';
                logoutButton.style.opacity = '1';
            }, 800);
        }
    }

    function showWelcomeMessage() {
        if (welcomeOverlay) {
            welcomeOverlay.style.display = 'flex';
            setTimeout(() => {
                welcomeOverlay.style.display = 'none';
                showLoggedInElements();
            }, 3500);
        } else {
            showLoggedInElements();
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function showContentScreen() {
        loginScreen.style.display = 'none';
        blockScreen.style.display = 'none';
        contentScreen.style.display = 'block';
        initBackground();
    }

    function showLoginScreen() {
        contentScreen.style.display = 'none';
        blockScreen.style.display = 'none';
        loginScreen.style.display = 'flex';

        loggedInElements.forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
            el.style.transition = 'none';
        });

        if (welcomeOverlay) welcomeOverlay.style.display = 'none';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        errorMessage.style.display = 'none';
    }

    function showBlock(seconds) {
        let timeLeft = seconds;
        document.getElementById('countdown').textContent = timeLeft;

        loginScreen.style.display = 'none';
        blockScreen.style.display = 'flex';

        const interval = setInterval(() => {
            timeLeft--;
            document.getElementById('countdown').textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(interval);
                showLoginScreen();
            }
        }, 1000);
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        const button = loginForm.querySelector('button');
        button.disabled = true;
        button.textContent = 'Checking...';

        const success = await login(email, password);

        button.disabled = false;
        button.textContent = 'Login';
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            try {
                const button = logoutBtn;
                button.textContent = 'Logging out...';
                button.disabled = true;

                await fetch('/api/logout', { method: 'POST' });
                showLoginScreen();
            } catch (e) {
                console.error('Logout error:', e);
                showLoginScreen();
            }
        });
    }

    if (mainSearchForm) {
        mainSearchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const query = mainSearchInput.value.trim();
            if (query) {
                window.location.href = `/celestial-ai?query=${encodeURIComponent(query)}`;
            }
        });
    }

    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (data.authenticated) {
                userEmailElement.textContent = data.email || 'user@celestial.com';
                showContentScreen();
                showLoggedInElements();
            }
        } catch (e) {
            console.error('Status check error:', e);
        }
    }

    checkStatus();
});