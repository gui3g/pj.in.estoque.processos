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
    
    // Limpar o formulário quando o modal for fechado
    $('#productModal').on('hidden.bs.modal', function() {
        $('#product-form')[0].reset();
    });
});

/**
 * Carrega a lista de produtos
 */
function loadProductsList() {
    $.ajax({
        url: '/api/products',
        type: 'GET',
        success: function(products) {
            renderProductsTable(products);
        },
        error: function(xhr) {
            console.error('Erro ao carregar produtos:', xhr);
            showAlert('danger', 'Erro ao carregar a lista de produtos.');
            $('#products-table-body').html('<tr><td colspan="6" class="text-center">Erro ao carregar produtos</td></tr>');
        }
    });
}

/**
 * Renderiza a tabela de produtos
 */
function renderProductsTable(products) {
    const tbody = $('#products-table-body');
    tbody.empty();
    
    if (products && products.length > 0) {
        products.forEach(function(product) {
            const row = `
                <tr data-product-id="${product.id}">
                    <td>${product.codigo}</td>
                    <td>${product.nome}</td>
                    <td>${product.descricao || '-'}</td>
                    <td>${product.unidade.toUpperCase()}</td>
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
    $.ajax({
        url: `/api/products/${productId}`,
        type: 'GET',
        success: function(product) {
            // Preencher o modal com os detalhes do produto
            const content = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Código:</strong> ${product.codigo}</p>
                        <p><strong>Nome:</strong> ${product.nome}</p>
                        <p><strong>Descrição:</strong> ${product.descricao || '-'}</p>
                        <p><strong>Unidade:</strong> ${product.unidade.toUpperCase()}</p>
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
                                <th>Tempo Prateleira</th>
                            </tr>
                        </thead>
                        <tbody id="product-phases">
                            <tr><td colspan="4" class="text-center">Carregando fases...</td></tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            $('#product-details-content').html(content);
            
            // Exibir modal
            const viewModal = new bootstrap.Modal(document.getElementById('viewProductModal'));
            viewModal.show();
            
            // Carregar fases do produto
            loadProductPhases(productId);
        },
        error: function(xhr) {
            console.error('Erro ao carregar detalhes do produto:', xhr);
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
        error: function(xhr) {
            console.error('Erro ao carregar fases do produto:', xhr);
            $('#product-phases').html('<tr><td colspan="4" class="text-center">Erro ao carregar fases</td></tr>');
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
    
    // Remover alertas existentes
    $('.alert').remove();
    
    // Adicionar novo alerta
    $('.container').prepend(alertHtml);
    
    // Auto-fechar após 5 segundos
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}
