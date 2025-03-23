/**
 * TU&YO CRM - Script specifico per la gestione clienti
 * Sviluppato da Tommaso Bona
 * 2025
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inizializzazione gestione ricerca
    setupSearchFunctionality();
    
    // Gestione filtri clienti
    setupClientFilters();
    
    // Gestione sync con Tilby
    setupTilbySync();
    
    // Gestione del modal di WhatsApp
    setupWhatsAppModal();
    
    // Gestione aggiunta nuovo cliente
    setupNewClientForm();
    
    console.log('Clients JS caricato');
});

/**
 * Configura la funzionalità di ricerca clienti
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchClient');
    const searchResults = document.getElementById('searchResults');
    const clearSearch = document.getElementById('clearSearch');
    
    if (!searchInput || !searchResults || !clearSearch) return;

    // Mostra risultati quando l'input ha il focus
    searchInput.addEventListener('focus', function() {
        if (this.value.length > 0) {
            searchResults.classList.add('show');
        }
    });

    // Nascondi risultati dopo un breve ritardo al blur
    searchInput.addEventListener('blur', function() {
        setTimeout(() => {
            searchResults.classList.remove('show');
        }, 200);
    });

    // Cerca mentre l'utente digita
    searchInput.addEventListener('input', debounce(function() {
        if (this.value.length > 2) {
            performClientSearch(this.value);
        } else {
            searchResults.classList.remove('show');
        }
    }, 300));

    // Pulisci la ricerca
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
    });
}

/**
 * Esegue la ricerca dei clienti (simulata)
 * In un'implementazione reale, chiamerebbe l'API di backend
 */
function performClientSearch(query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    // Simula una richiesta API con un ritardo
    setTimeout(() => {
        // Dati di esempio
        const mockResults = [
            {id: 1, name: 'Mario Rossi', phone: '+39 123 456 7890'},
            {id: 2, name: 'Maria Rossi', phone: '+39 123 567 8901'},
            {id: 3, name: 'Marco Rossini', phone: '+39 345 678 9012'},
            {id: 4, name: 'Matteo Rossi', phone: '+39 456 789 0123'},
            {id: 5, name: 'Marina Rossetti', phone: '+39 567 890 1234'}
        ];
        
        // Filtra i risultati in base alla query
        const filteredResults = mockResults.filter(client => 
            client.name.toLowerCase().includes(query.toLowerCase()) || 
            client.phone.includes(query)
        );
        
        // Genera l'HTML per i risultati
        let resultsHTML = '';
        
        if (filteredResults.length > 0) {
            filteredResults.forEach(client => {
                resultsHTML += `
                    <div class="search-result-item" data-client-id="${client.id}">
                        <div><strong>${client.name}</strong></div>
                        <div class="small text-muted">${client.phone}</div>
                    </div>
                `;
            });
        } else {
            resultsHTML = `
                <div class="search-result-item">
                    <div>Nessun cliente trovato</div>
                    <div class="small text-muted">Prova con un altro termine</div>
                </div>
            `;
        }
        
        searchResults.innerHTML = resultsHTML;
        searchResults.classList.add('show');
        
        // Aggiungi event handler ai risultati
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const clientId = this.getAttribute('data-client-id');
                if (clientId) {
                    window.location.href = `/clients/${clientId}`;
                }
            });
        });
    }, 300);
}

/**
 * Configura i filtri clienti
 */
function setupClientFilters() {
    const filterLoyalty = document.getElementById('filterLoyalty');
    const filterVisit = document.getElementById('filterVisit');
    const resetFilters = document.getElementById('resetFilters');
    
    if (!filterLoyalty || !filterVisit || !resetFilters) return;

    // Applica filtri quando cambiano i valori
    filterLoyalty.addEventListener('change', applyClientFilters);
    filterVisit.addEventListener('change', applyClientFilters);
    
    // Reset dei filtri
    resetFilters.addEventListener('click', function() {
        filterLoyalty.value = '';
        filterVisit.value = '';
        
        // Mostra tutte le carte
        const cards = document.querySelectorAll('.client-card');
        cards.forEach(card => {
            card.closest('.col-xl-3, .col-lg-4, .col-md-6').style.display = 'block';
        });
        
        showNotification('Filtri reimpostati', 'info');
    });
}

/**
 * Applica i filtri ai clienti
 */
