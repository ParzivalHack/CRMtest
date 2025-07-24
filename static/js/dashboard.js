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

    fetch('/api/stats/sales')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(`Errore: ${data.error}`, 'danger');
                return;
            }

            // Update total sales
            document.querySelector('h2.mb-0').textContent = `€${data.total_sales.toFixed(2)}`;

            // Update charts and tables
            updateClientsChart();
            updateFlavorChart();
            updateTopClientsTable();
        })
        .catch(error => {
            console.error('Errore:', error);
            showNotification('Errore di comunicazione con il server.', 'danger');
        })
        .finally(() => {
            // Reset bottone
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

/**
 * Aggiorna i dati del grafico con valori casuali (solo per demo)
 */
function updateClientsChart() {
    fetch('/api/stats/clients')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(`Errore: ${data.error}`, 'danger');
                return;
            }

            const clientsChart = Chart.getChart('clientsChart');
            if (clientsChart) {
                clientsChart.data.labels = data.labels;
                clientsChart.data.datasets[0].data = data.new_clients;
                clientsChart.data.datasets[1].data = data.active_clients;
                clientsChart.update();
            }
        })
        .catch(error => {
            console.error('Errore:', error);
            showNotification('Errore di comunicazione con il server.', 'danger');
        });
}

function updateFlavorChart() {
    fetch('/api/stats/products')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(`Errore: ${data.error}`, 'danger');
                return;
            }

            const flavorChart = Chart.getChart('flavorChart');
            if (flavorChart) {
                flavorChart.data.labels = data.labels;
                flavorChart.data.datasets[0].data = data.data;
                flavorChart.update();
            }
        })
        .catch(error => {
            console.error('Errore:', error);
            showNotification('Errore di comunicazione con il server.', 'danger');
        });
}

function updateTopClientsTable() {
    fetch('/api/clients/top')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(`Errore: ${data.error}`, 'danger');
                return;
            }

            const tbody = document.getElementById('top-clients-tbody');
            tbody.innerHTML = '';
            data.forEach(client => {
                const row = `
                    <tr>
                        <td>${client.name}</td>
                        <td><span class="badge bg-success">${client.loyalty_points}</span></td>
                        <td>${client.last_visit}</td>
                        <td>
                            <a href="/clients/${client.id}" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-user"></i>
                            </a>
                            <a href="#" class="btn btn-sm btn-outline-success">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Errore:', error);
            showNotification('Errore di comunicazione con il server.', 'danger');
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
    const syncBtn = document.getElementById('sync-now');
    if (syncBtn) {
        syncBtn.addEventListener('click', function(e) {
            e.preventDefault();
            syncWithTilby();
        });
    }

    // Initial data load
    refreshDashboardData();
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
    const syncNowButton = document.getElementById('sync-now');
    const originalText = syncNowButton.innerHTML;
    syncNowButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizzazione...';
    syncNowButton.disabled = true;

    fetch('/api/sync/now', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full_sync: true })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification("Sincronizzazione completata con successo.", "success");
        } else {
            showNotification(`Errore durante la sincronizzazione: ${data.message}`, "danger");
        }
        syncNowButton.innerHTML = originalText;
        syncNowButton.disabled = false;
    })
    .catch(error => {
        console.error('Errore:', error);
        showNotification("Errore di comunicazione con il server.", "danger");
        syncNowButton.innerHTML = originalText;
        syncNowButton.disabled = false;
    });
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