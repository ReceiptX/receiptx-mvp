"""
PaddleOCR Flask Server for Receipt OCR
Handles image OCR processing for the ReceiptX app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import sys

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Try to import PaddleOCR
try:
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(lang='en')
    PADDLEOCR_AVAILABLE = True
    print("✅ PaddleOCR initialized successfully!")
except Exception as e:
    PADDLEOCR_AVAILABLE = False
    ocr = None
    print(f"⚠️  PaddleOCR not available: {str(e)}")
    print("\nTo fix this issue:")
    print("1. Python 3.14 is too new for PaddlePaddle")
    print("2. Install Python 3.9-3.11 from python.org")
    print("3. Run: pip install paddlepaddle paddleocr flask flask-cors")
    print("\nServer will run in FALLBACK mode (returns mock data)\n")

try:
    from PIL import Image
    import numpy as np
    PIL_AVAILABLE = True
except:
    PIL_AVAILABLE = False
    print("⚠️  PIL/Numpy not fully available")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'paddleocr_available': PADDLEOCR_AVAILABLE,
        'python_version': sys.version
    })


@app.route('/ocr', methods=['POST'])
def process_ocr():
    """Process image and extract text using OCR"""
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    try:
        # Read image
        img_bytes = file.read()
        
        # If PaddleOCR is available, use it
        if PADDLEOCR_AVAILABLE and PIL_AVAILABLE:
            return process_with_paddleocr(img_bytes)
        else:
            return process_fallback(img_bytes)
            
    except Exception as e:
        return jsonify({
            'error': f'OCR processing failed: {str(e)}'
        }), 500


def process_with_paddleocr(img_bytes):
    """Process image with PaddleOCR"""
    try:
        # Convert to PIL Image
        img = Image.open(io.BytesIO(img_bytes))
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_array = np.array(img)
        
        print(f"Processing image with shape: {img_array.shape}, dtype: {img_array.dtype}")
        
        # Run OCR - use predict instead of ocr
        result = ocr.ocr(img_array)
        
        print(f"OCR result type: {type(result)}, length: {len(result) if result else 0}")
        
        # Extract text from result
        text_lines = []
        total_confidence = 0
        line_count = 0
        
        if result and len(result) > 0 and result[0]:
            for line in result[0]:
                try:
                    if line and len(line) >= 2:
                        text = line[1][0]
                        conf = line[1][1] if len(line[1]) >= 2 else 0.0
                        text_lines.append(text)
                        total_confidence += conf
                        line_count += 1
                except Exception as line_error:
                    print(f"Error processing line: {line_error}")
                    continue
        
        full_text = '\n'.join(text_lines) if text_lines else "No text detected"
        avg_confidence = total_confidence / line_count if line_count > 0 else 0
        
        print(f"✅ Extracted {line_count} lines")
        
        return jsonify({
            'text': full_text,
            'confidence': round(avg_confidence, 2),
            'lines_detected': line_count,
            'method': 'paddleocr'
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ ERROR in PaddleOCR processing: {str(e)}")
        print(error_trace)
        return jsonify({
            'error': f'PaddleOCR processing error: {str(e)}',
            'details': error_trace
        }), 500


def process_fallback(img_bytes):
    """Fallback method when PaddleOCR is not available"""
    print("⚠️  Using fallback OCR (mock data)")
    
    # Return mock data for testing
    import datetime
    mock_text = f"""RECEIPT
Store Name: Sample Store
Date: {datetime.datetime.now().strftime('%Y-%m-%d')}
Time: {datetime.datetime.now().strftime('%H:%M')}

Items:
Coffee         $4.50
Sandwich       $8.95
Chips          $2.50

Subtotal:     $15.95
Tax:           $1.28
Total:        $17.23

Thank you!
"""
    
    return jsonify({
        'text': mock_text.strip(),
        'confidence': 0.5,
        'lines_detected': 12,
        'method': 'fallback',
        'warning': 'PaddleOCR not available - using mock data. Please install Python 3.9-3.11 and PaddlePaddle.'
    })


@app.route('/', methods=['GET'])
def index():
    """Root endpoint with instructions"""
    status = "✅ READY" if PADDLEOCR_AVAILABLE else "⚠️  FALLBACK MODE"
    
    return f"""
    <h1>PaddleOCR Server {status}</h1>
    <p><strong>Status:</strong> {status}</p>
    <p><strong>PaddleOCR Available:</strong> {PADDLEOCR_AVAILABLE}</p>
    <p><strong>Python Version:</strong> {sys.version}</p>
    
    <h2>Endpoints:</h2>
    <ul>
        <li><code>GET /health</code> - Health check</li>
        <li><code>POST /ocr</code> - Process OCR (send image as 'file' in multipart/form-data)</li>
    </ul>
    
    {'' if PADDLEOCR_AVAILABLE else '''
    <h2>⚠️ Setup Required</h2>
    <p>PaddleOCR is not working. To fix:</p>
    <ol>
        <li>Install Python 3.9, 3.10, or 3.11 (3.14 is too new)</li>
        <li>Run: <code>pip install paddlepaddle paddleocr flask flask-cors pillow numpy</code></li>
        <li>Restart this server</li>
    </ol>
    <p>Currently using fallback mode with mock data.</p>
    '''}
    """


if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 Starting PaddleOCR Server")
    print("="*50)
    print(f"PaddleOCR Available: {PADDLEOCR_AVAILABLE}")
    print(f"Python Version: {sys.version}")
    print("Server running on http://localhost:8000")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=8000, debug=False)
