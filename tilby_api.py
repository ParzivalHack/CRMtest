import os
import json
import time
import logging
import requests
from typing import Dict, List, Any, Optional, Union
from requests.exceptions import RequestException, Timeout, ConnectionError

# Configurazione del logging
logger = logging.getLogger(__name__)

class TilbyAPI:
    """
    Classe per gestire tutte le interazioni con l'API Tilby.
    Fornisce metodi per autenticazione, recupero dati clienti, carte fedeltà e punti.
    """
    
    def __init__(self, api_url: str, api_key: str, timeout: int = 10, retry_attempts: int = 3):
        """
        Inizializza il client API di Tilby.
        
        Args:
            api_url: URL base dell'API Tilby
            api_key: Chiave API per l'autenticazione
            timeout: Timeout per le richieste in secondi
            retry_attempts: Numero di tentativi di riconnessione in caso di errore
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self._last_request_time = 0
        self._rate_limit_per_minute = 60  # Imposta questo in base ai limiti API di Tilby
        self._min_request_interval = 60 / self._rate_limit_per_minute
    
    def _handle_rate_limiting(self):
        """Gestisce il rate limiting per evitare di superare i limiti dell'API"""
        current_time = time.time()
        time_since_last_request = current_time - self._last_request_time
        
        if time_since_last_request < self._min_request_interval:
            sleep_time = self._min_request_interval - time_since_last_request
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f} seconds")
            time.sleep(sleep_time)
        
        self._last_request_time = time.time()
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Effettua una richiesta all'API di Tilby con gestione degli errori e retry.
        
        Args:
            method: Metodo HTTP (get, post, put, delete)
            endpoint: Endpoint API (senza barra iniziale)
            **kwargs: Parametri aggiuntivi da passare alla richiesta
        
        Returns:
            Dict contenente la risposta JSON dell'API
            
        Raises:
            TilbyAPIError: Se la richiesta fallisce dopo tutti i tentativi
        """
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        self._handle_rate_limiting()
        
        for attempt in range(self.retry_attempts):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                # Controlla se la risposta è valida
                response.raise_for_status()
                
                # Controlla se la risposta è un JSON valido
                try:
                    return response.json()
                except ValueError:
                    # Se non è JSON, restituisci la risposta testuale
                    return {"text": response.text}
                    
            except Timeout:
                logger.warning(f"Timeout durante la richiesta a {url}. Tentativo {attempt+1}/{self.retry_attempts}")
                if attempt == self.retry_attempts - 1:
                    raise TilbyAPIError(f"Timeout durante la richiesta a {url} dopo {self.retry_attempts} tentativi")
                
            except ConnectionError:
                logger.warning(f"Errore di connessione a {url}. Tentativo {attempt+1}/{self.retry_attempts}")
                if attempt == self.retry_attempts - 1:
                    raise TilbyAPIError(f"Impossibile connettersi a {url} dopo {self.retry_attempts} tentativi")
                
            except RequestException as e:
                logger.warning(f"Errore durante la richiesta a {url}: {str(e)}. Tentativo {attempt+1}/{self.retry_attempts}")
                if attempt == self.retry_attempts - 1:
                    raise TilbyAPIError(f"Errore durante la richiesta a {url}: {str(e)}")
                    
            # Attendi prima di riprovare con backoff esponenziale
            if attempt < self.retry_attempts - 1:
                wait_time = 2 ** attempt
                logger.info(f"Attendo {wait_time} secondi prima di riprovare...")
                time.sleep(wait_time)
        
        # Non dovremmo mai arrivare qui, ma per sicurezza
        raise TilbyAPIError(f"Errore imprevisto durante la richiesta a {url}")
    
    def test_connection(self) -> bool:
        """
        Verifica se la connessione all'API Tilby funziona correttamente.
        
        Returns:
            bool: True se la connessione funziona, False altrimenti
        """
        try:
            response = self._make_request("get", "status")
            return response.get("status") == "ok"
        except Exception as e:
            logger.error(f"Errore during il test di connessione: {str(e)}")
            return False
    
    def get_customers(self, page: int = 1, limit: int = 100, last_sync: Optional[str] = None) -> Dict[str, Any]:
        """
        Recupera l'elenco dei clienti da Tilby, con supporto per la paginazione e 
        sincronizzazione incrementale.
        
        Args:
            page: Numero di pagina
            limit: Numero massimo di risultati per pagina
            last_sync: Timestamp dell'ultima sincronizzazione (formato ISO)
        
        Returns:
            Dict contenente i clienti e i metadati di paginazione
        """
        params = {
            "page": page,
            "limit": limit
        }
        
        if last_sync:
            params["updated_since"] = last_sync
            
        return self._make_request("get", "customers", params=params)
    
    def get_customer(self, customer_id: Union[str, int]) -> Dict[str, Any]:
        """
        Recupera i dettagli di un cliente specifico.
        
        Args:
            customer_id: ID del cliente
            
        Returns:
            Dict contenente i dettagli del cliente
        """
        return self._make_request("get", f"customers/{customer_id}")
    
    def get_loyalty_cards(self, customer_id: Optional[Union[str, int]] = None) -> Dict[str, Any]:
        """
        Recupera le carte fedeltà, filtrate opzionalmente per cliente.
        
        Args:
            customer_id: ID del cliente (opzionale)
            
        Returns:
            Dict contenente le carte fedeltà
        """
        endpoint = "loyalty/cards"
        params = {}
        
        if customer_id:
            params["customer_id"] = customer_id
            
        return self._make_request("get", endpoint, params=params)
    
    def get_loyalty_points(self, card_id: Union[str, int]) -> Dict[str, Any]:
        """
        Recupera i punti fedeltà per una carta specifica.
        
        Args:
            card_id: ID della carta fedeltà
            
        Returns:
            Dict contenente i dettagli dei punti
        """
        return self._make_request("get", f"loyalty/cards/{card_id}/points")
    
    def get_transactions(self, start_date: Optional[str] = None, end_date: Optional[str] = None, 
                         customer_id: Optional[Union[str, int]] = None, 
                         page: int = 1, limit: int = 100) -> Dict[str, Any]:
        """
        Recupera le transazioni di vendita, con vari filtri.
        
        Args:
            start_date: Data inizio formato YYYY-MM-DD
            end_date: Data fine formato YYYY-MM-DD
            customer_id: ID del cliente
            page: Numero di pagina
            limit: Numero massimo di risultati per pagina
            
        Returns:
            Dict contenente le transazioni e i metadati di paginazione
        """
        params = {
            "page": page,
            "limit": limit
        }
        
        if start_date:
            params["start_date"] = start_date
            
        if end_date:
            params["end_date"] = end_date
            
        if customer_id:
            params["customer_id"] = customer_id
            
        return self._make_request("get", "transactions", params=params)
    
    def get_products(self) -> Dict[str, Any]:
        """
        Recupera l'elenco dei prodotti disponibili.
        
        Returns:
            Dict contenente i prodotti
        """
        return self._make_request("get", "products")
    
    def add_loyalty_points(self, card_id: Union[str, int], points: int, reason: str) -> Dict[str, Any]:
        """
        Aggiunge punti fedeltà a una carta fedeltà.
        
        Args:
            card_id: ID della carta fedeltà
            points: Numero di punti da aggiungere
            reason: Motivo dell'aggiunta di punti
            
        Returns:
            Dict contenente lo stato dell'operazione
        """
        data = {
            "points": points,
            "reason": reason
        }
        
        return self._make_request("post", f"loyalty/cards/{card_id}/points", json=data)
    
    def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un nuovo cliente su Tilby.
        
        Args:
            customer_data: Dati del cliente
            
        Returns:
            Dict contenente i dettagli del cliente creato
        """
        return self._make_request("post", "customers", json=customer_data)
    
    def update_customer(self, customer_id: Union[str, int], customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggiorna i dati di un cliente esistente.
        
        Args:
            customer_id: ID del cliente
            customer_data: Nuovi dati del cliente
            
        Returns:
            Dict contenente i dettagli del cliente aggiornato
        """
        return self._make_request("put", f"customers/{customer_id}", json=customer_data)
    
    def get_loyalty_card_by_phone(self, phone: str) -> Dict[str, Any]:
        """
        Recupera una carta fedeltà in base al numero di telefono del cliente.
        
        Args:
            phone: Numero di telefono del cliente
            
        Returns:
            Dict contenente i dettagli della carta fedeltà
        """
        params = {"phone": phone}
        return self._make_request("get", "loyalty/cards/by-phone", params=params)


class TilbyAPIError(Exception):
    """Eccezione personalizzata per errori dell'API Tilby"""
    pass


# Funzione di utilità per creare un'istanza TilbyAPI dalle configurazioni
def get_tilby_api_client() -> TilbyAPI:
    """
    Crea e restituisce un client TilbyAPI configurato con i parametri
    presenti nei file di configurazione o variabili d'ambiente.
    
    Returns:
        TilbyAPI: Istanza configurata del client API
    """
    from config import TILBY_API_URL, TILBY_API_KEY
    
    # Verifica che le credenziali siano configurate
    if not TILBY_API_URL or not TILBY_API_KEY:
        settings_file = os.path.join('data', 'settings.json')
        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                api_url = settings.get('tilby_api_url', '')
                api_key = settings.get('tilby_api_key', '')
        except (FileNotFoundError, json.JSONDecodeError):
            logger.error("File di configurazione non trovato o non valido")
            api_url = ''
            api_key = ''
            
        if not api_url or not api_key:
            logger.warning("Credenziali API Tilby non configurate. L'integrazione non funzionerà.")
    else:
        api_url = TILBY_API_URL
        api_key = TILBY_API_KEY
    
    return TilbyAPI(api_url, api_key)