function applyClientFilters() {
    const filterLoyalty = document.getElementById('filterLoyalty');
    const filterVisit = document.getElementById('filterVisit');
    const cards = document.querySelectorAll('.client-card');
    
    if (!filterLoyalty || !filterVisit || cards.length === 0) return;
    
    // Reimpostazione visibilità
    cards.forEach(card => {
        card.closest('.col-xl-3, .col-lg-4, .col-md-6').style.display = 'block';
    });
    
    // Se non ci sono filtri attivi, esci
    if (!filterLoyalty.value && !filterVisit.value) return;
    
    // Applica filtri
    cards.forEach(card => {
        let show = true;
        
        // Filtra per punti fedeltà
        if (filterLoyalty.value) {
            const loyaltyBadge = card.querySelector('.loyalty-badge');
            if (loyaltyBadge) {
                const points = parseInt(loyaltyBadge.textContent);
                
                switch(filterLoyalty.value) {
                    case 'high':
                        show = points >= 50;
                        break;
                    case 'medium':
                        show = points >= 20 && points < 50;
                        break;
                    case 'low':
                        show = points < 20;
                        break;
                }
            }
        }
        
        // Filtra per ultima visita
        if (show && filterVisit.value) {
            const lastVisitText = card.querySelector('.fa-calendar-alt').nextSibling.textContent;
            const lastVisitMatch = lastVisitText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            
            if (lastVisitMatch) {
                const lastVisitDate = new Date(
                    parseInt(lastVisitMatch[3]),
                    parseInt(lastVisitMatch[2]) - 1,
                    parseInt(lastVisitMatch[1])
                );
                
                const today = new Date();
                const daysDiff = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24));
                
                switch(filterVisit.value) {
                    case 'week':
                        show = daysDiff <= 7;
                        break;
                    case 'month':
                        show = daysDiff <= 30;
                        break;
                    case 'older':
                        show = daysDiff > 30;
                        break;
                }
            }
        }
        
        // Aggiorna visibilità
        card.closest('.col-xl-3, .col-lg-4, .col-md-6').style.display = show ? 'block' : 'none';
    });
    
    // Conta quanti elementi sono visibili
    const visibleCards = document.querySelectorAll('.client-card').length - 
                         document.querySelectorAll('.col-xl-3[style*="display: none"], .col-lg-4[style*="display: none"], .col-md-6[style*="display: none"]').length;
    
    showNotification(`Filtri applicati: ${visibleCards} clienti visualizzati`, 'info');
}

/**
 * Configura la sincronizzazione con Tilby
 */
function setupTilbySync() {
    const syncBtn = document.getElementById('syncTilbyBtn');
    if (!syncBtn) return;
    
    syncBtn.addEventListener('click', function() {
        const btn = this;
        const originalText = btn.innerHTML;
        
        // Aggiorna UI per mostrare caricamento
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizzazione...';
        btn.disabled = true;
        
        // Simulazione chiamata API
        setTimeout(function() {
            btn.innerHTML = '<i class="fas fa-check"></i> Dati sincronizzati!';
            
            // Reset bottone dopo 2 secondi
            setTimeout(function() {
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                // Notifica successo
                showNotification('I dati sono stati sincronizzati con Tilby.', 'success');
                
                // Aggiorna casualmente il numero di punti fedeltà (solo per demo)
                document.querySelectorAll('.loyalty-badge').forEach(badge => {
                    const currentPoints = parseInt(badge.textContent);
                    const newPoints = currentPoints + Math.floor(Math.random() * 5);
                    badge.textContent = `${newPoints} pts`;
                    
                    // Aggiorna classe in base ai nuovi punti
                    badge.className = badge.className.replace(/bg-\w+/, '');
                    if (newPoints >= 50) {
                        badge.classList.add('bg-success');
                    } else if (newPoints >= 20) {
                        badge.classList.add('bg-info');
                    } else {
                        badge.classList.add('bg-secondary');
                    }
                });
            }, 2000);
        }, 2000);
    });
}

/**
 * Configura il modal di WhatsApp
 */
