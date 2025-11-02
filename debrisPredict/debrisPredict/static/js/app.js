/**
 * Marine Debris Detection - Main Application JavaScript
 * Handles form submission, heatmap visualization, and chart rendering
 */

// Global variables
let heatmapInstance = null;
let currentDetections = [];
let histogramChartInstance = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeFormHandlers();
    initializeImagePreview();
});

/**
 * Initialize form submission and control handlers
 */
function initializeFormHandlers() {
    const form = document.getElementById('uploadForm');
    const confidenceSlider = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const submitBtn = document.getElementById('submitBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsSection = document.getElementById('resultsSection');

    // Handle confidence threshold slider
    confidenceSlider.addEventListener('input', function(e) {
        confidenceValue.textContent = parseFloat(e.target.value).toFixed(2);
    });

    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        processImage(form, submitBtn, loadingIndicator, resultsSection);
    });
}

/**
 * Initialize image preview functionality
 */
function initializeImagePreview() {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
        }
    });
}

/**
 * Process uploaded image and fetch detection results
 */
function processImage(form, submitBtn, loadingIndicator, resultsSection) {
    const formData = new FormData(form);
    const resultImg = document.getElementById('resultImg');

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    resultsSection.style.display = 'none';
    submitBtn.disabled = true;

    // First submit to get result image
    fetch(form.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.blob();
    })
    .then(blob => {
        // Display result image
        const imageUrl = URL.createObjectURL(blob);
        resultImg.src = imageUrl;

        // Initialize heatmap when image loads
        resultImg.onload = function() {
            if (!heatmapInstance) {
                heatmapInstance = new DebrisHeatmap('heatmapCanvas', resultImg);
            } else {
                heatmapInstance.imageElement = resultImg;
                heatmapInstance.resizeCanvas();
            }
        };

        // Fetch detection data
        return fetch(form.action + '?format=json', {
            method: 'POST',
            body: formData
        });
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to get detection data');
        return response.json();
    })
    .then(data => {
        // Store detections globally
        currentDetections = data.detections || [];

        // Hide loading, show results
        loadingIndicator.style.display = 'none';
        resultsSection.style.display = 'block';

        // Populate detection statistics
        populateDetectionStats(data);

        // Update heatmap with detection data
        if (heatmapInstance && currentDetections.length > 0) {
            heatmapInstance.setDetections(currentDetections);
            heatmapInstance.hide(); // Hidden by default
        }
    })
    .catch(error => {
        console.error('Error:', error);
        loadingIndicator.style.display = 'none';
        alert('An error occurred while processing the image. Please try again.');
    })
    .finally(() => {
        submitBtn.disabled = false;
    });
}

/**
 * Populate detection statistics and visualizations
 */
function populateDetectionStats(data) {
    if (!data || !data.detections || data.detections.length === 0) {
        resetDetectionStats();
        return;
    }

    const detections = data.detections;
    const confidences = detections.map(d => d.confidence);
    const totalCount = detections.length;
    const avgConfidence = (confidences.reduce((a, b) => a + b, 0) / confidences.length * 100).toFixed(1);
    const highConfCount = confidences.filter(c => c > 0.7).length;

    // Count detections by category
    const categories = {
        'plastic': 0,
        'metal': 0,
        'fishing waste': 0
    };

    detections.forEach(detection => {
        const className = (detection.class_name || '').toLowerCase().trim();
        if (className in categories) {
            categories[className]++;
        }
    });

    // Update summary cards
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('avgConfidence').textContent = avgConfidence + '%';
    document.getElementById('highConfCount').textContent = highConfCount;

    // Populate detection breakdown
    populateDetectionBreakdown(categories, totalCount);

    // Create confidence histogram
    createConfidenceHistogram(confidences);
}

/**
 * Populate detection breakdown with progress bars
 */
