import os
import io
import logging
import tempfile
import requests
import base64
from flask import (
    Flask,
    render_template,
    request,
    Response,
    jsonify,
    flash,
    redirect,
    url_for,
)
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "marine-waste-detection-secret-key")
CORS(app, resources={r"/predict": {"origins": "*"}})

# Marine waste classes and their subclasses
MARINE_CLASSES = {
    "plastic": [
        "Bottle",
        "Shampoo-bottle",
        "Standing-bottle",
        "Drink-carton",
        "Plastic-bag",
        "Food-wrapper",
        "Straw",
        "Cup",
        "Lid",
        "Container",
        "plastic",
    ],
    "metal": [
        "Can",
        "Tin",
        "Aluminum-foil",
        "Metal-cap",
        "Metal-container",
        "Metal-scrap",
        "Wire",
        "Nail",
        "Bolt",
        "Screw",
        "metal",
    ],
    "fishing waste": [
        "Hook",
        "Fishing-line",
        "Fishing-net",
        "Buoy",
        "Fishing-gear",
        "Rope",
        "Float",
        "Trap",
        "Crab-pot",
        "Lead-weight",
        "fishing waste",
    ],
}

# Class colors for visualization (updated to match new requirements)
CLASS_COLORS = {
    "plastic": "#FF00FF",  # Magenta/Pink
    "metal": "#C7FC00",  # Lime Green
    "fishing waste": "#FE0056",  # Hot Pink/Red
}

# Debris information database for "Know Your Debris" library
DEBRIS_INFO = {
    "plastic": {
        "name": "Plastic Waste",
        "degradation_time": "450-1000 years",
        "environmental_path": "Ocean surface → Marine food chain → Microplastics in sediment",
        "icon": "fa-bottle-water",
        "description": "Plastic debris is one of the most persistent pollutants in marine environments. It breaks down into microplastics that enter the food chain.",
        "common_items": ["Bottles", "Bags", "Food wrappers", "Straws", "Containers"],
        "impact": "Ingestion by marine life, entanglement, toxic chemical leaching",
    },
    "metal": {
        "name": "Metal Waste",
        "degradation_time": "50-200 years",
        "environmental_path": "Ocean floor → Corrosion → Dissolved metals in water column",
        "icon": "fa-recycle",
        "description": "Metal waste corrodes in saltwater, releasing harmful chemicals and heavy metals into the marine ecosystem.",
        "common_items": ["Cans", "Metal containers", "Foil", "Fishing hooks", "Wire"],
        "impact": "Heavy metal contamination, habitat damage, sharp edges causing injury",
    },
    "fishing waste": {
        "name": "Fishing Waste",
        "degradation_time": "600+ years",
        "environmental_path": "Floating/submerged → Ghost fishing → Seafloor accumulation",
        "icon": "fa-fish",
        "description": "Abandoned fishing gear continues to trap and kill marine life (ghost fishing) for decades. Often made of durable synthetic materials.",
        "common_items": ["Nets", "Lines", "Buoys", "Traps", "Hooks"],
        "impact": "Ghost fishing, entanglement of marine mammals, habitat destruction",
    },
}


def categorize_detection(raw_class):
    """Categorize raw detection class into main categories."""
    if not raw_class:
        return "plastic"

    # Normalize the class name
    raw_class_lower = str(raw_class).lower().strip()

    # Direct mapping for YOLO model output
    if raw_class_lower in ["plastic", "plastic waste", "plastic wastes"]:
        return "plastic"
    elif raw_class_lower in ["metal", "metal waste", "metal wastes"]:
        return "metal"
    elif raw_class_lower in ["fishing waste", "fishing wastes", "fishing gear"]:
        return "fishing waste"

    # First try exact match
    for main_class, sub_classes in MARINE_CLASSES.items():
        if raw_class in sub_classes:
            return main_class

    # Try case-insensitive match
    for main_class, sub_classes in MARINE_CLASSES.items():
        if any(sub.lower() in raw_class_lower for sub in sub_classes) or any(
            raw_class_lower in sub.lower() for sub in sub_classes
        ):
            return main_class

    # Default to plastic if no match found
    return "plastic"


