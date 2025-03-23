/**
 * TU&YO CRM - Script specifico per la gestione WhatsApp
 * Sviluppato da Tommaso Bona
 * 2025
 */

document.addEventListener('DOMContentLoaded', function() {
    // Gestione templates WhatsApp
    setupTemplatesManagement();
    
    // Gestione campagne WhatsApp
    setupCampaignsManagement();
    
    // Gestione modali per invio messaggi
    setupSendMessageModals();
    
    console.log('WhatsApp JS caricato');
});

/**
 * Configura la gestione dei template WhatsApp
 */
function setupTemplatesManagement() {
    // Form creazione/modifica template
    const templateForm = document.getElementById('templateForm');
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    
    if (templateForm && saveTemplateBtn) {
        // Anteprima in tempo reale
        setupLivePreview();
        
        // Pulsanti per inserimento variabili
        setupVariableButtons();
        
        // Salvataggio template
        saveTemplateBtn.addEventListener('click', saveTemplate);
    }
    
    // Gestione template esistenti
    addTemplateEventListeners();
}

/**
 * Gestisce l'anteprima in tempo reale del template
 */
function setupLivePreview() {
    const templateText = document.getElementById('templateText');
    const livePreview = document.getElementById('livePreview');
    
    if (!templateText || !livePreview) return;
    
    templateText.addEventListener('input', function() {
        updateLivePreview(this.value, livePreview);
    });
}

/**
 * Aggiorna l'anteprima del template
 */
function updateLivePreview(text, previewElement) {
    if (!previewElement) return;
    
    if (!text) {
        previewElement.innerHTML = "L'anteprima apparirà qui mentre scrivi...";
        return;
    }
    
    // Sostituisci le variabili con valori di esempio
    let previewText = text;
    previewText = previewText.replace(/{name}/g, "Mario");
    previewText = previewText.replace(/{points}/g, "45");
    previewText = previewText.replace(/{date}/g, new Date().toLocaleDateString('it-IT'));
    
    previewElement.innerHTML = previewText;
}

/**
 * Configura i pulsanti per l'inserimento delle variabili
 */
function setupVariableButtons() {
    const variableButtons = document.querySelectorAll('.insert-variable');
    const templateText = document.getElementById('templateText');
    
    if (!variableButtons.length || !templateText) return;
    
    variableButtons.forEach(button => {
        button.addEventListener('click', function() {
            const variable = this.getAttribute('data-variable');
            if (!variable) return;
            
            // Inserisci la variabile alla posizione corrente del cursore
            const cursorPos = templateText.selectionStart;
            const textBefore = templateText.value.substring(0, cursorPos);
            const textAfter = templateText.value.substring(cursorPos);
            
            templateText.value = textBefore + variable + textAfter;
            templateText.focus();
            templateText.selectionStart = templateText.selectionEnd = cursorPos + variable.length;
            
            // Aggiorna l'anteprima
            const livePreview = document.getElementById('livePreview');
            if (livePreview) {
                updateLivePreview(templateText.value, livePreview);
            }
        });
    });
}

/**
 * Salva un template (nuovo o modificato)
 */
function saveTemplate() {
    const templateName = document.getElementById('templateName')?.value;
    const templateText = document.getElementById('templateText')?.value;
    
    if (!templateName || !templateText) {
        alert('Compila tutti i campi obbligatori.');
        return;
    }
    
    const btn = this;
    const originalText = btn.textContent || btn.innerText;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    btn.disabled = true;
    
    // In un'implementazione reale, qui si farebbe una chiamata API
    // Per ora simuliamo il salvataggio
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-check"></i> Salvato!';
        
        setTimeout(function() {
            btn.textContent = originalText;
            btn.disabled = false;
            
            // Chiudi il modal e pulisci il form
            try {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addTemplateModal'));
                if (modal) {
                    modal.hide();
                }
                document.getElementById('templateForm').reset();
                const livePreview = document.getElementById('livePreview');
                if (livePreview) {
                    livePreview.innerHTML = "L'anteprima apparirà qui mentre scrivi...";
                }
            } catch (e) {
                console.error('Errore nel chiudere il modal', e);
            }
            
            // Se è una modifica, aggiorna il template esistente
            // altrimenti crea un nuovo template 
            const isEdit = document.getElementById('addTemplateModalLabel')?.textContent.includes('Modifica');
            
            if (isEdit) {
                showNotification(`Template "${templateName}" aggiornato con successo.`, 'success');
                // Aggiorna i dati del template nella lista (in un'app reale si ricaricherebbe)
            } else {
                // Aggiungi il nuovo template alla lista
                addNewTemplate(templateName, templateText);
                showNotification(`Template "${templateName}" creato con successo.`, 'success');
            }
        }, 1000);
    }, 1500);
}

/**
 * Aggiunge un nuovo template alla lista
 */
