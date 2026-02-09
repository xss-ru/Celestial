from flask import Flask, send_from_directory, request, jsonify, session
from flask_cors import CORS
import os
import requests
import time
import secrets
import re

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(32)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

BOT_TOKEN = os.getenv('BOT_TOKEN')
CHAT_ID = os.getenv('CHAT_ID')

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    return 8 <= len(password) <= 100

@app.route('/')
def index():
    return send_from_directory('.', 'web.html')

@app.route('/web.css')
def css():
    return send_from_directory('.', 'web.css')

@app.route('/web.js')
def js():
    return send_from_directory('.', 'web.js')

@app.route('/onion.jpg')
def image():
    return send_from_directory('.', 'onion.jpg')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'ошибка запроса'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'заполните все поля'}), 400
    
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'некорректный email'}), 400
    
    if not validate_password(password):
        return jsonify({'success': False, 'message': 'пароль должен быть от 8 до 100 символов'}), 400
    
    session['authenticated'] = True
    session['timestamp'] = time.time()
    session['user_email'] = email
    return jsonify({'success': True})

@app.route('/api/status')
def status():
    authenticated = session.get('authenticated', False)
    if authenticated:
        if time.time() - session.get('timestamp', 0) > 3600:
            session.clear()
            authenticated = False
    return jsonify({'authenticated': authenticated, 'email': session.get('user_email', '')})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000, threaded=True)