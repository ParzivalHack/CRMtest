import os
import json
import logging
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify

# Configurazione del logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Chiave segreta per le sessioni
app.config['SESSION_TYPE'] = 'filesystem'
app.config['JSON_AS_ASCII'] = False  # Per gestire correttamente i caratteri non ASCII

# Assicurati che le directory necessarie esistano
os.makedirs('data', exist_ok=True)

# Funzione per caricare i dati JSON
def load_json_data(filename):
    filepath = os.path.join('data', filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        with open(filepath, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

# Funzione per salvare i dati JSON
def save_json_data(filename, data):
    filepath = os.path.join('data', filename)
    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

# Inizializzazione dei file JSON con valori predefiniti
def initialize_json_files():
    # Creazione di un file users.json predefinito se non esiste o è vuoto
    users_file_path = os.path.join('data', 'users.json')
    if not os.path.exists(users_file_path) or os.path.getsize(users_file_path) == 0:
        default_users = {
            "admin": {
                "password": "admin123",  # Da cambiare in produzione!
                "role": "admin"
            }
        }
        save_json_data('users.json', default_users)
        logger.info("File users.json creato con utente admin predefinito")
    
    # Creazione di un file settings.json predefinito se non esiste o è vuoto
    settings_file_path = os.path.join('data', 'settings.json')
    if not os.path.exists(settings_file_path) or os.path.getsize(settings_file_path) == 0:
        default_settings = {
            "app_name": "TU&YO CRM",
            "version": "1.0.0",
            "tilby_api_url": "",
            "tilby_api_key": "",
            "whatsapp_business_api_enabled": False,
            "whatsapp_api_key": "",
            "theme": "light",
            "language": "it"
        }
        save_json_data('settings.json', default_settings)
        logger.info("File settings.json creato con impostazioni predefinite")
    
    # Creazione di un file campaigns.json predefinito se non esiste o è vuoto
    campaigns_file_path = os.path.join('data', 'campaigns.json')
    if not os.path.exists(campaigns_file_path) or os.path.getsize(campaigns_file_path) == 0:
        default_campaigns = {
            "campaigns": []
        }
        save_json_data('campaigns.json', default_campaigns)
        logger.info("File campaigns.json creato con lista vuota")

# Chiama la funzione di inizializzazione all'avvio dell'app
initialize_json_files()

# Funzione per salvare i dati JSON
def save_json_data(filename, data):
    filepath = os.path.join('data', filename)
    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

# Creazione di un file users.json predefinito se non esiste
if not os.path.exists(os.path.join('data', 'users.json')):
    default_users = {
        "admin": {
            "password": "admin123",  # Da cambiare in produzione!
            "role": "admin"
        }
    }
    save_json_data('users.json', default_users)
    logger.info("File users.json creato con utente admin predefinito")

# Middleware di autenticazione
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Accesso negato. Effettua il login.', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Rotte per l'autenticazione
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        users = load_json_data('users.json')
        
        if username in users and users[username]['password'] == password:
            session['username'] = username
            session['role'] = users[username]['role']
            flash(f'Benvenuto, {username}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Credenziali non valide. Riprova.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Logout effettuato con successo.', 'success')
    return redirect(url_for('login'))

# Rotte principali dell'applicazione
@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Qui dovremo aggiungere la logica per recuperare i dati da Tilby
    # Per ora, mostreremo dati di esempio
    mock_data = {
        'total_clients': 120,
        'active_clients': 85,
        'campaigns_sent': 5,
        'loyalty_cards': 95
    }
    return render_template('dashboard.html', data=mock_data)

@app.route('/clients')
@login_required
def clients_list():
    # Qui dovremo implementare l'integrazione con Tilby per ottenere i dati reali dei clienti
    # Per ora, utilizziamo dati di esempio
    mock_clients = [
        {'id': 1, 'name': 'Mario Rossi', 'phone': '+39 123 456 7890', 'loyalty_points': 45, 'last_visit': '2025-03-01'},
        {'id': 2, 'name': 'Anna Verdi', 'phone': '+39 234 567 8901', 'loyalty_points': 78, 'last_visit': '2025-03-05'},
        {'id': 3, 'name': 'Luca Bianchi', 'phone': '+39 345 678 9012', 'loyalty_points': 12, 'last_visit': '2025-02-20'}
    ]
    return render_template('clients/list.html', clients=mock_clients)

@app.route('/clients/<int:client_id>')
@login_required
def client_detail(client_id):
    # Simuliamo il recupero dei dettagli di un cliente specifico
    # In futuro, questi dati verranno estratti dall'API Tilby
    mock_client = {
        'id': client_id,
        'name': 'Mario Rossi',
        'phone': '+39 123 456 7890',
        'email': 'mario.rossi@example.com',
        'loyalty_points': 45,
        'last_visit': '2025-03-01',
        'purchases': [
            {'date': '2025-03-01', 'amount': 8.50, 'items': 'Yogurt fragola grande'},
            {'date': '2025-02-15', 'amount': 6.00, 'items': 'Yogurt cioccolato medio'},
            {'date': '2025-01-30', 'amount': 10.20, 'items': 'Yogurt pistacchio grande + topping'}
        ]
    }
    return render_template('clients/detail.html', client=mock_client)

@app.route('/whatsapp/templates')
@login_required
def whatsapp_templates():
    # Qui mostreremo i template per i messaggi WhatsApp
    mock_templates = [
        {'id': 1, 'name': 'Benvenuto', 'text': 'Ciao {name}, benvenuto da TU&YO La Tua Yogurteria! Grazie per esserti iscritto.'},
        {'id': 2, 'name': 'Promozione', 'text': 'Ciao {name}! Solo per te oggi: sconto del 20% su tutti i nostri yogurt. Ti aspettiamo!'},
        {'id': 3, 'name': 'Compleanno', 'text': 'Auguri {name}! Per festeggiare il tuo compleanno, vieni a trovarci per uno yogurt gratuito!'}
    ]
    return render_template('whatsapp/templates.html', templates=mock_templates)

@app.route('/whatsapp/campaigns')
@login_required
def whatsapp_campaigns():
    # Qui mostreremo le campagne WhatsApp passate e permetteremo di crearne di nuove
    mock_campaigns = [
        {'id': 1, 'name': 'Promo Weekend', 'template': 'Promozione', 'sent_date': '2025-03-01', 'recipients': 45, 'successful': 42},
        {'id': 2, 'name': 'Nuovi Gusti', 'template': 'Informazione', 'sent_date': '2025-02-15', 'recipients': 62, 'successful': 60}
    ]
    return render_template('whatsapp/campaigns.html', campaigns=mock_campaigns)

@app.route('/reports/analytics')
@login_required
def analytics():
    # Qui mostreremo le statistiche e le analisi
    mock_analytics = {
        'client_growth': [15, 22, 28, 35, 42, 50, 58, 65, 72, 80, 88, 95],
        'monthly_visits': [120, 145, 165, 180, 210, 230],
        'popular_products': [
            {'name': 'Yogurt Fragola', 'percentage': 35},
            {'name': 'Yogurt Cioccolato', 'percentage': 28},
            {'name': 'Yogurt Pistacchio', 'percentage': 15},
            {'name': 'Altri gusti', 'percentage': 22}
        ]
    }
    return render_template('reports/analytics.html', analytics=mock_analytics)

# API endpoints per operazioni AJAX
@app.route('/api/clients/search', methods=['GET'])
@login_required
def search_clients():
    query = request.args.get('q', '')
    # Implementare la ricerca reale quando avremo l'integrazione con Tilby
    # Per ora, restituiamo risultati di esempio
    mock_results = [
        {'id': 1, 'name': 'Mario Rossi', 'phone': '+39 123 456 7890'},
        {'id': 2, 'name': 'Maria Rossini', 'phone': '+39 123 567 8901'}
    ]
    return jsonify(mock_results)

# Handler per la pagina 404
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Avvio dell'applicazione
if __name__ == '__main__':
    logger.info("Avvio dell'applicazione TU&YO CRM...")
    # In produzione, utilizzeremo NGROK per esporre l'applicazione
    app.run(debug=True, host='0.0.0.0', port=5000)