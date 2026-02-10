from flask import Flask, request, jsonify, session, send_from_directory, make_response
from flask_cors import CORS
import os
import time
import requests
import json
from datetime import datetime
import hashlib
import re

app = Flask(__name__)
app.secret_key = 'celestial-secret-key-2027'
CORS(app, supports_credentials=True)

OPENROUTER_API_KEY = "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"

def load_credentials():
    users_str = os.getenv('USERS', '')
    credentials = []
    
    if users_str:
        user_entries = users_str.split(',')
        for entry in user_entries:
            entry = entry.strip()
            if ':' in entry:
                parts = entry.split(':', 1)
                if len(parts) == 2:
                    email = parts[0].strip()
                    password = parts[1].strip()
                    if email and password:
                        credentials.append({'email': email, 'password': password})
    
    return credentials

def check_credentials(email, password):
    email = email.strip().lower()
    credentials = load_credentials()
    
    for cred in credentials:
        if cred['email'].lower() == email and cred['password'] == password:
            return True
    return False

def get_user_history_path(email):
    safe_email = re.sub(r'[^a-zA-Z0-9]', '_', email)
    return f"user_history/{safe_email}_history.json"

def load_user_history(email):
    history_path = get_user_history_path(email)
    if os.path.exists(history_path):
        try:
            with open(history_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_user_history(email, history):
    os.makedirs("user_history", exist_ok=True)
    history_path = get_user_history_path(email)
    try:
        with open(history_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.before_request
def check_auth():
    if request.path.startswith('/static/') or \
       request.path.startswith('/api/') or \
       request.path in ['/', '/web.css', '/web.js', '/DataBase/web.css', '/DataBase/web.js', 
                       '/onion.mp4', '/onion.jpg', '/onion.gif']:
        return
    
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    login_time = session.get('login_time', 0)
    if time.time() - login_time > 24 * 60 * 60:
        session.clear()
        return jsonify({'error': 'Session expired'}), 401

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        print(f"Login attempt: {email}")
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        if check_credentials(email, password):
            session['authenticated'] = True
            session['email'] = email
            session['login_time'] = time.time()
            
            user_history = load_user_history(email)
            session['ai_history'] = user_history
            
            print(f"User logged in: {email}")
            return jsonify({'success': True, 'email': email, 'message': 'Login successful'})
        else:
            print(f"Failed login: {email}")
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
            
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/status', methods=['GET'])
def check_status():
    if session.get('authenticated'):
        login_time = session.get('login_time', 0)
        if time.time() - login_time < 24 * 60 * 60:
            return jsonify({'authenticated': True, 'email': session.get('email')})
    session.clear()
    return jsonify({'authenticated': False})

@app.route('/api/logout', methods=['POST'])
def logout():
    email = session.get('email', 'Unknown')
    if email != 'Unknown':
        save_user_history(email, session.get('ai_history', []))
    session.clear()
    print(f"User logged out: {email}")
    return jsonify({'success': True})

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        chat_history = data.get('history', [])
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        messages = []
        
        for msg in chat_history[-10:]:
            if msg['type'] == 'user':
                messages.append({"role": "user", "content": msg['content']})
            elif msg['type'] == 'ai':
                messages.append({"role": "assistant", "content": msg['content']})
        
        messages.append({"role": "user", "content": message})
        
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                data=json.dumps({
                    "model": "openrouter/free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "Ты Celestial AI, продвинутый русскоязычный ассистент. Отвечай на русском языке. Будь полезным, точным и детальным. Форматируй ответы с четкими абзацами и выделяй важные термины жирным шрифтом (**жирный**). Используй маркированные списки для перечислений."
                        },
                        *messages
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "frequency_penalty": 0.1,
                    "presence_penalty": 0.1,
                    "stream": False
                }),
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"OpenRouter API error: {response.status_code}, {response.text}")
                raise Exception("API error")
            
            result = response.json()
            
            if 'choices' not in result or not result['choices']:
                raise Exception("No response from AI")
            
            ai_message = result['choices'][0]['message']['content']
            
        except Exception as e:
            print(f"OpenRouter error: {e}")
            fallback_responses = [
                "Я понимаю ваш вопрос, но в данный момент испытываю технические сложности. Попробуйте задать вопрос еще раз через несколько минут.",
                "Спасибо за ваш вопрос. Пожалуйста, повторите его немного позже, когда соединение восстановится.",
                "Произошла временная ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз."
            ]
            ai_message = fallback_responses[len(message) % len(fallback_responses)]
        
        if 'ai_history' not in session:
            session['ai_history'] = []
        
        session['ai_history'].append({
            'user': message,
            'ai': ai_message,
            'timestamp': datetime.now().isoformat()
        })
        
        if len(session['ai_history']) > 50:
            session['ai_history'] = session['ai_history'][-50:]
        
        email = session.get('email')
        if email:
            save_user_history(email, session['ai_history'])
        
        return jsonify({
            'success': True,
            'message': ai_message,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"AI chat error: {str(e)}")
        return jsonify({
            'success': True,
            'message': "Произошла внутренняя ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.",
            'timestamp': datetime.now().isoformat()
        })

@app.route('/api/ai/history', methods=['GET'])
def ai_history():
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'history': session.get('ai_history', []),
        'authenticated': True
    })

