/**
 * Marine Waste Detection - Main JavaScript File
 * Handles form interactions, image processing, and UI updates
 */

// Global variables
let currentImageBlob = null;
let detectionResults = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Marine Waste Detection App initialized');
    
    // Setup file input handler
    setupFileInput();
    
    // Setup form submission
    setupFormSubmission();
    
    // Setup tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        initializeTooltips();
    }
    
    // Check model availability on load
    checkModelHealth();
}

/**
 * Setup file input handling for image preview
 */
function setupFileInput() {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!imageInput || !imagePreview || !previewImg) return;
    
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // Validate file type
            if (!isValidImageFile(file)) {
                showAlert('Please select a valid image file (JPG, PNG, GIF, BMP)', 'error');
                this.value = '';
                return;
            }
            
            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showAlert('File size must be less than 10MB', 'error');
                this.value = '';
                return;
            }
            
            // Show image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
                
                // Add fade-in animation
                imagePreview.style.opacity = '0';
                setTimeout(() => {
                    imagePreview.style.transition = 'opacity 0.3s ease';
                    imagePreview.style.opacity = '1';
                }, 10);
            };
            reader.readAsDataURL(file);
        } else {
            hideImagePreview();
        }
    });
}

/**
 * Setup form submission handling
 */
function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        processImageUpload(this);
    });
}

/**
 * Process image upload and detection
 */
async function processImageUpload(form) {
    const formData = new FormData(form);
    const submitBtn = document.getElementById('submitBtn');
    
    try {
        // Show loading state
        showLoadingState();
        disableSubmitButton(submitBtn, true);
        
        // Submit the form
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the result image blob
        const blob = await response.blob();
        currentImageBlob = blob;
        
        // Display results
        displayResults(blob);
        
    } catch (error) {
        console.error('Error processing image:', error);
        showAlert('An error occurred while processing the image. Please try again.', 'error');
        hideLoadingState();
    } finally {
        disableSubmitButton(submitBtn, false);
    }
}

/**
 * Display detection results
 */
function displayResults(imageBlob) {
    const resultImg = document.getElementById('resultImg');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!resultImg || !resultsSection) return;
    
    // Create URL for the result image
    const imageUrl = URL.createObjectURL(imageBlob);
    resultImg.src = imageUrl;
    
    // Hide loading and show results
    hideLoadingState();
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Update detection statistics
    updateDetectionStats();
    
    // Show success message
    showAlert('Image processed successfully! Detection results are shown below.', 'success');
}

/**
 * Update detection statistics display
 */
function updateDetectionStats() {
    const statsDiv = document.getElementById('detectionStats');
    const listDiv = document.getElementById('detectionList');
    
    if (!statsDiv || !listDiv) return;
    
    // Display processing status
    statsDiv.innerHTML = `
        <div class="card bg-light">
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-6">
                        <h4 class="text-primary mb-0"><i class="fas fa-check-circle"></i></h4>
                        <small class="text-muted">Processing Complete</small>
                    </div>
                    <div class="col-6">
                        <h4 class="text-success mb-0"><i class="fas fa-robot"></i></h4>
                        <small class="text-muted">AI Analysis Done</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted">Model:</span>
                <span class="badge bg-primary">YOLOv8n</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="text-muted">Status:</span>
                <span class="badge bg-success">Active</span>
            </div>
        </div>
    `;
    
    // Display detection information
    listDiv.innerHTML = `
        <div class="alert alert-info mb-3">
            <small>
                <i class="fas fa-info-circle me-2"></i>
                Detected objects are highlighted with bounding boxes on the processed image.
            </small>
        </div>
        <div class="mb-2">
            <h6 class="mb-2">Detectable Categories:</h6>
            <div class="row">
                <div class="col-6">
                    <small class="text-muted d-block">• Wall</small>
                    <small class="text-muted d-block">• Valve</small>
                    <small class="text-muted d-block">• Bottle</small>
                    <small class="text-muted d-block">• Hook</small>
                    <small class="text-muted d-block">• Propeller</small>
                    <small class="text-muted d-block">• Shampoo-bottle</small>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">• Chain</small>
                    <small class="text-muted d-block">• Standing-bottle</small>
                    <small class="text-muted d-block">• Can</small>
                    <small class="text-muted d-block">• Drink-carton</small>
                    <small class="text-muted d-block">• Tire</small>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsSection = document.getElementById('resultsSection');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Hide image preview
 */
function hideImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
}

/**
 * Disable/Enable submit button
 */
function disableSubmitButton(button, disable) {
    if (!button) return;
    
    if (disable) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-search me-2"></i>Detect Marine Waste';
    }
}

/**
 * Reset form to initial state
 */
function resetForm() {
    const form = document.getElementById('uploadForm');
    const resultsSection = document.getElementById('resultsSection');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (form) {
        form.reset();
    }
    
    hideImagePreview();
    
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Clear current image blob
    if (currentImageBlob) {
        URL.revokeObjectURL(currentImageBlob);
        currentImageBlob = null;
    }
    
    showAlert('Form reset successfully. You can upload a new image.', 'info');
}

/**
 * Download detection result
 */
function downloadResult() {
    if (!currentImageBlob) {
        showAlert('No result image available to download', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `marine_waste_detection_${new Date().getTime()}.jpg`;
    link.href = URL.createObjectURL(currentImageBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Result image downloaded successfully!', 'success');
}

/**
 * Validate image file type
 */
function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    return validTypes.includes(file.type);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Find container or create one
    let container = document.querySelector('.container');
    if (!container) {
        container = document.querySelector('main .container');
    }
    
    if (container) {
        // Insert alert at the beginning of container
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Check model health status
 */
async function checkModelHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (!data.model_available) {
            showAlert('Warning: YOLO model is not available. Please ensure the model file exists.', 'warning');
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Global functions for HTML onclick events
window.resetForm = resetForm;
window.downloadResult = downloadResult;