function addNewTemplate(name, text) {
    const templatesList = document.getElementById('templatesList');
    if (!templatesList) return;
    
    const templateId = Date.now(); // Simula un ID unico
    const templateHTML = `
        <div class="col-md-6 mb-4">
            <div class="card template-card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${name}</h5>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item edit-template" href="#" data-template-id="${templateId}"><i class="fas fa-edit me-2"></i>Modifica</a></li>
                            <li><a class="dropdown-item text-danger delete-template" href="#" data-template-id="${templateId}"><i class="fas fa-trash me-2"></i>Elimina</a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <div class="template-preview">
                        ${text.replace(/{name}/g, "Mario").replace(/{points}/g, "45").replace(/{date}/g, new Date().toLocaleDateString('it-IT'))}
                    </div>
                    
                    <div class="template-variables">
                        <small class="text-muted d-block mb-2">Variabili disponibili:</small>
                        <code>{name}</code>
                        ${text.includes('{points}') ? '<code>{points}</code>' : ''}
                        ${text.includes('{date}') ? '<code>{date}</code>' : ''}
                    </div>
                </div>
                <div class="card-footer bg-white">
                    <div class="template-controls">
                        <button class="btn btn-sm btn-outline-primary preview-template" data-template-id="${templateId}">
                            <i class="fas fa-eye"></i> Anteprima
                        </button>
                        <button class="btn btn-sm btn-success send-template" data-template-id="${templateId}">
                            <i class="fab fa-whatsapp"></i> Invia
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    templatesList.insertAdjacentHTML('afterbegin', templateHTML);
    
    // Aggiungi eventi ai nuovi elementi
    addTemplateEventListeners();
}

/**
 * Aggiunge event listener ai template WhatsApp
 */
function addTemplateEventListeners() {
    // Preview template
    document.querySelectorAll('.preview-template').forEach(button => {
        if (button.getAttribute('data-event-added')) return;
        
        button.setAttribute('data-event-added', 'true');
        button.addEventListener('click', function() {
            showTemplatePreview(this);
        });
    });
    
    // Send template
    document.querySelectorAll('.send-template').forEach(button => {
        if (button.getAttribute('data-event-added')) return;
        
        button.setAttribute('data-event-added', 'true');
        button.addEventListener('click', function() {
            showRecipientsModal(this);
        });
    });
    
    // Edit template
    document.querySelectorAll('.edit-template').forEach(link => {
        if (link.getAttribute('data-event-added')) return;
        
        link.setAttribute('data-event-added', 'true');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            editTemplate(this);
        });
    });
    
    // Delete template
    document.querySelectorAll('.delete-template').forEach(link => {
        if (link.getAttribute('data-event-added')) return;
        
        link.setAttribute('data-event-added', 'true');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            deleteTemplate(this);
        });
    });
}

/**
 * Mostra l'anteprima di un template
 */
function showTemplatePreview(button) {
    const templateId = button.getAttribute('data-template-id');
    if (!templateId) return;
    
    const card = button.closest('.template-card');
    if (!card) return;
    
    const templateName = card.querySelector('.card-header h5')?.textContent || 'Template';
    const templateText = card.querySelector('.template-preview')?.innerHTML || '';
    
    // Aggiorna il modal di anteprima
    const previewModalLabel = document.getElementById('previewModalLabel');
    const previewText = document.getElementById('previewText');
    const previewMobile = document.getElementById('previewMobile');
    const previewDesktop = document.getElementById('previewDesktop');
    
    if (previewModalLabel) previewModalLabel.textContent = `Anteprima: ${templateName}`;
    if (previewText) previewText.innerHTML = templateText;
    if (previewMobile) previewMobile.innerHTML = templateText;
    if (previewDesktop) previewDesktop.innerHTML = templateText;
    
    // Mostra il modal
    try {
        const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
        previewModal.show();
    } catch (e) {
        console.error('Errore nell\'apertura del modal di anteprima', e);
    }
}

/**
 * Mostra il modal per la selezione dei destinatari
 */
function showRecipientsModal(button) {
    const templateId = button.getAttribute('data-template-id');
    if (!templateId) return;
    
    const card = button.closest('.template-card');
    if (!card) return;
    
    const templateName = card.querySelector('.card-header h5')?.textContent || 'Template';
    const templateText = card.querySelector('.template-preview')?.innerHTML || '';
    
    // Aggiorna il modal dei destinatari
    const selectedTemplateName = document.getElementById('selectedTemplateName');
    const selectedTemplateText = document.getElementById('selectedTemplateText');
    
    if (selectedTemplateName) selectedTemplateName.textContent = templateName;
    if (selectedTemplateText) selectedTemplateText.innerHTML = templateText;
    
    // Reset selezione destinatari
    resetRecipientSelection();
    
    // Mostra il modal
    try {
        const recipientsModal = new bootstrap.Modal(document.getElementById('recipientsModal'));
        recipientsModal.show();
    } catch (e) {
        console.error('Errore nell\'apertura del modal dei destinatari', e);
    }
}

/**
 * Resetta la selezione dei destinatari
 */
function resetRecipientSelection() {
    const selectAllCheckbox = document.getElementById('selectAllRecipients');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    document.querySelectorAll('.recipient-check').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) selectedCount.textContent = '0';
}

/**
 * Prepara il form per modificare un template
 */
function editTemplate(link) {
    const templateId = link.getAttribute('data-template-id');
    if (!templateId) return;
    
    const card = link.closest('.template-card');
    if (!card) return;
    
    const templateName = card.querySelector('.card-header h5')?.textContent || '';
    const templatePreviewEl = card.querySelector('.template-preview');
    if (!templatePreviewEl) return;
    
    let templatePreview = templatePreviewEl.innerHTML;
    
    // Converti il testo dell'anteprima nelle variabili originali
    let originalText = templatePreview;
    originalText = originalText.replace(/Mario/g, "{name}");
    originalText = originalText.replace(/45/g, "{points}");
    
    // Data è più complesso da gestire perché cambia ogni giorno
    // Per semplicità, cerchiamo solo pattern di date tipici
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/g;
    originalText = originalText.replace(dateRegex, "{date}");
    
    // Aggiorna il form
    const templateNameInput = document.getElementById('templateName');
    const templateTextArea = document.getElementById('templateText');
    const modalLabel = document.getElementById('addTemplateModalLabel');
    const saveBtn = document.getElementById('saveTemplateBtn');
    
    if (templateNameInput) templateNameInput.value = templateName;
    if (templateTextArea) templateTextArea.value = originalText;
    if (modalLabel) modalLabel.textContent = "Modifica Template";
    if (saveBtn) saveBtn.textContent = "Aggiorna Template";
    
    // Aggiorna l'anteprima
    const livePreview = document.getElementById('livePreview');
    if (livePreview && templateTextArea) {
        updateLivePreview(templateTextArea.value, livePreview);
    }
    
    // Mostra il modal
    try {
        const modal = new bootstrap.Modal(document.getElementById('addTemplateModal'));
        modal.show();
    } catch (e) {
        console.error('Errore nell\'apertura del modal di modifica', e);
    }
}

/**
 * Elimina un template
 */
function deleteTemplate(link) {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;
    
    const templateId = link.getAttribute('data-template-id');
    if (!templateId) return;
    
    const card = link.closest('.col-md-6');
    if (!card) return;
    
    // Simula eliminazione con effetto di dissolvenza
    card.style.opacity = '0.5';
    setTimeout(() => {
        card.remove();
        showNotification('Template eliminato con successo.', 'success');
    }, 500);
}

/**
 * Configura la gestione delle campagne WhatsApp
 */
function setupCampaignsManagement() {
    // Pannello creazione campagna
    setupCampaignPanel();
    
    // Gestione modal dettagli campagna
    setupCampaignDetailsModal();
    
    // Bottoni per ripetere campagna
    setupRepeatCampaignButtons();
}

/**
 * Configura il pannello per la creazione di campagne
 */
function setupCampaignPanel() {
    // Pulsante per aprire il pannello
    const newCampaignBtn = document.getElementById('newCampaignBtn');
    if (newCampaignBtn) {
        newCampaignBtn.addEventListener('click', function() {
            try {
                const campaignPanel = new bootstrap.Offcanvas(document.getElementById('campaignPanel'));
                campaignPanel.show();
                
                // Reset wizard
                showWizardStep(1);
                const campaignDetailsForm = document.getElementById('campaignDetailsForm');
                if (campaignDetailsForm) campaignDetailsForm.reset();
                
                const scheduleDateContainer = document.getElementById('scheduleDateContainer');
                if (scheduleDateContainer) scheduleDateContainer.style.display = 'none';
            } catch (e) {
                console.error('Errore nell\'apertura del pannello campagna', e);
            }
        });
    }
    
    // Navigazione wizard
    setupWizardNavigation();
    
    // Opzioni pianificazione campagna
    const campaignSchedule = document.getElementById('campaignSchedule');
    if (campaignSchedule) {
        campaignSchedule.addEventListener('change', function() {
            const scheduleDateContainer = document.getElementById('scheduleDateContainer');
            if (scheduleDateContainer) {
                scheduleDateContainer.style.display = this.value === 'schedule' ? 'block' : 'none';
            }
        });
    }
    
    // Gestione metodo selezione destinatari
    document.querySelectorAll('input[name="selectionMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const filterOptions = document.getElementById('filterOptions');
            const selectOptions = document.getElementById('selectOptions');
            
            if (filterOptions) filterOptions.style.display = 'none';
            if (selectOptions) selectOptions.style.display = 'none';
            
            if (this.value === 'filter' && filterOptions) {
                filterOptions.style.display = 'block';
            } else if (this.value === 'select' && selectOptions) {
                selectOptions.style.display = 'block';
            }
        });
    });
    
    // Pulsante di applicazione filtri
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const pointsFilter = document.getElementById('pointsFilter')?.value;
            const lastVisitFilter = document.getElementById('lastVisitFilter')?.value;
            
            // Simulazione conteggio risultati filtrati
            let filteredCount = 85; // Default
            
            if (pointsFilter === '50' && lastVisitFilter === '7') {
                filteredCount = 5;
            } else if (pointsFilter === '50' || lastVisitFilter === '7') {
                filteredCount = 12;
            } else if (pointsFilter === '20' || lastVisitFilter === '30') {
                filteredCount = 25;
            } else if (pointsFilter === '10' || lastVisitFilter === '90') {
                filteredCount = 58;
            } else if (lastVisitFilter === 'inactive') {
                filteredCount = 30;
            }
            
            const filteredCountEl = document.getElementById('filteredCount');
            if (filteredCountEl) filteredCountEl.textContent = filteredCount;
        });
    }
    
    // Gestione checkbox clienti
    document.querySelectorAll('.client-check').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedClientsCount);
    });
    
    // Pulsante conferma invio campagna
    const confirmCampaignBtn = document.getElementById('confirmCampaignBtn');
    if (confirmCampaignBtn) {
        confirmCampaignBtn.addEventListener('click', sendCampaign);
    }
}

/**
 * Aggiorna il conteggio dei clienti selezionati
 */
function updateSelectedClientsCount() {
    const selectedCount = document.querySelectorAll('.client-check:checked').length;
    const selectedClientsCount = document.getElementById('selectedClientsCount');
    if (selectedClientsCount) {
        selectedClientsCount.textContent = selectedCount;
    }
}

/**
 * Configura la navigazione nel wizard
 */
function setupWizardNavigation() {
    // Pulsanti "Continua"
    document.querySelectorAll('.next-step').forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = parseInt(this.getAttribute('data-step'));
            
            // Validazioni specifiche per ogni step
            if (currentStep === 1) {
                const campaignName = document.getElementById('campaignName')?.value;
                if (!campaignName) {
                    alert('Inserisci un nome per la campagna.');
                    return;
                }
            }
            
            // Se siamo all'ultimo step, facciamo un'anteprima
            if (currentStep === 3) {
                updateCampaignSummary();
            }
            
            showWizardStep(currentStep + 1);
        });
    });
    
    // Pulsanti "Indietro"
    document.querySelectorAll('.prev-step').forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = parseInt(this.getAttribute('data-step'));
            showWizardStep(currentStep - 1);
        });
    });
}

/**
 * Mostra un passaggio specifico del wizard
 */
function showWizardStep(stepNumber) {
    // Nascondi tutti i passaggi
    document.querySelectorAll('.step-content').forEach(step => {
        if (step) step.style.display = 'none';
    });
    
    // Mostra il passaggio corrente
    const currentStep = document.getElementById(`step${stepNumber}`);
    if (currentStep) currentStep.style.display = 'block';
    
    // Aggiorna indicatore passaggi
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.getAttribute('data-step'));
        
        step.classList.remove('active', 'completed');
        
        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
}

/**
 * Aggiorna il riepilogo della campagna
 */
function updateCampaignSummary() {
    const campaignName = document.getElementById('campaignName')?.value || '-';
    const campaignDescription = document.getElementById('campaignDescription')?.value || 'Nessuna descrizione';
    const campaignSchedule = document.getElementById('campaignSchedule')?.value;
    const scheduleDate = document.getElementById('scheduleDate')?.value;
    
    // Template selezionato
    const selectedTemplateRadio = document.querySelector('input[name="templateRadio"]:checked');
    const selectedTemplateCard = selectedTemplateRadio?.closest('.template-card');
    const templateName = selectedTemplateCard?.querySelector('label')?.textContent.trim() || 'Benvenuto';
    
    // Destinatari
    const selectionMethod = document.querySelector('input[name="selectionMethod"]:checked')?.value;
    let recipientsText = "Tutti i clienti (120)";
    
    if (selectionMethod === 'filter') {
        const filteredCount = document.getElementById('filteredCount')?.textContent || '0';
        recipientsText = `Clienti filtrati (${filteredCount})`;
    } else if (selectionMethod === 'select') {
        const selectedCount = document.getElementById('selectedClientsCount')?.textContent || '0';
        recipientsText = `Clienti selezionati manualmente (${selectedCount})`;
    }
    
    // Aggiorna i campi del riepilogo
    const summaryName = document.getElementById('summaryName');
    const summaryDescription = document.getElementById('summaryDescription');
    const summarySchedule = document.getElementById('summarySchedule');
    const summaryTemplate = document.getElementById('summaryTemplate');
    const summaryRecipients = document.getElementById('summaryRecipients');
    
    if (summaryName) summaryName.textContent = campaignName;
    if (summaryDescription) summaryDescription.textContent = campaignDescription;
    
    if (summarySchedule) {
        if (campaignSchedule === 'schedule' && scheduleDate) {
            const formattedDate = new Date(scheduleDate).toLocaleString('it-IT');
            summarySchedule.textContent = `Pianificata per ${formattedDate}`;
        } else {
            summarySchedule.textContent = "Invio immediato";
        }
    }
    
    if (summaryTemplate) summaryTemplate.textContent = templateName;
    if (summaryRecipients) summaryRecipients.textContent = recipientsText;
}

/**
 * Invia una campagna WhatsApp
 */
function sendCampaign() {
    const btn = document.getElementById('confirmCampaignBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Invio in corso...';
    btn.disabled = true;
    
    // Simulazione invio
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Campagna inviata!';
        
        setTimeout(function() {
            // Chiudi il pannello
            try {
                const campaignPanel = bootstrap.Offcanvas.getInstance(document.getElementById('campaignPanel'));
                if (campaignPanel) campaignPanel.hide();
            } catch (e) {
                console.error('Errore nel chiudere il pannello campagna', e);
            }
            
            // Reset pulsante
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Notifica l'utente
            showNotification('Campagna inviata con successo! I messaggi verranno recapitati a breve.', 'success');
            
            // Aggiungi la nuova campagna alla lista (in un'implementazione reale si ricaricherebbe la pagina)
            addNewCampaignToList();
        }, 1500);
    }, 3000);
}

/**
 * Aggiunge una nuova campagna alla lista
 */
function addNewCampaignToList() {
    const campaignName = document.getElementById('campaignName')?.value;
    if (!campaignName) return;
    
    const templateName = document.getElementById('summaryTemplate')?.textContent || 'Template';
    const today = new Date().toLocaleDateString('it-IT');
    
    // Calcola numero destinatari
    const selectionMethod = document.querySelector('input[name="selectionMethod"]:checked')?.value;
    let recipients = 120;
    
    if (selectionMethod === 'filter') {
        recipients = parseInt(document.getElementById('filteredCount')?.textContent || '0');
    } else if (selectionMethod === 'select') {
        recipients = parseInt(document.getElementById('selectedClientsCount')?.textContent || '0');
    }
    
    // Crea HTML per la nuova campagna
    const newCampaignHTML = `
        <div class="campaign-card card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">${campaignName}</h5>
                    <span class="badge bg-primary">${templateName}</span>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p class="mb-1"><i class="fas fa-calendar-alt text-muted me-2"></i>${today}</p>
                        <p class="mb-0"><i class="fas fa-users text-muted me-2"></i>${recipients} destinatari</p>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <span class="badge bg-success badge-success-rate">100% consegnati</span>
                    </div>
                </div>
                <div class="border-top pt-3 d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary view-campaign-btn" data-campaign-id="new">
                        <i class="fas fa-chart-bar"></i> Metriche
                    </button>
                    <button class="btn btn-sm btn-outline-success repeat-campaign-btn" data-campaign-id="new">
                        <i class="fas fa-redo"></i> Ripeti Campagna
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Aggiungi la campagna alla lista
    const campaignsList = document.querySelector('.card-body');
    if (campaignsList) {
        campaignsList.insertAdjacentHTML('afterbegin', newCampaignHTML);
        
        // Aggiungi event listener ai nuovi bottoni
        setupCampaignButtonsEventListeners();
    }
}

