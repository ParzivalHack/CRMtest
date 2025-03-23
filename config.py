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
TILBY_API_URL = "https://api.tilby.example.com"  # Da modificare con URL reale
TILBY_API_KEY = os.environ.get('TILBY_API_KEY', '')

# Configurazioni WhatsApp Business API (da completare con credenziali reali)
WHATSAPP_API_URL = "https://api.whatsapp.com/business"  # Da modificare con URL reale
WHATSAPP_API_KEY = os.environ.get('WHATSAPP_API_KEY', '')
WHATSAPP_BUSINESS_ID = os.environ.get('WHATSAPP_BUSINESS_ID', '')
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')

# Configurazioni NGROK (da completare con token reale)
NGROK_AUTH_TOKEN = os.environ.get('NGROK_AUTH_TOKEN', '')
NGROK_REGION = "eu"  # Regione di NGROK (eu, us, au, ap, sa)

# Impostazioni di sicurezza
SESSION_COOKIE_SECURE = False  # Impostare su True in produzione con HTTPS
SESSION_COOKIE_HTTPONLY = True
PERMANENT_SESSION_LIFETIME = 86400  # 24 ore in secondi