# Marine Waste Detection System - Deployment Guide

## Overview
This Flask application provides a web interface for marine waste detection using YOLO (You Only Look Once) deep learning technology. The system can detect 11 different types of marine waste objects in underwater images.

## Current Status
- ✅ Web application running successfully
- ✅ Upload interface with image preview
- ✅ Demo mode with sample detection boxes
- ✅ Bootstrap dark theme responsive design
- ⚠️ Running in demo mode (ultralytics package installation issues)

## Features
- **Upload Interface**: Drag-and-drop image upload with preview
- **Real-time Processing**: Fast image processing and detection
- **Demo Mode**: Sample detection boxes when YOLO model unavailable
- **Responsive Design**: Works on desktop and mobile devices
- **11 Marine Waste Classes**: Wall, Valve, Bottle, Hook, Propeller, Shampoo-bottle, Chain, Standing-bottle, Can, Drink-carton, Tire

## Installation Requirements

### System Dependencies
```bash
# Already installed in this environment:
- Python 3.11
- Flask framework
- Bootstrap CSS framework
- PIL (Python Imaging Library)
- NumPy
```

### Python Packages
```bash
# Currently installed:
pip install flask flask-cors pillow numpy torch torchvision

# For real YOLO detection (requires compatible environment):
pip install ultralytics
```

## Model Setup

### Using Your Custom Model
1. Place your trained YOLO model file as `best.pt` in the root directory
2. Ensure the model is trained for marine waste detection with these 11 classes:
   ```python
   ['Wall', 'Valve', 'Bottle', 'Hook', 'Propeller', 'Shampoo-bottle', 
    'Chain', 'Standing-bottle', 'Can', 'Drink-carton', 'Tire']
   ```

### Training Your Own Model (if needed)
Use the provided training utilities:
- `attached_assets/converter_1755713632756.py` - Convert XML annotations to YOLO format
- `attached_assets/dataSplit_1755713632756.py` - Split dataset into train/validation sets
- `attached_assets/yolo_model_1755713632759.py` - Train YOLO model with custom data

## Running the Application

### Development Mode
```bash
python main.py
```
The application will be available at http://localhost:5000

### Production Mode (with Gunicorn)
```bash
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
```

## API Endpoints

### Main Routes
- `GET /` - Main upload interface
- `POST /predict` - Image upload and processing
- `GET /health` - Health check and model status

### Health Check Response
```json
{
  "status": "healthy",
  "model_available": false,
  "demo_mode": true,
  "classes": ["Wall", "Valve", "Bottle", ...],
  "message": "Demo mode active - install ultralytics package and add model file for real detection"
}
```

## Troubleshooting

### Demo Mode Issues
If the application is stuck in demo mode:
1. Check if `best.pt` model file exists in root directory
2. Verify ultralytics package installation:
   ```bash
   python -c "from ultralytics import YOLO; print('OK')"
   ```
3. Check logs for specific error messages

### Image Upload Issues
- Supported formats: JPG, PNG, GIF, BMP
- Maximum file size: 10MB
- Ensure proper file permissions

### Performance Optimization
- Use GPU-enabled environment for faster inference
- Consider model quantization for deployment
- Implement caching for frequently processed images

## File Structure
```
├── app.py                 # Main Flask application
├── main.py               # Application entry point
├── best.pt               # Trained YOLO model (your custom model)
├── templates/
│   ├── base.html         # Base template with navigation
│   └── index.html        # Main upload interface
├── static/
│   ├── css/style.css     # Custom styles
│   └── js/main.js        # Frontend JavaScript
└── attached_assets/      # Training and conversion utilities
```

## Next Steps for Full Functionality
1. Resolve ultralytics package installation in production environment
2. Test with your trained model file (best.pt)
3. Optimize inference performance
4. Add batch processing capabilities
5. Implement result storage and history

## Support
For issues with:
- Package installation: Check Python version compatibility
- Model loading: Verify model file format and classes
- Performance: Consider GPU acceleration options