def load_model():
    """Load the Roboflow model configuration for marine waste detection."""
    try:
        # Create Roboflow API configuration
        roboflow_config = {
            "api_url": "https://detect.roboflow.com",
            "api_key": "W6Khbwl6kDNfKx1OGBSo",
            "model_id": "debris-detection-pasan-7azav/1",
        }

        logging.info("Roboflow API configuration loaded successfully")
        return roboflow_config
    except Exception as e:
        logging.warning(
            f"Error loading Roboflow configuration: {str(e)}, running in demo mode"
        )
        return "demo_mode"


def inference(model, image):
    """Perform inference on the input image using Roboflow API or demo mode."""
    try:
        # Always start with demo mode values that we can override
        demo_mode = model == "demo_mode"

        # Convert image to bytes for API and for demo if needed
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="JPEG", quality=85)

        if not demo_mode:
            try:
                # Prepare API request
                api_url = f"{model['api_url']}/{model['model_id']}"
                confidence = float(request.form.get("confidence", 0.1))

                # Make API request
                response = requests.post(
                    api_url,
                    params={
                        "api_key": model["api_key"],
                        "confidence": max(
                            0.01, min(confidence, 0.99)
                        ),  # Ensure confidence is within valid range
                        "overlap": 0.5,
                    },
                    files={"file": ("image.jpg", image_bytes.getvalue(), "image/jpeg")},
                    timeout=30,
                )

                if response.status_code == 200:
                    result = response.json()
                    logging.info(
                        f"Roboflow API response: {len(result.get('predictions', []))} detections found"
                    )

                    # Process successful response
                    label_mode = request.form.get("label_mode", "class_confidence")
                    result_image = draw_detections(image, result, label_mode)

                    # Extract and categorize detections
                    detections = []
                    detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}

                    if "predictions" in result:
                        for detection in result["predictions"]:
                            raw_class = detection.get("class", "Unknown")
                            categorized_class = categorize_detection(raw_class)
                            detection_counts[categorized_class] += 1

                            detection_info = {
                                "raw_class": raw_class,
                                "class_name": categorized_class,
                                "confidence": detection.get("confidence", 0.0),
                                "bbox": [
                                    detection.get("x", 0)
                                    - detection.get("width", 0) / 2,
                                    detection.get("y", 0)
                                    - detection.get("height", 0) / 2,
                                    detection.get("x", 0)
                                    + detection.get("width", 0) / 2,
                                    detection.get("y", 0)
                                    + detection.get("height", 0) / 2,
                                ],
                                "center": {
                                    "x": detection.get("x", 0),
                                    "y": detection.get("y", 0),
                                },
                            }
                            detections.append(detection_info)

                    # Convert final image to bytes
                    result_bytes = io.BytesIO()
                    result_image.save(result_bytes, format="JPEG")
                    result_bytes.seek(0)

                    return result_bytes.getvalue(), detections, detection_counts
                else:
                    logging.error(
                        f"Roboflow API error {response.status_code}: {response.text}"
                    )
                    demo_mode = True  # Fall back to demo mode

            except requests.exceptions.RequestException as e:
                logging.error(f"Network error during API request: {str(e)}")
                demo_mode = True  # Fall back to demo mode
            except Exception as e:
                logging.error(f"Unexpected error during API processing: {str(e)}")
                demo_mode = True  # Fall back to demo mode

        # If we get here, either we're in demo mode or we had an error and fell back to it
        if demo_mode:
            try:
                demo_image = create_demo_image(image)
                demo_bytes = io.BytesIO()
                demo_image.save(demo_bytes, format="JPEG")
                demo_bytes.seek(0)

                # Create sample detections for demo mode
                detections = [
                    {
                        "raw_class": "metal",
                        "class_name": "metal",
                        "confidence": 0.85,
                        "bbox": [100, 100, 150, 150],
                        "center": {"x": 125, "y": 125},
                    },
                    {
                        "raw_class": "plastic",
                        "class_name": "plastic",
                        "confidence": 0.92,
                        "bbox": [200, 200, 250, 250],
                        "center": {"x": 225, "y": 225},
                    },
                    {
                        "raw_class": "fishing waste",
                        "class_name": "fishing waste",
                        "confidence": 0.78,
                        "bbox": [300, 150, 350, 200],
                        "center": {"x": 325, "y": 175},
                    },
                ]

                detection_counts = {"fishing waste": 1, "metal": 1, "plastic": 1}

                return demo_bytes.getvalue(), detections, detection_counts

            except Exception as e:
                logging.error(f"Error in demo mode: {str(e)}")
                raise

    except Exception as e:
        logging.error(f"Critical error in inference: {str(e)}")
        # Return a black image with error text as a last resort
        error_img = Image.new("RGB", (800, 600), color="black")
        draw = ImageDraw.Draw(error_img)
        try:
            font = ImageFont.load_default()
            draw.text((50, 50), "Error processing image", fill="white", font=font)
            draw.text((50, 80), str(e), fill="white", font=font)
        except:
            pass

        error_bytes = io.BytesIO()
        error_img.save(error_bytes, format="JPEG")
        error_bytes.seek(0)

        return (
            error_bytes.getvalue(),
            [],
            {"fishing waste": 0, "metal": 0, "plastic": 0},
        )


