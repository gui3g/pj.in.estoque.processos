/**
 * Arquivo JavaScript principal para funcionalidades comuns do sistema
 */

// Configuração global do AJAX para incluir token CSRF
$(document).ready(function() {
    // Função para obter o token CSRF dos cookies
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Configuração global para AJAX
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            // Se não for uma requisição "segura", adicionar token CSRF
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type)) {
                const csrftoken = getCookie('csrftoken');
                if (csrftoken) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        }
    });

    // Manipulador para o botão de logout
    $('#logout-btn').on('click', function(e) {
        e.preventDefault();
        
        $.ajax({
            url: '/logout',
            type: 'POST',
            success: function() {
                window.location.href = '/login';
            },
            error: function() {
                alert('Erro ao tentar fazer logout. Tente novamente.');
            }
        });
    });

    // Formatador de data para exibição
    window.formatDate = function(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
    };

    // Formatador de tempo (minutos para formato HH:MM)
    window.formatTime = function(minutes) {
        if (!minutes && minutes !== 0) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Função para formatar status com badge
    window.formatStatus = function(status) {
        if (!status) return '-';
        
        const statusMap = {
            'em_producao': 'Em Produção',
            'concluido': 'Concluído',
            'parado': 'Parado',
            'iniciado': 'Iniciado',
            'finalizado': 'Finalizado',
            'pausado': 'Pausado'
        };
        
        const displayStatus = statusMap[status] || status;
        return `<span class="badge bg-${status}">${displayStatus}</span>`;
    };

    // Função utilitária para exibir mensagens de alerta
    window.showAlert = function(container, type, message, timeout = 5000) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $(container).html(alertHtml);
        
        if (timeout) {
            setTimeout(() => {
                $(container).find('.alert').alert('close');
            }, timeout);
        }
    };

    // Inicializa tooltips do Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
