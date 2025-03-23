/**
 * TU&YO CRM - Script specifico per la dashboard
 * Sviluppato da Tommaso Bona
 * 2025
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inizializzazione dei grafici della dashboard
    initDashboardCharts();
    
    // Configurazione refresh automatico dati
    setupDataRefresh();
    
    // Eventi per i pulsanti di azione rapida
    setupQuickActions();
    
    console.log('Dashboard JS caricato');
});

/**
 * Inizializza tutti i grafici della dashboard
 */
function initDashboardCharts() {
    // Grafico clienti
    if (document.getElementById('clientsChart')) {
        const ctx = document.getElementById('clientsChart').getContext('2d');
        const clientsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ottobre', 'Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo'],
                datasets: [{
                    label: 'Nuovi Clienti',
                    data: [12, 19, 15, 22, 26, 30],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Clienti Attivi',
                    data: [65, 72, 78, 85, 95, 105],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Grafico distribuzione gusti
    if (document.getElementById('flavorChart')) {
        const flavorCtx = document.getElementById('flavorChart').getContext('2d');
        const flavorChart = new Chart(flavorCtx, {
            type: 'doughnut',
            data: {
                labels: ['Fragola', 'Cioccolato', 'Pistacchio', 'Vaniglia', 'Mango', 'Altri'],
                datasets: [{
                    data: [25, 20, 15, 12, 10, 18],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(165, 42, 42, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(54, 162, 235, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(165, 42, 42, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
}

/**
 * Configurazione refresh automatico dati
 */
function setupDataRefresh() {
    // Aggiorna dati al click del pulsante refresh
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshDashboardData();
        });
    }
    
    // Refresh automatico ogni 5 minuti
    // Disabilitato per ora per evitare troppe chiamate API in fase di sviluppo
    // setInterval(refreshDashboardData, 300000);
}

/**
 * Aggiorna i dati della dashboard tramite API
 */
function refreshDashboardData() {
    const btn = document.getElementById('refreshDataBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    // Mostra indicatore di caricamento
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiornamento...';
    btn.disabled = true;
    
    // Simulazione chiamata API a Tilby
    setTimeout(function() {
        // Aggiornamento completato
        btn.innerHTML = '<i class="fas fa-check"></i> Dati aggiornati!';
        
        // In un'implementazione reale, qui si aggiornerebbero i dati e grafici
        updateRandomChartData();
        
        // Reset bottone dopo 2 secondi
        setTimeout(function() {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Notifica l'utente
            showNotification("I dati sono stati aggiornati con successo.", "success");
        }, 2000);
    }, 2000);
}

/**
 * Aggiorna i dati del grafico con valori casuali (solo per demo)
 */
function updateRandomChartData() {
    const charts = Chart.instances;
    
    // Aggiorna tutti i grafici con dati casuali
    charts.forEach(chart => {
        chart.data.datasets.forEach(dataset => {
            dataset.data = dataset.data.map(() => Math.floor(Math.random() * 50) + 10);
        });
        chart.update();
    });
}

/**
 * Configura i pulsanti di azione rapida
 */
function setupQuickActions() {
    // Bottone generazione report
    const reportBtn = document.querySelector('.btn-outline-secondary[href*="report"]');
    if (reportBtn) {
        reportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateReport();
        });
    }
    
    // Bottone sincronizzazione Tilby
    const syncBtn = document.querySelector('.btn-outline-info[href*="sync"]');
    if (syncBtn) {
        syncBtn.addEventListener('click', function(e) {
            e.preventDefault();
            syncWithTilby();
        });
    }
}

/**
 * Genera un report dimostrativo
 */
function generateReport() {
    showNotification("Generazione report in corso...", "info");
    
    // Simulazione generazione report
    setTimeout(function() {
        showNotification("Report generato con successo! Scarica il file.", "success");
    }, 3000);
}

/**
 * Simulazione sincronizzazione con Tilby
 */
function syncWithTilby() {
    showNotification("Sincronizzazione con Tilby in corso...", "info");
    
    // Simulazione sincronizzazione
    setTimeout(function() {
        showNotification("Sincronizzazione completata. 15 nuovi clienti importati.", "success");
        
        // Aggiorna contatori casuali
        document.querySelectorAll('.kpi-card h2').forEach(counter => {
            const currentValue = parseInt(counter.textContent);
            const increment = Math.floor(Math.random() * 10) + 1;
            counter.textContent = currentValue + increment;
        });
    }, 3000);
}

/**
 * Mostra una notifica nella dashboard
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
                const alert = alerts[0];
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}