def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def draw_detections(image, result, label_mode="class_confidence"):
    """Draw detection boxes and labels on the image with category-specific colors."""
    try:
        # Create a copy of the image to draw on
        result_img = image.copy()
        draw = ImageDraw.Draw(result_img)

        # Try to load a font
        try:
            # Try to load a larger font if available
            try:
                font = ImageFont.truetype("Arial.ttf", 14)
            except:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()

        # Define colors for each category (updated colors)
        category_colors = {
            "plastic": "#FF00FF",  # Magenta/Pink
            "metal": "#C7FC00",  # Lime Green
            "fishing waste": "#FE0056",  # Hot Pink/Red
        }

        # Draw each detection with class-specific colors
        if "predictions" in result:
            for detection in result["predictions"]:
                # Extract detection data
                x = detection.get("x", 0)
                y = detection.get("y", 0)
                width = detection.get("width", 0)
                height = detection.get("height", 0)
                confidence = detection.get("confidence", 0.0)
                class_name = detection.get("class", "Unknown")

                # Categorize the detection
                category = categorize_detection(class_name)

                # Get color based on category
                color_hex = category_colors.get(
                    category, "#FF00FF"
                )  # Default to magenta
                color_rgb = hex_to_rgb(color_hex)

                # Calculate box coordinates
                left = max(0, x - width / 2)
                top = max(0, y - height / 2)
                right = min(image.width, x + width / 2)
                bottom = min(image.height, y + height / 2)

                # Draw rectangle with thicker border
                border_width = max(
                    2, int(min(image.width, image.height) * 0.004)
                )  # Dynamic border width

                # Draw main rectangle
                draw.rectangle(
                    [left, top, right, bottom], outline=color_rgb, width=border_width
                )

                # Draw a second rectangle inside for better visibility
                inner_offset = border_width * 2
                draw.rectangle(
                    [
                        left + inner_offset,
                        top + inner_offset,
                        right - inner_offset,
                        bottom - inner_offset,
                    ],
                    outline=color_rgb,
                    width=1,
                )

                # Prepare label text based on mode
                if label_mode == "class_confidence":
                    label = f"{class_name} {confidence:.1%}"
                elif label_mode == "class_only":
                    label = class_name
                elif label_mode == "confidence_only":
                    label = f"{confidence:.1%}"
                else:
                    label = ""

                # Draw label background and text
                if label and font:
                    try:
                        # Get text size
                        text_bbox = draw.textbbox((0, 0), label, font=font)
                        text_width = text_bbox[2] - text_bbox[0]
                        text_height = text_bbox[3] - text_bbox[1]

                        # Ensure label is within image bounds
                        label_left = max(0, min(left, image.width - text_width - 10))
                        label_top = max(
                            0,
                            min(top - text_height - 5, image.height - text_height - 5),
                        )

                        # Draw background for text with some padding
                        padding = 5
                        draw.rectangle(
                            [
                                label_left - padding,
                                label_top - padding,
                                label_left + text_width + padding * 2,
                                label_top + text_height + padding,
                            ],
                            fill=color_rgb,
                            outline=color_rgb,
                        )

                        # Draw text with shadow for better visibility
                        shadow_offset = 1
                        draw.text(
                            (
                                label_left + padding + shadow_offset,
                                label_top + shadow_offset,
                            ),
                            label,
                            fill=(0, 0, 0, 128),  # Semi-transparent black for shadow
                            font=font,
                        )
                        draw.text(
                            (label_left + padding, label_top),
                            label,
                            fill="white",
                            font=font,
                        )
                    except Exception as e:
                        logging.error(f"Error drawing label: {str(e)}")

        return result_img

    except Exception as e:
        logging.error(f"Error in draw_detections: {str(e)}")
        return image


