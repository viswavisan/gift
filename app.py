import os
import uuid
import sqlite3
import random
import string
from flask import Flask, render_template, request, jsonify, abort
from werkzeug.utils import secure_filename

app = Flask(__name__)
DB_FILE = 'gifts.db'
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max limit
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_ref_code():
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(6))

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def create_unique_id():
    conn = get_db_connection()
    while True:
        code = generate_ref_code()
        exists = conn.execute('SELECT 1 FROM gifts WHERE id = ?', (code,)).fetchone()
        if not exists:
            conn.close()
            return code

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS gifts (
            id TEXT PRIMARY KEY,
            recipient TEXT NOT NULL,
            occasion TEXT NOT NULL,
            wrap_style TEXT NOT NULL,
            gift_item TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS gift_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gift_id TEXT NOT NULL,
            title TEXT NOT NULL,
            image_url TEXT DEFAULT '',
            specs TEXT DEFAULT '',
            amazon_link TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gift_id) REFERENCES gifts (id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

# Initialize the database
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex[:12]}.{ext}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
        file.save(save_path)
        return jsonify({
            'success': True,
            'image_url': f"/static/uploads/{unique_name}"
        })
    return jsonify({'error': 'Invalid file type. Supported types: PNG, JPG, JPEG, WEBP, GIF'}), 400

@app.route('/create', methods=['POST'])
def create_gift():
    data = request.get_json(silent=True)
    if not data and request.form:
        data = request.form.to_dict()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    recipient = data.get('recipient', '').strip()
    occasion = data.get('occasion', 'Birthday').strip()
    wrap_style = 'wrap'
    gift_item = 'Pending Selection'
    message = data.get('message', '').strip()
    options_data = data.get('options', [])
    
    if not recipient or not message:
        return jsonify({'error': 'Recipient name and message are required'}), 400
    
    gift_id = create_unique_id()
    
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO gifts (id, recipient, occasion, wrap_style, gift_item, message) VALUES (?, ?, ?, ?, ?, ?)',
            (gift_id, recipient, occasion, wrap_style, gift_item, message)
        )
        if options_data and isinstance(options_data, list):
            for opt in options_data:
                if isinstance(opt, dict) and opt.get('title', '').strip():
                    conn.execute(
                        '''INSERT INTO gift_options (gift_id, title, image_url, specs, amazon_link)
                           VALUES (?, ?, ?, ?, ?)''',
                        (
                            gift_id,
                            opt.get('title', '').strip(),
                            opt.get('image_url', '').strip(),
                            opt.get('specs', '').strip(),
                            opt.get('amazon_link', '').strip()
                        )
                    )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    conn.close()
    
    # Generate URLs
    gift_url = f"{request.url_root}gift/{gift_id}"
    status_url = f"{request.url_root}status/{gift_id}"
    
    return jsonify({
        'success': True,
        'gift_id': gift_id,
        'gift_url': gift_url,
        'status_url': status_url,
        'ref_code': gift_id
    })

@app.route('/select/<gift_id>', methods=['POST'])
def select_gift(gift_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    gift_item = data.get('gift_item', '').strip()
    if not gift_item:
        return jsonify({'error': 'No gift selection provided'}), 400
    
    conn = get_db_connection()
    gift = conn.execute('SELECT * FROM gifts WHERE id = ?', (gift_id,)).fetchone()
    if not gift:
        conn.close()
        return jsonify({'error': 'Gift not found'}), 404
    
    try:
        conn.execute(
            'UPDATE gifts SET gift_item = ? WHERE id = ?',
            (gift_item, gift_id)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    conn.close()
    
    return jsonify({'success': True})

@app.route('/gift/<gift_id>')
def view_gift(gift_id):
    conn = get_db_connection()
    gift = conn.execute('SELECT * FROM gifts WHERE id = ?', (gift_id,)).fetchone()
    if gift is None:
        conn.close()
        abort(404, description="Gift not found")
        
    rows = conn.execute('SELECT * FROM gift_options WHERE gift_id = ? ORDER BY id ASC', (gift_id,)).fetchall()
    conn.close()

    options = [dict(r) for r in rows]
    if not options:
        # Default fallback options if none provided
        options = [
            {'id': 'iphone', 'title': 'iPhone 15 Pro Max', 'image_url': '/static/images/iphone.png', 'specs': 'Titanium design, A17 Pro chip', 'amazon_link': ''},
            {'id': 'ps5', 'title': 'PlayStation 5', 'image_url': '/static/images/ps5.png', 'specs': 'Ultra-high speed SSD, Ray tracing', 'amazon_link': ''},
            {'id': 'airpods', 'title': 'AirPods Max', 'image_url': '/static/images/airpods.png', 'specs': 'Active Noise Cancellation, Spatial Audio', 'amazon_link': ''},
            {'id': 'watch', 'title': 'Luxury Watch', 'image_url': '/static/images/watch.png', 'specs': 'Automatic movement, Sapphire crystal', 'amazon_link': ''}
        ]

    return render_template(
        'gift.html',
        gift_id=gift['id'],
        recipient=gift['recipient'],
        occasion=gift['occasion'],
        wrap_style=gift['wrap_style'],
        gift_item=gift['gift_item'],
        message=gift['message'],
        options=options
    )

@app.route('/status/<gift_id>')
def view_status(gift_id):
    conn = get_db_connection()
    gift = conn.execute('SELECT * FROM gifts WHERE id = ?', (gift_id,)).fetchone()
    if gift is None:
        conn.close()
        abort(404, description="Gift not found")
        
    rows = conn.execute('SELECT * FROM gift_options WHERE gift_id = ? ORDER BY id ASC', (gift_id,)).fetchall()
    conn.close()

    options = [dict(r) for r in rows]
    selected_option = None
    
    if gift['gift_item'] != 'Pending Selection':
        for opt in options:
            if str(opt['id']) == str(gift['gift_item']) or opt['title'] == gift['gift_item']:
                selected_option = opt
                break
        if not selected_option:
            legacy_map = {
                'iphone': {'title': 'iPhone 15 Pro Max', 'image_url': '/static/images/iphone.png', 'specs': 'Titanium design, A17 Pro chip', 'amazon_link': ''},
                'ps5': {'title': 'PlayStation 5', 'image_url': '/static/images/ps5.png', 'specs': 'Ultra-high speed SSD, Ray tracing', 'amazon_link': ''},
                'airpods': {'title': 'AirPods Max', 'image_url': '/static/images/airpods.png', 'specs': 'Active Noise Cancellation, Spatial Audio', 'amazon_link': ''},
                'watch': {'title': 'Luxury Watch', 'image_url': '/static/images/watch.png', 'specs': 'Automatic movement, Sapphire crystal', 'amazon_link': ''}
            }
            if gift['gift_item'] in legacy_map:
                selected_option = legacy_map[gift['gift_item']]
            else:
                selected_option = {'title': gift['gift_item'], 'image_url': '', 'specs': '', 'amazon_link': ''}

    return render_template(
        'status.html',
        gift_id=gift['id'],
        recipient=gift['recipient'],
        occasion=gift['occasion'],
        gift_item=gift['gift_item'],
        message=gift['message'],
        created_at=gift['created_at'],
        options=options,
        selected_option=selected_option
    )

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