/**
 * Configura i modal per dettagli campagna
 */
function setupCampaignDetailsModal() {
    document.querySelectorAll('.view-campaign-btn').forEach(button => {
        if (button.getAttribute('data-event-added')) return;
        
        button.setAttribute('data-event-added', 'true');
        button.addEventListener('click', function() {
            showCampaignDetails(this);
        });
    });
}

/**
 * Mostra i dettagli di una campagna
 */
function showCampaignDetails(button) {
    const campaignId = button.getAttribute('data-campaign-id');
    const campaignCard = button.closest('.campaign-card');
    if (!campaignCard) return;
    
    const campaignName = campaignCard.querySelector('h5')?.textContent || '';
    const campaignTemplate = campaignCard.querySelector('.badge')?.textContent || '';
    const campaignDate = campaignCard.querySelector('.fa-calendar-alt')?.nextSibling?.textContent.trim() || '';
    const recipientsText = campaignCard.querySelector('.fa-users')?.nextSibling?.textContent.trim() || '';
    const recipientsMatch = recipientsText.match(/\d+/);
    const recipients = recipientsMatch ? parseInt(recipientsMatch[0]) : 0;
    
    // Dati per la visualizzazione performance
    let delivered, read;
    const successRateEl = campaignCard.querySelector('.badge-success-rate');
    const successRateMatch = successRateEl?.textContent.match(/\d+/);
    const successRate = successRateMatch ? parseInt(successRateMatch[0]) : 100;
    
    delivered = Math.round(recipients * successRate / 100);
    read = Math.round(delivered * 0.8); // Supponiamo che l'80% dei messaggi consegnati sia letto
    
    // Aggiorna i contenuti del modal
    const modalElements = {
        name: document.getElementById('campaignModalName'),
        date: document.getElementById('campaignModalDate'),
        template: document.getElementById('campaignModalTemplate'),
        sent: document.getElementById('campaignModalSent'),
        delivered: document.getElementById('campaignModalDelivered'),
        read: document.getElementById('campaignModalRead'),
        deliveryRate: document.getElementById('campaignModalDeliveryRate'),
        readRate: document.getElementById('campaignModalReadRate'),
        content: document.getElementById('campaignModalContent')
    };
    
    if (modalElements.name) modalElements.name.textContent = campaignName;
    if (modalElements.date) modalElements.date.textContent = 'Inviata il ' + campaignDate;
    if (modalElements.template) modalElements.template.textContent = campaignTemplate;
    if (modalElements.sent) modalElements.sent.textContent = recipients;
    if (modalElements.delivered) modalElements.delivered.textContent = delivered;
    if (modalElements.read) modalElements.read.textContent = read;
    
    const deliveryRate = Math.round(delivered / recipients * 100);
    const readRate = Math.round(read / delivered * 100);
    
    if (modalElements.deliveryRate) {
        modalElements.deliveryRate.style.width = deliveryRate + '%';
        modalElements.deliveryRate.textContent = deliveryRate + '%';
    }
    
    if (modalElements.readRate) {
        modalElements.readRate.style.width = readRate + '%';
        modalElements.readRate.textContent = readRate + '%';
    }
    
    // Contenuto del messaggio - per semplicità usiamo un testo di esempio basato sul template
    if (modalElements.content) {
        let messageContent = '';
        
        switch (campaignTemplate.toLowerCase()) {
            case 'promozione':
                messageContent = 'Ciao {name}! Solo per te oggi: sconto del 20% su tutti i nostri yogurt. Ti aspettiamo!';
                break;
            case 'benvenuto':
                messageContent = 'Ciao {name}, benvenuto da TU&YO La Tua Yogurteria! Grazie per esserti iscritto.';
                break;
            case 'compleanno':
                messageContent = 'Auguri {name}! Per festeggiare il tuo compleanno, vieni a trovarci per uno yogurt gratuito!';
                break;
            case 'informazione':
                messageContent = 'Ciao {name}, abbiamo delle novità da TU&YO! Passa a trovarci per scoprire i nuovi gusti.';
                break;
            default:
                messageContent = 'Ciao {name}, grazie per essere cliente di TU&YO La Tua Yogurteria!';
        }
        
        modalElements.content.innerHTML = messageContent.replace(/{name}/g, 'Mario');
    }
    
    // Mostra il modal
    try {
        const campaignDetailsModal = new bootstrap.Modal(document.getElementById('campaignDetailsModal'));
        campaignDetailsModal.show();
    } catch (e) {
        console.error('Errore nell\'apertura del modal dettagli campagna', e);
    }
}

