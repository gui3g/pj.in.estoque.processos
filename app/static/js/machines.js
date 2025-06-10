$(document).ready(function() {
    // Carregar máquinas ao iniciar
    loadMachines();
    
    // Carregar fases para os selects
    loadPhases();
    
    // Configurar busca
    $('#search-machine').on('keyup', function() {
        const searchTerm = $(this).val().toLowerCase();
        filterMachines(searchTerm);
    });
    
    // Salvar nova máquina
    $('#save-machine-btn').on('click', function() {
        saveMachine();
    });
    
    // Atualizar máquina existente
    $('#update-machine-btn').on('click', function() {
        updateMachine();
    });
    
    // Botão de imprimir QR code
    $('#print-qrcode-btn').on('click', function() {
        printQRCode();
    });
    
    // Botão de download QR code
    $('#download-qrcode-btn').on('click', function() {
        downloadQRCode();
    });
    
    // Logout
    $('#logout-btn').on('click', function() {
        fetch('/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        }).then(() => {
            window.location.href = '/login';
        });
    });
});

/**
 * Carrega a lista de máquinas do servidor
 */
function loadMachines() {
    $.ajax({
        url: '/api/machines',
        type: 'GET',
        success: function(machines) {
            displayMachines(machines);
        },
        error: function() {
            showAlert('Erro ao carregar máquinas', 'danger');
        }
    });
}

/**
 * Exibe as máquinas na tabela
 */
function displayMachines(machines) {
    const table = $('#machines-table tbody');
    table.empty();
    
    if (machines.length === 0) {
        $('#no-machines-message').show();
        return;
    }
    
    $('#no-machines-message').hide();
    
    machines.forEach(function(machine) {
        const statusBadge = getStatusBadge(machine.status);
        
        const row = `
            <tr data-id="${machine.id}">
                <td>${machine.codigo}</td>
                <td>${machine.nome}</td>
                <td>${machine.fase_descricao}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info view-qrcode-btn" title="Ver QR Code">
                        <i class="fas fa-qrcode"></i>
                    </button>
                    <button class="btn btn-sm btn-primary edit-machine-btn" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-${machine.status === 'ativo' ? 'warning' : 'success'} toggle-status-btn" title="${machine.status === 'ativo' ? 'Desativar' : 'Ativar'}">
                        <i class="fas fa-${machine.status === 'ativo' ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `;
        
        table.append(row);
    });
    
    // Adicionar event listeners aos botões
    $('.view-qrcode-btn').on('click', function() {
        const machineId = $(this).closest('tr').data('id');
        showQRCode(machineId);
    });
    
    $('.edit-machine-btn').on('click', function() {
        const machineId = $(this).closest('tr').data('id');
        editMachine(machineId);
    });
    
    $('.toggle-status-btn').on('click', function() {
        const machineId = $(this).closest('tr').data('id');
        const isActive = $(this).hasClass('btn-warning');
        toggleMachineStatus(machineId, isActive);
    });
}

/**
 * Filtra as máquinas com base no termo de busca
 */
