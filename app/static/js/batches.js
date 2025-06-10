/**
 * Gerenciamento de Lotes
 * Este script gerencia as operações CRUD para lotes e suas relações com produtos e fases
 */

// Variáveis globais
let batchesList = [];
let currentBatchId = null;
let batchPhases = [];

// Configuração dos eventos quando o DOM estiver pronto
$(document).ready(function() {
    // Carregar lista de lotes ao carregar a página
    loadBatchesList();
    
    // Carregar lista de produtos para o select de cadastro de lote
    loadProductsList();
    
    // Evento para buscar lotes
    $('#batch-search').on('input', function() {
        filterBatches($(this).val());
    });
    
    // Evento para atualizar a lista de lotes
    $('#refresh-batches').on('click', function() {
        loadBatchesList();
    });
    
    // Eventos para salvar lote
    $('#save-batch').on('click', function() {
        saveBatch();
    });
    
    // Evento para abrir o modal com formulário limpo (novo lote)
    $('[data-bs-target="#batchModal"]').on('click', function() {
        resetBatchForm();
    });
    
    // Evento para logout
    $('#logout-btn').on('click', function() {
        window.location.href = '/auth/logout';
    });
});

/**
 * Carrega a lista de lotes do backend
 */
function loadBatchesList() {
    $.ajax({
        url: '/api/batches/',
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(data) {
            batchesList = data;
            renderBatchesTable(data);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar lotes:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar a lista de lotes.');
        }
    });
}

/**
 * Carrega a lista de produtos para o select
 */
