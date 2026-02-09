document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('login-screen');
    const blockScreen = document.getElementById('block-screen');
    const contentScreen = document.getElementById('content-screen');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailElement = document.getElementById('user-email');

    loginScreen.style.display = 'flex';
    blockScreen.style.display = 'none';
    contentScreen.style.display = 'none';
    errorMessage.style.display = 'none';

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
                errorMessage.style.display = 'none';
            } else {
                showError(data.message || 'login error');
                showBlock(10);
            }
        } catch (error) {
            showError('network error');
            showBlock(10);
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function showContentScreen() {
        loginScreen.style.display = 'none';
        blockScreen.style.display = 'none';
        contentScreen.style.display = 'flex';
        initMap();
    }

    function showLoginScreen() {
        contentScreen.style.display = 'none';
        blockScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
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

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            showError('fill all fields');
            return;
        }

        const button = loginForm.querySelector('button');
        button.disabled = true;
        button.textContent = 'logging in...';

        login(email, password).finally(() => {
            button.disabled = false;
            button.textContent = 'login';
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            try {
                const button = logoutBtn;
                button.textContent = 'logging out...';
                button.disabled = true;

                await fetch('/api/logout', { method: 'POST' });
                showLoginScreen();
            } catch (e) {
                showLoginScreen();
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
            }
        } catch (e) {
            console.log('Status check error:', e);
        }
    }

    function initMap() {
        if (!document.getElementById('map')) return;

        const map = L.map('map', {
            center: [55.7558, 37.6176],
            zoom: 5,
            minZoom: 2,
            maxZoom: 18,
            zoomControl: false,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: ''
        }).addTo(map);

        const customControl = L.control({ position: 'bottomright' });
        customControl.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'custom-control');
            div.innerHTML = 'CELESTIAL MAP';
            div.style.cssText = 'background: #000000; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 600; border: 1px solid #333333; letter-spacing: 1px;';
            return div;
        };
        customControl.addTo(map);
    }

    checkStatus();
});