/**
 * TU&YO CRM - JavaScript principale
 * Sviluppato da Tommaso Bona
 * 2025
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza i tooltip di Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Inizializza i popover di Bootstrap
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Gestione chiusura automatica degli alert
    document.querySelectorAll('.alert:not(.alert-permanent)').forEach(function(alert) {
        setTimeout(function() {
            const alertInstance = new bootstrap.Alert(alert);
            alertInstance.close();
        }, 5000); // Chiude l'alert dopo 5 secondi
    });

    // Aggiunge l'effetto hover alle card
    document.querySelectorAll('.card-hover').forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            this.classList.add('shadow');
        });
        card.addEventListener('mouseleave', function() {
            this.classList.remove('shadow');
        });
    });

    // Funzione per formattare i numeri come valuta
    window.formatCurrency = function(value) {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    };

    // Funzione per formattare le date
    window.formatDate = function(dateString) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('it-IT', options);
    };

    // Funzione per generare colori casuali per i grafici
    window.getRandomColors = function(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * 200);
            const g = Math.floor(Math.random() * 200);
            const b = Math.floor(Math.random() * 200);
            colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
        }
        return colors;
    };

    // Funzione per mostrare un loader
    window.showLoader = function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Caricamento...</span></div><p class="mt-2">Caricamento in corso...</p></div>';
        }
    };

    // Funzione per aggiungere un messaggio di notifica
    window.showNotification = function(message, type = 'success') {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        document.querySelector('.container-fluid').insertAdjacentHTML('afterbegin', alertHTML);
    };

    // Funzione per conferma con modal
    window.confirmAction = function(title, message, callback) {
        // Controlla se esiste già un modal di conferma
        let confirmModal = document.getElementById('confirmActionModal');
        
        // Se non esiste, creane uno nuovo
        if (!confirmModal) {
            const modalHTML = `
                <div class="modal fade" id="confirmActionModal" tabindex="-1" aria-labelledby="confirmActionModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="confirmActionModalLabel">Conferma</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="confirmActionModalBody">
                                Sei sicuro di voler procedere?
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                                <button type="button" class="btn btn-primary" id="confirmActionBtn">Conferma</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            confirmModal = document.getElementById('confirmActionModal');
        }
        
        // Aggiorna contenuto
        document.getElementById('confirmActionModalLabel').textContent = title;
        document.getElementById('confirmActionModalBody').textContent = message;
        
        // Gestisci click sul pulsante di conferma
        const confirmBtn = document.getElementById('confirmActionBtn');
        const modalInstance = new bootstrap.Modal(confirmModal);
        
        // Rimuovi eventuali listener precedenti
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Aggiungi il nuovo listener
        newConfirmBtn.addEventListener('click', function() {
            modalInstance.hide();
            if (typeof callback === 'function') {
                callback();
            }
        });
        
        // Mostra il modal
        modalInstance.show();
    };

    // Gestione logout con conferma
    const logoutLink = document.querySelector('a[href="/logout"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.confirmAction(
                'Conferma Logout',
                'Sei sicuro di voler effettuare il logout?',
                function() {
                    window.location.href = logoutLink.getAttribute('href');
                }
            );
        });
    }

    // Funzione per simulare una richiesta API (per sviluppo)
    window.simulateApiRequest = function(success = true, delay = 1000) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (success) {
                    resolve({ success: true, message: 'Operazione completata con successo' });
                } else {
                    reject({ success: false, message: 'Si è verificato un errore' });
                }
            }, delay);
        });
    };

    // Funzione per gestire errori nelle richieste API
    window.handleApiError = function(error) {
        console.error('Errore API:', error);
        let errorMessage = 'Si è verificato un errore durante l\'operazione.';
        
        if (error && error.message) {
            errorMessage = error.message;
        }
        
        window.showNotification(errorMessage, 'danger');
    };

    // Funzione per validare un indirizzo email
    window.isValidEmail = function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    // Funzione per validare un numero di telefono italiano
    window.isValidItalianPhone = function(phone) {
        // Rimuovi spazi e caratteri non numerici
        const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        
        // Verifica se è un numero italiano valido
        // Accetta formati: +39XXXXXXXXXX, 0039XXXXXXXXXX, 3XXXXXXXXX
        const re = /^(\+39|0039)?\d{9,10}$/;
        return re.test(cleanPhone);
    };

    // Funzione per formattare un numero di telefono italiano
    window.formatItalianPhone = function(phone) {
        // Rimuovi spazi e caratteri non numerici
        let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        
        // Rimuovi prefisso internazionale se presente
        if (cleanPhone.startsWith('+39')) {
            cleanPhone = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith('0039')) {
            cleanPhone = cleanPhone.substring(4);
        }
        
        // Formatta il numero
        if (cleanPhone.length === 10) {
            return `+39 ${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6)}`;
        } else if (cleanPhone.length === 9) {
            return `+39 ${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5)}`;
        } else {
            return `+39 ${cleanPhone}`;
        }
    };

    // Gestione tema chiaro/scuro (preparazione per futura implementazione)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
    }

    // Funzione per impostare il tema
    window.setTheme = function(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    };

    // Log dell'inizializzazione dell'applicazione
    console.log('TU&YO CRM - App inizializzata');
});

// Funzione per aprire WhatsApp Web con un messaggio precompilato
function openWhatsAppChat(phone, message) {
    // Rimuovi spazi e caratteri non numerici
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Costruisci l'URL di WhatsApp Web
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    // Apri WhatsApp Web in una nuova finestra
    window.open(whatsappUrl, '_blank');
}

// Funzione per caricare dati da Tilby API (simulazione)
async function fetchTilbyData(endpoint, params = {}) {
    try {
        // In un'applicazione reale, qui ci sarebbe una chiamata fetch all'API Tilby
        console.log(`Chiamata a Tilby API: ${endpoint}`, params);
        
        // Simulazione di risposta
        return await window.simulateApiRequest(true, 1500);
    } catch (error) {
        window.handleApiError(error);
        throw error;
    }
}

// Funzione per inviare messaggi WhatsApp (simulazione)
async function sendWhatsAppMessage(phone, message) {
    try {
        console.log(`Invio messaggio WhatsApp a ${phone}: ${message}`);
        
        // Simulazione di invio
        return await window.simulateApiRequest(true, 2000);
    } catch (error) {
        window.handleApiError(error);
        throw error;
    }
}

// Funzione per sincronizzare i dati locali con Tilby
async function syncWithTilby() {
    try {
        window.showNotification('Sincronizzazione con Tilby in corso...', 'info');
        
        // Simulazione di sincronizzazione
        const result = await window.simulateApiRequest(true, 3000);
        
        window.showNotification('Sincronizzazione completata con successo!', 'success');
        return result;
    } catch (error) {
        window.handleApiError(error);
        throw error;
    }
}

// Funzione per salvare dati nel localStorage
function saveLocalData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Errore nel salvare i dati locali:', error);
        return false;
    }
}

// Funzione per caricare dati dal localStorage
function loadLocalData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Errore nel caricare i dati locali:', error);
        return null;
    }
}

// Funzione per aggiornare l'URL NGROK
function updateNgrokUrl(url) {
    // Salva l'URL nel localStorage per uso futuro
    saveLocalData('ngrokUrl', url);
    
    // Aggiorna eventuali elementi della UI che mostrano l'URL
    const ngrokUrlElements = document.querySelectorAll('.ngrok-url');
    ngrokUrlElements.forEach(element => {
        element.textContent = url;
    });
    
    console.log('URL NGROK aggiornato:', url);
}

// Configura gli eventi per i form di ricerca
document.querySelectorAll('form.search-form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchInput = this.querySelector('input[type="search"]');
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm) {
            // In un'applicazione reale, qui ci sarebbe la logica di ricerca
            console.log('Ricerca:', searchTerm);
        }
    });
});

// Gestisce l'animazione delle card al caricamento della pagina
function animateCardsOnLoad() {
    document.querySelectorAll('.animate-on-load').forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
            card.style.opacity = '1';
        }, index * 100);
    });
}

// Inizializza l'animazione delle card
if (document.querySelectorAll('.animate-on-load').length > 0) {
    document.querySelectorAll('.animate-on-load').forEach(card => {
        card.style.opacity = '0';
    });
    
    // Avvia l'animazione dopo un breve ritardo
    setTimeout(animateCardsOnLoad, 200);
}

// Fine del file main.js