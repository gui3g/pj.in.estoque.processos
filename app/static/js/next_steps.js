/**
 * next-steps.js - Funções para processar e exibir os próximos passos de produção
 * incluindo máquinas associadas às fases
 */

// Função para carregar informações do próximo passo para um lote
function loadNextSteps(loteId) {
    if (!loteId) {
        $('#next-steps-container').hide();
        $('#fase-atual-container').hide();
        $('#no-lote-selected').show();
        return;
    }

    // Mostrar indicador de carregamento
    showLoadingIndicator('Carregando informações das fases...');

    // Chamar API para obter informações do próximo passo
    $.ajax({
        url: `/api/next-steps/${loteId}`,
        type: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            hideLoadingIndicator();
            displayNextSteps(response);
        },
        error: function(xhr) {
            hideLoadingIndicator();
            console.error('Erro ao carregar próximos passos:', xhr);
            showErrorAlert('Não foi possível carregar as informações de próximos passos. Tente novamente.');
        }
    });
}

// Função para exibir informações de próximos passos
function displayNextSteps(data) {
    // Esconder mensagem de nenhum lote selecionado
    $('#no-lote-selected').hide();
    
    // Atualizar informações da fase atual
    displayCurrentPhase(data.fase_atual);
    
    // Atualizar lista de próximos passos
    displayUpcomingSteps(data.proximos_passos);
}

// Função para exibir informações sobre a fase atual
function displayCurrentPhase(faseAtual) {
    const faseAtualContainer = $('#fase-atual-container');
    const faseAtualNome = $('#fase-atual-nome');
    const faseAtualDias = $('#fase-atual-dias');
    const faseAtualMaquinas = $('#fase-atual-maquinas');
    
    faseAtualNome.text(faseAtual.nome);
    faseAtualDias.text(`${faseAtual.dias_na_fase} dia(s)`);
    
    // Limpar e preencher a lista de máquinas da fase atual
    faseAtualMaquinas.empty();
    
    if (faseAtual.maquinas && faseAtual.maquinas.length > 0) {
        faseAtual.maquinas.forEach(function(maquina) {
            const statusClass = maquina.status === 'ativo' ? 'text-success' : 
                              (maquina.status === 'manutencao' ? 'text-warning' : 'text-danger');
            
            const maquinaItem = $(`
                <div class="mb-1 d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-cog me-1 ${statusClass}"></i>
                        <span>${maquina.nome}</span>
                        <small class="text-muted ms-1">(${maquina.codigo})</small>
                    </div>
                    <span class="badge bg-secondary">Ordem: ${maquina.ordem}</span>
                </div>
            `);
            
            // Adicionar evento ao clicar na máquina para selecioná-la
            maquinaItem.on('click', function() {
                selectMachine(maquina);
            });
            
            faseAtualMaquinas.append(maquinaItem);
        });
    } else {
        faseAtualMaquinas.append('<p class="text-muted">Nenhuma máquina associada a esta fase.</p>');
    }
    
    faseAtualContainer.show();
}

// Função para exibir os próximos passos
function displayUpcomingSteps(proximosPassos) {
    const nextStepsContainer = $('#next-steps-container');
    const nextStepsList = $('#next-steps-list');
    
    nextStepsList.empty();
    
    if (proximosPassos && proximosPassos.length > 0) {
        proximosPassos.forEach(function(fase, index) {
            const stepItem = $(`
                <div class="next-step-item mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="badge bg-secondary me-2">${index + 1}</span>
                        <strong>${fase.fase_nome}</strong>
                    </div>
            `);
            
            // Se houver máquinas, exibi-las
            if (fase.maquinas && fase.maquinas.length > 0) {
                const maquinasList = $('<div class="ps-3 small"></div>');
                
                fase.maquinas.forEach(function(maquina) {
                    const statusClass = maquina.status === 'ativo' ? 'text-success' : 
                                      (maquina.status === 'manutencao' ? 'text-warning' : 'text-danger');
                    
                    maquinasList.append(`
                        <div class="mb-1">
                            <i class="fas fa-cog me-1 ${statusClass}"></i>
                            <span>${maquina.nome}</span>
                            <small class="text-muted ms-1">(Ordem: ${maquina.ordem})</small>
                        </div>
                    `);
                });
                
                stepItem.append(maquinasList);
            } else {
                stepItem.append('<div class="ps-3 small text-muted">Nenhuma máquina associada</div>');
            }
            
            nextStepsList.append(stepItem);
        });
    } else {
        nextStepsList.append('<p class="text-muted">Não há próximas fases.</p>');
    }
    
    nextStepsContainer.show();
}

