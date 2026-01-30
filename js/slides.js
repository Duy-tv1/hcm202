// Slide Manager - Hiển thị SVG slides với phân trang và điều khiển
(function() {

class SlideManager {
    constructor() {
        this.totalSlides = 25;
        this.currentSlide = 1;
        this.svgCache = {};
        this.isLoading = false;
        
        this.slideContainer = document.getElementById('slide-container');
        this.contentContainer = document.getElementById('content-container');
        this.paginationContainer = document.getElementById('slide-pagination');
        
        this.init();
    }

    init() {
        console.log('[SlideManager] Initializing...');
        
        // Load SVG for first slide
        this.loadSlide(1);
        
        // Create pagination dots
        this.createPagination();
        
        // Button event listeners
        document.getElementById('slide-prev-btn').addEventListener('click', () => this.previousSlide());
        document.getElementById('slide-next-btn').addEventListener('click', () => this.nextSlide());
        
        // Keyboard navigation (Page Up / Page Down)
        document.addEventListener('keydown', (e) => {
            if (this.isContentActive()) {
                if (e.key === 'PageUp') {
                    e.preventDefault();
                    this.previousSlide();
                } else if (e.key === 'PageDown') {
                    e.preventDefault();
                    this.nextSlide();
                }
            }
        });
        
        // Pagination dots click
        this.updatePaginationDots();
    }

    createPagination() {
        const pagination = this.paginationContainer;
        pagination.innerHTML = '';
        
        // Add slide counter
        const counter = document.createElement('span');
        counter.className = 'slide-number';
        counter.id = 'slide-counter';
        counter.textContent = `${this.currentSlide} / ${this.totalSlides}`;
        pagination.appendChild(counter);
        
        // Add dots
        const dotsContainer = document.createElement('div');
        dotsContainer.style.display = 'flex';
        dotsContainer.style.gap = '0.5rem';
        dotsContainer.style.flexWrap = 'wrap';
        dotsContainer.style.justifyContent = 'center';
        dotsContainer.style.maxWidth = '600px';
        
        for (let i = 1; i <= this.totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = 'slide-dot';
            dot.id = `dot-${i}`;
            dot.title = `Slide ${i}`;
            dot.addEventListener('click', () => this.goToSlide(i));
            dotsContainer.appendChild(dot);
        }
        
        pagination.appendChild(dotsContainer);
    }

    async loadSlide(slideNum) {
        if (this.isLoading) return;
        if (slideNum < 1 || slideNum > this.totalSlides) return;
        
        this.isLoading = true;
        
        try {
            // Check cache first
            if (this.svgCache[slideNum]) {
                this.displaySlide(slideNum, this.svgCache[slideNum]);
                this.isLoading = false;
                return;
            }
            
            const response = await fetch(`image/${slideNum}.svg`);
            if (!response.ok) throw new Error(`Failed to load slide ${slideNum}`);
            
            const svgText = await response.text();
            this.svgCache[slideNum] = svgText;
            
            this.displaySlide(slideNum, svgText);
        } catch (error) {
            console.error('[SlideManager] Error loading slide:', error);
            this.slideContainer.innerHTML = `<div style="color: #ff6b6b; text-align: center;">Lỗi tải slide ${slideNum}</div>`;
        }
        
        this.isLoading = false;
    }

    displaySlide(slideNum, svgText) {
        // Clear previous content
        this.slideContainer.innerHTML = '';
        
        // Create SVG wrapper
        const svgWrapper = document.createElement('div');
        svgWrapper.style.width = '100%';
        svgWrapper.style.height = '100%';
        svgWrapper.style.display = 'flex';
        svgWrapper.style.alignItems = 'center';
        svgWrapper.style.justifyContent = 'center';
        svgWrapper.style.overflow = 'auto';
        
        // Insert SVG - để có thể chỉnh sửa inline CSS
        svgWrapper.innerHTML = svgText;
        
        // Adjust SVG to fit container
        const svg = svgWrapper.querySelector('svg');
        if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.maxHeight = '100%';
            svg.style.width = 'auto';
            svg.style.height = 'auto';
            // Enable interaction with SVG elements
            svg.style.pointerEvents = 'auto';
            // Allow text selection
            svg.style.userSelect = 'text';
        }
        
        this.slideContainer.appendChild(svgWrapper);
        
        // Update current slide
        this.currentSlide = slideNum;
        this.updatePaginationDots();
    }

    updatePaginationDots() {
        // Update counter
        const counter = document.getElementById('slide-counter');
        if (counter) {
            counter.textContent = `${this.currentSlide} / ${this.totalSlides}`;
        }
        
        // Update dots
        for (let i = 1; i <= this.totalSlides; i++) {
            const dot = document.getElementById(`dot-${i}`);
            if (dot) {
                if (i === this.currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            }
        }
    }

    nextSlide() {
        const nextSlide = this.currentSlide + 1;
        if (nextSlide <= this.totalSlides) {
            this.goToSlide(nextSlide);
        }
    }

    previousSlide() {
        const prevSlide = this.currentSlide - 1;
        if (prevSlide >= 1) {
            this.goToSlide(prevSlide);
        }
    }

    goToSlide(slideNum) {
        if (slideNum === this.currentSlide) return;
        this.loadSlide(slideNum);
    }

    isContentActive() {
        return window.currentMode === 'content';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.slideManager = new SlideManager();
        console.log('[SlideManager] Initialized');
    });
} else {
    window.slideManager = new SlideManager();
    console.log('[SlideManager] Initialized');
}

// Export for use
window.SlideManager = SlideManager;

})();
