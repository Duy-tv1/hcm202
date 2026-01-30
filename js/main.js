// Initialize
(function() {

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] DOMContentLoaded fired');
    
    // Initialize 3D particle engine
    setTimeout(() => {
        if (typeof window.initParticles === 'function') {
            window.initParticles();
            console.log('[Main] Particles initialized');
        } else {
            console.error('[Main] initParticles not found');
        }
    }, 100);
    
    // Start Controller (Video/Gestures) - From gestures.js
    try {
        const controller = new window.GestureController((gesture) => {
            handleGestureCommand(gesture);
        });
        console.log('[Main] GestureController initialized');
        
        // Auto-start or Button-start
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                console.log('[Main] Kích hoạt camera');
                controller.start();
                startBtn.classList.add('hidden');
                
                // Show camera UI elements
                if (typeof window.showCameraUI === 'function') {
                    window.showCameraUI();
                }
                
                // Remove from DOM flow after transition
                setTimeout(() => {
                    startBtn.style.display = 'none';
                }, 300);
            };
        }
    } catch (e) {
        console.error('[Main] Error:', e);
    }
});

function handleGestureCommand(gesture) {
    console.log('[Main] Gesture detected:', gesture, 'Current mode:', window.currentMode);
    
    // Khi đang ở trong content mode (xem slide)
    if (window.currentMode === 'content') {
        console.log('[Main] Đang xem slide');
        
        // Tay phải = slide sau
        if (gesture === 'nav_next') {
            console.log('[Main] Slide sau (tay phải)');
            if (window.slideManager) {
                window.slideManager.nextSlide();
            }
            return;
        }
        
        // Tay trái = slide trước
        if (gesture === 'nav_prev') {
            console.log('[Main] Slide trước (tay trái)');
            if (window.slideManager) {
                window.slideManager.previousSlide();
            }
            return;
        }
        
        // Cả 2 tay = thoát mode
        if (gesture === 'toggle_canva') {
            console.log('[Main] Thoát khỏi mode slide (cả 2 tay)');
            window.closeMode();
        }
        return;
    }
    
    // Khi đang ở trong game mode
    if (window.currentMode === 'game') {
        console.log('[Main] Đang ở trong game');
        
        // Chỉ cả 2 tay mới thoát mode
        if (gesture === 'toggle_canva') {
            console.log('[Main] Thoát khỏi game (cả 2 tay)');
            window.closeMode();
        }
        // Các gesture khác bị ignore
        return;
    }
    
    // Khi không ở trong mode nào, có thể mở mode
    // Tay trái = mở Nội dung (Slides)
    if (gesture === 'nav_prev') {
        console.log('[Main] Mở Nội Dung (tay trái)');
        window.openMode('content');
        return;
    }
    
    // Tay phải = mở Trò chơi
    if (gesture === 'nav_next') {
        console.log('[Main] Mở Trò Chơi (tay phải)');
        window.openMode('game');
        return;
    }
}

// Export for use from other scripts
window.handleGestureCommand = handleGestureCommand;

})();
