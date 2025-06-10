/**
 * JavaScript para gerenciamento de produtos
 */

$(document).ready(function() {
    // Carregar lista de produtos
    loadProductsList();
    
    // Carregar lista de fases disponíveis
    loadAvailablePhases();
    
    // Configurar busca de produtos
    $('#search-products').on('keyup', function() {
        const searchTerm = $(this).val().toLowerCase();
        filterProducts(searchTerm);
    });
    
    // Configurar evento para visualizar produto
    $(document).on('click', '.view-product', function() {
        const productId = $(this).data('id');
        viewProduct(productId);
    });
    
    // Configurar evento para editar produto
    $(document).on('click', '.edit-product', function() {
        const productId = $(this).data('id');
        editProduct(productId);
    });
    
    // Configurar evento para excluir produto
    $(document).on('click', '.delete-product', function() {
        const productId = $(this).data('id');
        deleteProduct(productId);
    });
    
    // Salvar produto ao clicar no botão salvar
    $('#save-product').on('click', function() {
        saveProduct();
    });
    
    // Adicionar fase à lista de fases selecionadas
    $('#add-phase').on('click', function() {
        addSelectedPhase();
    });
    
    // Remover fase da lista de fases selecionadas
    $(document).on('click', '.remove-phase', function() {
        $(this).closest('li').remove();
        updateSelectedPhasesVisibility();
    });
    
    // Atualizar lista de produtos ao clicar no botão atualizar
    $('#refresh-products').on('click', function() {
        $(this).html('<i class="fas fa-spinner fa-spin me-1"></i>Atualizando...');
        $(this).prop('disabled', true);
        
        loadProductsList();
        
        // Restaurar botão após um curto período
        setTimeout(function() {
            $('#refresh-products').html('<i class="fas fa-sync-alt me-1"></i>Atualizar Lista');
            $('#refresh-products').prop('disabled', false);
        }, 1000);
    });
    
    // Limpar formulário quando o modal for fechado
    $('#productModal').on('hidden.bs.modal', function() {
        $('#product-form')[0].reset();
        $('#save-product').removeData('mode');
        $('#save-product').removeData('id');
        $('.modal-title').text('Novo Produto');
        $('#selected-phases').empty()
            .append('<li class="list-group-item text-center text-muted" id="no-phases-selected">Nenhuma fase selecionada</li>');
    });
    
    // Inicializar Sortable.js para ordenar as fases selecionadas
    if (typeof Sortable !== 'undefined') {
        new Sortable(document.getElementById('selected-phases'), {
            animation: 150,
            ghostClass: 'bg-light',
            onEnd: function() {
                // Garantir que o item "Nenhuma fase selecionada" permanece visível apenas quando necessário
                updateSelectedPhasesVisibility();
            }
        });
    } else {
        console.warn('Sortable.js não está carregado. A funcionalidade de arrastar e ordenar não estará disponível.');
    }
});

/**
 * Carrega a lista de produtos
 */
function loadProductsList() {
    console.log('Iniciando carregamento da lista de produtos...');
    $.ajax({
        url: '/api/products/',
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(products) {
            console.log('Produtos carregados com sucesso:', products);
            renderProductsTable(products);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar produtos:', xhr.status, error);
            console.error('Resposta:', xhr.responseText);
            showAlert('danger', 'Erro ao carregar a lista de produtos.');
            $('#products-table-body').html(`<tr><td colspan="6" class="text-center">Erro ao carregar produtos: ${xhr.status} ${error}</td></tr>`);
        }
    });
}

/**
 * Renderiza a tabela de produtos
 */
