import os
import json
import logging
import datetime
from typing import Dict, List, Any, Tuple, Optional

from tilby_api import get_tilby_api_client, TilbyAPIError

# Configurazione del logging
logger = logging.getLogger(__name__)

# Inizializza il client API
tilby_api = get_tilby_api_client()

# Percorsi dati
DATA_DIR = "data"
SYNC_INFO_FILE = os.path.join(DATA_DIR, "sync_info.json")

def get_last_sync_time() -> Optional[str]:
    """
    Restituisce la data e ora dell'ultima sincronizzazione avvenuta con successo.
    
    Returns:
        str: Timestamp in formato ISO dell'ultima sincronizzazione o None se mai sincronizzato
    """
    try:
        if os.path.exists(SYNC_INFO_FILE):
            with open(SYNC_INFO_FILE, 'r', encoding='utf-8') as f:
                sync_info = json.load(f)
                return sync_info.get('last_successful_sync')
        return None
    except (json.JSONDecodeError, FileNotFoundError):
        logger.warning("File delle informazioni di sincronizzazione non trovato o non valido")
        return None

def update_sync_time(success: bool = True) -> None:
    """
    Aggiorna il timestamp dell'ultima sincronizzazione.
    
    Args:
        success: True se la sincronizzazione è avvenuta con successo, False altrimenti
    """
    now = datetime.datetime.now().isoformat()
    sync_info = {}
    
    # Carica le informazioni esistenti se disponibili
    if os.path.exists(SYNC_INFO_FILE):
        try:
            with open(SYNC_INFO_FILE, 'r', encoding='utf-8') as f:
                sync_info = json.load(f)
        except json.JSONDecodeError:
            logger.warning("File delle informazioni di sincronizzazione non valido, verrà sovrascritto")
    
    # Aggiorna le informazioni
    if success:
        sync_info['last_successful_sync'] = now
    sync_info['last_sync_attempt'] = now
    sync_info['last_sync_status'] = 'success' if success else 'failed'
    
    # Salva le informazioni aggiornate
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(SYNC_INFO_FILE, 'w', encoding='utf-8') as f:
        json.dump(sync_info, f, indent=2)

