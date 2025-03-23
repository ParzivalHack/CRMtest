import os
import json
import logging
import threading
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import requests

# Importa i nuovi moduli per l'integrazione Tilby
from tilby_api import get_tilby_api_client, TilbyAPIError
from tilby_sync import (
    perform_incremental_sync, 
    perform_full_sync, 
    get_customers_by_filter,
    get_customer_by_id,
    get_loyalty_card_by_customer,
    get_transactions_by_customer,
    get_product_stats,
    get_customer_stats,
    update_customer_info,
    update_whatsapp_consent,
    add_custom_notes
)

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
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                return json.load(file)
        except json.JSONDecodeError:
            logger.error(f"Errore nel decodificare il file {filename}")
            return {}
    return {}

# Funzione per salvare i dati JSON
def save_json_data(filename, data):
    filepath = os.path.join('data', filename)
    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

# Funzione per sincronizzazione periodica in background
def periodic_sync(interval=3600):  # Ogni ora di default
    """Esegue la sincronizzazione con Tilby a intervalli regolari"""
    while True:
        logger.info(f"Avvio sincronizzazione periodica (intervallo: {interval} secondi)")
        try:
            stats = perform_incremental_sync()
            if stats['success']:
                logger.info(f"Sincronizzazione periodica completata con successo: {stats['customers']['new']} nuovi clienti, {stats['loyalty_cards']['new']} nuove carte")
            else:
                logger.error(f"Sincronizzazione periodica fallita: {stats['errors']}")
        except Exception as e:
            logger.error(f"Errore durante la sincronizzazione periodica: {str(e)}")
        
        # Attendi il prossimo intervallo
        time.sleep(interval)

# Inizia il thread di sincronizzazione periodica
sync_thread = None

def start_sync_thread():
    global sync_thread
    if sync_thread is None or not sync_thread.is_alive():
        sync_thread = threading.Thread(target=periodic_sync, daemon=True)
        sync_thread.start()
        logger.info("Thread di sincronizzazione avviato")

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
    # Carica statistiche reali dai dati sincronizzati
    customer_stats = get_customer_stats()
    
    # Gestisci eventuali errori nel calcolo delle statistiche
    if 'error' in customer_stats:
        flash('Errore nel calcolo delle statistiche. Verificare la sincronizzazione con Tilby.', 'warning')
        customer_stats = {
            'total_customers': 0,
            'active_customers': 0,
            'inactive_customers': 0,
            'avg_transactions_per_customer': 0,
            'avg_spending_per_customer': 0
        }
    
    # Prepara i dati per la dashboard
    data = {
        'total_clients': customer_stats.get('total_customers', 0),
        'active_clients': customer_stats.get('active_customers', 0),
        'campaigns_sent': len(load_json_data('campaigns.json').get('campaigns', [])),
        'loyalty_cards': len(load_json_data('loyalty_cards.json').get('cards', []))
    }
    
    return render_template('dashboard.html', data=data)

@app.route('/clients')
@login_required
def clients_list():
    # Recupera i filtri dalla query string
    loyalty_filter = request.args.get('loyalty', '')
    visit_filter = request.args.get('visit', '')
    search_query = request.args.get('q', '')
    
    # Carica tutti i clienti
    customers_data = load_json_data('customers.json')
    all_clients = customers_data.get('customers', [])
    filtered_clients = []
    
    # Applica filtri se presenti
    for client in all_clients:
        # Applica filtro di ricerca
        if search_query and search_query.lower() not in client.get('name', '').lower() and search_query not in client.get('phone', ''):
            continue
            
        # Ottieni la carta fedeltà del cliente per i punti
        client_card = get_loyalty_card_by_customer(client.get('id'))
        loyalty_points = client_card.get('points', 0) if client_card else 0
        client['loyalty_points'] = loyalty_points
        
        # Applica filtro fedeltà
        if loyalty_filter:
            if loyalty_filter == 'high' and loyalty_points < 50:
                continue
            elif loyalty_filter == 'medium' and (loyalty_points < 20 or loyalty_points >= 50):
                continue
            elif loyalty_filter == 'low' and loyalty_points >= 20:
                continue
                
        # Applica filtro ultima visita
        if visit_filter:
            # Ottieni l'ultima transazione del cliente
            client_transactions = get_transactions_by_customer(client.get('id'))
            last_visit = client_transactions[0].get('date', '') if client_transactions else ''
            client['last_visit'] = last_visit
            
            # Calcola giorni dalla visita
            if last_visit:
                last_visit_date = datetime.strptime(last_visit, '%Y-%m-%d')
                days_diff = (datetime.now() - last_visit_date).days
                
                if visit_filter == 'week' and days_diff > 7:
                    continue
                elif visit_filter == 'month' and days_diff > 30:
                    continue
                elif visit_filter == 'older' and days_diff <= 30:
                    continue
            else:
                # Se non ha mai visitato, considera come "older"
                if visit_filter != 'older':
                    continue
        
        # Se il cliente ha superato tutti i filtri, aggiungilo alla lista
        filtered_clients.append(client)
    
    return render_template('clients/list.html', clients=filtered_clients)