// Função para selecionar uma máquina para o apontamento
function selectMachine(maquina) {
    // Atualizar informações da máquina na interface
    $('#maquina-info').text(`${maquina.nome} (${maquina.codigo})`);
    
    // Armazenar o ID da máquina para uso no apontamento
    $('#apontamento-form').data('maquina-id', maquina.id);
    
    // Atualizar o visual para indicar que uma máquina foi selecionada
    $('.selected-machine').removeClass('selected-machine');
    $(`[data-maquina-id="${maquina.id}"]`).addClass('selected-machine');
    
    // Exibir feedback visual
    showSuccessAlert(`Máquina "${maquina.nome}" selecionada para o apontamento.`);
}

// Função para lidar com o QR code escaneado da máquina
function handleMachineQrCode(qrCodeData) {
    // Esconder o leitor de QR code
    $('#machine-qr-reader').hide();
    
    // Formatar os dados do QR code (esperado formato: "maquina:CODIGO")
    const parts = qrCodeData.split(':');
    if (parts.length !== 2 || parts[0] !== 'maquina') {
        showErrorAlert('QR code inválido. Esperado formato: "maquina:CODIGO"');
        return;
    }
    
    const codigoMaquina = parts[1];
    
    // Buscar informações da máquina pelo código
    $.ajax({
        url: `/api/machines/codigo/${codigoMaquina}`,
        type: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(maquina) {
            selectMachine(maquina);
        },
        error: function(xhr) {
            console.error('Erro ao carregar informações da máquina:', xhr);
            showErrorAlert(`Máquina com código ${codigoMaquina} não encontrada.`);
        }
    });
}

// Inicializar eventos quando o documento estiver pronto
$(document).ready(function() {
    // Evento para escanear QR code da máquina
    $('#scan-machine-qr').on('click', function() {
        const machineQrReader = $('#machine-qr-reader');
        
        if (machineQrReader.is(':visible')) {
            machineQrReader.hide();
            return;
        }
        
        machineQrReader.show();
        
        // Inicializar leitor de QR code
        const machineQrScanner = new Html5Qrcode('machine-qr-reader');
        const qrConfig = { fps: 10, qrbox: 250 };
        
        machineQrScanner.start(
            { facingMode: "environment" }, 
            qrConfig, 
            (decodedText) => {
                // Parar o scanner após detectar um código
                machineQrScanner.stop().then(() => {
                    handleMachineQrCode(decodedText);
                }).catch(err => {
                    console.error('Erro ao parar o scanner:', err);
                });
            },
            (errorMessage) => {
                // Ignorar erros durante o scan contínuo
            }
        ).catch(err => {
            console.error('Erro ao iniciar o scanner:', err);
            showErrorAlert('Não foi possível acessar a câmera. Verifique as permissões.');
            machineQrReader.hide();
        });
    });
    
    // Mostrar ou esconder o container de escaneamento de máquina baseado no checkbox
    $('#iniciar-apontamento').on('change', function() {
        if ($(this).is(':checked')) {
            $('#machine-scan-container').show();
        } else {
            $('#machine-scan-container').hide();
        }
    });
    
    // Quando um lote é selecionado, carregar seus próximos passos
    $('#lote-select').on('change', function() {
        const loteId = $(this).val();
        if (loteId) {
            loadNextSteps(loteId);
        } else {
            $('#next-steps-container').hide();
            $('#fase-atual-container').hide();
            $('#no-lote-selected').show();
        }
    });
});

// Funções auxiliares para mostrar ou esconder indicadores de carregamento
function showLoadingIndicator(message) {
    $('#loading-message').text(message || 'Carregando...');
    $('#loading-overlay').show();
}

function hideLoadingIndicator() {
    $('#loading-overlay').hide();
}

// Funções auxiliares para exibir alertas
function showSuccessAlert(message) {
    const alertId = 'alert-' + Date.now();
    const alert = $(`
        <div id="${alertId}" class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
    `);
    
    $('#alerts-container').append(alert);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        $(`#${alertId}`).alert('close');
    }, 5000);
}

function showErrorAlert(message) {
    const alertId = 'alert-' + Date.now();
    const alert = $(`
        <div id="${alertId}" class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
    `);
    
    $('#alerts-container').append(alert);
    
    // Remover automaticamente após 7 segundos
    setTimeout(() => {
        $(`#${alertId}`).alert('close');
    }, 7000);
}
