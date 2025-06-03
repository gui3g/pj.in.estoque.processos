/**
 * JavaScript para gerenciamento de produtos
 */

$(document).ready(function() {
    // Carregar lista de produtos
    loadProductsList();
    
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
    
    // Configurar evento para salvar produto
    $('#save-product').on('click', function() {
        saveProduct();
    });
    
    // Adicionar evento para o botão de atualizar lista
    $('#refresh-products').on('click', function() {
        loadProductsList();
    });
    
    // Limpar o formulário quando o modal for fechado
    $('#productModal').on('hidden.bs.modal', function() {
        $('#product-form')[0].reset();
    });
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
            $('#product-details').html(content);
            $('#view-product-title').text(`Produto: ${product.codigo}`);
            $('#viewProductModal').modal('show');
            
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
 * Adicionar função para salvar produto
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
    
    console.log('Dados do produto a serem enviados:', produtoData);
    
    // Enviar dados para a API
    $.ajax({
        url: '/api/products/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(produtoData),
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Produto cadastrado com sucesso:', response);
            showAlert('success', 'Produto cadastrado com sucesso!');
            
            // Fechar o modal
            $('#productModal').modal('hide');
            
            // Limpar o formulário
            $('#product-form')[0].reset();
            
            // Recarregar a lista de produtos
            loadProductsList();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao cadastrar produto:', xhr.status, error);
            let errorMsg = 'Erro ao cadastrar produto. Tente novamente.';
            
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.detail || errorMsg;
                console.log('Detalhes do erro:', xhr.responseJSON);
            }
            
            showAlert('danger', errorMsg);
        }
    });
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
        $.ajax({
            url: `/api/products/${productId}`,
            type: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            success: function() {
                showAlert('success', 'Produto excluído com sucesso!');
                loadProductsList(); // Recarregar a lista
            },
            error: function(xhr, status, error) {
                console.error('Erro ao excluir produto:', xhr.status, error);
                showAlert('danger', 'Erro ao excluir o produto.');
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