@app.route('/api/ai/clear', methods=['POST'])
def clear_ai_history():
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    session['ai_history'] = []
    email = session.get('email')
    if email:
        save_user_history(email, [])
    
    return jsonify({'success': True})

@app.route('/')
def serve_index():
    return send_from_directory('.', 'web.html')

@app.route('/web.css')
def serve_css():
    return send_from_directory('.', 'web.css')

@app.route('/web.js')
def serve_js():
    return send_from_directory('.', 'web.js')

@app.route('/onion.mp4')
def serve_video():
    return send_from_directory('.', 'onion.mp4')

@app.route('/onion.jpg')
def serve_image():
    return send_from_directory('.', 'onion.jpg')

@app.route('/onion.gif')
def serve_gif():
    return send_from_directory('.', 'onion.gif')

@app.route('/celestial-ai')
def celestial_ai():
    return send_from_directory('Celestial_AI', 'web.html')

@app.route('/celestial-ai/<path:filename>')
def celestial_ai_static(filename):
    return send_from_directory('Celestial_AI', filename)

@app.route('/celestial-ai/bot.jpg')
def serve_bot_image():
    return send_from_directory('Celestial_AI', 'bot.jpg')

@app.route('/search')
def search():
    return send_from_directory('Search', 'web.html')

@app.route('/search/<path:filename>')
def search_static(filename):
    return send_from_directory('Search', filename)

@app.route('/database')
def database():
    return send_from_directory('DataBase', 'web.html')

@app.route('/database/web.css')
def database_css():
    return send_from_directory('DataBase', 'web.css')

@app.route('/database/web.js')
def database_js():
    return send_from_directory('DataBase', 'web.js')

@app.route('/database/<path:filename>')
def database_static(filename):
    return send_from_directory('DataBase', filename)

@app.route('/services')
def services():
    return send_from_directory('Services', 'web.html')

@app.route('/services/<path:filename>')
def services_static(filename):
    return send_from_directory('Services', filename)

@app.route('/about')
def about():
    return send_from_directory('About', 'web.html')

@app.route('/about/<path:filename>')
def about_static(filename):
    return send_from_directory('About', filename)