function loadProductsList() {
    $.ajax({
        url: '/api/products/',
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(data) {
            const productSelect = $('#batch-produto');
            productSelect.find('option:not(:first)').remove(); // Remove opções anteriores exceto a primeira
            
            if (data && data.length > 0) {
                data.forEach(function(product) {
                    productSelect.append(`<option value="${product.id}">${product.codigo} - ${product.nome}</option>`);
                });
            } else {
                productSelect.append('<option value="" disabled>Nenhum produto encontrado</option>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar produtos:', xhr.status, error);
            showAlert('warning', 'Não foi possível carregar a lista de produtos.');
        }
    });
}

/**
 * Renderiza a tabela de lotes
 */
function renderBatchesTable(batches) {
    const tbody = $('#batches-table-body');
    tbody.empty();
    
    if (batches && batches.length > 0) {
        batches.forEach(function(batch) {
            // Formatar a data de criação
            const dataCriacao = new Date(batch.data_criacao).toLocaleString('pt-BR');
            
            // Formatar o status para exibição
            let statusText = '';
            let statusClass = '';
            
            switch(batch.status) {
                case 'pendente':
                    statusText = 'Pendente';
                    statusClass = 'bg-warning text-dark';
                    break;
                case 'em_andamento':
                    statusText = 'Em Andamento';
                    statusClass = 'bg-info text-dark';
                    break;
                case 'concluido':
                    statusText = 'Concluído';
                    statusClass = 'bg-success';
                    break;
                case 'cancelado':
                    statusText = 'Cancelado';
                    statusClass = 'bg-danger';
                    break;
                default:
                    statusText = batch.status;
                    statusClass = 'bg-secondary';
            }
            
            const row = `
                <tr>
                    <td>${batch.codigo}</td>
                    <td>${batch.produto ? batch.produto.nome : 'N/A'}</td>
                    <td>${batch.descricao || 'N/A'}</td>
                    <td>${batch.quantidade}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${dataCriacao}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-info" onclick="viewBatch(${batch.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="editBatch(${batch.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="manageBatchPhases(${batch.id})">
                                <i class="fas fa-tasks"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteBatch(${batch.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    } else {
        tbody.append('<tr><td colspan="7" class="text-center">Nenhum lote encontrado</td></tr>');
    }
}

/**
 * Filtra a lista de lotes com base no termo de busca
 */
function filterBatches(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    
    if (!searchTerm) {
        renderBatchesTable(batchesList);
        return;
    }
    
    const filtered = batchesList.filter(batch => 
        (batch.codigo && batch.codigo.toLowerCase().includes(searchTerm)) ||
        (batch.descricao && batch.descricao.toLowerCase().includes(searchTerm)) ||
        (batch.produto && batch.produto.nome && batch.produto.nome.toLowerCase().includes(searchTerm)) ||
        (batch.status && batch.status.toLowerCase().includes(searchTerm))
    );
    
    renderBatchesTable(filtered);
}

/**
 * Visualiza detalhes de um lote
 */
function viewBatch(batchId) {
    $.ajax({
        url: `/api/batches/${batchId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(batch) {
            // Formatar a data de criação
            const dataCriacao = new Date(batch.data_criacao).toLocaleString('pt-BR');
            
            // Formatar o status para exibição
            let statusText = '';
            let statusClass = '';
            
            switch(batch.status) {
                case 'pendente':
                    statusText = 'Pendente';
                    statusClass = 'bg-warning text-dark';
                    break;
                case 'em_andamento':
                    statusText = 'Em Andamento';
                    statusClass = 'bg-info text-dark';
                    break;
                case 'concluido':
                    statusText = 'Concluído';
                    statusClass = 'bg-success';
                    break;
                case 'cancelado':
                    statusText = 'Cancelado';
                    statusClass = 'bg-danger';
                    break;
                default:
                    statusText = batch.status;
                    statusClass = 'bg-secondary';
            }
            
            // Montar o HTML com os detalhes do lote
            const batchDetailsHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${batch.codigo}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            Produto: ${batch.produto ? batch.produto.nome : 'N/A'}
                        </h6>
                        <p class="card-text">${batch.descricao || 'Sem descrição'}</p>
                    </div>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item">
                            <strong>Quantidade:</strong> ${batch.quantidade}
                        </li>
                        <li class="list-group-item">
                            <strong>Status:</strong> <span class="badge ${statusClass}">${statusText}</span>
                        </li>
                        <li class="list-group-item">
                            <strong>Prioridade:</strong> ${batch.prioridade ? 'Sim' : 'Não'}
                        </li>
                        <li class="list-group-item">
                            <strong>Data de Criação:</strong> ${dataCriacao}
                        </li>
                    </ul>
                </div>
            `;
            
            // Exibir os detalhes no modal
            $('#batch-details-content').html(batchDetailsHTML);
            $('#viewBatchModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar detalhes do lote:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar detalhes do lote.');
        }
    });
}

/**
 * Carrega os dados de um lote para edição
 */
function editBatch(batchId) {
    $.ajax({
        url: `/api/batches/${batchId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(batch) {
            currentBatchId = batch.id;
            
            // Preencher o formulário com os dados do lote
            $('#batch-codigo').val(batch.codigo);
            $('#batch-descricao').val(batch.descricao);
            $('#batch-quantidade').val(batch.quantidade);
            $('#batch-status').val(batch.status);
            $('#batch-prioridade').prop('checked', batch.prioridade);
            
            // Selecionar o produto no dropdown
            if (batch.produto && batch.produto.id) {
                $('#batch-produto').val(batch.produto.id);
            }
            
            // Atualizar o título do modal
            $('.modal-title').text('Editar Lote');
            
            // Exibir o modal
            $('#batchModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar lote para edição:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar lote para edição.');
        }
    });
}

/**
 * Salva um novo lote ou atualiza um existente
 */
function saveBatch() {
    // Validar formulário
    if (!validateBatchForm()) {
        return;
    }
    
    // Coletar dados do formulário
    const batchData = {
        codigo: $('#batch-codigo').val().trim(),
        produto_id: parseInt($('#batch-produto').val()),
        descricao: $('#batch-descricao').val().trim(),
        quantidade: parseInt($('#batch-quantidade').val()),
        status: $('#batch-status').val(),
        prioridade: $('#batch-prioridade').is(':checked')
    };
    
    // Determinar se é criação ou atualização
    const isUpdate = currentBatchId !== null;
    const url = isUpdate ? `/api/batches/${currentBatchId}` : '/api/batches/';
    const method = isUpdate ? 'PUT' : 'POST';
    
    // Enviar requisição
    $.ajax({
        url: url,
        type: method,
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        data: JSON.stringify(batchData),
        success: function(response) {
            $('#batchModal').modal('hide');
            loadBatchesList();
            showAlert('success', `Lote ${isUpdate ? 'atualizado' : 'cadastrado'} com sucesso!`);
            currentBatchId = null;
        },
        error: function(xhr, status, error) {
            console.error(`Erro ao ${isUpdate ? 'atualizar' : 'cadastrar'} lote:`, xhr.status, error);
            
            let errorMessage = `Erro ao ${isUpdate ? 'atualizar' : 'cadastrar'} lote.`;
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                errorMessage = xhr.responseJSON.detail;
            }
            
            showAlert('danger', errorMessage);
        }
    });
}

/**
 * Valida o formulário de lote
 */
function validateBatchForm() {
    let isValid = true;
    
    // Validar código
    if (!$('#batch-codigo').val().trim()) {
        $('#batch-codigo').addClass('is-invalid');
        isValid = false;
    } else {
        $('#batch-codigo').removeClass('is-invalid');
    }
    
    // Validar produto
    if (!$('#batch-produto').val()) {
        $('#batch-produto').addClass('is-invalid');
        isValid = false;
    } else {
        $('#batch-produto').removeClass('is-invalid');
    }
    
    // Validar quantidade
    const quantidade = parseInt($('#batch-quantidade').val());
    if (isNaN(quantidade) || quantidade < 1) {
        $('#batch-quantidade').addClass('is-invalid');
        isValid = false;
    } else {
        $('#batch-quantidade').removeClass('is-invalid');
    }
    
    return isValid;
}

/**
 * Limpa o formulário de lote
 */
function resetBatchForm() {
    currentBatchId = null;
    $('#batch-form')[0].reset();
    $('.modal-title').text('Novo Lote');
    $('.is-invalid').removeClass('is-invalid');
}

/**
 * Exclui um lote
 */
function deleteBatch(batchId) {
    if (confirm('Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.')) {
        $.ajax({
            url: `/api/batches/${batchId}`,
            type: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            headers: {
                'Accept': 'application/json'
            },
            success: function() {
                loadBatchesList();
                showAlert('success', 'Lote excluído com sucesso!');
            },
            error: function(xhr, status, error) {
                console.error('Erro ao excluir lote:', xhr.status, error);
                showAlert('danger', 'Erro ao excluir lote.');
            }
        });
    }
}

/**
 * Gerencia as fases de um lote
 */
function manageBatchPhases(batchId) {
    currentBatchId = batchId;
    
    // Carregar fases do lote
    loadBatchPhases(batchId);
    
    // Exibir modal
    $('#batchPhasesModal').modal('show');
}

/**
 * Carrega as fases de um lote
 */
function loadBatchPhases(batchId) {
    $.ajax({
        url: `/api/batches/${batchId}/phases`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(phases) {
            batchPhases = phases;
            const tbody = $('#batch-phases-items');
            tbody.empty();
            
            if (phases && phases.length > 0) {
                phases.forEach(function(phase, index) {
                    // Formatar o status para exibição
                    let statusText = '';
                    let statusClass = '';
                    
                    switch(phase.status) {
                        case 'pendente':
                            statusText = 'Pendente';
                            statusClass = 'bg-warning text-dark';
                            break;
                        case 'em_andamento':
                            statusText = 'Em Andamento';
                            statusClass = 'bg-info text-dark';
                            break;
                        case 'concluido':
                            statusText = 'Concluído';
                            statusClass = 'bg-success';
                            break;
                        case 'aguardando_aprovacao':
                            statusText = 'Aguardando Aprovação';
                            statusClass = 'bg-primary';
                            break;
                        default:
                            statusText = phase.status;
                            statusClass = 'bg-secondary';
                    }
                    
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${phase.fase.nome}</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-info" onclick="viewPhaseDetails(${phase.fase.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="updatePhaseStatus(${phase.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            } else {
                tbody.append('<tr><td colspan="4" class="text-center">Este lote não possui fases registradas</td></tr>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar fases do lote:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar fases do lote.');
        }
    });
}

/**
 * Exibe detalhes de uma fase
 */
function viewPhaseDetails(phaseId) {
    // Implementação futura
    alert('Funcionalidade em desenvolvimento');
}

/**
 * Atualiza o status de uma fase de lote
 */
function updatePhaseStatus(phaseLoteId) {
    // Implementação futura
    alert('Funcionalidade em desenvolvimento');
}

/**
 * Exibe uma mensagem de alerta na página
 */
function showAlert(type, message) {
    // Criar o elemento de alerta
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Adicionar o alerta ao topo da página
    const alertContainer = $('<div>').addClass('container mt-3').html(alertHTML);
    $('.container').first().before(alertContainer);
    
    // Configurar para ocultar automaticamente após 5 segundos
    setTimeout(function() {
        alertContainer.fadeOut(500, function() {
            $(this).remove();
        });
    }, 5000);
}
