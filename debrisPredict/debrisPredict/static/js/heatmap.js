/**
 * Debris Density Heatmap Module
 * Visualizes detection density using a color-coded heatmap overlay
 */

class DebrisHeatmap {
    constructor(canvasId, imageElement) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.imageElement = imageElement;
        this.detections = [];
        this.isVisible = true;
        this.gridSize = 50; // Size of each grid cell in pixels
        this.heatmapData = null;
        this.colorScale = [
            { threshold: 0, color: 'rgba(0, 0, 255, 0)' },      // Transparent (no detections)
            { threshold: 1, color: 'rgba(0, 255, 255, 0.3)' },  // Cyan (low)
            { threshold: 2, color: 'rgba(0, 255, 0, 0.4)' },    // Green (medium-low)
            { threshold: 3, color: 'rgba(255, 255, 0, 0.5)' },  // Yellow (medium)
            { threshold: 4, color: 'rgba(255, 165, 0, 0.6)' },  // Orange (medium-high)
            { threshold: 5, color: 'rgba(255, 0, 0, 0.7)' }     // Red (high)
        ];
    }

    /**
     * Initialize the heatmap with detection data
     */
    setDetections(detections) {
        this.detections = detections;
        this.calculateHeatmapData();
    }

    /**
     * Resize canvas to match image dimensions
     */
    resizeCanvas() {
        if (!this.imageElement) return;

        const rect = this.imageElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    /**
     * Calculate heatmap grid data based on detection centers
     */
    calculateHeatmapData() {
        if (!this.detections || this.detections.length === 0) {
            this.heatmapData = null;
            return;
        }

        // Get image dimensions
        const imgWidth = this.imageElement.naturalWidth;
        const imgHeight = this.imageElement.naturalHeight;

        if (!imgWidth || !imgHeight) return;

        // Calculate grid dimensions
        const cols = Math.ceil(imgWidth / this.gridSize);
        const rows = Math.ceil(imgHeight / this.gridSize);

        // Initialize grid
        const grid = Array(rows).fill(0).map(() => Array(cols).fill(0));

        // Count detections in each grid cell
        this.detections.forEach(detection => {
            const center = detection.center || this.calculateCenter(detection.bbox);

            // Map detection coordinates to grid
            const col = Math.floor(center.x / this.gridSize);
            const row = Math.floor(center.y / this.gridSize);

            // Increment count for this cell and surrounding cells (for smoothing)
            for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                    // Weight decreases with distance from center
                    const distance = Math.sqrt(Math.pow(r - row, 2) + Math.pow(c - col, 2));
                    const weight = 1 / (1 + distance);
                    grid[r][c] += weight;
                }
            }
        });

        this.heatmapData = {
            grid: grid,
            rows: rows,
            cols: cols,
            maxDensity: Math.max(...grid.map(row => Math.max(...row)))
        };
    }

    /**
     * Calculate center point from bbox if not provided
     */
    calculateCenter(bbox) {
        return {
            x: (bbox[0] + bbox[2]) / 2,
            y: (bbox[1] + bbox[3]) / 2
        };
    }

    /**
     * Get color for a given density value
     */
    getColorForDensity(density) {
        if (density === 0) {
            return this.colorScale[0].color;
        }

        // Find appropriate color from scale
        for (let i = this.colorScale.length - 1; i >= 0; i--) {
            if (density >= this.colorScale[i].threshold) {
                return this.colorScale[i].color;
            }
        }

        return this.colorScale[1].color;
    }

    /**
     * Render the heatmap overlay
     */
    render() {
        if (!this.isVisible || !this.heatmapData) {
            this.clear();
            return;
        }

        this.resizeCanvas();
        this.clear();

        const { grid, rows, cols } = this.heatmapData;

        // Calculate scale factors
        const scaleX = this.canvas.width / (cols * this.gridSize);
        const scaleY = this.canvas.height / (rows * this.gridSize);

        // Draw heatmap cells
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const density = grid[row][col];

                if (density > 0) {
                    const x = col * this.gridSize * scaleX;
                    const y = row * this.gridSize * scaleY;
                    const width = this.gridSize * scaleX;
                    const height = this.gridSize * scaleY;

                    // Draw cell with appropriate color
                    this.ctx.fillStyle = this.getColorForDensity(density);
                    this.ctx.fillRect(x, y, width, height);

                    // Add subtle border for high-density areas
                    if (density >= 3) {
                        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(x, y, width, height);
                    }
                }
            }
        }

        // Add gradient overlay for smoother appearance
        this.applyGradientSmoothing();
    }

    /**
     * Apply gradient smoothing for better visual appearance
     */
    applyGradientSmoothing() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Simple box blur for smoothing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = 'blur(8px)';
        tempCtx.drawImage(this.canvas, 0, 0);

        this.ctx.drawImage(tempCanvas, 0, 0);
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Toggle heatmap visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.render();
        return this.isVisible;
    }

    /**
     * Show heatmap
     */
    show() {
        this.isVisible = true;
        this.render();
    }

    /**
     * Hide heatmap
     */
    hide() {
        this.isVisible = false;
        this.clear();
    }

    /**
     * Update grid size (for zoom/detail adjustment)
     */
    setGridSize(size) {
        this.gridSize = size;
        this.calculateHeatmapData();
        this.render();
    }

    /**
     * Get statistics about the heatmap
     */
    getStats() {
        if (!this.heatmapData) {
            return {
                totalDetections: 0,
                maxDensity: 0,
                avgDensity: 0,
                hotspots: 0
            };
        }

        const { grid, maxDensity } = this.heatmapData;
        let totalDensity = 0;
        let cellCount = 0;
        let hotspots = 0;

        grid.forEach(row => {
            row.forEach(density => {
                if (density > 0) {
                    totalDensity += density;
                    cellCount++;
                    if (density >= 4) {
                        hotspots++;
                    }
                }
            });
        });

        return {
            totalDetections: this.detections.length,
            maxDensity: maxDensity.toFixed(2),
            avgDensity: cellCount > 0 ? (totalDensity / cellCount).toFixed(2) : 0,
            hotspots: hotspots
        };
    }

    /**
     * Export heatmap as image data URL
     */
    exportAsImage() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Generate legend data for UI display
     */
    getLegendData() {
        return this.colorScale.map((item, index) => ({
            label: index === 0 ? 'None' :
                   index === 1 ? 'Low' :
                   index === 2 ? 'Medium-Low' :
                   index === 3 ? 'Medium' :
                   index === 4 ? 'Medium-High' : 'High',
            color: item.color,
            threshold: item.threshold
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebrisHeatmap;
}