@app.route('/database.txt')
def serve_database_txt():
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    database_content = """Базы данных находящиеся на серверах:

Сбербанк (клиенты): ~200 млн.                 Delivery Club / Яндекс.Еда: 22 млн.               Wildberries: 34 млн.
DNS-shop: 11 млн.                             Юла (Yula): 30 млн.                               Avito (учетки): 35 млн.
2ГИС (сотрудники): 225 тыс.                   Магнит (персонал): 130 тыс.                       СберСпасибо: 5.2 млн.
HeadHunter (hh.ru): 40 млн.                   Госуслуги (данные): ~140 млн.                     Билайн (абоненты): 8.7 млн.
МТС (клиенты): 3.7 млн.                       МегаФон (база): 1 млн.                            Tele2 (полная база): 126 млн.
Тинькофф Банк: 30 млн.                        Альфа-Банк (клиенты): 3.5 тыс.                    ВТБ (спецвыборка): 60 тыс.
Банк Открытие: 10 млн.                        Почта Банк: 780 тыс.                              Райффайзенбанк: 800 тыс.
QIWI кошельки: 22 млн.                        Яндекс.Такси (партнеры): 15 млн.                  Ситимобил: 33 млн.
ВкусВилл: 2.5 млн.                            Перекресток: 2.7 млн.                             Лента (база): 130 тыс.
Ашан (сотрудники): 1.4 тыс.                   Детский мир: 567 тыс.                             Lamoda: 11 млн.
Wildberries (фулл): 50 млн.                   Ozon: 9 млн.                                      Связной: 22 млн.
Евросеть: 20 млн.                             М.Видео: 3.4 млн.                                 Эльдорадо: 5.6 млн.
Ситилинк: 2.8 млн.                            Онлайнер: 4.2 млн.                                ТопШоп (TopShop): 2.1 млн.
Гемотест (лаборатория): 400 тыс.              Инвитро: 4.5 млн.                                 Сбераптека: 220 тыс.
Столото (лотореи): 3 млн.                     1xBet: 28 млн.                                    Фонбет: 1.2 млн.
ВКонтакте (устаревшие базы): 100 млн+.        Одноклассники (утечки): 30 млн+.                  Mail.ru Group (старые): 25 млн.
Яндекс (устаревшие хэши): 50 млн.             Rambler (старая база): 98 млн.                    Пикабу (Pikabu): 8.5 млн.
Дром (Drom.ru): 12.5 млн.                     Авто.ру: 28 млн.                                  НН.ру (городской портал): 2.7 млн.
Билеты.ру (концерты): 7 млн.                  Kassir.ru: 2.1 млн.                               Афиша.ру: 1.2 млн.
Спортмастер: 2.3 млн.                         Adidas Russia: 340 тыс.                           Reebok Russia: 180 тыс.
М.Видео (сотрудники): 1.3 тыс.                СберЗдоровье: 500 тыс.                            Яндекс.Здоровье: 200 тыс.
Национальная Медиа Группа: 1.1 тыс.           Газпромбанк (старая): 15 тыс.                     МКБ (Московский Кредитный Банк): 1.2 млн.
Совкомбанк: 5.7 млн.                          Хоум Кредит Банк: 500 тыс.                        Ренессанс Кредит: 4.8 млн.
ТКС (Tinkoff Black): 30 млн.                  Яндекс.Плюс: 15 млн.                              Кинопоиск (учетки): 8 млн.
IVI (ivi.ru): 5.5 млн.                        More.tv: 2.1 млн.                                 Start (стриминг): 1.8 млн.
Яндекс.Музыка: 10 млн.                        VK Музыка: 12 млн.                                Zvuk (стриминг): 1.5 млн.
СберМаркет: 4.2 млн.                          Утконос: 1.3 млн.                                 Азбука Вкуса: 350 тыс.
Метро Кэш энд Керри (сотрудники): 15 тыс.     Яндекс.Лавка: 2.8 млн.                            Вайлдберриз (WB): 34 млн.
Ozon (seller base): 1.2 млн.                  Яндекс.Деньги (старая): 45 млн.                   Вебмани (WM): 25 млн.
PayPal Russia: 4.5 млн.                       СБП (Система быстрых платежей, данные): 16 млн.   Налоговая (служебные данные): неизв.
ПФР (данные пенсионеров): неизв.              МВД (служебные базы): неизв.                      РЖД (пассажиры): 40 млн.
Аэрофлот (пассажиры): 30 млн.                 S7 Airlines: 12 млн.                              Уральские авиалиния: 5 млн.
Ростелеком: 3.3 млн.                          Дом.ру: 1.8 млн.                                  МГТС: 2.4 млн.
Корус (консалтинг): 150 тыс.                  Финам (брокер): 300 тыс.                          БКС Брокер: 500 тыс.
Открытие Брокер: 200 тыс.                     ВТБ Капитал: 100 тыс.                             Сбер CIB: 80 тыс.
Роснефть (сотрудники): 1.5 млн.               Газпром (служебные данные): неизв.                Лукойл (сотрудники): 200 тыс.
Росатом (контрагенты): неизв.                 Роскосмос (подрядчики): неизв.                    Рособрнадзор (ЕГЭ данные): неизв."""
    
    response = make_response(database_content)
    response.headers["Content-Type"] = "text/plain"
    response.headers["Content-Disposition"] = "attachment; filename=celestial_database_index.txt"
    return response

if __name__ == '__main__':
    print("Starting Celestial server...")
    folders = ['Celestial_AI', 'Search', 'DataBase', 'Services', 'About', 'user_history']
    for folder in folders:
        if not os.path.exists(folder):
            os.makedirs(folder)
            print(f"Created folder: {folder}")
    
    credentials = load_credentials()
    print(f"Loaded {len(credentials)} users from .env")
    app.run(host='0.0.0.0', port=5000, debug=True)