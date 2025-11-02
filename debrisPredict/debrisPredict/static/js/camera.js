/**
 * Camera Control Module for Live Marine Debris Detection
 * Handles webcam streaming, real-time detection, and heatmap overlay
 */

class CameraController {
    constructor() {
        this.isActive = false;
        this.heatmapEnabled = false;
        this.statusInterval = null;
        this.detectionStats = {
            total: 0,
            plastic: 0,
            metal: 0,
            fishing_waste: 0
        };
    }

    /**
     * Initialize camera controls
     */
    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    /**
     * Setup event listeners for camera controls
     */
    setupEventListeners() {
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        const toggleHeatmapBtn = document.getElementById('toggleCameraHeatmapBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startCamera());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopCamera());
        }

        if (toggleHeatmapBtn) {
            toggleHeatmapBtn.addEventListener('click', () => this.toggleHeatmap());
        }
    }

    /**
     * Start the camera and begin live detection
     */
    async startCamera() {
        try {
            const startBtn = document.getElementById('startCameraBtn');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Starting...';
            }

            const response = await fetch('/camera/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.isActive = true;
                this.showVideoFeed();
                this.startStatusPolling();
                this.updateUI();
                this.showNotification('Camera started successfully', 'success');
            } else {
                this.showNotification('Failed to start camera: ' + data.message, 'error');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-video me-2"></i>Open Camera';
                }
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            this.showNotification('Error starting camera: ' + error.message, 'error');
            const startBtn = document.getElementById('startCameraBtn');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-video me-2"></i>Open Camera';
            }
        }
    }

    /**
     * Stop the camera
     */
    async stopCamera() {
        try {
            const stopBtn = document.getElementById('stopCameraBtn');
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Stopping...';
            }

            const response = await fetch('/camera/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.isActive = false;
                this.heatmapEnabled = false;
                this.hideVideoFeed();
                this.stopStatusPolling();
                this.updateUI();
                this.resetStats();
                this.showNotification('Camera stopped', 'info');
            } else {
                this.showNotification('Failed to stop camera: ' + data.message, 'error');
            }

            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.innerHTML = '<i class="fas fa-stop-circle me-2"></i>Stop Camera';
            }
        } catch (error) {
            console.error('Error stopping camera:', error);
            this.showNotification('Error stopping camera: ' + error.message, 'error');
            const stopBtn = document.getElementById('stopCameraBtn');
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.innerHTML = '<i class="fas fa-stop-circle me-2"></i>Stop Camera';
            }
        }
    }

    /**
     * Toggle heatmap overlay
     */
    async toggleHeatmap() {
        try {
            const response = await fetch('/camera/toggle_heatmap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.heatmapEnabled = data.heatmap_enabled;
                this.updateUI();
                this.showNotification(
                    this.heatmapEnabled ? 'Heatmap enabled' : 'Heatmap disabled',
                    'info'
                );
            }
        } catch (error) {
            console.error('Error toggling heatmap:', error);
            this.showNotification('Error toggling heatmap: ' + error.message, 'error');
        }
    }

    /**
     * Show the video feed
     */
    showVideoFeed() {
        const cameraSection = document.getElementById('cameraSection');
        const videoFeed = document.getElementById('videoFeed');
        const uploadSection = document.getElementById('uploadForm').closest('.card');

        if (cameraSection) {
            cameraSection.style.display = 'block';
        }

        if (videoFeed) {
            videoFeed.src = '/video_feed?' + new Date().getTime();
        }

        // Hide upload section when camera is active
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
    }

    /**
     * Hide the video feed
     */
    hideVideoFeed() {
        const cameraSection = document.getElementById('cameraSection');
        const videoFeed = document.getElementById('videoFeed');
        const uploadSection = document.getElementById('uploadForm').closest('.card');

        if (cameraSection) {
            cameraSection.style.display = 'none';
        }

        if (videoFeed) {
            videoFeed.src = '';
        }

        // Show upload section when camera is stopped
        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
    }

    /**
     * Start polling camera status
     */
    startStatusPolling() {
        this.statusInterval = setInterval(() => {
            this.updateCameraStatus();
        }, 1000); // Update every second
    }

    /**
     * Stop polling camera status
     */
    stopStatusPolling() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }

    /**
     * Update camera status from server
     */
    async updateCameraStatus() {
        try {
            const response = await fetch('/camera/status');
            const data = await response.json();

            this.detectionStats.total = data.total_detections || 0;
            this.detectionStats.plastic = data.detection_counts?.plastic || 0;
            this.detectionStats.metal = data.detection_counts?.metal || 0;
            this.detectionStats.fishing_waste = data.detection_counts?.['fishing waste'] || 0;

            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error fetching camera status:', error);
        }
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const totalElem = document.getElementById('liveTotalCount');
        const plasticElem = document.getElementById('livePlasticCount');
        const metalElem = document.getElementById('liveMetalCount');
        const fishingElem = document.getElementById('liveFishingCount');

        if (totalElem) totalElem.textContent = this.detectionStats.total;
        if (plasticElem) plasticElem.textContent = this.detectionStats.plastic;
        if (metalElem) metalElem.textContent = this.detectionStats.metal;
        if (fishingElem) fishingElem.textContent = this.detectionStats.fishing_waste;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.detectionStats = {
            total: 0,
            plastic: 0,
            metal: 0,
            fishing_waste: 0
        };
        this.updateStatsDisplay();
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        const startBtn = document.getElementById('startCameraBtn');
        const stopBtn = document.getElementById('stopCameraBtn');
        const toggleHeatmapBtn = document.getElementById('toggleCameraHeatmapBtn');
        const heatmapBtnText = document.getElementById('cameraHeatmapBtnText');

        if (startBtn) {
            startBtn.disabled = this.isActive;
            if (!this.isActive) {
                startBtn.innerHTML = '<i class="fas fa-video me-2"></i>Open Camera';
            }
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isActive;
        }

        if (toggleHeatmapBtn) {
            toggleHeatmapBtn.disabled = !this.isActive;
        }

        if (heatmapBtnText) {
            heatmapBtnText.textContent = this.heatmapEnabled ? 'Hide Heatmap' : 'Show Heatmap';
        }

        // Update heatmap button color
        if (toggleHeatmapBtn) {
            if (this.heatmapEnabled) {
                toggleHeatmapBtn.classList.remove('btn-outline-danger');
                toggleHeatmapBtn.classList.add('btn-danger');
            } else {
                toggleHeatmapBtn.classList.remove('btn-danger');
                toggleHeatmapBtn.classList.add('btn-outline-danger');
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize camera controller when DOM is ready
let cameraController;

document.addEventListener('DOMContentLoaded', function() {
    cameraController = new CameraController();
    cameraController.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraController;
}