function populateDetectionBreakdown(categories, totalCount) {
    const breakdownDiv = document.getElementById('detectionBreakdown');

    const plasticPercent = totalCount > 0 ? (categories['plastic'] / totalCount * 100) : 0;
    const metalPercent = totalCount > 0 ? (categories['metal'] / totalCount * 100) : 0;
    const fishingPercent = totalCount > 0 ? (categories['fishing waste'] / totalCount * 100) : 0;

    breakdownDiv.innerHTML = `
        <div class="card border-0 bg-light">
            <div class="card-body p-3">
                <h6 class="mb-3">Detection Breakdown</h6>

                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span><i class="fas fa-circle" style="color: #FF00FF;"></i> Plastic</span>
                        <strong>${categories['plastic']} (${plasticPercent.toFixed(0)}%)</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${plasticPercent}%; background-color: #FF00FF;"></div>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span><i class="fas fa-circle" style="color: #C7FC00;"></i> Metal</span>
                        <strong>${categories['metal']} (${metalPercent.toFixed(0)}%)</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${metalPercent}%; background-color: #C7FC00;"></div>
                    </div>
                </div>

                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span><i class="fas fa-circle" style="color: #FE0056;"></i> Fishing Waste</span>
                        <strong>${categories['fishing waste']} (${fishingPercent.toFixed(0)}%)</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${fishingPercent}%; background-color: #FE0056;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create confidence distribution histogram
 */
function createConfidenceHistogram(confidences) {
    // Create confidence bins
    const bins = [0, 0, 0, 0, 0];
    const binLabels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];

    confidences.forEach(conf => {
        const percentage = conf * 100;
        if (percentage < 20) bins[0]++;
        else if (percentage < 40) bins[1]++;
        else if (percentage < 60) bins[2]++;
        else if (percentage < 80) bins[3]++;
        else bins[4]++;
    });

    const colors = [
        'rgba(244, 67, 54, 0.7)',   // Red for low confidence
        'rgba(255, 152, 0, 0.7)',   // Orange
        'rgba(255, 235, 59, 0.7)',  // Yellow
        'rgba(76, 175, 80, 0.7)',   // Green
        'rgba(33, 150, 243, 0.7)'   // Blue for high confidence
    ];

    const ctx = document.getElementById('histogramChart').getContext('2d');

    // Destroy existing chart if it exists
    if (histogramChartInstance) {
        histogramChartInstance.destroy();
    }

    histogramChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Number of Detections',
                data: bins,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Confidence Level'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            }
        }
    });
}

/**
 * Reset detection statistics to default
 */
function resetDetectionStats() {
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('avgConfidence').textContent = '0%';
    document.getElementById('highConfCount').textContent = '0';

    const breakdownDiv = document.getElementById('detectionBreakdown');
    breakdownDiv.innerHTML = `
        <div class="alert alert-info mb-0">
            <i class="fas fa-info-circle me-2"></i>
            No debris detected with current confidence threshold.
        </div>
    `;

    // Clear histogram
    if (histogramChartInstance) {
        histogramChartInstance.destroy();
        histogramChartInstance = null;
    }
}

/**
 * Toggle heatmap visibility
 */
function toggleHeatmap() {
    if (!heatmapInstance || !currentDetections || currentDetections.length === 0) {
        alert('No detections available for heatmap visualization.');
        return;
    }

    const isVisible = heatmapInstance.toggle();
    const btnText = document.getElementById('heatmapBtnText');
    const legend = document.getElementById('heatmapLegend');
    const stats = document.getElementById('heatmapStats');

    if (isVisible) {
        btnText.textContent = 'Hide Density Heatmap';
        legend.style.display = 'block';
        stats.style.display = 'block';

        // Update stats
        const heatmapStats = heatmapInstance.getStats();
        document.getElementById('hotspotCount').textContent = heatmapStats.hotspots;
    } else {
        btnText.textContent = 'Show Density Heatmap';
        legend.style.display = 'none';
        stats.style.display = 'none';
    }
}

/**
 * Reset form to initial state
 */
function resetForm() {
    document.getElementById('uploadForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('loadingIndicator').style.display = 'none';

    // Reset heatmap
    if (heatmapInstance) {
        heatmapInstance.hide();
    }

    // Reset heatmap button
    const btnText = document.getElementById('heatmapBtnText');
    if (btnText) {
        btnText.textContent = 'Show Density Heatmap';
    }

    const legend = document.getElementById('heatmapLegend');
    const stats = document.getElementById('heatmapStats');
    if (legend) legend.style.display = 'none';
    if (stats) stats.style.display = 'none';

    // Clear detections
    currentDetections = [];
}

/**
 * Download result image
 */
function downloadResult() {
    const resultImg = document.getElementById('resultImg');
    if (!resultImg || !resultImg.src) {
        alert('No result image available for download.');
        return;
    }

    const link = document.createElement('a');
    link.download = 'marine_debris_detection_' + new Date().getTime() + '.jpg';
    link.href = resultImg.src;
    link.click();
}

/**
 * Scroll to debris library section
 */
function scrollToDebrisLibrary() {
    const section = document.getElementById('debrisLibrarySection');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
