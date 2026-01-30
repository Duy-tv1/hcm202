// Data will be loaded from Canva embeds - Content data removed for flexibility

(function() {
// --- 3D ENGINE STATE ---
let scene, camera, renderer, particleSystem;
const PARTICLE_COUNT = 5000; // Tăng để hiển thị chi tiết các đảo
let visualState = "CHAOS"; 
let currentSlideData = null; // For content mode
let targetZoom = 800;
let currentRotation = { x: 0, y: 0 };
let particleVelocity = []; // Lưu vận tốc của từng particle
let previousAnimationState = "CHAOS"; // Track state changes

// Animation state machine
let animationState = "CHAOS"; // CHAOS hoặc MAP_FORMING
let stateTimer = 0;
const CHAOS_DURATION = 10000; // 10 giây hỗn loạn
const MAP_DURATION = 10000; // 10 giây hiển thị bản đồ
let mapTargetPositions = []; // Lưu tọa độ target của bản đồ

// Load bản đồ Việt Nam từ ảnh PNG - xử lý ảnh đầu vào
async function loadVietnamMap() {
    try {
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.onload = () => {
            processMapImage(image, 5, 150); // Spacing 9 để lấy ít điểm hơn, hiển thị toàn bộ bản đồ
        };
        image.onerror = (err) => {
            throw new Error('Cannot load map image: ' + err);
        };
        image.src = 'image/map/map.png?t=' + Date.now();
    } catch (error) {
        console.error('[Particles] ✗ Lỗi load bản đồ:', error.message);
        mapTargetPositions = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            mapTargetPositions.push({
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                z: (Math.random() - 0.5) * 200,
                color: '#ff0000'
            });
        }
    }
}

// Xử lý ảnh để tạo bản đồ (copy logic từ map.html)
function processMapImage(image, spacing = 7, threshold = 80) {
    const COLORS = ['#ef4444', '#f59e0b', '#fbbf24', '#dc2626', '#fcd34d', '#ea580c'];
    
    // Render ảnh
    const renderWidth = 800;
    const scale = renderWidth / image.naturalWidth;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = renderWidth;
    tempCanvas.height = image.naturalHeight * scale;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0, renderWidth, tempCanvas.height);
    
    console.log('[Particles] Processing image:', renderWidth, 'x', tempCanvas.height);
    
    // Sample pixels
    const pixels = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
    const points = [];
    
    const step = Math.max(1, spacing);
    let dotCount = 0;
    
    for (let y = 0; y < tempCanvas.height; y += step) {
        for (let x = 0; x < tempCanvas.width; x += step) {
            const index = (Math.floor(y) * tempCanvas.width + Math.floor(x)) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            const a = pixels[index + 3];
            
            const brightness = (r + g + b) / 3;
            
            // Check: a > 50 && brightness < threshold
            if (a > 50 && brightness < threshold) {
                const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                points.push({
                    x: x,
                    y: y,
                    color: color
                });
                dotCount++;
            }
        }
    }
    
    console.log('[Particles] Found', dotCount, 'points');
    
    if (points.length === 0) {
        console.warn('[Particles] No pixels found - check threshold');
        return false;
    }
    
    // Tính bounds
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const widthMap = maxX - minX;
    const heightMap = maxY - minY;
    
    console.log('[Particles] Size:', widthMap.toFixed(0), 'x', heightMap.toFixed(0));
    
    // Scale để vừa viewport - TĂNG targetSize để bản đồ to hơn (logic ngược)
    const targetSize = 550; 
    const mapScale = Math.max(widthMap, heightMap) / targetSize;
    
    // Normalize vào 3D space
    points.forEach(p => {
        p.x = (p.x - centerX) / mapScale;
        p.y = -(p.y - centerY) / mapScale;
        p.z = Math.random() * 50 - 25;
    });
    
    // Pad nếu cần
    if (points.length < PARTICLE_COUNT && points.length > 0) {
        const originalLength = points.length;
        while (points.length < PARTICLE_COUNT) {
            const p = points[Math.floor(Math.random() * originalLength)];
            points.push({
                x: p.x + (Math.random() - 0.5) * 20,
                y: p.y + (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 50,
                color: p.color
            });
        }
    }
    
    mapTargetPositions = points.slice(0, PARTICLE_COUNT);
    console.log('[Particles] ✓ Loaded map with', mapTargetPositions.length, 'particles (scale:', mapScale.toFixed(2), ')');
    return true;
}

// Make initParticles accessible globally
window.initParticles = function() {
    console.log('[Particles] Khởi tạo 3D scene');
    
    // Load bản đồ Việt Nam trước khi render
    loadVietnamMap().then(() => {
        initScene();
    });
};

function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0002);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 8000);
    camera.position.z = 800;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    const container = document.getElementById('canvas-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        console.log('[Particles] Canvas đã được thêm vào container');
    }

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    
    // Khởi tạo velocity cho mỗi particle
    particleVelocity = [];
    for(let i=0; i<PARTICLE_COUNT; i++) {
        pos[i*3] = (Math.random()-0.5)*4500; 
        pos[i*3+1] = (Math.random()-0.5)*4500; 
        pos[i*3+2] = (Math.random()-0.5)*4500;
        
        // Velocity ngẫu nhiên (di chuyển đơn vị/frame)
        particleVelocity.push({
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6,
            z: (Math.random() - 0.5) * 6
        });
        
        // Màu đỏ, vàng, trắng ngẫu nhiên
        const colorType = Math.random();
        if (colorType < 0.33) {
            // Đỏ (FF0000)
            col[i*3] = 1.0;
            col[i*3+1] = 0.0;
            col[i*3+2] = 0.0;
        } else if (colorType < 0.66) {
            // Vàng (FFFF00)
            col[i*3] = 1.0;
            col[i*3+1] = 1.0;
            col[i*3+2] = 0.0;
        } else {
            // Trắng (FFFFFF)
            col[i*3] = 1.0;
            col[i*3+1] = 1.0;
            col[i*3+2] = 1.0;
        }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({ 
        size: 4, 
        vertexColors: true, 
        transparent: true, 
        opacity: 0.8, 
        blending: THREE.AdditiveBlending 
    }));
    scene.add(particleSystem);
    console.log('[Particles] Particles khởi tạo xong, bắt đầu animate');
    animate();
};