@app.route('/clients/<client_id>')
@login_required
def client_detail(client_id):
    # Recupera i dati del cliente
    client = get_customer_by_id(client_id)
    
    if not client:
        flash('Cliente non trovato.', 'danger')
        return redirect(url_for('clients_list'))
    
    # Recupera la carta fedeltà
    loyalty_card = get_loyalty_card_by_customer(client_id)
    if loyalty_card:
        client['loyalty_points'] = loyalty_card.get('points', 0)
    else:
        client['loyalty_points'] = 0
    
    # Recupera le transazioni
    transactions = get_transactions_by_customer(client_id)
    
    # Formatta le transazioni per la vista
    client['purchases'] = []
    for transaction in transactions:
        purchase = {
            'date': transaction.get('date', ''),
            'amount': transaction.get('total_amount', 0),
            'items': ', '.join([item.get('product_name', 'Prodotto') for item in transaction.get('items', [])])
        }
        client['purchases'].append(purchase)
    
    # Determina l'ultima visita
    if client['purchases']:
        client['last_visit'] = client['purchases'][0]['date']
    else:
        client['last_visit'] = 'Mai'
    
    return render_template('clients/detail.html', client=client)

@app.route('/whatsapp/templates')
@login_required
def whatsapp_templates():
    # Carica i template esistenti
    templates_data = load_json_data('whatsapp_templates.json')
    templates = templates_data.get('templates', [])
    
    return render_template('whatsapp/templates.html', templates=templates)

@app.route('/whatsapp/campaigns')
@login_required
def whatsapp_campaigns():
    # Carica le campagne esistenti
    campaigns_data = load_json_data('campaigns.json')
    campaigns = campaigns_data.get('campaigns', [])
    
    # Ordina le campagne per data (più recenti prima)
    campaigns.sort(key=lambda x: x.get('sent_date', ''), reverse=True)
    
    return render_template('whatsapp/campaigns.html', campaigns=campaigns)

@app.route('/reports/analytics')
@login_required
def analytics():
    # Calcola statistiche reali
    customer_stats = get_customer_stats()
    product_stats = get_product_stats()
    
    # Prepara i dati per la vista
    analytics_data = {
        'client_growth': [],  # Andrebbe calcolato in base alle date di registrazione
        'monthly_visits': [],  # Andrebbe calcolato in base alle transazioni per mese
        'popular_products': []  # Prodotti più venduti
    }
    
    # Aggiungi i prodotti più popolari
    for product in product_stats.get('top_products', [])[:5]:
        analytics_data['popular_products'].append({
            'name': product.get('name', 'Prodotto'),
            'percentage': (product.get('quantity', 0) / product_stats.get('total_products_sold', 1)) * 100
        })
    
    return render_template('reports/analytics.html', analytics=analytics_data)

