# Marine Waste Detection System

Flask web application for detecting plastic waste in marine environments using YOLO AI technology.

## Quick Start

1. **Download project files**
 ```
   - download the zip file
   - extract it 
 ```

2. **Install dependencies**
   ```bash

   pip install flask flask-cors pillow numpy torch torchvision requests gunicorn flask-sqlalchemy psycopg2-binary email-validator

   ```
   
   *Note: Skip `inference-sdk` if you get compatibility errors - the app will run in demo mode*

3. **Run the application**
   ```bash
   python main.py
   ```

4. **Open in browser**
   ```
   http://localhost:5000
   ```


### If you get "file not found" error:
You need these files in your folder:
- `main.py` - Entry point file
- `app.py` - Main application code  
- `templates/` folder with HTML files
- `static/` folder with CSS/JS files

Download all files from this Replit project or ask for the individual files.

---
*For detailed setup instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)*