function setupWhatsAppModal() {
    const whatsappBtns = document.querySelectorAll('.whatsapp-btn');
    if (whatsappBtns.length === 0) return;
    
    // Inizializza il modal
    let whatsappModal;
    try {
        whatsappModal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    } catch (e) {
        console.error('WhatsApp modal non trovato', e);
        return;
    }
    
    // Configura i controlli del modal
    const whatsappTemplate = document.getElementById('whatsappTemplate');
    const customMessageContainer = document.getElementById('customMessageContainer');
    const messagePreview = document.getElementById('messagePreview');
    const whatsappClientId = document.getElementById('whatsappClientId');
    const customMessage = document.getElementById('customMessage');
    
    if (!whatsappTemplate || !customMessageContainer || !messagePreview || !whatsappClientId) return;
    
    // Apertura del modal
    whatsappBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const clientId = this.getAttribute('data-client-id');
            const clientName = this.getAttribute('data-client-name');
            
            whatsappClientId.value = clientId;
            whatsappTemplate.value = '';
            messagePreview.innerHTML = 'Seleziona un template per visualizzare l\'anteprima.';
            customMessageContainer.style.display = 'none';
            
            if (document.getElementById('whatsappModalLabel')) {
                document.getElementById('whatsappModalLabel').textContent = `Invia Messaggio a ${clientName}`;
            }
            
            whatsappModal.show();
        });
    });
    
    // Gestione cambiamento template
    whatsappTemplate.addEventListener('change', function() {
        if (this.value === 'custom') {
            customMessageContainer.style.display = 'block';
            if (customMessage) customMessage.value = '';
            messagePreview.innerHTML = 'Scrivi un messaggio personalizzato...';
        } else {
            customMessageContainer.style.display = 'none';
            
            // Mostra anteprima del template selezionato
            let previewText = '';
            switch(this.value) {
                case 'welcome':
                    previewText = 'Ciao [nome], benvenuto da TU&YO La Tua Yogurteria! Grazie per esserti iscritto.';
                    break;
                case 'promo':
                    previewText = 'Ciao [nome]! Solo per te oggi: sconto del 20% su tutti i nostri yogurt. Ti aspettiamo!';
                    break;
                case 'birthday':
                    previewText = 'Auguri [nome]! Per festeggiare il tuo compleanno, vieni a trovarci per uno yogurt gratuito!';
                    break;
                default:
                    previewText = 'Seleziona un template per visualizzare l\'anteprima.';
            }
            
            messagePreview.innerHTML = previewText;
        }
    });
    
    // Anteprima messaggio personalizzato
    if (customMessage) {
        customMessage.addEventListener('input', function() {
            messagePreview.innerHTML = this.value || 'Scrivi un messaggio personalizzato...';
        });
    }
    
    // Invio messaggio
    const sendWhatsappBtn = document.getElementById('sendWhatsappBtn');
    if (sendWhatsappBtn) {
        sendWhatsappBtn.addEventListener('click', function() {
            if (!whatsappTemplate.value) {
                alert('Seleziona un template prima di inviare il messaggio.');
                return;
            }
            
            const btn = this;
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio...';
            btn.disabled = true;
            
            // Simulazione invio
            setTimeout(function() {
                btn.innerHTML = '<i class="fas fa-check"></i> Inviato!';
                
                setTimeout(function() {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    whatsappModal.hide();
                    
                    showNotification('Messaggio WhatsApp inviato con successo.', 'success');
                }, 1000);
            }, 2000);
        });
    }
}

/**
 * Configura il form per l'aggiunta di nuovi clienti
 */
function setupNewClientForm() {
    const saveClientBtn = document.getElementById('saveClientBtn');
    if (!saveClientBtn) return;
    
    saveClientBtn.addEventListener('click', function() {
        const form = document.getElementById('addClientForm');
        if (!form) return;
        
        // Validazione base
        const name = document.getElementById('clientName')?.value;
        const phone = document.getElementById('clientPhone')?.value;
        
        if (!name || !phone) {
            alert('Inserisci nome e telefono per continuare.');
            return;
        }
        
        // Validazione avanzata del telefono (formato italiano)
        if (!isValidItalianPhone(phone)) {
            alert('Inserisci un numero di telefono italiano valido.');
            return;
        }
        
        const btn = this;
        const originalText = btn.textContent;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
        btn.disabled = true;
        
        // Simulazione salvataggio
        setTimeout(function() {
            btn.innerHTML = '<i class="fas fa-check"></i> Salvato!';
            
            setTimeout(function() {
                btn.textContent = originalText;
                btn.disabled = false;
                
                // Chiudi il modal e resetta il form
                try {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addClientModal'));
                    modal.hide();
                    form.reset();
                } catch (e) {
                    console.error('Errore nel chiudere il modal', e);
                }
                
                showNotification(`Cliente ${name} aggiunto con successo.`, 'success');
                
                // Opzionale: aggiorna la lista clienti con il nuovo cliente
                // In un'implementazione reale, si ricaricherebbe la pagina o si aggiornerebbe la lista dinamicamente
            }, 1000);
        }, 2000);
    });
}

/**
 * Validazione del numero di telefono italiano
 */
function isValidItalianPhone(phone) {
    // Rimuovi spazi e caratteri non numerici
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Verifica formato italiano: può iniziare con +39 o 0039, seguito da 9-10 cifre
    // Oppure iniziare direttamente con 3 e avere in totale 9-10 cifre
    const pattern = /^(\+39|0039)?([0-9]{9,10})$/;
    return pattern.test(cleanPhone);
}

/**
 * Funzione debounce per evitare chiamate troppo frequenti
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Mostra notifica nella pagina
 */
function showNotification(message, type = 'success') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const container = document.querySelector('.container-fluid');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Chiudi automaticamente dopo 5 secondi
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            if (alerts.length > 0) {
                try {
                    const bsAlert = new bootstrap.Alert(alerts[0]);
                    bsAlert.close();
                } catch (e) {
                    alerts[0].remove();
                }
            }
        }, 5000);
    }
}