def create_demo_image(image):
    """Create a demo image with placeholder detection boxes."""
    try:
        from PIL import ImageDraw, ImageFont

        # Create a copy of the image to draw on
        demo_img = image.copy()
        draw = ImageDraw.Draw(demo_img)

        # Get image dimensions
        width, height = demo_img.size

        # Add demo bounding boxes and labels
        demo_detections = [
            {
                "label": "Demo: Bottle",
                "box": (width * 0.2, height * 0.3, width * 0.4, height * 0.6),
            },
            {
                "label": "Demo: Can",
                "box": (width * 0.6, height * 0.4, width * 0.8, height * 0.7),
            },
        ]

        # Draw demo boxes
        for detection in demo_detections:
            box = detection["box"]
            label = detection["label"]

            # Draw rectangle
            draw.rectangle(box, outline="red", width=3)

            # Draw label background
            try:
                font = ImageFont.load_default()
            except:
                font = None

            if font:
                bbox = draw.textbbox((0, 0), label, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            else:
                text_width, text_height = len(label) * 6, 11

            draw.rectangle(
                [box[0], box[1] - text_height - 4, box[0] + text_width + 4, box[1]],
                fill="red",
            )

            # Draw label text
            draw.text(
                (box[0] + 2, box[1] - text_height - 2), label, fill="white", font=font
            )

        # Convert to bytes
        image_bytes = io.BytesIO()
        demo_img.save(image_bytes, format="JPEG")
        image_bytes.seek(0)

        return image_bytes.getvalue()

    except Exception as e:
        logging.error(f"Error creating demo image: {str(e)}")
        # Return original image if demo creation fails
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="JPEG")
        image_bytes.seek(0)
        return image_bytes.getvalue()


@app.route("/")
def home():
    """Home page route."""
    return render_template(
        "index.html",
        classes=MARINE_CLASSES,
        class_colors=CLASS_COLORS,
        debris_info=DEBRIS_INFO,
    )


@app.route("/api/debris-info")
def debris_info():
    """API endpoint to get debris information for the library."""
    return jsonify(DEBRIS_INFO)


@app.route("/predict", methods=["POST"])
def predict():
    """Prediction route for processing uploaded images."""
    if request.method == "POST":
        try:
            # Check if image file is present in the request
            if "image" not in request.files:
                flash("No image file uploaded", "error")
                return redirect(url_for("home"))

            image_file = request.files["image"]

            # Check if file is selected
            if image_file.filename == "":
                flash("No image file selected", "error")
                return redirect(url_for("home"))

            # Validate file type
            allowed_extensions = {"png", "jpg", "jpeg", "gif", "bmp"}
            if not (
                "." in image_file.filename
                and image_file.filename.rsplit(".", 1)[1].lower() in allowed_extensions
            ):
                flash("Invalid file type. Please upload an image file.", "error")
                return redirect(url_for("home"))

            # Read the image file
            try:
                image = Image.open(image_file)
                # Fix image orientation based on EXIF data
                image = ImageOps.exif_transpose(image)
                # Convert RGBA to RGB if necessary
                if image.mode == "RGBA":
                    image = image.convert("RGB")
            except Exception as e:
                flash(f"Error processing image: {str(e)}", "error")
                return redirect(url_for("home"))

            # Load the YOLO model
            model = load_model()
            if model is None:
                flash(
                    "Model not available. Please ensure the model file exists.", "error"
                )
                return redirect(url_for("home"))
            elif model == "demo_mode":
                flash(
                    "Running in demo mode - showing sample detections. Roboflow API may be temporarily unavailable.",
                    "info",
                )

            # Perform inference on the image
            result_image_bytes, detections, detection_counts = inference(model, image)

            if result_image_bytes is None:
                flash("Error during image processing", "error")
                return redirect(url_for("home"))

            # Check if this is a request for JSON data
            if request.args.get("format") == "json":
                return jsonify(
                    {
                        "success": True,
                        "detections": detections,
                        "detection_counts": detection_counts,
                        "total_objects": len(detections),
                        "debris_info": DEBRIS_INFO,
                    }
                )

            # Return the result image as bytes for direct image requests
            return Response(result_image_bytes, mimetype="image/jpeg")

        except Exception as e:
            logging.error(f"Error in predict route: {str(e)}")
            flash(f"An error occurred: {str(e)}", "error")
            return redirect(url_for("home"))