/**
 * Configura i pulsanti per ripetere le campagne
 */
function setupRepeatCampaignButtons() {
    // Bottoni nella lista campagne
    document.querySelectorAll('.repeat-campaign-btn').forEach(button => {
        if (button.getAttribute('data-event-added')) return;
        
        button.setAttribute('data-event-added', 'true');
        button.addEventListener('click', function() {
            repeatCampaign(this);
        });
    });
    
    // Bottone nel modal dettagli
    const repeatCampaignModalBtn = document.getElementById('repeatCampaignModalBtn');
    if (repeatCampaignModalBtn) {
        repeatCampaignModalBtn.addEventListener('click', function() {
            const campaignName = document.getElementById('campaignModalName')?.textContent || '';
            
            // Chiudi il modal
            try {
                const modal = bootstrap.Modal.getInstance(document.getElementById('campaignDetailsModal'));
                if (modal) modal.hide();
            } catch (e) {
                console.error('Errore nel chiudere il modal dettagli', e);
            }
            
            // Apri il pannello campagna
            try {
                const campaignPanel = new bootstrap.Offcanvas(document.getElementById('campaignPanel'));
                campaignPanel.show();
                
                // Reset wizard e compila con i dati della campagna precedente
                showWizardStep(1);
                
                const campaignNameInput = document.getElementById('campaignName');
                if (campaignNameInput) campaignNameInput.value = `Copia di ${campaignName}`;
                
                // Seleziona automaticamente lo stesso template (per semplicità qui seleziona il primo)
                setTimeout(() => {
                    const templateRadio = document.querySelector('input[name="templateRadio"]');
                    if (templateRadio) templateRadio.checked = true;
                }, 500);
            } catch (e) {
                console.error('Errore nell\'aprire il pannello campagna', e);
            }
        });
    }
}