function getEraPosition(i, type) {
    // Placeholder - can be customized based on Canva content
    const t = i / PARTICLE_COUNT;
    const time = Date.now() * 0.001;
    
    const x = Math.sin(t * 100 + time * 0.5) * 300;
    const y = Math.cos(t * 50 + time * 0.3) * 300;
    const z = Math.sin(t * 80 + time * 0.2) * 300;
    
    return {x, y, z};
}

function getSlidePosition(i, slide) {
    if (!slide) return {x:0, y:0, z:0};
    
    // Slide Params
    // particleCount acts as a limiter: if i > count, hide particle or send far away
    if (i > slide.particleCount) {
        return { x: 99999, y: 99999, z: 99999 };
    }

    const time = Date.now() * 0.001 * (slide.movementSpeed || 0.5);
    const logic = slide.clusteringLogic || 'random';
    let x=0, y=0, z=0;

    // Generic Logic Implementations
    switch(logic) {
        case 'random': 
        case 'chaotic':
            x = (Math.sin(i * 132.1 + time) + Math.cos(i * 32.1)) * 400;
            y = (Math.sin(i * 45.2) + Math.cos(i * 21.9 + time)) * 400;
            z = (Math.sin(i * 99.1) + Math.cos(time + i)) * 400;
            break;
            
        case 'groups':
        case 'split':
            const group = i % 2 === 0 ? 1 : -1;
            x = group * 300 + Math.sin(i + time) * 150;
            y = Math.cos(i * 0.1 + time) * 150;
            z = Math.sin(i * 0.2) * 150;
            break;

        case 'merged':
        case 'unity':
        case 'connected':
            // High density center
            const r = Math.random() * 300;
            const theta = Math.random() * Math.PI * 2 + time * 0.2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
            break;

        case 'grid':
        case 'uniform':
            const side = Math.cbrt(slide.particleCount);
            const spacing = 40;
            const ix = i % side;
            const iy = Math.floor(i / side) % side;
            const iz = Math.floor(i / (side * side));
            x = (ix - side/2) * spacing;
            y = (iy - side/2) * spacing;
            z = (iz - side/2) * spacing;
            break;

        case 'layers':
            const layer = i % 3; 
            y = (layer - 1) * 300;
            const rl = Math.random() * 400;
            const al = Math.random() * Math.PI * 2 + time;
            x = rl * Math.cos(al);
            z = rl * Math.sin(al);
            break;

        default: // Fluid/Flow
            x = Math.sin(i * 0.01 + time) * 500;
            y = Math.cos(i * 0.02 + time) * 200;
            z = Math.sin(i * 0.03 + time) * 500;
            break;
    }
    
    // Apply attraction rules (Simple modifiers)
    if (slide.attractionRules) {
        const strength = slide.attractionRules.strength || 0.5;
        if (slide.attractionRules.type === 'center') {
            x *= (1 - strength * 0.5);
            y *= (1 - strength * 0.5);
            z *= (1 - strength * 0.5);
        }
    }

    return {x, y, z};
}

