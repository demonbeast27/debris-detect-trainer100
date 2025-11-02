# 🚀 Quick Start Guide - Marine Debris Detection System

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Edge, Safari)

---

## Installation & Setup

### Step 1: Navigate to Project Directory
```bash
cd C:\Users\tilak\Downloads\debrisPredictfinal\debrisPredict\debrisPredict
```

### Step 2: Install Required Dependencies
```bash
pip install flask flask-cors pillow numpy requests python-dotenv
```

Or use the requirements file:
```bash
cd ../..
pip install -r requirements.txt
```

### Step 3: Verify Installation
Check that all packages are installed:
```bash
pip list | findstr "flask pillow numpy"
```

---

## Running the Application

### Method 1: Using main.py
```bash
cd C:\Users\tilak\Downloads\debrisPredictfinal\debrisPredict\debrisPredict
python main.py
```

### Method 2: Using app.py directly
```bash
cd C:\Users\tilak\Downloads\debrisPredictfinal\debrisPredict\debrisPredict
python -m flask run --host=0.0.0.0 --port=5000
```

### Expected Output
```
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://<your-ip>:5000
Press CTRL+C to quit
```

---

## Accessing the Application

### Local Access
Open your browser and navigate to:
```
http://localhost:5000
```

### Network Access (from other devices)
```
http://<your-computer-ip>:5000
```

To find your IP:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

---

## Using the Application

### 1. Upload an Image
- Click "Select Image File"
- Choose a marine/underwater image
- Preview will appear below

### 2. Configure Detection
- **Confidence Threshold**: Adjust slider (0.01 - 0.30)
  - Lower values = more detections (including less certain ones)
  - Higher values = fewer, more confident detections
  
- **Label Display Mode**: Choose how labels appear
  - Class + Confidence %: Shows both (e.g., "plastic 85%")
  - Class Only: Shows just the type (e.g., "plastic")
  - Confidence Only: Shows just percentage (e.g., "85%")
  - No Labels: Clean view with only bounding boxes