function filterMachines(searchTerm) {
    $('#machines-table tbody tr').each(function() {
        const codigo = $(this).find('td:eq(0)').text().toLowerCase();
        const nome = $(this).find('td:eq(1)').text().toLowerCase();
        const fase = $(this).find('td:eq(2)').text().toLowerCase();
        
        if (codigo.includes(searchTerm) || nome.includes(searchTerm) || fase.includes(searchTerm)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

/**
 * Carrega as fases para os selects
 */
function loadPhases() {
    $.ajax({
        url: '/api/phases',
        type: 'GET',
        success: function(phases) {
            const options = phases.map(phase => `<option value="${phase.id}">${phase.nome || phase.descricao}</option>`).join('');
            $('#machine-phase, #edit-machine-phase, #associate-machine-phase').append(options);
            
            // Carregar máquinas por fase (para a tab de associação)
            loadMachinesByPhase();
        },
        error: function() {
            showAlert('Erro ao carregar fases', 'danger');
        }
    });
}

/**
 * Carrega as máquinas agrupadas por fase
 */
function loadMachinesByPhase() {
    $.ajax({
        url: '/api/machines/fases',
        type: 'GET',
        success: function(result) {
            displayMachinesByPhase(result);
        },
        error: function() {
            showAlert('Erro ao carregar máquinas por fase', 'danger');
        }
    });
}

/**
 * Exibe as máquinas agrupadas por fase
 */
function displayMachinesByPhase(phases) {
    const container = $('#phase-machines-container');
    container.empty();
    
    if (phases.length === 0) {
        container.html('<div class="alert alert-info">Nenhuma fase com máquinas associadas.</div>');
        return;
    }
    
    phases.forEach(function(phase) {
        const phaseCard = $(`
            <div class="card mb-3">
                <div class="card-header">
                    <h5>${phase.fase_nome}</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Ordem</th>
                                    <th>Código</th>
                                    <th>Nome</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="phase-${phase.fase_id}-machines" data-phase-id="${phase.fase_id}" class="sortable-machines">
                            </tbody>
                        </table>
                    </div>
                    <div class="text-end mt-2">
                        <button class="btn btn-primary btn-sm add-machine-to-phase" data-phase-id="${phase.fase_id}">
                            <i class="fas fa-plus me-1"></i>Adicionar Máquina
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        const tbody = phaseCard.find(`#phase-${phase.fase_id}-machines`);
        
        if (phase.maquinas && phase.maquinas.length > 0) {
            phase.maquinas.sort((a, b) => a.ordem - b.ordem).forEach(function(machine) {
                const statusBadge = getStatusBadge(machine.status);
                const machineRow = $(`
                    <tr data-machine-id="${machine.id}" data-order="${machine.ordem}">
                        <td><span class="ordem-badge badge bg-secondary">${machine.ordem}</span></td>
                        <td>${machine.codigo}</td>
                        <td>${machine.nome}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-danger remove-machine-btn" data-phase-id="${phase.fase_id}" data-machine-id="${machine.id}" title="Remover da fase">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
                tbody.append(machineRow);
            });
        } else {
            tbody.append(`<tr><td colspan="5"><em>Nenhuma máquina associada</em></td></tr>`);
        }
        
        container.append(phaseCard);
    });
    
    // Permitir ordenação das máquinas dentro da fase via drag and drop
    $('.sortable-machines').each(function() {
        const phaseId = $(this).data('phase-id');
        
        $(this).sortable({
            items: 'tr:not(:last)',
            cursor: 'move',
            axis: 'y',
            update: function() {
                updateMachineOrder(phaseId);
            }
        });
    });
    
    // Adicionar handlers para botões
    $('.add-machine-to-phase').on('click', function() {
        const phaseId = $(this).data('phase-id');
        showAddMachineToPhaseModal(phaseId);
    });
    
    $('.remove-machine-btn').on('click', function() {
        const phaseId = $(this).data('phase-id');
        const machineId = $(this).data('machine-id');
        removeMachineFromPhase(phaseId, machineId);
    });
}

/**
 * Salva uma nova máquina
 */
function saveMachine() {
    const codigo = $('#machine-code').val();
    const nome = $('#machine-name').val();
    const descricao = $('#machine-description').val();
    const faseId = $('#machine-phase').val();
    const status = $('#machine-status').val();
    
    if (!codigo || !nome || !faseId) {
        showAlert('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    $.ajax({
        url: '/api/machines',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            codigo: codigo,
            nome: nome,
            descricao: descricao,
            fase_id: parseInt(faseId),
            status: status
        }),
        success: function(response) {
            $('#addMachineModal').modal('hide');
            showAlert('Máquina cadastrada com sucesso', 'success');
            $('#addMachineForm')[0].reset();
            loadMachines();
        },
        error: function(xhr) {
            const message = xhr.responseJSON?.detail || 'Erro ao cadastrar máquina';
            showAlert(message, 'danger');
        }
    });
}

/**
 * Carrega os dados de uma máquina para edição
 */
function editMachine(machineId) {
    $.ajax({
        url: `/api/machines/${machineId}`,
        type: 'GET',
        success: function(machine) {
            $('#edit-machine-id').val(machine.id);
            $('#edit-machine-code').val(machine.codigo);
            $('#edit-machine-name').val(machine.nome);
            $('#edit-machine-description').val(machine.descricao);
            $('#edit-machine-phase').val(machine.fase_id);
            $('#edit-machine-status').val(machine.status);
            
            $('#editMachineModal').modal('show');
        },
        error: function() {
            showAlert('Erro ao carregar dados da máquina', 'danger');
        }
    });
}

/**
 * Atualiza os dados de uma máquina
 */
function updateMachine() {
    const machineId = $('#edit-machine-id').val();
    const codigo = $('#edit-machine-code').val();
    const nome = $('#edit-machine-name').val();
    const descricao = $('#edit-machine-description').val();
    const faseId = $('#edit-machine-phase').val();
    const status = $('#edit-machine-status').val();
    
    if (!codigo || !nome || !faseId) {
        showAlert('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    $.ajax({
        url: `/api/machines/${machineId}`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            codigo: codigo,
            nome: nome,
            descricao: descricao,
            fase_id: parseInt(faseId),
            status: status
        }),
        success: function() {
            $('#editMachineModal').modal('hide');
            showAlert('Máquina atualizada com sucesso', 'success');
            loadMachines();
        },
        error: function(xhr) {
            const message = xhr.responseJSON?.detail || 'Erro ao atualizar máquina';
            showAlert(message, 'danger');
        }
    });
}

/**
 * Alterna o status de uma máquina (ativo/inativo)
 */
function toggleMachineStatus(machineId, isActive) {
    const newStatus = isActive ? 'inativo' : 'ativo';
    const actionText = isActive ? 'desativar' : 'ativar';
    
    if (confirm(`Deseja ${actionText} esta máquina?`)) {
        $.ajax({
            url: `/api/machines/${machineId}/status`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                status: newStatus
            }),
            success: function() {
                showAlert(`Máquina ${isActive ? 'desativada' : 'ativada'} com sucesso`, 'success');
                loadMachines();
            },
            error: function() {
                showAlert(`Erro ao ${actionText} máquina`, 'danger');
            }
        });
    }
}

/**
 * Exibe o QR Code de uma máquina
 */
function showQRCode(machineId) {
    $.ajax({
        url: `/api/machines/${machineId}`,
        type: 'GET',
        success: function(machine) {
            $('#qrcode-machine-name').text(machine.nome);
            $('#qrcode-machine-info').text(`Código: ${machine.codigo}`);
            
            // Buscar imagem de QR Code gerada pelo servidor
            if (machine.qrcode) {
                // Se a máquina já tem um QR code no servidor, exibir ele
                const qrUrl = `/api/machines/qrcode/${machine.id}`;
                $('#qrcode-img').attr('src', qrUrl);
                $('#qrcode-container').hide();
                $('#server-qrcode-container').show();
            } else {
                // Caso contrário, gerar um QR code local temporariamente
                $('#server-qrcode-container').hide();
                $('#qrcode-container').show();
                
                // Limpar container anterior
                $('#qrcode-container').empty();
                
                // Criar QR Code com os dados da máquina
                const qrData = `maquina:${machine.codigo}:${machine.nome}`;
                
                const qrcode = new QRCode(document.getElementById("qrcode-container"), {
                    text: qrData,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
            
            // Exibir o modal
            $('#qrCodeModal').modal('show');
        },
        error: function() {
            showAlert('Erro ao carregar dados da máquina', 'danger');
        }
    });
}

/**
 * Exibe o modal para adicionar uma máquina a uma fase
 */
function showAddMachineToPhaseModal(phaseId) {
    // Limpar seleção anterior
    $('#associate-machine-phase').val(phaseId);
    $('#associate-machine-id').val('');
    $('#associate-machine-ordem').val(1);
    
    // Carregar máquinas para seleção
    $.ajax({
        url: '/api/machines',
        type: 'GET',
        data: { active_only: true },
        success: function(machines) {
            const machineSelect = $('#associate-machine-id');
            machineSelect.empty();
            machineSelect.append('<option value="">Selecione uma máquina...</option>');
            
            machines.forEach(function(machine) {
                machineSelect.append(`<option value="${machine.id}">${machine.nome} (${machine.codigo})</option>`);
            });
            
            $('#associateMachineModal').modal('show');
        },
        error: function() {
            showAlert('Erro ao carregar máquinas disponíveis', 'danger');
        }
    });
}

/**
 * Associa uma máquina a uma fase com uma ordem específica
 */
function associateMachineToPhase() {
    const phaseId = $('#associate-machine-phase').val();
    const machineId = $('#associate-machine-id').val();
    const ordem = $('#associate-machine-ordem').val() || 1;
    
    if (!phaseId || !machineId) {
        showAlert('Selecione uma fase e uma máquina', 'warning');
        return;
    }
    
    $.ajax({
        url: '/api/machines/associar-fase',
        type: 'POST',
        data: {
            fase_id: phaseId,
            maquina_id: machineId,
            ordem: ordem
        },
        success: function(response) {
            $('#associateMachineModal').modal('hide');
            showAlert('Máquina associada com sucesso', 'success');
            loadMachinesByPhase();
        },
        error: function(xhr) {
            const message = xhr.responseJSON?.detail || 'Erro ao associar máquina à fase';
            showAlert(message, 'danger');
        }
    });
}

/**
 * Remove a associação de uma máquina com uma fase
 */
function removeMachineFromPhase(phaseId, machineId) {
    if (!confirm('Tem certeza que deseja remover esta máquina da fase?')) {
        return;
    }
    
    $.ajax({
        url: '/api/machines/desassociar-fase',
        type: 'DELETE',
        data: {
            fase_id: phaseId,
            maquina_id: machineId
        },
        success: function(response) {
            showAlert('Máquina removida da fase com sucesso', 'success');
            loadMachinesByPhase();
        },
        error: function(xhr) {
            const message = xhr.responseJSON?.detail || 'Erro ao remover máquina da fase';
            showAlert(message, 'danger');
        }
    });
}

/**
 * Atualiza a ordem das máquinas em uma fase
 */
function updateMachineOrder(phaseId) {
    const tbody = $(`#phase-${phaseId}-machines`);
    const rows = tbody.find('tr[data-machine-id]');
    
    if (rows.length === 0) return;
    
    // Construir array com nova ordem
    const novaOrdem = [];
    rows.each(function(index) {
        const machineId = $(this).data('machine-id');
        if (machineId) {
            const ordem = index + 1;
            novaOrdem.push({
                maquina_id: machineId,
                ordem: ordem
            });
            
            // Atualizar exibição da ordem
            $(this).data('order', ordem);
            $(this).find('.ordem-badge').text(ordem);
        }
    });
    
    // Enviar nova ordem para o servidor
    $.ajax({
        url: '/api/machines/reordenar',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            fase_id: phaseId,
            nova_ordem: novaOrdem
        }),
        success: function(response) {
            showAlert('Ordem das máquinas atualizada', 'success');
        },
        error: function(xhr) {
            const message = xhr.responseJSON?.detail || 'Erro ao atualizar ordem das máquinas';
            showAlert(message, 'danger');
            loadMachinesByPhase();  // Recarregar para exibir ordem correta
        }
    });
}

/**
 * Imprime o QR Code
 */
function printQRCode() {
    const machineInfo = $('#qrcode-machine-name').text();
    const qrCodeImg = $('#qrcode-container img').attr('src');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>QR Code - ${machineInfo}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    .container {
                        max-width: 400px;
                        margin: 0 auto;
                        border: 1px solid #ccc;
                        padding: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>${machineInfo}</h3>
                    <p>${$('#qrcode-machine-info').text()}</p>
                    <img src="${qrCodeImg}" alt="QR Code">
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * Download do QR Code como imagem
 */
function downloadQRCode() {
    const machineInfo = $('#qrcode-machine-name').text();
    const qrCodeImg = $('#qrcode-container img').attr('src');
    
    // Criar um link temporário para download
    const link = document.createElement('a');
    link.download = `qrcode-${machineInfo.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeImg;
    link.click();
}

/**
 * Retorna o badge HTML para o status
 */
function getStatusBadge(status) {
    const statusMap = {
        'ativo': '<span class="badge bg-success">Ativo</span>',
        'inativo': '<span class="badge bg-danger">Inativo</span>',
        'manutencao': '<span class="badge bg-warning text-dark">Manutenção</span>'
    };
    
    return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
}

/**
 * Exibe um alerta na página
 */
function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Remover alertas anteriores
    $('.alert').remove();
    
    // Adicionar o novo alerta
    $('.container').prepend(alertHtml);
    
    // Auto-fechar após 5 segundos
    setTimeout(function() {
        $('.alert').fadeOut('slow', function() {
            $(this).remove();
        });
    }, 5000);
}
