document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailElement = document.getElementById('user-email');
    const bgVideo = document.getElementById('bg-video');
    const gifFallback = document.getElementById('gif-fallback');
    const downloadButton = document.querySelector('.download-button');

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

    if (downloadButton) {
        downloadButton.addEventListener('click', function (e) {
            console.log('Downloading database list...');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            try {
                const button = logoutBtn;
                button.textContent = 'Logging out...';
                button.disabled = true;

                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (e) {
                console.error('Logout error:', e);
                window.location.href = '/';
            }
        });
    }

    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (!data.authenticated) {
                window.location.href = '/';
                return;
            }

            if (userEmailElement && data.email) {
                userEmailElement.textContent = data.email;
            }

            initBackground();
        } catch (e) {
            console.error('Status check error:', e);
            window.location.href = '/';
        }
    }

    checkStatus();
});