### 3. Detect Debris
- Click "Detect Marine Debris" button
- Wait for processing (usually 2-10 seconds)
- View results with color-coded detections:
  - **Pink/Magenta (#FF00FF)**: Plastic waste
  - **Lime Green (#C7FC00)**: Metal waste
  - **Hot Pink/Red (#FE0056)**: Fishing waste

### 4. View Density Heatmap
- Click "Show Density Heatmap" button
- Heatmap overlay appears showing debris concentration
- Color indicates density:
  - Cyan: Low concentration
  - Yellow: Medium concentration
  - Orange: High concentration
  - Red: Very high concentration
- View hotspot count in statistics
- Click again to hide

### 5. Explore Debris Library
- Scroll down to "Know Your Debris Library" section
- Read about each debris type:
  - Degradation time
  - Environmental path
  - Common items
  - Environmental impact
- Learn facts about marine pollution

### 6. Download Results
- Click "Download Result" button
- Image saves with timestamp in filename

### 7. Upload Another Image
- Click "Upload Another Image" button
- Form resets for new detection

---

## Testing the Application

### Test with Demo Mode
If the Roboflow API is unavailable, the app automatically enters demo mode:
- Shows sample detections
- All features still work
- Good for testing UI/UX

### Sample Images
Test with images containing:
- Plastic bottles or bags
- Metal cans or containers
- Fishing nets or ropes
- Multiple debris types for best results

---

## Features Overview

### ✅ What's New in This Version

1. **Updated Colors**
   - Plastic: Magenta (#FF00FF)
   - Metal: Lime Green (#C7FC00)
   - Fishing Waste: Hot Pink/Red (#FE0056)

2. **Debris Density Heatmap**
   - Real-time concentration visualization
   - Hotspot detection
   - Toggle on/off
   - Smooth gradients

3. **Know Your Debris Library**
   - Educational information cards
   - Degradation times (450-1000 years for plastic!)
   - Environmental paths
   - Impact descriptions
   - Common item lists

4. **Enhanced Analytics**
   - Confidence distribution histogram
   - Detection breakdown with progress bars
   - Summary statistics
   - Category-specific counts

---

## Troubleshooting

### Issue: Port 5000 already in use
**Solution**: Use a different port
```bash
python main.py --port=5001
```
Or edit `main.py` and change port number.

### Issue: Module not found errors
**Solution**: Reinstall dependencies
```bash
pip install --upgrade flask flask-cors pillow numpy requests
```

### Issue: Image not uploading
**Solution**: Check file size and format
- Max size: 10MB
- Supported: JPG, PNG, GIF, BMP
- Try a smaller image

### Issue: No detections found
**Solution**: Adjust confidence threshold
- Lower the slider to 0.01-0.05
- Try images with clearer debris
- Ensure good lighting in image

### Issue: Heatmap not showing
**Solution**: 
- Ensure detections exist first
- Refresh page and try again
- Check browser console for errors (F12)

### Issue: Colors don't match
**Solution**: Clear browser cache
- Press Ctrl+Shift+Delete
- Clear cached images and files
- Reload page (Ctrl+F5)

---

## Browser Compatibility

### Fully Supported
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Mozilla Firefox
- ✅ Safari (macOS/iOS)

### Minimum Versions
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Performance Tips

### For Better Detection Results
1. Use high-quality images (at least 640x480)
2. Ensure good lighting
3. Images with clear debris objects
4. Avoid overly blurry or dark images

### For Faster Processing
1. Resize large images before upload
2. Use recommended 1920x1080 or smaller
3. Close other browser tabs
4. Ensure stable internet connection

---

## API Endpoints

### Available Endpoints

#### 1. Home Page
```
GET /
```
Main application interface

#### 2. Prediction
```
POST /predict
Content-Type: multipart/form-data

Parameters:
  - image: file (required)
  - confidence: float (0.01-0.30, default: 0.1)
  - label_mode: string (class_confidence|class_only|confidence_only|none)

Returns: JPEG image with detections
```

#### 3. Prediction Data
```
POST /predict?format=json

Returns JSON:
{
  "success": true,
  "detections": [...],
  "detection_counts": {...},
  "total_objects": int,
  "debris_info": {...}
}
```

#### 4. Debris Information
```
GET /api/debris-info

Returns JSON with debris library data
```

#### 5. Health Check
```
GET /health

Returns:
{
  "status": "healthy",
  "model_available": boolean,
  "demo_mode": boolean,
  "classes": {...}
}
```

---

## Development Mode

### Enable Debug Mode
Already enabled in `main.py`:
```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

### View Logs
Logs appear in terminal where you ran the app:
```
INFO:root:Roboflow API configuration loaded successfully
INFO:root:Roboflow API response: 5 detections found
```

### Hot Reload
Debug mode enables automatic reloading when you edit files.

---

## File Structure

```
debrisPredictfinal/
├── requirements.txt              # Python dependencies
├── UPDATES_README.md            # Detailed feature documentation
├── QUICKSTART.md               # This file
└── debrisPredict/
    └── debrisPredict/
        ├── app.py              # Flask backend
        ├── main.py             # Entry point
        ├── best.pt             # YOLO model weights
        ├── static/
        │   ├── css/            # Stylesheets
        │   └── js/
        │       ├── heatmap.js  # Heatmap engine
        │       ├── app.js      # Main application JS
        │       └── ocean.js    # 3D background
        └── templates/
            ├── base.html       # Base template
            └── index.html      # Main page
```

---

## Next Steps

1. ✅ Run the application
2. ✅ Upload a test image
3. ✅ Try the heatmap feature
4. ✅ Explore the debris library
5. ✅ Adjust confidence threshold
6. ✅ Download results

### Learn More
- Read `UPDATES_README.md` for detailed feature documentation
- Check `DEPLOYMENT_GUIDE.md` for production deployment
- Review code comments for technical details

---

## Support & Resources

### Documentation
- `README.md` - General project info
- `UPDATES_README.md` - Feature details
- `DEPLOYMENT_GUIDE.md` - Production setup

### Common Questions

**Q: Can I use my own YOLO model?**
A: Yes, replace `best.pt` and update the Roboflow API configuration in `app.py`

**Q: Can I add more debris types?**
A: Yes, update `MARINE_CLASSES` and `DEBRIS_INFO` in `app.py`

**Q: Can I change the colors?**
A: Yes, edit `CLASS_COLORS` dictionary in `app.py`

**Q: Does this work offline?**
A: Partially. The app runs locally, but requires internet for the Roboflow API. Demo mode works fully offline.

**Q: Can I process videos?**
A: Not yet, but this is planned for future updates.

---

## Quick Command Reference

```bash
# Install dependencies
pip install -r requirements.txt

# Run application
cd debrisPredict/debrisPredict
python main.py

# Check health
curl http://localhost:5000/health

# Stop application
Press CTRL+C in terminal
```

---

## Success Indicators

You'll know everything is working when:
- ✅ Browser opens to http://localhost:5000
- ✅ 3D ocean background animates smoothly
- ✅ File upload accepts images
- ✅ Detections show with colored boxes
- ✅ Heatmap toggles on/off
- ✅ Debris library displays three cards
- ✅ Charts render properly
- ✅ Download button works

---

**Ready to go! 🎉**

If you encounter any issues, check the Troubleshooting section or review the error messages in your terminal.

Happy debris detecting! 🌊🔍