function createTimelineLabels(container) {
    // Timeline labels removed - will use Canva embeds instead
}

function animate() {
    requestAnimationFrame(animate);
    if (!particleSystem) return;

    const pos = particleSystem.geometry.attributes.position.array;
    const col = particleSystem.geometry.attributes.color.array;

    camera.position.z += (targetZoom - camera.position.z) * 0.05;
    particleSystem.rotation.y += (currentRotation.y - particleSystem.rotation.y) * 0.08;
    particleSystem.rotation.x += (currentRotation.x - particleSystem.rotation.x) * 0.08;
    
    const time = Date.now() * 0.001;

    // State machine cho animation
    stateTimer += 16; // ~60fps
    
    if (animationState === "CHAOS" && stateTimer > CHAOS_DURATION) {
        console.log('[Particles] Chuyển sang MAP_FORMING');
        animationState = "MAP_FORMING";
        stateTimer = 0;
        targetZoom = 500; // Zoom in khi hiển thị bản đồ
    } else if (animationState === "MAP_FORMING" && stateTimer > MAP_DURATION) {
        console.log('[Particles] Chuyển sang CHAOS');
        animationState = "CHAOS";
        stateTimer = 0;
        targetZoom = 800; // Zoom out khi về chế độ chaos
        
        // Regenerate velocity khi quay lại CHAOS
        if (previousAnimationState === "MAP_FORMING") {
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particleVelocity[i] = {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6,
                    z: (Math.random() - 0.5) * 6
                };
            }
        }
    }
    
    previousAnimationState = animationState;

    if (visualState === "CHAOS") {
        if (animationState === "CHAOS") {
            // Chuyển động hỗn loạn - áp dụng velocity
            for(let i=0; i<PARTICLE_COUNT; i++) {
                const vel = particleVelocity[i];
                pos[i*3] += vel.x;
                pos[i*3+1] += vel.y;
                pos[i*3+2] += vel.z;
                
                // Bounce off walls (giới hạn 3000 units)
                const boundary = 3000;
                if (Math.abs(pos[i*3]) > boundary) vel.x *= -1;
                if (Math.abs(pos[i*3+1]) > boundary) vel.y *= -1;
                if (Math.abs(pos[i*3+2]) > boundary) vel.z *= -1;
                
                const colorType = Math.random();
                if (colorType < 0.33) {
                    col[i*3] = 1.0;
                    col[i*3+1] = 0.0;
                    col[i*3+2] = 0.0;
                } else if (colorType < 0.66) {
                    col[i*3] = 1.0;
                    col[i*3+1] = 1.0;
                    col[i*3+2] = 0.0;
                } else {
                    col[i*3] = 1.0;
                    col[i*3+1] = 1.0;
                    col[i*3+2] = 1.0;
                }
            }
        } else if (animationState === "MAP_FORMING") {
            // Tập hợp thành bản đồ Việt Nam
            for(let i=0; i<PARTICLE_COUNT; i++) {
                const target = mapTargetPositions[i] || {x: 0, y: 0, z: 0};
                
                // Smooth animation về target position
                const ease = 0.05;
                pos[i*3] += (target.x - pos[i*3]) * ease;
                pos[i*3+1] += (target.y - pos[i*3+1]) * ease;
                pos[i*3+2] += (target.z - pos[i*3+2]) * ease;
                
                // Màu đỏ, vàng, trắng theo pattern
                const colorType = i % 3;
                if (colorType === 0) {
                    col[i*3] = 1.0;
                    col[i*3+1] = 0.0;
                    col[i*3+2] = 0.0;
                } else if (colorType === 1) {
                    col[i*3] = 1.0;
                    col[i*3+1] = 1.0;
                    col[i*3+2] = 0.0;
                } else {
                    col[i*3] = 1.0;
                    col[i*3+1] = 1.0;
                    col[i*3+2] = 1.0;
                }
            }
        }
    } else if (visualState === "CONTENT_SLIDE" && currentSlideData) {
        for(let i=0; i<PARTICLE_COUNT; i++) {
            const tar = getSlidePosition(i, currentSlideData);
            pos[i*3] += (tar.x - pos[i*3])*0.2; 
            pos[i*3+1] += (tar.y - pos[i*3+1])*0.2; 
            pos[i*3+2] += (tar.z - pos[i*3+2])*0.2;
            
            const colorType = i % 3;
            if (colorType === 0) {
                col[i*3] += (1.0 - col[i*3])*0.1;
                col[i*3+1] += (0.0 - col[i*3+1])*0.1;
                col[i*3+2] += (0.0 - col[i*3+2])*0.1;
            } else if (colorType === 1) {
                col[i*3] += (1.0 - col[i*3])*0.1;
                col[i*3+1] += (1.0 - col[i*3+1])*0.1;
                col[i*3+2] += (0.0 - col[i*3+2])*0.1;
            } else {
                col[i*3] += (1.0 - col[i*3])*0.1;
                col[i*3+1] += (1.0 - col[i*3+1])*0.1;
                col[i*3+2] += (1.0 - col[i*3+2])*0.1;
            }
        }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;

    if (visualState === 'CONTENT_SLIDE') {
        if (particleSystem.material) {
            particleSystem.material.opacity = 0.22;
            particleSystem.material.size = 3.2;
        }
    } else {
        if (particleSystem.material) {
            particleSystem.material.opacity = 0.8;
            particleSystem.material.size = 4;
        }
    }

    renderer.render(scene, camera);
}

// Global interface để upload ảnh từ index.html
window.uploadMapImage = function(file, spacing = 7, threshold = 80) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            console.log('[Particles] Processing uploaded image');
            processMapImage(img, spacing, threshold);
        };
        img.onerror = () => {
            console.error('[Particles] Invalid image file');
        };
        img.src = event.target.result;
    };
    reader.onerror = () => {
        console.error('[Particles] Failed to read file');
    };
    reader.readAsDataURL(file);
};

// Global interface to control particles state
function setParticlesState(newState, data = null) {
    visualState = newState;
    
    if (newState === 'CONTENT_SLIDE') {
        currentSlideData = data; 
        targetZoom = 500;
    } else {
        targetZoom = 1000;
    }
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Global interface to control particles state
window.setParticlesState = function(newState, data = null) {
    visualState = newState;
    
    if (newState === 'CONTENT_SLIDE') {
        currentSlideData = data; 
        targetZoom = 500;
    } else {
        targetZoom = 1000;
    }
};

})();