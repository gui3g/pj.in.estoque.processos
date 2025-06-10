/**
 * JavaScript para gerenciamento de fases
 */

$(document).ready(function() {
    // Carregar lista de fases
    loadPhasesList();
    
    // Configurar busca de fases
    $('#phase-search').on('keyup', function() {
        const searchTerm = $(this).val().toLowerCase();
        filterPhases(searchTerm);
    });
    
    // Configurar evento para visualizar fase
    $(document).on('click', '.view-phase', function() {
        const phaseId = $(this).data('id');
        viewPhase(phaseId);
    });
    
    // Configurar evento para editar fase
    $(document).on('click', '.edit-phase', function() {
        const phaseId = $(this).data('id');
        editPhase(phaseId);
    });
    
    // Configurar evento para gerenciar checklist
    $(document).on('click', '.manage-checklist', function() {
        const phaseId = $(this).data('id');
        manageChecklist(phaseId);
    });
    
    // Configurar evento para excluir fase
    $(document).on('click', '.delete-phase', function() {
        const phaseId = $(this).data('id');
        deletePhase(phaseId);
    });
    
    // Salvar fase ao clicar no botão salvar
    $('#save-phase').on('click', function() {
        savePhase();
    });
    
    // Adicionar item ao checklist
    $('#add-checklist-item').on('click', function() {
        addChecklistItem();
    });
    
    // Salvar checklist
    $('#save-checklist').on('click', function() {
        saveChecklist();
    });
    
    // Atualizar lista de fases ao clicar no botão atualizar
    $('#refresh-phases').on('click', function() {
        $(this).html('<i class="fas fa-spinner fa-spin me-1"></i>Atualizando...');
        $(this).prop('disabled', true);
        
        loadPhasesList();
        
        // Restaurar botão após um curto período
        setTimeout(function() {
            $('#refresh-phases').html('<i class="fas fa-sync-alt me-1"></i>Atualizar Lista');
            $('#refresh-phases').prop('disabled', false);
        }, 1000);
    });
    
    // Limpar formulário quando o modal for fechado
    $('#phaseModal').on('hidden.bs.modal', function() {
        $('#phase-form')[0].reset();
        $('#save-phase').removeData('mode');
        $('#save-phase').removeData('id');
        $('.modal-title').text('Nova Fase');
    });
});

/**
 * Carrega a lista de fases
 */
function loadPhasesList() {
    console.log('Iniciando carregamento da lista de fases...');
    $.ajax({
        url: '/api/phases/',
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(phases) {
            console.log('Fases carregadas com sucesso:', phases);
            renderPhasesTable(phases);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar fases:', xhr.status, error);
            console.error('Resposta:', xhr.responseText);
            showAlert('danger', 'Erro ao carregar a lista de fases.');
            $('#phases-table-body').html(`<tr><td colspan="6" class="text-center">Erro ao carregar fases: ${xhr.status} ${error}</td></tr>`);
        }
    });
}

/**
 * Renderiza a tabela de fases
 */
