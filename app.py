import sqlite3
import random
import string
from flask import Flask, render_template, request, jsonify, abort

def generate_ref_code():
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(6))

def create_unique_id():
    conn = get_db_connection()
    while True:
        code = generate_ref_code()
        exists = conn.execute('SELECT 1 FROM gifts WHERE id = ?', (code,)).fetchone()
        if not exists:
            conn.close()
            return code

app = Flask(__name__)
DB_FILE = 'gifts.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

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
    conn.commit()
    conn.close()

# Initialize the database
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create', methods=['POST'])
def create_gift():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    recipient = data.get('recipient', '').strip()
    occasion = data.get('occasion', 'Birthday').strip()
    wrap_style = 'wrap'
    gift_item = 'Pending Selection'
    message = data.get('message', '').strip()
    
    if not recipient or not message:
        return jsonify({'error': 'Recipient name and message are required'}), 400
    
    gift_id = create_unique_id()
    
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO gifts (id, recipient, occasion, wrap_style, gift_item, message) VALUES (?, ?, ?, ?, ?, ?)',
            (gift_id, recipient, occasion, wrap_style, gift_item, message)
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
    conn.close()
    
    if gift is None:
        abort(404, description="Gift not found")
        
    return render_template(
        'gift.html',
        gift_id=gift['id'],
        recipient=gift['recipient'],
        occasion=gift['occasion'],
        wrap_style=gift['wrap_style'],
        gift_item=gift['gift_item'],
        message=gift['message']
    )

@app.route('/status/<gift_id>')
def view_status(gift_id):
    conn = get_db_connection()
    gift = conn.execute('SELECT * FROM gifts WHERE id = ?', (gift_id,)).fetchone()
    conn.close()
    
    if gift is None:
        abort(404, description="Gift not found")
        
    return render_template(
        'status.html',
        gift_id=gift['id'],
        recipient=gift['recipient'],
        occasion=gift['occasion'],
        gift_item=gift['gift_item'],
        message=gift['message'],
        created_at=gift['created_at']
    )

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