/**
 * Ripete una campagna esistente
 */
function repeatCampaign(button) {
    const campaignId = button.getAttribute('data-campaign-id');
    const campaignCard = button.closest('.campaign-card');
    if (!campaignCard) return;
    
    const campaignName = campaignCard.querySelector('h5')?.textContent || '';
    
    // Apri il pannello campagna
    try {
        const campaignPanel = new bootstrap.Offcanvas(document.getElementById('campaignPanel'));
        campaignPanel.show();
        
        // Reset wizard e compila con i dati della campagna precedente
        showWizardStep(1);
        
        const campaignNameInput = document.getElementById('campaignName');
        if (campaignNameInput) campaignNameInput.value = `Copia di ${campaignName}`;
        
        // Seleziona automaticamente lo stesso template (per semplicità qui seleziona il primo)
        setTimeout(() => {
            const templateRadio = document.querySelector('input[name="templateRadio"]');
            if (templateRadio) templateRadio.checked = true;
        }, 500);
    } catch (e) {
        console.error('Errore nell\'aprire il pannello campagna', e);
    }
}

/**
 * Configura i modali per l'invio dei messaggi
 */
function setupSendMessageModals() {
    // Gestione selezione destinatari
    setupRecipientsSelection();
    
    // Pulsante per inviare ai selezionati
    const sendToSelectedBtn = document.getElementById('sendToSelectedBtn');
    if (sendToSelectedBtn) {
        sendToSelectedBtn.addEventListener('click', function() {
            sendToSelectedRecipients();
        });
    }
    
    // Invio dal modal di anteprima
    const sendFromPreviewBtn = document.getElementById('sendFromPreviewBtn');
    if (sendFromPreviewBtn) {
        sendFromPreviewBtn.addEventListener('click', function() {
            openRecipientsFromPreview();
        });
    }
}

