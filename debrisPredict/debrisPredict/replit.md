# Overview

This is a marine waste detection system that uses YOLO (You Only Look Once) deep learning technology to identify and classify marine debris in underwater images. The application can detect 11 different types of marine waste objects including bottles, cans, tires, propellers, and other debris commonly found in marine environments. The system consists of a Flask-based web application that provides an interface for users to upload images and receive real-time detection results with bounding boxes drawn around identified waste objects.

## Current Status (August 2025)
- ✅ Flask web application successfully deployed and running
- ✅ Complete upload interface with image preview functionality
- ✅ Roboflow API integration for real-time plastic waste detection
- ✅ Specialized plastic waste detection system with confidence analysis
- ✅ Adjustable confidence threshold controls (0.01-0.30)
- ✅ Multiple label display modes for detection boxes
- ✅ Single-class focus: Plastic waste only for environmental monitoring
- ✅ Advanced analytics with confidence histogram and detection quality metrics
- ✅ Image orientation correction for mobile photos
- ✅ Full deployment guide created for production setup
- ✅ Comprehensive README.md created with VS Code setup instructions

# User Preferences

Preferred communication style: Simple, everyday language.
Display preferences: Detection boxes on images with analytical charts (hide detailed object lists).
Detection focus: Only plastic waste detection for environmental monitoring accuracy.
Chart preferences: Confidence histogram and quality analysis instead of pie charts.
Detection focus: Only plastic waste detection - removed metal and fishing categories completely.
Visualization: Confidence histogram and summary cards instead of pie charts for single-category detection.

# System Architecture

## Frontend Architecture
The frontend uses a traditional server-side rendered approach with Flask templates and Bootstrap for styling. The system includes:
- **Template Engine**: Jinja2 templates with a base template for consistent layout
- **UI Framework**: Bootstrap with dark theme for modern, responsive design
- **JavaScript**: Vanilla JavaScript for image preview, form handling, and AJAX interactions
- **Styling**: Custom CSS combined with Bootstrap and Font Awesome icons

## Backend Architecture
The backend follows a simple Flask application pattern:
- **Web Framework**: Flask with CORS support for cross-origin requests
- **Model Loading**: Dynamic YOLO model loading with error handling for missing dependencies
- **Image Processing**: PIL (Python Imaging Library) for image manipulation and numpy for array operations
- **Prediction Pipeline**: Ultralytics YOLO integration for real-time object detection with confidence thresholding

## Data Storage Solutions
The system uses file-based storage:
- **Model Storage**: Pre-trained YOLO model stored as `best.pt` file
- **Static Assets**: Images, CSS, and JavaScript files served directly by Flask
- **No Database**: The application is stateless and doesn't persist user data or detection results

## Authentication and Authorization
Currently implements basic session management:
- **Session Secret**: Environment variable-based secret key for Flask sessions
- **No User Authentication**: Open access system without user registration or login requirements

## Machine Learning Architecture
The core detection system uses:
- **Model Type**: YOLOv8n (nano version) for efficient real-time detection
- **Training Data**: Custom dataset with 11 marine waste classes
- **Confidence Threshold**: 0.25 minimum confidence for detections
- **Output Format**: Bounding boxes with class labels overlaid on original images

# External Dependencies

## Core ML Dependencies
- **ultralytics**: YOLO model implementation and inference engine
- **PIL (Pillow)**: Image processing and manipulation
- **numpy**: Numerical operations for image arrays

## Web Framework Dependencies
- **Flask**: Web application framework and routing
- **flask-cors**: Cross-origin resource sharing support for API endpoints

## Frontend Dependencies
- **Bootstrap**: CSS framework for responsive UI design
- **Font Awesome**: Icon library for consistent iconography
- **Vanilla JavaScript**: Client-side interactions without additional frameworks

## Development Tools
- **XML parsing**: Built-in xml.etree.ElementTree for annotation format conversion
- **File operations**: Standard Python libraries for data splitting and organization

## Model Training Infrastructure
The repository includes utilities for:
- **Data annotation conversion**: XML to YOLO format conversion scripts
- **Dataset splitting**: Train/validation split utilities
- **Custom training**: YAML configuration for model training with custom marine waste classes