@app.route("/health")
def health_check():
    """Health check endpoint."""
    model = load_model()
    model_available = model is not None and model != "demo_mode"
    demo_mode = model == "demo_mode"

    return jsonify(
        {
            "status": "healthy",
            "model_available": model_available,
            "demo_mode": demo_mode,
            "classes": MARINE_CLASSES,
            "message": "Demo mode active - Roboflow API may be temporarily unavailable"
            if demo_mode
            else "Real Roboflow marine debris detection model loaded",
        }
    )


@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors."""
    return render_template("index.html", error="Page not found"), 404


@app.errorhandler(500)
def internal_server_error(e):
    """Handle 500 errors."""
    return render_template("index.html", error="Internal server error"), 500


class VideoCamera:
    """Class to handle video camera operations."""

    def __init__(self):
        self.video = cv2.VideoCapture(0)
        self.video.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.video.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    def __del__(self):
        self.video.release()

    def get_frame(self):
        """Get a frame from the camera."""
        success, frame = self.video.read()
        if not success:
            return None
        return frame

    def release(self):
        """Release the camera."""
        if self.video.isOpened():
            self.video.release()


def process_frame_detections(frame):
    """Process a single frame and return detections."""
    global latest_detections

    try:
        # Convert frame to PIL Image
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)

        # Prepare image for API
        image_bytes = io.BytesIO()
        pil_image.save(image_bytes, format="JPEG", quality=85)
        image_bytes.seek(0)

        # Load model config
        model = load_model()

        if model == "demo_mode":
            # Demo mode - generate sample detections
            detections = []
            detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}
        else:
            # Real API call
            try:
                api_url = f"{model['api_url']}/{model['model_id']}"
                response = requests.post(
                    api_url,
                    params={
                        "api_key": model["api_key"],
                        "confidence": 0.1,
                        "overlap": 0.5,
                    },
                    files={"file": ("frame.jpg", image_bytes.getvalue(), "image/jpeg")},
                    timeout=5,  # Shorter timeout for video
                )

                if response.status_code == 200:
                    result = response.json()
                    detections = []
                    detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}

                    if "predictions" in result:
                        for detection in result["predictions"]:
                            raw_class = detection.get("class", "Unknown")
                            categorized_class = categorize_detection(raw_class)
                            detection_counts[categorized_class] += 1

                            detection_info = {
                                "raw_class": raw_class,
                                "class_name": categorized_class,
                                "confidence": detection.get("confidence", 0.0),
                                "bbox": [
                                    detection.get("x", 0)
                                    - detection.get("width", 0) / 2,
                                    detection.get("y", 0)
                                    - detection.get("height", 0) / 2,
                                    detection.get("x", 0)
                                    + detection.get("width", 0) / 2,
                                    detection.get("y", 0)
                                    + detection.get("height", 0) / 2,
                                ],
                                "center": {
                                    "x": detection.get("x", 0),
                                    "y": detection.get("y", 0),
                                },
                            }
                            detections.append(detection_info)

                        # Store detections for heatmap
                        latest_detections.extend(detections)
                else:
                    detections = []
                    detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}
            except Exception as e:
                logging.error(f"API error during frame processing: {str(e)}")
                detections = []
                detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}

        return detections, detection_counts

    except Exception as e:
        logging.error(f"Error processing frame: {str(e)}")
        return [], {"fishing waste": 0, "metal": 0, "plastic": 0}


def draw_detections_on_frame(frame, detections):
    """Draw bounding boxes and labels on frame."""
    if not detections:
        return frame

    frame_height, frame_width = frame.shape[:2]

    # Color mapping
    color_map = {
        "plastic": (255, 0, 255),  # BGR format for OpenCV (Magenta)
        "metal": (0, 252, 199),  # BGR format (Lime Green)
        "fishing waste": (86, 0, 254),  # BGR format (Hot Pink/Red)
    }

    for detection in detections:
        try:
            bbox = detection["bbox"]
            class_name = detection["class_name"]
            confidence = detection["confidence"]

            # Get color
            color = color_map.get(class_name, (255, 255, 255))

            # Convert bbox coordinates
            x1 = int(bbox[0])
            y1 = int(bbox[1])
            x2 = int(bbox[2])
            y2 = int(bbox[3])

            # Draw rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Prepare label
            label = f"{class_name} {confidence:.1%}"

            # Get text size
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            thickness = 1
            (text_width, text_height), baseline = cv2.getTextSize(
                label, font, font_scale, thickness
            )

            # Draw label background
            cv2.rectangle(
                frame,
                (x1, y1 - text_height - 10),
                (x1 + text_width + 10, y1),
                color,
                -1,
            )

            # Draw label text
            cv2.putText(
                frame,
                label,
                (x1 + 5, y1 - 5),
                font,
                font_scale,
                (255, 255, 255),
                thickness,
            )

        except Exception as e:
            logging.error(f"Error drawing detection: {str(e)}")
            continue

    return frame


def draw_heatmap_on_frame(frame, detections_history):
    """Draw heatmap overlay on frame based on detection history."""
    if not detections_history or len(detections_history) == 0:
        return frame

    frame_height, frame_width = frame.shape[:2]

    # Create heatmap
    heatmap = np.zeros((frame_height, frame_width), dtype=np.float32)

    # Grid size for heatmap
    grid_size = 50

    # Count detections in grid
    for detection in detections_history:
        try:
            center = detection.get("center", {})
            x = int(center.get("x", 0))
            y = int(center.get("y", 0))

            # Add gaussian blob around detection center
            for dy in range(-grid_size, grid_size):
                for dx in range(-grid_size, grid_size):
                    px = x + dx
                    py = y + dy

                    if 0 <= px < frame_width and 0 <= py < frame_height:
                        distance = np.sqrt(dx**2 + dy**2)
                        if distance < grid_size:
                            weight = np.exp(-(distance**2) / (2 * (grid_size / 3) ** 2))
                            heatmap[py, px] += weight
        except Exception as e:
            continue

    # Normalize heatmap
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()

    # Apply colormap
    heatmap_colored = cv2.applyColorMap(
        (heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET
    )

    # Blend with original frame
    alpha = 0.4
    frame = cv2.addWeighted(frame, 1 - alpha, heatmap_colored, alpha, 0)

    return frame


def generate_frames():
    """Generate frames for video streaming."""
    global camera, camera_active, latest_detections, heatmap_enabled

    while camera_active:
        if camera is None:
            break

        frame = camera.get_frame()
        if frame is None:
            break

        # Process detections every few frames to improve performance
        detections, _ = process_frame_detections(frame)

        # Draw detections
        frame = draw_detections_on_frame(frame, detections)

        # Draw heatmap if enabled
        if heatmap_enabled and len(latest_detections) > 0:
            frame = draw_heatmap_on_frame(frame, list(latest_detections))

        # Encode frame
        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")


@app.route("/camera/start", methods=["POST"])
def start_camera():
    """Start the camera for live detection."""
    global camera, camera_active, camera_lock

    try:
        with camera_lock:
            if camera_active:
                return jsonify({"success": False, "message": "Camera already active"})

            camera = VideoCamera()
            camera_active = True

        return jsonify({"success": True, "message": "Camera started"})
    except Exception as e:
        logging.error(f"Error starting camera: {str(e)}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/camera/stop", methods=["POST"])
def stop_camera():
    """Stop the camera."""
    global camera, camera_active, camera_lock, latest_detections

    try:
        with camera_lock:
            if camera:
                camera.release()
                camera = None
            camera_active = False
            latest_detections.clear()

        return jsonify({"success": True, "message": "Camera stopped"})
    except Exception as e:
        logging.error(f"Error stopping camera: {str(e)}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/camera/toggle_heatmap", methods=["POST"])
def toggle_heatmap():
    """Toggle heatmap overlay."""
    global heatmap_enabled

    try:
        heatmap_enabled = not heatmap_enabled
        return jsonify({"success": True, "heatmap_enabled": heatmap_enabled})
    except Exception as e:
        logging.error(f"Error toggling heatmap: {str(e)}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/video_feed")
def video_feed():
    """Video streaming route."""
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/camera/status")
def camera_status():
    """Get camera status."""
    global camera_active, heatmap_enabled, latest_detections

    detection_counts = {"fishing waste": 0, "metal": 0, "plastic": 0}

    # Count recent detections
    for detection in latest_detections:
        class_name = detection.get("class_name", "")
        if class_name in detection_counts:
            detection_counts[class_name] += 1

    return jsonify(
        {
            "active": camera_active,
            "heatmap_enabled": heatmap_enabled,
            "total_detections": len(latest_detections),
            "detection_counts": detection_counts,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
