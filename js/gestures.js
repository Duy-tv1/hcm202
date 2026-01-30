(function() {

class GestureController {
    constructor(onGestureDetected) {
        this.onGestureDetected = onGestureDetected; 
        this.videoElement = document.querySelector('.input_video');
        this.canvasElement = document.querySelector('.output_canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        
        // Gesture State
        this.currentGesture = null;
        this.gestureStartTime = 0;
        this.holdDuration = 0; // Instant activation (no hold required)
        this.cooldownEndTime = 0;
        this.gestureEnabled = false; // Disable gestures until camera fully started 
        
        this.hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        // Tối ưu hóa cho độ chính xác cao hơn - Downgrade to Lite for Performance
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 0, // 0 = Lite (Faster), 1 = Full (Slower)
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));
    }

    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            this.videoElement.srcObject = stream;
            
            this.videoElement.onloadeddata = () => {
                this.videoElement.play();
                this.detectLoop();
                
                const btn = document.getElementById('start-btn');
                if(btn) btn.textContent = "Camera (Lite Mode)";
                
                const overlay = document.getElementById('loading-overlay');
                if(overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.style.display = 'none', 500);
                }
                
                // Enable gestures after 2 seconds to avoid false positives on startup
                console.log('[Gestures] Camera started, enabling gesture detection in 2s...');
                setTimeout(() => {
                    this.gestureEnabled = true;
                    console.log('[Gestures] Gesture detection enabled!');
                }, 2000);
            };
        } catch(e) {
            console.error("Camera failed:", e);
            alert("Không thể gởi camera! Hãy kiểm tra quyền truy cập.");
        }
    }

    async detectLoop() {
        // Optimized throttling: Process every 50ms (20 FPS) for better performance
        if (!this.lastDetect || Date.now() - this.lastDetect > 50) {
            if (this.videoElement.readyState === 4) {
                await this.hands.send({image: this.videoElement});
                this.lastDetect = Date.now();
            }
        }
        requestAnimationFrame(() => this.detectLoop());
    }

    detectSingleHandShape(landmarks) {
        const isFingerUp = (tipIdx, pipIdx) => {
            return landmarks[tipIdx].y < landmarks[pipIdx].y;
        };
        
        let fingersUp = 0;
        if (isFingerUp(8, 6)) fingersUp++; // Index
        if (isFingerUp(12, 10)) fingersUp++; // Middle
        if (isFingerUp(16, 14)) fingersUp++; // Ring
        if (isFingerUp(20, 18)) fingersUp++; // Pinky

        // CHỐT CHẶN: Chỉ đếm ngón cái khi 4 ngón kia ĐÃ MỞ (để bắt số 5).
        // Nếu 4 ngón kia chưa mở hết, ta bỏ qua ngón cái để tránh nhiễu (ngón cái hay bị duỗi nhẹ).
        
        let thumbUp = false;
        if (landmarks[4].y < landmarks[3].y) thumbUp = true; 

        if (fingersUp === 4) {
             if (thumbUp) return '5'; // 5 ngón (xòe cả bàn)
             return '4';
        }
        
        if (fingersUp === 3) return '3';
        if (fingersUp === 2) return '2';
        if (fingersUp === 1) return '1';
        
        if (fingersUp === 0) {
             return 'fist'; 
        }

        return 'unknown';
    }

    // Simple single-hand gesture detection only
    detectGesture(results) {
        const hands = results.multiHandLandmarks;
        const handedness = results.multiHandedness;
        
        // 2 tay = thoát
        if (hands && hands.length === 2) {
            return 'toggle_canva';  // 5 ngón (cả 2 tay) -> toggle/exit
        }
        
        // Need at least 1 hand
        if (!hands || hands.length === 0) {
            return 'missing_hand';
        }
        
        // 1 tay = chuyển slide theo vị trí (trái/phải)
        if (hands.length === 1 && handedness && handedness[0]) {
            const label = handedness[0].label;  // "Left" hoặc "Right"
            
            // Tay trái = slide sau
            if (label === 'Left') {
                return 'nav_next';
            }
            // Tay phải = slide trước
            if (label === 'Right') {
                return 'nav_prev';
            }
        }
        
        return 'unknown';
    }

    onResults(results) {
        // Cập nhật canvas kích thước thật (đỡ bị stretch/lệch)
        if (this.canvasElement.width !== this.videoElement.videoWidth) {
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
        }

        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Vẽ ảnh
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Vẽ khung xương tay (Kiểm tra kỹ thư viện để tránh lỗi)
        if (results.multiHandLandmarks) {
            const hasDrawingUtils = (typeof drawConnectors === 'function') && (typeof drawLandmarks === 'function');
            const hasConnections = (typeof HAND_CONNECTIONS !== 'undefined');

            for (const landmarks of results.multiHandLandmarks) {
                if (hasDrawingUtils && hasConnections) {
                    drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FFFF', lineWidth: 2});
                    drawLandmarks(this.canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
                } else {
                    // Fallback nếu thư viện drawing chưa load kịp
                    // Vẽ đơn giản các điểm
                    if (typeof drawLandmarks === 'function') {
                        drawLandmarks(this.canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
                    }
                }
            }
        }
        this.canvasCtx.restore();

        // Xử lý Logic
        let detected = this.detectGesture(results);
        this.processHoldTimer(detected);
    }

    processHoldTimer(gesture) {
        // Don't process if gestures are disabled (startup period)
        if (!this.gestureEnabled) return;
        
        // Cooldown
        if (Date.now() < this.cooldownEndTime) return;

        // Xử lý trạng thái thiếu tay
        if (gesture === 'missing_hand') {
            this.currentGesture = null;
            // Debounce message: only show if persistent? 
            // For now direct feedback is better to guide user.
            this.updateStatus({ state: 'idle', text: 'Đưa bàn tay vào khung hình!' }, true);
            return;
        }

        if (!gesture || gesture === 'unknown') {
            this.currentGesture = null;
            this.updateStatus({ state: 'idle', text: 'Chờ lệnh: ✊ (Neo) + 1,2,3... (Lệnh)' });
            return;
        }

        const now = Date.now();
        if (this.currentGesture !== gesture) {
            this.currentGesture = gesture;
            this.gestureStartTime = now;
            this.updateStatus({ state: 'detecting', text: `Phát hiện: ${gesture}`, progress: 0 });
        } else {
            const elapsed = now - this.gestureStartTime;
            let progress = this.holdDuration > 0 ? (elapsed / this.holdDuration) * 100 : 100;
            progress = Math.min(100, Math.max(0, progress));
            
            // Instant activation if no hold time required
            if (this.holdDuration === 0) {
                this.cooldownEndTime = now + 1500; // Longer cooldown to prevent rapid gestures
                this.onGestureDetected(gesture);
                this.updateStatus({ state: 'success', text: 'KÍCH HOẠT!', progress: 100 });
                setTimeout(() => {
                     this.currentGesture = null; 
                }, 300);
            } else {
                this.updateStatus({ 
                    state: 'holding', 
                    text: `Giữ yên 2s: ${name}`, 
                    progress: progress 
                });

                if (elapsed >= this.holdDuration) {
                    this.cooldownEndTime = now + 500; 
                    this.onGestureDetected(gesture);
                    this.updateStatus({ state: 'success', text: 'KÍCH HOẠT THÀNH CÔNG!', progress: 100 });
                    setTimeout(() => {
                         this.currentGesture = null; 
                    }, 1500);
                }
            }
        }
    }

    updateStatus(statusObj, isWarning = false) {
        const statusText = document.getElementById('status-text');
        const progressBar = document.getElementById('gesture-progress-bar');
        const progressContainer = document.getElementById('gesture-progress-container');
        
        if (statusText) {
            statusText.innerText = statusObj.text;
            if (isWarning) statusText.style.color = '#ffaa00';
            else statusText.style.color = '#fff';
        }
        
        if (progressBar && progressContainer) {
            if (statusObj.state === 'idle') {
                progressContainer.style.opacity = '0.3';
                progressBar.style.width = '0%';
            } else if (statusObj.state === 'success') {
                progressContainer.style.opacity = '1';
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#00ff00';
            } else {
                progressContainer.style.opacity = '1';
                progressBar.style.width = `${statusObj.progress}%`;
                
                if (statusObj.progress < 30) progressBar.style.backgroundColor = '#4facfe';
                else if (statusObj.progress < 70) progressBar.style.backgroundColor = '#f59e0b';
                else progressBar.style.backgroundColor = '#ffff00';
            }
        }
    }
}

window.GestureController = GestureController;

})();