# API endpoints per operazioni AJAX
@app.route('/api/clients/search', methods=['GET'])
@login_required
def search_clients():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([])
    
    # Carica tutti i clienti
    customers_data = load_json_data('customers.json')
    all_clients = customers_data.get('customers', [])
    
    # Filtra i clienti in base alla query
    results = []
    for client in all_clients:
        if (query.lower() in client.get('name', '').lower() or 
            query in client.get('phone', '')):
            results.append({
                'id': client.get('id'),
                'name': client.get('name'),
                'phone': client.get('phone')
            })
    
    return jsonify(results[:10])  # Limita a 10 risultati

@app.route('/api/sync/now', methods=['POST'])
@login_required
def api_sync_now():
    """API endpoint per avviare una sincronizzazione manuale"""
    try:
        full_sync = request.json.get('full_sync', False)
        
        if full_sync:
            stats = perform_full_sync()
        else:
            stats = perform_incremental_sync()
        
        return jsonify({
            'success': stats['success'],
            'message': 'Sincronizzazione completata con successo' if stats['success'] else 'Errore durante la sincronizzazione',
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Errore durante la sincronizzazione manuale: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Errore durante la sincronizzazione: {str(e)}'
        }), 500

@app.route('/api/clients/<client_id>/notes', methods=['POST'])
@login_required
def update_client_notes(client_id):
    """API endpoint per aggiornare le note di un cliente"""
    try:
        notes = request.json.get('notes', '')
        success = add_custom_notes(client_id, notes)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Note aggiornate con successo'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Errore nell\'aggiornamento delle note'
            }), 400
    except Exception as e:
        logger.error(f"Errore nell'aggiornamento delle note: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Errore: {str(e)}'
        }), 500

@app.route('/api/clients/<client_id>/whatsapp-consent', methods=['POST'])
@login_required
def update_client_whatsapp_consent(client_id):
    """API endpoint per aggiornare il consenso WhatsApp di un cliente"""
    try:
        consent = request.json.get('consent', False)
        success = update_whatsapp_consent(client_id, consent)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Consenso WhatsApp aggiornato con successo'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Errore nell\'aggiornamento del consenso'
            }), 400
    except Exception as e:
        logger.error(f"Errore nell'aggiornamento del consenso WhatsApp: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Errore: {str(e)}'
        }), 500

# Handler per la pagina 404
@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

# Avvia la sincronizzazione all'avvio dell'applicazione

# Con questo approccio
@app.route('/initialize', methods=['GET'])
def initialize_app():
    """Endpoint per inizializzare l'applicazione"""
    logger.info("Avvio sincronizzazione iniziale...")
    try:
        # Esegui una sincronizzazione incrementale all'avvio
        stats = perform_incremental_sync()
        if stats['success']:
            flash('Sincronizzazione con Tilby completata con successo!', 'success')
        else:
            flash('Errore durante la sincronizzazione con Tilby. Controlla i log.', 'warning')
        
        # Avvia il thread di sincronizzazione periodica
        start_sync_thread()
        
        return jsonify({"success": True, "message": "Inizializzazione completata"})
    except Exception as e:
        logger.error(f"Errore durante la sincronizzazione iniziale: {str(e)}")
        return jsonify({"success": False, "message": f"Errore: {str(e)}"}), 500

# E poi aggiungi il nuovo metodo per eseguire l'inizializzazione all'avvio
with app.app_context():
    # Avvia sincronizzazione all'avvio dell'applicazione
    # Questa sezione viene eseguita quando l'app viene avviata, non ad ogni richiesta
    @app.after_request
    def after_request_func(response):
        # Verifica se è la prima richiesta
        if not getattr(app, '_got_first_request', False):
            # Imposta il flag per evitare che venga eseguito più volte
            app._got_first_request = True
            # Esegui l'inizializzazione in un thread separato per non bloccare la risposta
            threading.Thread(target=lambda: requests.get(f"http://localhost:{app.config.get('PORT', 5000)}/initialize")).start()
        return response

# Avvio dell'applicazione
if __name__ == '__main__':
    logger.info("Avvio dell'applicazione TU&YO CRM...")
    # In produzione, utilizzeremo NGROK per esporre l'applicazione
    app.run(debug=True, host='0.0.0.0', port=5000)