/**
 * Configura la selezione dei destinatari
 */
function setupRecipientsSelection() {
    const selectAllCheckbox = document.getElementById('selectAllRecipients');
    const recipientCheckboxes = document.querySelectorAll('.recipient-check');
    const selectedCountElement = document.getElementById('selectedCount');
    
    if (!selectAllCheckbox || recipientCheckboxes.length === 0 || !selectedCountElement) return;
    
    // Aggiorna il conteggio
    function updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.recipient-check:checked').length;
        selectedCountElement.textContent = selectedCount;
    }
    
    // Gestione checkbox "seleziona tutti"
    selectAllCheckbox.addEventListener('change', function() {
        recipientCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateSelectedCount();
    });
    
    // Gestione checkbox singoli
    recipientCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedCount();
            
            // Aggiorna lo stato del checkbox "seleziona tutti"
            const allChecked = document.querySelectorAll('.recipient-check:checked').length === recipientCheckboxes.length;
            selectAllCheckbox.checked = allChecked;
        });
    });
    
    // Pulsante cancella selezione
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
            selectAllCheckbox.checked = false;
            recipientCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectedCount();
        });
    }
    
    // Filtro destinatari
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            const filterType = document.getElementById('filterType')?.value;
            
            if (!filterType) {
                // Mostra tutti
                document.querySelectorAll('#recipientsList tr').forEach(row => {
                    row.style.display = '';
                });
                return;
            }
            
            document.querySelectorAll('#recipientsList tr').forEach(row => {
                const points = parseInt(row.querySelector('td:nth-child(4)')?.textContent || '0');
                const lastVisitText = row.querySelector('td:nth-child(5)')?.textContent || '';
                
                // Converti la data in formato italiano in un oggetto Date
                const lastVisitParts = lastVisitText.split('/');
                if (lastVisitParts.length !== 3) return;
                
                const lastVisitDate = new Date(
                    parseInt(lastVisitParts[2]), 
                    parseInt(lastVisitParts[1]) - 1, 
                    parseInt(lastVisitParts[0])
                );
                
                const today = new Date();
                const daysDiff = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24));
                
                switch(filterType) {
                    case 'loyal':
                        row.style.display = points >= 50 ? '' : 'none';
                        break;
                    case 'recent':
                        row.style.display = daysDiff <= 30 ? '' : 'none';
                        break;
                    case 'inactive':
                        row.style.display = daysDiff > 60 ? '' : 'none';
                        break;
                }
            });
        });
    }
    
    // Ricerca destinatari
    const searchRecipients = document.getElementById('searchRecipients');
    if (searchRecipients) {
        searchRecipients.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            
            document.querySelectorAll('#recipientsList tr').forEach(row => {
                const name = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
                const phone = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
                
                if (name.includes(searchText) || phone.includes(searchText)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

/**
 * Invia messaggio ai destinatari selezionati
 */
function sendToSelectedRecipients() {
    const selectedCheckboxes = document.querySelectorAll('.recipient-check:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Seleziona almeno un destinatario.');
        return;
    }
    
    const btn = document.getElementById('sendToSelectedBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio in corso...';
    btn.disabled = true;
    
    // Simulazione invio
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-check"></i> Invio completato!';
        
        setTimeout(function() {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Chiudi il modal
            try {
                const modal = bootstrap.Modal.getInstance(document.getElementById('recipientsModal'));
                if (modal) modal.hide();
            } catch (e) {
                console.error('Errore nel chiudere il modal dei destinatari', e);
            }
            
            // Reset selezione
            const selectAllCheckbox = document.getElementById('selectAllRecipients');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            
            document.querySelectorAll('.recipient-check').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            const selectedCount = document.getElementById('selectedCount');
            if (selectedCount) selectedCount.textContent = '0';
            
            // Notifica l'utente
            showNotification(`Messaggio inviato con successo a ${selectedCheckboxes.length} clienti.`, 'success');
        }, 1000);
    }, 2000);
}

/**
 * Apre il modal dei destinatari dall'anteprima
 */
function openRecipientsFromPreview() {
    try {
        const recipientsModal = new bootstrap.Modal(document.getElementById('recipientsModal'));
        const previewModal = bootstrap.Modal.getInstance(document.getElementById('previewModal'));
        
        if (previewModal) previewModal.hide();
        
        // Aggiorna il modal dei destinatari con i dati del template
        const templateName = document.getElementById('previewModalLabel')?.textContent.replace('Anteprima: ', '') || '';
        const templateText = document.getElementById('previewText')?.innerHTML || '';
        
        const selectedTemplateName = document.getElementById('selectedTemplateName');
        const selectedTemplateText = document.getElementById('selectedTemplateText');
        
        if (selectedTemplateName) selectedTemplateName.textContent = templateName;
        if (selectedTemplateText) selectedTemplateText.innerHTML = templateText;
        
        recipientsModal.show();
    } catch (e) {
        console.error('Errore nell\'apertura del modal dei destinatari', e);
    }
}

/**
 * Aggiunge event listener ai bottoni delle campagne
 */
function setupCampaignButtonsEventListeners() {
    // Rimuovi event listener esistenti
    document.querySelectorAll('.view-campaign-btn[data-campaign-id="new"], .repeat-campaign-btn[data-campaign-id="new"]').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Aggiungi nuovi event listener
    document.querySelectorAll('.view-campaign-btn[data-campaign-id="new"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const campaignCard = this.closest('.campaign-card');
            if (!campaignCard) return;
            
            const campaignName = campaignCard.querySelector('h5')?.textContent || '';
            const campaignTemplate = campaignCard.querySelector('.badge')?.textContent || '';
            const campaignDate = campaignCard.querySelector('.fa-calendar-alt')?.nextSibling?.textContent.trim() || '';
            const recipientsText = campaignCard.querySelector('.fa-users')?.nextSibling?.textContent.trim() || '';
            const recipientsMatch = recipientsText.match(/\d+/);
            const recipients = recipientsMatch ? parseInt(recipientsMatch[0]) : 0;
            
            // Aggiorna il contenuto del modal
            const modalElements = {
                name: document.getElementById('campaignModalName'),
                date: document.getElementById('campaignModalDate'),
                template: document.getElementById('campaignModalTemplate'),
                sent: document.getElementById('campaignModalSent'),
                delivered: document.getElementById('campaignModalDelivered'),
                read: document.getElementById('campaignModalRead')
            };
            
            if (modalElements.name) modalElements.name.textContent = campaignName;
            if (modalElements.date) modalElements.date.textContent = 'Inviata il ' + campaignDate;
            if (modalElements.template) modalElements.template.textContent = campaignTemplate;
            if (modalElements.sent) modalElements.sent.textContent = recipients;
            if (modalElements.delivered) modalElements.delivered.textContent = recipients;
            if (modalElements.read) modalElements.read.textContent = Math.round(recipients * 0.8);
            
            // Percentuali di consegna e lettura
            const deliveryRateEl = document.getElementById('campaignModalDeliveryRate');
            const readRateEl = document.getElementById('campaignModalReadRate');
            
            if (deliveryRateEl) {
                deliveryRateEl.style.width = '100%';
                deliveryRateEl.textContent = '100%';
            }
            
            if (readRateEl) {
                readRateEl.style.width = '80%';
                readRateEl.textContent = '80%';
            }
            
            // Mostra il modal
            try {
                const modal = new bootstrap.Modal(document.getElementById('campaignDetailsModal'));
                modal.show();
            } catch (e) {
                console.error('Errore nell\'apertura del modal dettagli campagna', e);
            }
        });
    });
    
    document.querySelectorAll('.repeat-campaign-btn[data-campaign-id="new"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const campaignCard = this.closest('.campaign-card');
            if (!campaignCard) return;
            
            const campaignName = campaignCard.querySelector('h5')?.textContent || '';
            
            // Apri il pannello campagna
            try {
                const campaignPanel = new bootstrap.Offcanvas(document.getElementById('campaignPanel'));
                campaignPanel.show();
                
                // Reset wizard e compila con i dati della campagna precedente
                showWizardStep(1);
                
                const campaignNameInput = document.getElementById('campaignName');
                if (campaignNameInput) campaignNameInput.value = `Copia di ${campaignName}`;
                
                // Seleziona automaticamente lo stesso template
                setTimeout(() => {
                    const templateRadio = document.querySelector('input[name="templateRadio"]');
                    if (templateRadio) templateRadio.checked = true;
                }, 500);
            } catch (e) {
                console.error('Errore nell\'aprire il pannello campagna', e);
            }
        });
    });
}

/**
 * Mostra una notifica nella pagina
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
        
        // Rimuovi automaticamente dopo 5 secondi
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