def sync_customers(last_sync: Optional[str] = None) -> Tuple[int, int, int]:
    """
    Sincronizza i clienti dal sistema Tilby e li memorizza in file JSON locali.
    
    Args:
        last_sync: Timestamp dell'ultima sincronizzazione per una sincronizzazione incrementale
        
    Returns:
        Tuple con contatori per nuovi, aggiornati e totali clienti
    """
    new_count = 0
    updated_count = 0
    total_count = 0
    page = 1
    limit = 100
    has_more = True
    
    # Carica i clienti esistenti
    customers_file = os.path.join(DATA_DIR, "customers.json")
    if os.path.exists(customers_file):
        with open(customers_file, 'r', encoding='utf-8') as f:
            try:
                customers_data = json.load(f)
            except json.JSONDecodeError:
                customers_data = {"customers": []}
    else:
        customers_data = {"customers": []}
        
    # Crea dizionario per lookup veloce
    existing_customers = {c.get('id'): c for c in customers_data.get('customers', [])}
    
    logger.info(f"Inizio sincronizzazione clienti{' (incrementale)' if last_sync else ''}")
    
    while has_more:
        try:
            # Recupera la pagina corrente di clienti
            result = tilby_api.get_customers(page=page, limit=limit, last_sync=last_sync)
            customers = result.get('data', [])
            total_count += len(customers)
            
            # Processa i clienti di questa pagina
            for customer in customers:
                customer_id = customer.get('id')
                
                if customer_id in existing_customers:
                    # Aggiorna cliente esistente
                    existing_customers[customer_id].update(customer)
                    updated_count += 1
                else:
                    # Aggiungi nuovo cliente
                    customer['whatsapp_consent'] = False  # Default: nessun consenso WhatsApp
                    customer['notes'] = ""  # Note vuote di default
                    customers_data['customers'].append(customer)
                    existing_customers[customer_id] = customer
                    new_count += 1
            
            # Verifica se ci sono altre pagine
            pagination = result.get('pagination', {})
            current_page = pagination.get('current_page', page)
            total_pages = pagination.get('total_pages', 1)
            
            has_more = current_page < total_pages
            page += 1
            
        except TilbyAPIError as e:
            logger.error(f"Errore durante la sincronizzazione dei clienti: {str(e)}")
            break
    
    # Aggiorna la lista dei clienti con le versioni aggiornate
    customers_data['customers'] = list(existing_customers.values())
    
    # Salva i dati aggiornati
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(customers_file, 'w', encoding='utf-8') as f:
        json.dump(customers_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Sincronizzazione clienti completata: {new_count} nuovi, {updated_count} aggiornati, {total_count} totali")
    return new_count, updated_count, total_count

def sync_loyalty_cards() -> Tuple[int, int, int]:
    """
    Sincronizza le carte fedeltà dal sistema Tilby e le memorizza in file JSON locali.
    
    Returns:
        Tuple con contatori per nuove, aggiornate e totali carte fedeltà
    """
    new_count = 0
    updated_count = 0
    total_count = 0
    page = 1
    limit = 100
    has_more = True
    
    # Carica le carte fedeltà esistenti
    cards_file = os.path.join(DATA_DIR, "loyalty_cards.json")
    if os.path.exists(cards_file):
        with open(cards_file, 'r', encoding='utf-8') as f:
            try:
                cards_data = json.load(f)
            except json.JSONDecodeError:
                cards_data = {"cards": []}
    else:
        cards_data = {"cards": []}
        
    # Crea dizionario per lookup veloce
    existing_cards = {c.get('id'): c for c in cards_data.get('cards', [])}
    
    logger.info("Inizio sincronizzazione carte fedeltà")
    
    while has_more:
        try:
            # Recupera la pagina corrente di carte fedeltà
            result = tilby_api.get_loyalty_cards()
            cards = result.get('data', [])
            total_count += len(cards)
            
            # Processa le carte di questa pagina
            for card in cards:
                card_id = card.get('id')
                
                # Recupera i punti fedeltà
                try:
                    points_result = tilby_api.get_loyalty_points(card_id)
                    card['points'] = points_result.get('points', 0)
                except TilbyAPIError:
                    card['points'] = 0
                    
                if card_id in existing_cards:
                    # Aggiorna carta esistente
                    existing_cards[card_id].update(card)
                    updated_count += 1
                else:
                    # Aggiungi nuova carta
                    cards_data['cards'].append(card)
                    existing_cards[card_id] = card
                    new_count += 1
            
            # Verifica se ci sono altre pagine
            pagination = result.get('pagination', {})
            current_page = pagination.get('current_page', page)
            total_pages = pagination.get('total_pages', 1)
            
            has_more = current_page < total_pages
            page += 1
            
        except TilbyAPIError as e:
            logger.error(f"Errore durante la sincronizzazione delle carte fedeltà: {str(e)}")
            break
    
    # Aggiorna la lista delle carte con le versioni aggiornate
    cards_data['cards'] = list(existing_cards.values())
    
    # Salva i dati aggiornati
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(cards_file, 'w', encoding='utf-8') as f:
        json.dump(cards_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Sincronizzazione carte fedeltà completata: {new_count} nuove, {updated_count} aggiornate, {total_count} totali")
    return new_count, updated_count, total_count

def sync_transactions(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Tuple[int, int]:
    """
    Sincronizza le transazioni dal sistema Tilby e le memorizza in file JSON locali.
    
    Args:
        start_date: Data di inizio (formato YYYY-MM-DD) per filtrare le transazioni
        end_date: Data di fine (formato YYYY-MM-DD) per filtrare le transazioni
        
    Returns:
        Tuple con contatori per nuove e totali transazioni
    """
    new_count = 0
    total_count = 0
    page = 1
    limit = 100
    has_more = True
    
    # Carica le transazioni esistenti
    transactions_file = os.path.join(DATA_DIR, "transactions.json")
    if os.path.exists(transactions_file):
        with open(transactions_file, 'r', encoding='utf-8') as f:
            try:
                transactions_data = json.load(f)
            except json.JSONDecodeError:
                transactions_data = {"transactions": []}
    else:
        transactions_data = {"transactions": []}
    
    # Crea dizionario per lookup veloce
    existing_transactions = {t.get('id'): t for t in transactions_data.get('transactions', [])}
    
    logger.info(f"Inizio sincronizzazione transazioni{f' dal {start_date} al {end_date}' if start_date else ''}")
    
    while has_more:
        try:
            # Recupera la pagina corrente di transazioni
            result = tilby_api.get_transactions(
                start_date=start_date, 
                end_date=end_date, 
                page=page, 
                limit=limit
            )
            transactions = result.get('data', [])
            total_count += len(transactions)
            
            # Processa le transazioni di questa pagina
            for transaction in transactions:
                transaction_id = transaction.get('id')
                
                # Verifica se la transazione esiste già
                if transaction_id not in existing_transactions:
                    # Aggiungi la nuova transazione
                    transactions_data['transactions'].append(transaction)
                    existing_transactions[transaction_id] = transaction
                    new_count += 1
            
            # Verifica se ci sono altre pagine
            pagination = result.get('pagination', {})
            current_page = pagination.get('current_page', page)
            total_pages = pagination.get('total_pages', 1)
            
            has_more = current_page < total_pages
            page += 1
            
        except TilbyAPIError as e:
            logger.error(f"Errore durante la sincronizzazione delle transazioni: {str(e)}")
            break
    
    # Salva i dati aggiornati
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(transactions_file, 'w', encoding='utf-8') as f:
        json.dump(transactions_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Sincronizzazione transazioni completata: {new_count} nuove, {total_count} totali")
    return new_count, total_count

def sync_products() -> Tuple[int, int, int]:
    """
    Sincronizza i prodotti dal sistema Tilby e li memorizza in file JSON locali.
    
    Returns:
        Tuple con contatori per nuovi, aggiornati e totali prodotti
    """
    new_count = 0
    updated_count = 0
    total_count = 0
    
    # Carica i prodotti esistenti
    products_file = os.path.join(DATA_DIR, "products.json")
    if os.path.exists(products_file):
        with open(products_file, 'r', encoding='utf-8') as f:
            try:
                products_data = json.load(f)
            except json.JSONDecodeError:
                products_data = {"products": []}
    else:
        products_data = {"products": []}
        
    # Crea dizionario per lookup veloce
    existing_products = {p.get('id'): p for p in products_data.get('products', [])}
    
    logger.info("Inizio sincronizzazione prodotti")
    
    try:
        # Recupera tutti i prodotti
        result = tilby_api.get_products()
        products = result.get('data', [])
        total_count = len(products)
        
        # Processa i prodotti
        for product in products:
            product_id = product.get('id')
            
            if product_id in existing_products:
                # Aggiorna prodotto esistente
                existing_products[product_id].update(product)
                updated_count += 1
            else:
                # Aggiungi nuovo prodotto
                products_data['products'].append(product)
                existing_products[product_id] = product
                new_count += 1
                
        # Aggiorna la lista dei prodotti con le versioni aggiornate
        products_data['products'] = list(existing_products.values())
        
        # Salva i dati aggiornati
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(products_file, 'w', encoding='utf-8') as f:
            json.dump(products_data, f, ensure_ascii=False, indent=2)
                
    except TilbyAPIError as e:
        logger.error(f"Errore durante la sincronizzazione dei prodotti: {str(e)}")
    
    logger.info(f"Sincronizzazione prodotti completata: {new_count} nuovi, {updated_count} aggiornati, {total_count} totali")
    return new_count, updated_count, total_count

def perform_full_sync() -> Dict[str, Any]:
    """
    Esegue una sincronizzazione completa di tutti i dati da Tilby.
    
    Returns:
        Dict con statistiche sulla sincronizzazione
    """
    logger.info("Inizio sincronizzazione completa")
    
    # Timestamp corrente per le statistiche
    start_time = datetime.datetime.now()
    
    # Statistiche sincronizzazione
    stats = {
        'success': True,
        'start_time': start_time.isoformat(),
        'end_time': None,
        'duration_seconds': 0,
        'customers': {
            'new': 0,
            'updated': 0,
            'total': 0
        },
        'loyalty_cards': {
            'new': 0,
            'updated': 0,
            'total': 0
        },
        'transactions': {
            'new': 0,
            'total': 0
        },
        'products': {
            'new': 0,
            'updated': 0,
            'total': 0
        },
        'errors': []
    }
    
    try:
        # Sincronizza clienti
        new_customers, updated_customers, total_customers = sync_customers()
        stats['customers']['new'] = new_customers
        stats['customers']['updated'] = updated_customers
        stats['customers']['total'] = total_customers
        
        # Sincronizza carte fedeltà
        new_cards, updated_cards, total_cards = sync_loyalty_cards()
        stats['loyalty_cards']['new'] = new_cards
        stats['loyalty_cards']['updated'] = updated_cards
        stats['loyalty_cards']['total'] = total_cards
        
        # Sincronizza transazioni ultimi 30 giorni
        end_date = datetime.datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
        new_transactions, total_transactions = sync_transactions(start_date, end_date)
        stats['transactions']['new'] = new_transactions
        stats['transactions']['total'] = total_transactions
        
        # Sincronizza prodotti
        new_products, updated_products, total_products = sync_products()
        stats['products']['new'] = new_products
        stats['products']['updated'] = updated_products
        stats['products']['total'] = total_products
        
        # Aggiorna timestamp sincronizzazione
        update_sync_time(success=True)
        
    except Exception as e:
        logger.error(f"Errore durante la sincronizzazione completa: {str(e)}")
        stats['success'] = False
        stats['errors'].append(str(e))
        update_sync_time(success=False)
    
    # Calcola statistiche finali
    end_time = datetime.datetime.now()
    stats['end_time'] = end_time.isoformat()
    stats['duration_seconds'] = (end_time - start_time).total_seconds()
    
    logger.info(f"Sincronizzazione completata in {stats['duration_seconds']:.2f} secondi")
    return stats

def perform_incremental_sync() -> Dict[str, Any]:
    """
    Esegue una sincronizzazione incrementale dei dati da Tilby.
    
    Returns:
        Dict con statistiche sulla sincronizzazione
    """
    logger.info("Inizio sincronizzazione incrementale")
    
    # Ottieni timestamp ultima sincronizzazione
    last_sync = get_last_sync_time()
    
    if not last_sync:
        logger.info("Nessuna sincronizzazione precedente trovata, eseguo sincronizzazione completa")
        result = perform_full_sync()
        logger.info("Sincronizzazione completa terminata")
        return result
    
    # Timestamp corrente per le statistiche
    start_time = datetime.datetime.now()
    
    # Statistiche sincronizzazione
    stats = {
        'success': True,
        'start_time': start_time.isoformat(),
        'end_time': None,
        'duration_seconds': 0,
        'customers': {
            'new': 0,
            'updated': 0,
            'total': 0
        },
        'loyalty_cards': {
            'new': 0,
            'updated': 0,
            'total': 0
        },
        'transactions': {
            'new': 0,
            'total': 0
        },
        'errors': []
    }
    
    try:
        # Sincronizza solo clienti aggiornati dall'ultima sincronizzazione
        new_customers, updated_customers, total_customers = sync_customers(last_sync=last_sync)
        stats['customers']['new'] = new_customers
        stats['customers']['updated'] = updated_customers
        stats['customers']['total'] = total_customers
        
        # Sincronizza carte fedeltà (complete)
        new_cards, updated_cards, total_cards = sync_loyalty_cards()
        stats['loyalty_cards']['new'] = new_cards
        stats['loyalty_cards']['updated'] = updated_cards
        stats['loyalty_cards']['total'] = total_cards
        
        # Sincronizza solo transazioni dall'ultima sincronizzazione
        last_sync_date = datetime.datetime.fromisoformat(last_sync.replace('Z', '+00:00')).strftime('%Y-%m-%d')
        end_date = datetime.datetime.now().strftime('%Y-%m-%d')
        new_transactions, total_transactions = sync_transactions(last_sync_date, end_date)
        stats['transactions']['new'] = new_transactions
        stats['transactions']['total'] = total_transactions
        
        # Aggiorna timestamp sincronizzazione
        update_sync_time(success=True)
        
    except Exception as e:
        logger.error(f"Errore durante la sincronizzazione incrementale: {str(e)}")
        stats['success'] = False
        stats['errors'].append(str(e))
        update_sync_time(success=False)
    
    # Calcola statistiche finali
    end_time = datetime.datetime.now()
    stats['end_time'] = end_time.isoformat()
    stats['duration_seconds'] = (end_time - start_time).total_seconds()
    
    logger.info(f"Sincronizzazione incrementale completata in {stats['duration_seconds']:.2f} secondi")
    return stats
def get_customer_by_id(customer_id: str) -> Optional[Dict[str, Any]]:
   """
   Recupera i dati di un cliente dal file JSON locale.
   
   Args:
       customer_id: ID del cliente
       
   Returns:
       Dict con i dati del cliente o None se non trovato
   """
   customers_file = os.path.join(DATA_DIR, "customers.json")
   if not os.path.exists(customers_file):
       return None
       
   try:
       with open(customers_file, 'r', encoding='utf-8') as f:
           customers_data = json.load(f)
           
       for customer in customers_data.get('customers', []):
           if customer.get('id') == customer_id:
               return customer
               
       return None
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error(f"Errore nella lettura del file clienti: {customers_file}")
       return None

def get_customers_by_filter(filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
   """
   Recupera i clienti filtrati in base ai criteri specificati.
   
   Args:
       filters: Dizionario con i criteri di filtro (opzionale)
       
   Returns:
       Lista di dizionari con i dati dei clienti filtrati
   """
   customers_file = os.path.join(DATA_DIR, "customers.json")
   if not os.path.exists(customers_file):
       return []
       
   try:
       with open(customers_file, 'r', encoding='utf-8') as f:
           customers_data = json.load(f)
           
       customers = customers_data.get('customers', [])
       
       # Se non ci sono filtri, restituisci tutti i clienti
       if not filters:
           return customers
           
       filtered_customers = []
       
       for customer in customers:
           include = True
           
           # Applica tutti i filtri
           for key, value in filters.items():
               if key not in customer or customer[key] != value:
                   include = False
                   break
                   
           if include:
               filtered_customers.append(customer)
               
       return filtered_customers
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error(f"Errore nella lettura del file clienti: {customers_file}")
       return []

def get_loyalty_card_by_customer(customer_id: str) -> Optional[Dict[str, Any]]:
   """
   Recupera la carta fedeltà di un cliente.
   
   Args:
       customer_id: ID del cliente
       
   Returns:
       Dict con i dati della carta fedeltà o None se non trovata
   """
   cards_file = os.path.join(DATA_DIR, "loyalty_cards.json")
   if not os.path.exists(cards_file):
       return None
       
   try:
       with open(cards_file, 'r', encoding='utf-8') as f:
           cards_data = json.load(f)
           
       for card in cards_data.get('cards', []):
           if card.get('customer_id') == customer_id:
               return card
               
       return None
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error(f"Errore nella lettura del file carte fedeltà: {cards_file}")
       return None

def get_transactions_by_customer(customer_id: str) -> List[Dict[str, Any]]:
   """
   Recupera le transazioni di un cliente.
   
   Args:
       customer_id: ID del cliente
       
   Returns:
       Lista di dizionari con i dati delle transazioni
   """
   transactions_file = os.path.join(DATA_DIR, "transactions.json")
   if not os.path.exists(transactions_file):
       return []
       
   try:
       with open(transactions_file, 'r', encoding='utf-8') as f:
           transactions_data = json.load(f)
           
       customer_transactions = []
       
       for transaction in transactions_data.get('transactions', []):
           if transaction.get('customer_id') == customer_id:
               customer_transactions.append(transaction)
               
       # Ordina per data (più recenti prima)
       customer_transactions.sort(key=lambda x: x.get('date', ''), reverse=True)
       
       return customer_transactions
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error(f"Errore nella lettura del file transazioni: {transactions_file}")
       return []

def update_customer_info(customer_id: str, update_data: Dict[str, Any]) -> bool:
   """
   Aggiorna i dati di un cliente esistente.
   
   Args:
       customer_id: ID del cliente da aggiornare
       update_data: Dizionario con i dati da aggiornare
       
   Returns:
       bool: True se l'aggiornamento è riuscito, False altrimenti
   """
   customers_file = os.path.join(DATA_DIR, "customers.json")
   if not os.path.exists(customers_file):
       return False
       
   try:
       with open(customers_file, 'r', encoding='utf-8') as f:
           customers_data = json.load(f)
           
       # Trova il cliente da aggiornare
       found = False
       for i, customer in enumerate(customers_data.get('customers', [])):
           if customer.get('id') == customer_id:
               # Aggiorna solo i campi presenti in update_data
               for key, value in update_data.items():
                   customers_data['customers'][i][key] = value
               found = True
               break
               
       if not found:
           logger.warning(f"Cliente con ID {customer_id} non trovato")
           return False
           
       # Salva i dati aggiornati
       with open(customers_file, 'w', encoding='utf-8') as f:
           json.dump(customers_data, f, ensure_ascii=False, indent=2)
           
       return True
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error(f"Errore nell'aggiornamento del cliente: {customer_id}")
       return False

def get_product_stats() -> Dict[str, Any]:
   """
   Calcola statistiche sui prodotti venduti.
   
   Returns:
       Dict con statistiche sui prodotti
   """
   transactions_file = os.path.join(DATA_DIR, "transactions.json")
   products_file = os.path.join(DATA_DIR, "products.json")
   
   if not os.path.exists(transactions_file) or not os.path.exists(products_file):
       return {"error": "Dati insufficienti"}
       
   try:
       with open(transactions_file, 'r', encoding='utf-8') as f:
           transactions_data = json.load(f)
           
       with open(products_file, 'r', encoding='utf-8') as f:
           products_data = json.load(f)
           
       # Crea dizionario di lookup per i prodotti
       products_lookup = {p.get('id'): p for p in products_data.get('products', [])}
       
       # Conta le vendite per ogni prodotto
       product_counts = {}
       
       for transaction in transactions_data.get('transactions', []):
           for item in transaction.get('items', []):
               product_id = item.get('product_id')
               quantity = item.get('quantity', 1)
               
               if product_id in product_counts:
                   product_counts[product_id] += quantity
               else:
                   product_counts[product_id] = quantity
                   
       # Crea la lista dei prodotti più venduti
       top_products = []
       
       for product_id, count in sorted(product_counts.items(), key=lambda x: x[1], reverse=True):
           if product_id in products_lookup:
               product_name = products_lookup[product_id].get('name', 'Prodotto sconosciuto')
               top_products.append({
                   "id": product_id,
                   "name": product_name,
                   "quantity": count
               })
               
       # Calcola statistiche generali
       stats = {
           "top_products": top_products[:10],  # Top 10 prodotti
           "total_products_sold": sum(product_counts.values()),
           "unique_products_sold": len(product_counts)
       }
       
       return stats
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error("Errore nel calcolo delle statistiche prodotti")
       return {"error": "Errore nel calcolo delle statistiche"}

def get_customer_stats() -> Dict[str, Any]:
   """
   Calcola statistiche sui clienti.
   
   Returns:
       Dict con statistiche sui clienti
   """
   customers_file = os.path.join(DATA_DIR, "customers.json")
   transactions_file = os.path.join(DATA_DIR, "transactions.json")
   
   if not os.path.exists(customers_file) or not os.path.exists(transactions_file):
       return {"error": "Dati insufficienti"}
       
   try:
       with open(customers_file, 'r', encoding='utf-8') as f:
           customers_data = json.load(f)
           
       with open(transactions_file, 'r', encoding='utf-8') as f:
           transactions_data = json.load(f)
           
       # Numero totale di clienti
       total_customers = len(customers_data.get('customers', []))
       
       # Calcola clienti attivi (con acquisti negli ultimi 30 giorni)
       thirty_days_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
       
       # Crea un set di ID clienti con acquisti recenti
       active_customer_ids = set()
       
       for transaction in transactions_data.get('transactions', []):
           if transaction.get('date', '') >= thirty_days_ago:
               active_customer_ids.add(transaction.get('customer_id'))
               
       active_customers = len(active_customer_ids)
       
       # Calcola cliente medio per transazione 
       customer_transaction_counts = {}
       customer_spending = {}
       
       for transaction in transactions_data.get('transactions', []):
           customer_id = transaction.get('customer_id')
           amount = transaction.get('total_amount', 0)
           
           if customer_id in customer_transaction_counts:
               customer_transaction_counts[customer_id] += 1
               customer_spending[customer_id] += amount
           else:
               customer_transaction_counts[customer_id] = 1
               customer_spending[customer_id] = amount
               
       avg_transactions_per_customer = 0
       avg_spending_per_customer = 0
       
       if customer_transaction_counts:
           avg_transactions_per_customer = sum(customer_transaction_counts.values()) / len(customer_transaction_counts)
           avg_spending_per_customer = sum(customer_spending.values()) / len(customer_spending)
           
       # Calcola distribuzione visite
       visit_distribution = {
           "one_time": 0,   # Una sola visita
           "regular": 0,    # 2-5 visite
           "frequent": 0,   # Più di 5 visite
       }
       
       for customer_id, count in customer_transaction_counts.items():
           if count == 1:
               visit_distribution["one_time"] += 1
           elif count <= 5:
               visit_distribution["regular"] += 1
           else:
               visit_distribution["frequent"] += 1
               
       # Compila le statistiche
       stats = {
           "total_customers": total_customers,
           "active_customers": active_customers,
           "inactive_customers": total_customers - active_customers,
           "avg_transactions_per_customer": round(avg_transactions_per_customer, 2),
           "avg_spending_per_customer": round(avg_spending_per_customer, 2),
           "visit_distribution": visit_distribution
       }
       
       return stats
   except (json.JSONDecodeError, FileNotFoundError):
       logger.error("Errore nel calcolo delle statistiche clienti")
       return {"error": "Errore nel calcolo delle statistiche"}

def add_custom_notes(customer_id: str, notes: str) -> bool:
   """
   Aggiunge o aggiorna le note personalizzate per un cliente.
   
   Args:
       customer_id: ID del cliente
       notes: Note da aggiungere/aggiornare
       
   Returns:
       bool: True se l'operazione è riuscita, False altrimenti
   """
   return update_customer_info(customer_id, {"notes": notes})

def update_whatsapp_consent(customer_id: str, consent: bool) -> bool:
   """
   Aggiorna il consenso WhatsApp per un cliente.
   
   Args:
       customer_id: ID del cliente
       consent: True se il cliente ha dato il consenso, False altrimenti
       
   Returns:
       bool: True se l'operazione è riuscita, False altrimenti
   """
   return update_customer_info(customer_id, {"whatsapp_consent": consent})