function renderPhasesTable(phases) {
    const tbody = $('#phases-table-body');
    tbody.empty();
    
    console.log('Fases recebidas para renderização:', phases);
    
    if (phases && phases.length > 0) {
        phases.forEach(function(phase) {
            const row = `
                <tr data-phase-id="${phase.id}">
                    <td>${phase.codigo || ''}</td>
                    <td>${phase.nome || ''}</td>
                    <td>${phase.descricao || '-'}</td>
                    <td>${phase.tempo_estimado || 0} min</td>
                    <td>${phase.num_checklist_items || 0}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-info view-phase" data-id="${phase.id}" title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-primary edit-phase" data-id="${phase.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-success manage-checklist" data-id="${phase.id}" title="Gerenciar Checklist">
                                <i class="fas fa-list-check"></i>
                            </button>
                            <button type="button" class="btn btn-danger delete-phase" data-id="${phase.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    } else {
        tbody.html('<tr><td colspan="6" class="text-center">Nenhuma fase encontrada</td></tr>');
    }
}

/**
 * Filtra a tabela de fases com base no termo de busca
 */
function filterPhases(searchTerm) {
    const rows = $('#phases-table-body tr');
    
    rows.each(function() {
        const row = $(this);
        const text = row.text().toLowerCase();
        
        if (text.indexOf(searchTerm) > -1) {
            row.show();
        } else {
            row.hide();
        }
    });
}

/**
 * Visualiza os detalhes de uma fase
 */
function viewPhase(phaseId) {
    console.log('Visualizando fase ID:', phaseId);
    $.ajax({
        url: `/api/phases/${phaseId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(phase) {
            console.log('Detalhes da fase carregados:', phase);
            // Preencher o modal com os detalhes da fase
            const content = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Código:</strong> ${phase.codigo || '-'}</p>
                        <p><strong>Nome:</strong> ${phase.nome || '-'}</p>
                        <p><strong>Descrição:</strong> ${phase.descricao || '-'}</p>
                        <p><strong>Tempo Estimado:</strong> ${phase.tempo_estimado || 0} minutos</p>
                        <p><strong>Requer Aprovação:</strong> ${phase.requer_aprovacao ? 'Sim' : 'Não'}</p>
                    </div>
                </div>
                
                <h6 class="mt-4 mb-3">Itens do Checklist</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descrição</th>
                                <th>Obrigatório</th>
                            </tr>
                        </thead>
                        <tbody id="phase-checklist-items">
                            <tr>
                                <td colspan="3" class="text-center">Carregando itens...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            // Atualizar o conteúdo do modal
            $('#phase-details-content').html(content);
            // Atualizar o título do modal
            $('.modal-title').text(`Detalhes da Fase: ${phase.nome}`);
            // Exibir o modal
            const viewModal = new bootstrap.Modal(document.getElementById('viewPhaseModal'));
            viewModal.show();
            
            // Carregar checklist da fase
            loadPhaseChecklist(phaseId);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar detalhes da fase:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar detalhes da fase.');
        }
    });
}

/**
 * Carrega o checklist de uma fase
 */
function loadPhaseChecklist(phaseId) {
    $.ajax({
        url: `/api/phases/${phaseId}/checklist`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(items) {
            const tbody = $('#phase-checklist-items');
            tbody.empty();
            
            if (items && items.length > 0) {
                items.forEach(function(item, index) {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.descricao}</td>
                            <td>${item.obrigatorio ? 'Sim' : 'Não'}</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            } else {
                tbody.html('<tr><td colspan="3" class="text-center">Nenhum item no checklist</td></tr>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar checklist da fase:', xhr.status, error);
            $('#phase-checklist-items').html('<tr><td colspan="3" class="text-center">Erro ao carregar checklist</td></tr>');
        }
    });
}

/**
 * Editar uma fase
 */
function editPhase(phaseId) {
    console.log('Editando fase ID:', phaseId);
    
    // Primeiro buscar os dados da fase
    $.ajax({
        url: `/api/phases/${phaseId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(phase) {
            console.log('Dados da fase para edição:', phase);
            
            // Preencher formulário com os dados atuais
            $('#phase-codigo').val(phase.codigo || '');
            $('#phase-nome').val(phase.nome || '');
            $('#phase-descricao').val(phase.descricao || '');
            
            // Calcular valores para a unidade de tempo selecionada
            let tempoEstimado = phase.tempo_estimado || 0;
            let unidadeTempo = 1; // Padrão: minutos
            
            // Se o tempo for divisível por 1440 (dias), usar essa unidade
            if (tempoEstimado >= 1440 && tempoEstimado % 1440 === 0) {
                tempoEstimado = tempoEstimado / 1440;
                unidadeTempo = 1440;
            }
            // Senão, se for divisível por 60 (horas), usar essa unidade
            else if (tempoEstimado >= 60 && tempoEstimado % 60 === 0) {
                tempoEstimado = tempoEstimado / 60;
                unidadeTempo = 60;
            }
            
            $('#phase-tempo').val(tempoEstimado);
            $('#phase-tempo-unidade').val(unidadeTempo);
            $('#phase-requer-aprovacao').prop('checked', phase.requer_aprovacao);
            
            // Configurar modal para modo de edição
            $('.modal-title').text('Editar Fase');
            $('#save-phase').data('mode', 'edit');
            $('#save-phase').data('id', phaseId);
            
            // Exibir modal
            $('#phaseModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar dados da fase para edição:', xhr.status, error);
            showAlert('danger', 'Não foi possível carregar os dados da fase para edição.');
        }
    });
}

/**
 * Salvar ou atualizar fase
 */
function savePhase() {
    console.log('Salvando fase...');
    
    const codigo = $('#phase-codigo').val();
    const nome = $('#phase-nome').val();
    const descricao = $('#phase-descricao').val() || "";
    const tempoEstimadoValor = parseInt($('#phase-tempo').val() || 0);
    const unidadeTempo = parseInt($('#phase-tempo-unidade').val() || 1);
    const requerAprovacao = $('#phase-requer-aprovacao').is(':checked');
    
    // Calcular o tempo total em minutos baseado na unidade selecionada
    const tempoEstimado = tempoEstimadoValor * unidadeTempo;
    
    // Verificar campos obrigatórios
    if (!codigo) {
        showAlert('warning', 'Preencha o código da fase.');
        return;
    }
    
    if (!nome) {
        showAlert('warning', 'Preencha o nome da fase.');
        return;
    }
    
    // Dados a serem enviados conforme o modelo do banco de dados
    const faseData = {
        codigo: codigo,
        nome: nome,
        descricao: descricao,
        tempo_estimado: tempoEstimado,
        requer_aprovacao: requerAprovacao,
        ativo: true
    };
    
    // Verificar se é edição ou criação
    const isEdit = $('#save-phase').data('mode') === 'edit';
    const phaseId = $('#save-phase').data('id');
    
    let url = '/api/phases/';
    let type = 'POST';
    let successMsg = 'Fase cadastrada com sucesso!';
    
    // Se for edição, ajustar URL, método e mensagem
    if (isEdit && phaseId) {
        url = `/api/phases/${phaseId}`;
        type = 'PUT';
        successMsg = 'Fase atualizada com sucesso!';
        console.log(`Atualizando fase ID: ${phaseId}`);
    } else {
        console.log('Criando nova fase');
    }
    
    console.log(`Requisição ${type} para ${url} com dados:`, faseData);
    
    // Enviar dados para a API
    $.ajax({
        url: url,
        type: type,
        contentType: 'application/json',
        data: JSON.stringify(faseData),
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Operação realizada com sucesso:', response);
            showAlert('success', successMsg);
            
            // Fechar o modal
            $('#phaseModal').modal('hide');
            
            // Resetar o modo do botão de salvar
            $('#save-phase').removeData('mode');
            $('#save-phase').removeData('id');
            
            // Limpar o formulário
            $('#phase-form')[0].reset();
            $('.modal-title').text('Nova Fase');
            
            // Recarregar a lista de fases
            setTimeout(function() {
                loadPhasesList();
            }, 500);
        },
        error: function(xhr, status, error) {
            console.error(`Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} fase:`, xhr.status, error);
            let errorMsg = `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} fase. Tente novamente.`;
            
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.detail || errorMsg;
                console.log('Detalhes do erro:', xhr.responseJSON);
                
                // Log detalhado para ajudar no diagnóstico
                console.log('Dados enviados:', faseData);
                console.log('Resposta completa:', xhr);
            }
            
            showAlert('danger', errorMsg);
        }
    });
}

/**
 * Excluir uma fase
 */
function deletePhase(phaseId) {
    if (confirm('Tem certeza que deseja excluir esta fase? Esta ação não pode ser desfeita.')) {
        console.log('Excluindo fase ID:', phaseId);
        $.ajax({
            url: `/api/phases/${phaseId}`,
            type: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            success: function() {
                console.log('Fase excluída com sucesso');
                showAlert('success', 'Fase excluída com sucesso!');
                
                // Forçar o recarregamento da lista de fases
                setTimeout(function() {
                    loadPhasesList();
                }, 500);
            },
            error: function(xhr, status, error) {
                console.error('Erro ao excluir fase:', xhr.status, error);
                let errorMsg = `Erro ao excluir a fase: ${xhr.status} ${error}`;
                if (xhr.responseJSON && xhr.responseJSON.detail) {
                    errorMsg = xhr.responseJSON.detail;
                }
                showAlert('danger', errorMsg);
            }
        });
    }
}

/**
 * Gerencia o checklist de uma fase
 */
function manageChecklist(phaseId) {
    console.log('Gerenciando checklist para fase ID:', phaseId);
    
    // Carregar dados atuais do checklist
    $.ajax({
        url: `/api/phases/${phaseId}/checklist`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(items) {
            console.log('Itens do checklist carregados:', items);
            
            // Limpar lista atual
            $('#checklist-items').empty();
            
            // Se não houver itens, exibir mensagem padrão
            if (!items || items.length === 0) {
                $('#checklist-items').html('<li class="list-group-item text-center">Nenhum item adicionado</li>');
            } else {
                // Adicionar cada item à lista
                items.forEach(function(item, index) {
                    addChecklistItemToUI(item.id, item.descricao, item.obrigatorio, index + 1);
                });
            }
            
            // Armazenar ID da fase para uso no salvamento
            $('#save-checklist').data('phase-id', phaseId);
            
            // Atualizar o título do modal
            $('.modal-title').text('Gerenciar Checklist da Fase');
            
            // Exibir o modal
            $('#phaseChecklistModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar checklist:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar o checklist da fase.');
        }
    });
}

/**
 * Adiciona um item temporário ao checklist na interface
 */
function addChecklistItem() {
    const descricao = $('#checklist-item').val();
    const obrigatorio = $('#checklist-item-required').is(':checked');
    
    if (!descricao) {
        showAlert('warning', 'Informe a descrição do item.');
        return;
    }
    
    // Remover mensagem de "nenhum item" se houver
    if ($('#checklist-items li').length === 1 && 
        $('#checklist-items li').hasClass('text-center')) {
        $('#checklist-items').empty();
    }
    
    // Número do item (índice + 1)
    const itemNum = $('#checklist-items li').length + 1;
    
    // Adicionar novo item com ID temporário
    const tempId = 'temp-' + Date.now();
    addChecklistItemToUI(tempId, descricao, obrigatorio, itemNum);
    
    // Limpar campo
    $('#checklist-item').val('');
    $('#checklist-item-required').prop('checked', false);
}

/**
 * Adiciona um item ao checklist na interface do usuário
 */
function addChecklistItemToUI(id, descricao, obrigatorio, numero) {
    const item = `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${id}">
            <div>
                <span class="badge bg-secondary me-2">${numero}</span>
                ${descricao}
                ${obrigatorio ? ' <span class="badge bg-primary ms-2">Obrigatório</span>' : ''}
            </div>
            <button class="btn btn-sm btn-danger remove-checklist-item" title="Remover Item">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `;
    
    $('#checklist-items').append(item);
    
    // Configurar evento para remover item
    $('.remove-checklist-item').off('click').on('click', function() {
        $(this).closest('li').remove();
        
        // Se não houver mais itens, exibir mensagem
        if ($('#checklist-items li').length === 0) {
            $('#checklist-items').html('<li class="list-group-item text-center">Nenhum item adicionado</li>');
        } else {
            // Atualizar numeração
            $('#checklist-items li').each(function(index) {
                $(this).find('.badge.bg-secondary').text(index + 1);
            });
        }
    });
}

/**
 * Salva o checklist da fase
 */
function saveChecklist() {
    const phaseId = $('#save-checklist').data('phase-id');
    
    if (!phaseId) {
        showAlert('danger', 'ID da fase não encontrado.');
        return;
    }
    
    // Verificar se existe pelo menos um item não-padrão
    if ($('#checklist-items li').length === 0 || 
        ($('#checklist-items li').length === 1 && $('#checklist-items li').hasClass('text-center'))) {
        // Se não houver itens, enviar array vazio
        saveChecklistItems(phaseId, []);
        return;
    }
    
    // Coletar todos os itens
    const items = [];
    $('#checklist-items li').each(function(index) {
        // Ignorar mensagem de "nenhum item"
        if ($(this).hasClass('text-center')) {
            return;
        }
        
        const id = $(this).data('id');
        const descricao = $(this).text().trim().replace(/^\d+/, '').replace('Obrigatório', '').trim();
        const obrigatorio = $(this).find('.badge.bg-primary').length > 0;
        
        // Se o id começa com 'temp-', é um novo item
        const item = {
            descricao: descricao,
            obrigatorio: obrigatorio
        };
        
        // Se não for ID temporário, incluir o ID existente
        if (id && !id.toString().startsWith('temp-')) {
            item.id = id;
        }
        
        items.push(item);
    });
    
    saveChecklistItems(phaseId, items);
}

/**
 * Envia os itens do checklist para a API
 */
function saveChecklistItems(phaseId, items) {
    console.log(`Salvando checklist para fase ID: ${phaseId}`, items);
    
    $.ajax({
        url: `/api/phases/${phaseId}/checklist`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(items),
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Checklist salvo com sucesso:', response);
            showAlert('success', 'Checklist salvo com sucesso!');
            
            // Fechar o modal
            $('#phaseChecklistModal').modal('hide');
            
            // Recarregar a lista de fases
            setTimeout(function() {
                loadPhasesList();
            }, 500);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao salvar checklist:', xhr.status, error);
            let errorMsg = 'Erro ao salvar o checklist.';
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                errorMsg = xhr.responseJSON.detail;
            }
            showAlert('danger', errorMsg);
        }
    });
}

/**
 * Exibe mensagem de alerta
 */
function showAlert(type, message) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertsContainer = $('#alerts-container');
    if (alertsContainer.length === 0) {
        // Criar container se não existir
        $('.container').first().prepend('<div id="alerts-container"></div>');
    }
    
    $('#alerts-container').append(alertHtml);
    
    // Auto-esconder após 5 segundos
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}