function renderProductsTable(products) {
    const tbody = $('#products-table-body');
    tbody.empty();
    
    console.log('Produtos recebidos para renderização:', products);
    
    if (products && products.length > 0) {
        products.forEach(function(product) {
            // Use apenas os campos que existem no modelo atual
            const row = `
                <tr data-product-id="${product.id}">
                    <td>${product.codigo}</td>
                    <td>${product.codigo}</td> <!-- Usamos o código no lugar do nome -->
                    <td>${product.descricao || '-'}</td>
                    <td>UND</td> <!-- Valor padrão já que o campo não existe -->
                    <td>${product.num_fases || 0}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-info view-product" data-id="${product.id}" title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-primary edit-product" data-id="${product.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-danger delete-product" data-id="${product.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    } else {
        tbody.html('<tr><td colspan="6" class="text-center">Nenhum produto encontrado</td></tr>');
    }
}

/**
 * Filtra a tabela de produtos com base no termo de busca
 */
function filterProducts(searchTerm) {
    const rows = $('#products-table-body tr');
    
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
 * Visualiza os detalhes de um produto
 */
function viewProduct(productId) {
    console.log('Visualizando produto ID:', productId);
    $.ajax({
        url: `/api/products/${productId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(product) {
            console.log('Detalhes do produto carregados:', product);
            // Preencher o modal com os detalhes do produto
            const content = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Código:</strong> ${product.codigo}</p>
                        <p><strong>Descrição:</strong> ${product.descricao || '-'}</p>
                        <p><strong>Tempo Estimado:</strong> ${product.tempo_estimado_total} minutos</p>
                    </div>
                </div>
                
                <h6 class="mt-4 mb-3">Fases do Produto</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Ordem</th>
                                <th>Fase</th>
                                <th>Tempo Estimado</th>
                                <th>Tempo de Prateleira</th>
                            </tr>
                        </thead>
                        <tbody id="product-phases">
                            <tr>
                                <td colspan="4" class="text-center">Carregando fases...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            // Atualizar o conteúdo do modal
            $('#product-details-content').html(content);
            // Atualizar o título do modal
            $('.modal-title').text(`Detalhes do Produto: ${product.codigo}`);
            // Exibir o modal
            const viewModal = new bootstrap.Modal(document.getElementById('viewProductModal'));
            viewModal.show();
            
            // Carregar fases do produto
            loadProductPhases(productId);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar detalhes do produto:', xhr.status, error);
            showAlert('danger', 'Erro ao carregar detalhes do produto.');
        }
    });
}

/**
 * Carrega as fases de um produto
 */
function loadProductPhases(productId) {
    $.ajax({
        url: `/api/products/${productId}/fases`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(phases) {
            const tbody = $('#product-phases');
            tbody.empty();
            
            if (phases && phases.length > 0) {
                phases.forEach(function(phase) {
                    // Buscar informações da fase e do produto fase
                    let faseDescricao = phase.fase_id ? `ID: ${phase.fase_id}` : '-';
                    if (phase.fase_descricao) {
                        faseDescricao = phase.fase_descricao;
                    }
                    
                    const row = `
                        <tr>
                            <td>${phase.ordem}</td>
                            <td>${faseDescricao}</td>
                            <td>${phase.tempo_estimado} min</td>
                            <td>${phase.tempo_prateleira_horas || 0} h</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            } else {
                tbody.append('<tr><td colspan="4" class="text-center">Nenhuma fase encontrada</td></tr>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar fases do produto:', xhr.status, error);
            $('#product-phases').html('<tr><td colspan="4" class="text-center">Erro ao carregar fases</td></tr>');
        }
    });
}

/**
 * Salvar ou atualizar produto
 */
function saveProduct() {
    console.log('Salvando produto...');
    
    const codigo = $('#product-codigo').val();
    const descricao = $('#product-descricao').val() || "";
    const tempoEstimadoValor = parseInt($('#product-tempo').val() || 0);
    const unidadeTempo = parseInt($('#product-tempo-unidade').val() || 1);
    
    // Calcular o tempo total em minutos baseado na unidade selecionada
    const tempoEstimadoTotal = tempoEstimadoValor * unidadeTempo;
    
    // Verificar campos obrigatórios
    if (!codigo) {
        showAlert('warning', 'Preencha o código do produto.');
        return;
    }
    
    // Dados a serem enviados conforme o modelo do banco de dados
    const produtoData = {
        codigo: codigo,
        descricao: descricao,
        tempo_estimado_total: tempoEstimadoTotal,
        ativo: true
    };
    
    // Coletar fases selecionadas
    const fasesSelecionadas = [];
    $('#selected-phases li').not('#no-phases-selected').each(function(index) {
        const phaseId = $(this).data('phase-id');
        if (phaseId) {
            fasesSelecionadas.push({
                fase_id: parseInt(phaseId),
                ordem: index + 1,
                tempo_estimado: 0, // Valor padrão, pode ser ajustado posteriormente
                tempo_prateleira_horas: 0 // Valor padrão, pode ser ajustado posteriormente
            });
        }
    });
    
    // Verificar se é edição ou criação
    const isEdit = $('#save-product').data('mode') === 'edit';
    const productId = $('#save-product').data('id');
    
    let url = '/api/products/';
    let type = 'POST';
    let successMsg = 'Produto cadastrado com sucesso!';
    
    // Se for edição, ajustar URL, método e mensagem
    if (isEdit && productId) {
        url = `/api/products/${productId}`;
        type = 'PUT';
        successMsg = 'Produto atualizado com sucesso!';
        console.log(`Atualizando produto ID: ${productId}`);
    } else {
        console.log('Criando novo produto');
    }
    
    console.log(`Requisição ${type} para ${url} com dados:`, produtoData);
    console.log('Fases selecionadas:', fasesSelecionadas);
    
    // Enviar dados para a API
    $.ajax({
        url: url,
        type: type,
        contentType: 'application/json',
        data: JSON.stringify(produtoData),
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Operação realizada com sucesso:', response);
            
            // Obter o ID do produto (seja da resposta de criação ou do ID existente em caso de edição)
            const produtoId = response.id || productId;
            
            // Se tiver fases selecionadas, associar ao produto
            if (fasesSelecionadas.length > 0) {
                // Se estiver editando, primeiro remover fases existentes
                if (isEdit) {
                    // Limpar fases existentes e adicionar as novas
                    clearAndAddProductPhases(produtoId, fasesSelecionadas, successMsg);
                } else {
                    // Adicionar fases ao novo produto
                    addProductPhases(produtoId, fasesSelecionadas, successMsg);
                }
            } else {
                // Se não tiver fases, apenas mostrar mensagem de sucesso
                showAlert('success', successMsg);
                
                // Fechar o modal e resetar formulário
                resetProductForm();
                
                // Recarregar a lista de produtos
                setTimeout(function() {
                    loadProductsList();
                }, 500);
            }
        },
        error: function(xhr, status, error) {
            console.error(`Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} produto:`, xhr.status, error);
            let errorMsg = `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} produto. Tente novamente.`;
            
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.detail || errorMsg;
                console.log('Detalhes do erro:', xhr.responseJSON);
                
                // Log detalhado para ajudar no diagnóstico
                console.log('Dados enviados:', produtoData);
                console.log('Resposta completa:', xhr);
                
                // Verificar se é um problema de código duplicado
                if (errorMsg.includes('Código de produto já existe')) {
                    errorMsg = errorMsg + " - Por favor, use um código diferente ou verifique se o produto foi realmente excluído.";
                }
            }
            
            showAlert('danger', errorMsg);
        }
    });
}

/**
 * Adicionar fases a um produto
 */
function addProductPhases(produtoId, fases, successMsg) {
    let phasesAdded = 0;
    const totalPhases = fases.length;
    
    fases.forEach(function(fase) {
        // Criar objeto de fase para o produto
        const produtoFaseData = {
            produto_id: produtoId,
            fase_id: fase.fase_id,
            ordem: fase.ordem,
            tempo_estimado: fase.tempo_estimado || 0,
            tempo_prateleira_horas: fase.tempo_prateleira_horas || 0,
            ativo: true
        };
        
        $.ajax({
            url: `/api/products/${produtoId}/fases`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(produtoFaseData),
            xhrFields: {
                withCredentials: true
            },
            success: function() {
                phasesAdded++;
                
                if (phasesAdded === totalPhases) {
                    // Todas as fases foram adicionadas com sucesso
                    showAlert('success', successMsg);
                    
                    // Fechar o modal e resetar formulário
                    resetProductForm();
                    
                    // Recarregar a lista de produtos
                    setTimeout(function() {
                        loadProductsList();
                    }, 500);
                }
            },
            error: function(xhr, status, error) {
                console.error(`Erro ao adicionar fase ${fase.fase_id} ao produto ${produtoId}:`, xhr.status, error);
                showAlert('warning', `Produto foi salvo, mas houve erro ao adicionar algumas fases.`);
                
                // Fechar o modal e resetar formulário mesmo com erro
                resetProductForm();
                
                // Recarregar a lista de produtos
                setTimeout(function() {
                    loadProductsList();
                }, 500);
            }
        });
    });
}

/**
 * Limpar fases existentes e adicionar novas fases
 */
function clearAndAddProductPhases(produtoId, novasFases, successMsg) {
    // Primeiro carregar fases existentes
    $.ajax({
        url: `/api/products/${produtoId}/fases`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(fasesExistentes) {
            // Se não tem fases existentes, apenas adicionar as novas
            if (!fasesExistentes || fasesExistentes.length === 0) {
                addProductPhases(produtoId, novasFases, successMsg);
                return;
            }
            
            // Se tem fases existentes, devemos removê-las
            // Na vida real seria melhor usar uma operação em batch no backend
            let phasesRemoved = 0;
            const totalPhasesToRemove = fasesExistentes.length;
            
            fasesExistentes.forEach(function(fase) {
                $.ajax({
                    url: `/api/products/${produtoId}/fases/${fase.id}`,
                    type: 'DELETE',
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function() {
                        phasesRemoved++;
                        
                        if (phasesRemoved === totalPhasesToRemove) {
                            // Todas as fases foram removidas, adicionar novas
                            addProductPhases(produtoId, novasFases, successMsg);
                        }
                    },
                    error: function(xhr) {
                        console.error(`Erro ao remover fase ${fase.id}:`, xhr.status);
                        phasesRemoved++;
                        
                        if (phasesRemoved === totalPhasesToRemove) {
                            // Continuar mesmo com erro
                            addProductPhases(produtoId, novasFases, successMsg);
                        }
                    }
                });
            });
        },
        error: function(xhr) {
            console.error('Erro ao carregar fases existentes:', xhr.status);
            // Tentar adicionar novas fases mesmo com erro
            addProductPhases(produtoId, novasFases, successMsg);
        }
    });
}

/**
 * Resetar o formulário e fechar modal
 */
function resetProductForm() {
    // Fechar o modal
    $('#productModal').modal('hide');
    
    // Resetar o modo do botão de salvar
    $('#save-product').removeData('mode');
    $('#save-product').removeData('id');
    
    // Limpar o formulário
    $('#product-form')[0].reset();
    $('.modal-title').text('Novo Produto');
    
    // Limpar fases selecionadas
    $('#selected-phases').empty()
        .append('<li class="list-group-item text-center text-muted" id="no-phases-selected">Nenhuma fase selecionada</li>');
}

/**
 * Editar um produto
 */
function editProduct(productId) {
    console.log('Editando produto ID:', productId);
    
    // Primeiro buscar os dados do produto
    $.ajax({
        url: `/api/products/${productId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(product) {
            console.log('Dados do produto para edição:', product);
            
            // Preencher formulário com os dados atuais
            $('#product-codigo').val(product.codigo);
            $('#product-descricao').val(product.descricao || '');
            
            // Calcular valores para a unidade de tempo selecionada
            let tempoEstimado = product.tempo_estimado_total || 0;
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
            
            $('#product-tempo').val(tempoEstimado);
            $('#product-tempo-unidade').val(unidadeTempo);
            
            // Configurar modal para modo de edição
            $('.modal-title').text('Editar Produto');
            $('#save-product').data('mode', 'edit');
            $('#save-product').data('id', productId);
            
            // Limpar a lista de fases selecionadas
            $('#selected-phases').empty()
                .append('<li class="list-group-item text-center text-muted" id="no-phases-selected">Nenhuma fase selecionada</li>');
            
            // Carregar fases associadas a este produto
            $.ajax({
                url: `/api/products/${productId}/fases`,
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                headers: {
                    'Accept': 'application/json'
                },
                success: function(phases) {
                    console.log('Fases do produto carregadas:', phases);
                    
                    if (phases && phases.length > 0) {
                        // Remover mensagem "Nenhuma fase selecionada"
                        $('#no-phases-selected').remove();
                        
                        // Adicionar cada fase à lista de fases selecionadas
                        phases.forEach(function(phase) {
                            let phaseText = `ID: ${phase.fase_id}`;
                            if (phase.fase_descricao) {
                                phaseText = `ID: ${phase.fase_id} - ${phase.fase_descricao}`;
                            }
                            
                            const listItem = `
                                <li class="list-group-item d-flex justify-content-between align-items-center" data-phase-id="${phase.fase_id}">
                                    <div>
                                        <span class="badge bg-primary me-2">${phase.ordem}</span>
                                        ${phaseText}
                                    </div>
                                    <button type="button" class="btn btn-sm btn-danger remove-phase">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </li>
                            `;
                            
                            $('#selected-phases').append(listItem);
                        });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Erro ao carregar fases do produto:', xhr.status, error);
                }
            });
            
            // Exibir modal
            $('#productModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar dados do produto para edição:', xhr.status, error);
            showAlert('danger', 'Não foi possível carregar os dados do produto para edição.');
        }
    });
}

/**
 * Excluir um produto
 */
function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
        console.log('Excluindo produto ID:', productId);
        $.ajax({
            url: `/api/products/${productId}`,
            type: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            success: function() {
                console.log('Produto excluído com sucesso');
                showAlert('success', 'Produto excluído com sucesso!');
                
                // Forçar o recarregamento da lista de produtos
                setTimeout(function() {
                    loadProductsList();
                }, 500);
            },
            error: function(xhr, status, error) {
                console.error('Erro ao excluir produto:', xhr.status, error);
                showAlert('danger', `Erro ao excluir o produto: ${xhr.responseText || error}`);
            }
        });
    }
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

/**
 * Carrega a lista de fases disponíveis para associação com produtos
 */
function loadAvailablePhases() {
    console.log('Carregando fases disponíveis...');
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
            populatePhaseSelect(phases);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar fases:', xhr.status, error);
        }
    });
}

/**
 * Preenche o select de fases com as opções disponíveis
 */
function populatePhaseSelect(phases) {
    const select = $('#phase-select');
    select.find('option:not(:first)').remove(); // Mantém apenas a opção padrão
    
    if (phases && phases.length > 0) {
        phases.forEach(function(phase) {
            const option = `<option value="${phase.id}" data-descricao="${phase.descricao || ''}">ID: ${phase.id} - ${phase.descricao || 'Sem descrição'}</option>`;
            select.append(option);
        });
    }
}

/**
 * Adiciona uma fase selecionada à lista de fases do produto
 */
function addSelectedPhase() {
    const select = $('#phase-select');
    const phaseId = select.val();
    
    if (!phaseId) {
        showAlert('warning', 'Selecione uma fase para adicionar.');
        return;
    }
    
    // Verificar se fase já está selecionada
    const existingPhase = $(`#selected-phases li[data-phase-id="${phaseId}"]`);
    if (existingPhase.length > 0) {
        showAlert('warning', 'Esta fase já está selecionada.');
        return;
    }
    
    const phaseText = select.find('option:selected').text();
    const phaseDescricao = select.find('option:selected').data('descricao');
    
    // Criar item da lista com botão de remover
    const listItem = `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-phase-id="${phaseId}">
            <div>
                <span class="badge bg-primary me-2">${$('#selected-phases li').not('#no-phases-selected').length + 1}</span>
                ${phaseText}
            </div>
            <button type="button" class="btn btn-sm btn-danger remove-phase">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `;
    
    // Remover mensagem "Nenhuma fase selecionada" se for a primeira fase
    $('#no-phases-selected').remove();
    
    // Adicionar à lista
    $('#selected-phases').append(listItem);
    
    // Resetar select para opção padrão
    select.val('');
    
    // Atualizar ordem das fases
    updatePhaseOrder();
}

/**
 * Atualiza a ordem numérica das fases na lista
 */
function updatePhaseOrder() {
    $('#selected-phases li').not('#no-phases-selected').each(function(index) {
        $(this).find('.badge').text(index + 1);
    });
}

/**
 * Verifica se há fases selecionadas e exibe/oculta a mensagem "Nenhuma fase selecionada"
 */
function updateSelectedPhasesVisibility() {
    const hasPhases = $('#selected-phases li').not('#no-phases-selected').length > 0;
    
    if (!hasPhases) {
        $('#selected-phases').append('<li class="list-group-item text-center text-muted" id="no-phases-selected">Nenhuma fase selecionada</li>');
    } else {
        $('#no-phases-selected').remove();
        updatePhaseOrder();
    }
}
