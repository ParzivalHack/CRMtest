import os

# Configurazioni di base
DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(24))
APP_NAME = "TU&YO CRM"
APP_VERSION = "1.0.0"

# Percorsi dei file di dati
DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
CAMPAIGNS_FILE = os.path.join(DATA_DIR, "campaigns.json")

# Configurazioni Tilby API (da completare con credenziali reali)
TILBY_API_URL = "https://api.tilby.com/v2"  # URL base dell'API Tilby
TILBY_API_KEY = os.environ.get('TILBY_API_KEY', 'YOUR_API_KEY') # Sostituisci con la tua chiave API

# Impostazioni di sicurezza
SESSION_COOKIE_SECURE = True  # Impostare su True in produzione con HTTPS
SESSION_COOKIE_HTTPONLY = True
PERMANENT_SESSION_LIFETIME = 86400  # 24 ore in secondi