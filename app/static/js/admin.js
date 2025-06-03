/**
 * JavaScript para o painel administrativo
 */

$(document).ready(function() {
    // Carregar dados do dashboard
    loadDashboardData();
    loadLotesRecentes();
    
    // Event listeners para os botões
    $('#save-product').on('click', saveProduct);
    $('#save-phase').on('click', savePhase);
    $('#save-batch').on('click', saveBatch);
    $('#save-user').on('click', saveUser);
    
    // Adicionar linha de produto no form de lote
    $('#add-product-row').on('click', addProductRow);
    
    // Carregar produtos no formulário de lote
    loadProducts();
    
    // Remover produto no form de lote
    $(document).on('click', '.remove-product', function() {
        const productItems = $('.product-item');
        if (productItems.length > 1) {
            $(this).closest('.product-item').remove();
        }
    });
    
    // Handlers para visualização de listas
    $('#list-products').on('click', function() {
        window.location.href = '/admin/products';
    });
    
    $('#list-phases').on('click', function() {
        alert('Funcionalidade em desenvolvimento: Listar Fases');
    });
    
    $('#list-batches').on('click', function() {
        alert('Funcionalidade em desenvolvimento: Listar Lotes');
    });
    
    $('#list-users').on('click', function() {
        alert('Funcionalidade em desenvolvimento: Listar Usuários');
    });
    
    $('#view-all-lotes').on('click', function() {
        alert('Funcionalidade em desenvolvimento: Ver Todos os Lotes');
    });
});

/**
 * Carrega os dados para o dashboard
 */
function loadDashboardData() {
    // Carregar resumo
    $.ajax({
        url: '/api/admin/dashboard/summary',
        type: 'GET',
        success: function(data) {
            $('#total-lotes').text(data.total_lotes);
            $('#lotes-em-producao').text(data.lotes_em_producao);
            $('#apontamentos-hoje').text(data.apontamentos_hoje);
            $('#apontamentos-andamento').text(data.apontamentos_em_andamento);
            
            // Inicializar gráfico de status de lotes
            initLotesChart(data.lotes_em_producao, data.lotes_concluidos, data.total_lotes - data.lotes_em_producao - data.lotes_concluidos);
        },
        error: function() {
            console.error('Erro ao carregar resumo do dashboard');
        }
    });
    
    // Carregar KPIs
    $.ajax({
        url: '/api/admin/dashboard/kpis',
        type: 'GET',
        success: function(data) {
            $('#tempo-medio').text(data.tempo_medio_producao);
            $('#aderencia').text(data.aderencia_tempo_planejado);
            
            const tbody = $('#produtividade-operadores');
            tbody.empty();
            
            data.produtividade_por_operador.forEach(operador => {
                tbody.append(`
                    <tr>
                        <td>${operador.nome}</td>
                        <td>${operador.apontamentos}</td>
                        <td>${formatTime(operador.tempo_total)}</td>
                    </tr>
                `);
            });
        },
        error: function() {
            console.error('Erro ao carregar KPIs do dashboard');
        }
    });
}

/**
 * Inicializa o gráfico de status de lotes
 */
function initLotesChart(emProducao, concluidos, outros) {
    const ctx = document.getElementById('lotesChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Em Produção', 'Concluídos', 'Outros'],
            datasets: [{
                data: [emProducao, concluidos, outros],
                backgroundColor: ['#0dcaf0', '#198754', '#6c757d'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Carrega a lista de lotes recentes
 */
function loadLotesRecentes() {
    $.ajax({
        url: '/api/admin/dashboard/lotes_recentes',
        type: 'GET',
        success: function(data) {
            const tbody = $('#lotes-recentes');
            tbody.empty();
            
            data.forEach(lote => {
                // Calcular barra de progresso
                const progressClass = lote.progresso < 50 ? 'bg-warning' : 'bg-success';
                const progressBar = `
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${lote.progresso}%" 
                             aria-valuenow="${lote.progresso}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small>${Math.round(lote.progresso)}%</small>
                `;
                
                tbody.append(`
                    <tr>
                        <td>${lote.codigo}</td>
                        <td>${lote.descricao}</td>
                        <td>${formatStatus(lote.status)}</td>
                        <td>${lote.produtos_count}</td>
                        <td>${progressBar}</td>
                        <td>${formatDate(lote.data_criacao)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewLote(${lote.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="duplicateLote(${lote.id})">
                                <i class="fas fa-copy"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });
        },
        error: function() {
            console.error('Erro ao carregar lotes recentes');
        }
    });
}

/**
 * Carrega a lista de produtos para o formulário de lote
 */
function loadProducts() {
    $.ajax({
        url: '/api/products/',
        type: 'GET',
        success: function(products) {
            const productSelect = $('.product-select');
            productSelect.empty();
            productSelect.append('<option value="">Selecione um produto</option>');
            
            products.forEach(product => {
                productSelect.append(`<option value="${product.id}">${product.codigo} - ${product.descricao}</option>`);
            });
        },
        error: function() {
            console.error('Erro ao carregar produtos');
        }
    });
}

/**
 * Adiciona uma nova linha de produto no formulário de lote
 */
function addProductRow() {
    const productRow = $('.product-item').first().clone();
    productRow.find('select, input').val('');
    $('#batch-products').append(productRow);
}

/**
 * Salva um novo produto
 */
function saveProduct() {
    const codigo = $('#product-codigo').val();
    const descricao = $('#product-descricao').val() || "";
    const tempoEstimado = $('#product-tempo').val() || 0;
    
    // Verificar campos obrigatórios
    if (!codigo) {
        alert('Preencha o código do produto.');
        return;
    }
    
    // Dados a serem enviados conforme o modelo do banco de dados
    const produtoData = {
        codigo: codigo,
        descricao: descricao,
        tempo_estimado_total: parseInt(tempoEstimado) || 0
    };
    
    console.log('Enviando dados do produto:', produtoData);
    
    $.ajax({
        url: '/api/products/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(produtoData),
        success: function(response) {
            console.log('Produto cadastrado com sucesso:', response);
            alert('Produto cadastrado com sucesso!');
            $('#productModal').modal('hide');
            $('#product-form')[0].reset();
            // Recarregar a lista de produtos se estivermos na página de produtos
            if (typeof loadProductsList === 'function') {
                loadProductsList();
            }
        },
        error: function(xhr) {
            console.error('Erro ao cadastrar produto:', xhr);
            let errorMsg = 'Erro ao cadastrar produto. Tente novamente.';
            
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.detail || errorMsg;
                console.log('Detalhes do erro:', xhr.responseJSON);
            }
            
            alert(errorMsg);
        }
    });
}

/**
 * Salva uma nova fase
 */
function savePhase() {
    const codigo = $('#phase-code').val();
    const descricao = $('#phase-description').val();
    
    if (!codigo || !descricao) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }
    
    $.ajax({
        url: '/api/phases/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            codigo: codigo,
            descricao: descricao
        }),
        success: function() {
            alert('Fase cadastrada com sucesso!');
            $('#phaseModal').modal('hide');
            $('#phase-form')[0].reset();
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao cadastrar fase. Tente novamente.';
            alert(errorMsg);
        }
    });
}

/**
 * Salva um novo lote
 */
function saveBatch() {
    const codigo = $('#batch-code').val();
    const descricao = $('#batch-description').val();
    const observacoes = $('#batch-observations').val();
    
    if (!codigo || !descricao) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }
    
    // Verificar se pelo menos um produto foi selecionado
    let hasValidProduct = false;
    const productItems = $('.product-item');
    productItems.each(function() {
        const productId = $(this).find('.product-select').val();
        if (productId) {
            hasValidProduct = true;
            return false; // break
        }
    });
    
    if (!hasValidProduct) {
        alert('Selecione pelo menos um produto para o lote.');
        return;
    }
    
    // Primeiro, criar o lote
    $.ajax({
        url: '/api/batches/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            codigo: codigo,
            descricao: descricao,
            observacoes: observacoes,
            status: 'em_producao'
        }),
        success: function(lote) {
            // Depois, adicionar os produtos ao lote
            let productsAdded = 0;
            let totalProducts = 0;
            
            productItems.each(function() {
                const productId = $(this).find('.product-select').val();
                const quantity = $(this).find('.product-quantity').val() || 1;
                
                if (productId) {
                    totalProducts++;
                    
                    $.ajax({
                        url: `/api/batches/${lote.id}/produtos`,
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            lote_id: lote.id,
                            produto_id: parseInt(productId),
                            quantidade: parseInt(quantity)
                        }),
                        success: function() {
                            productsAdded++;
                            if (productsAdded === totalProducts) {
                                alert('Lote criado com sucesso!');
                                $('#batchModal').modal('hide');
                                $('#batch-form')[0].reset();
                                loadLotesRecentes(); // Atualizar lista de lotes
                            }
                        },
                        error: function() {
                            console.error('Erro ao adicionar produto ao lote');
                        }
                    });
                }
            });
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao criar lote. Tente novamente.';
            alert(errorMsg);
        }
    });
}

/**
 * Salva um novo usuário
 */
function saveUser() {
    const username = $('#user-username').val();
    const name = $('#user-name').val();
    const email = $('#user-email').val();
    const password = $('#user-password').val();
    const role = $('#user-role').val();
    const group = $('#user-group').val();
    
    if (!username || !name || !email || !password || !role) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }
    
    $.ajax({
        url: '/api/admin/users',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            usuario: username,
            nome: name,
            email: email,
            senha: password,
            role: role,
            grupo: group,
            ativo: true
        }),
        success: function() {
            alert('Usuário cadastrado com sucesso!');
            $('#userModal').modal('hide');
            $('#user-form')[0].reset();
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao cadastrar usuário. Tente novamente.';
            alert(errorMsg);
        }
    });
}

/**
 * Visualiza detalhes de um lote
 */
function viewLote(loteId) {
    alert(`Funcionalidade em desenvolvimento: Visualizar Lote ${loteId}`);
}

/**
 * Duplica um lote existente
 */
function duplicateLote(loteId) {
    const novoCodigo = prompt('Digite o código para o novo lote:');
    
    if (!novoCodigo) return;
    
    $.ajax({
        url: `/api/batches/duplicate/${loteId}?novo_codigo=${novoCodigo}`,
        type: 'POST',
        success: function() {
            alert('Lote duplicado com sucesso!');
            loadLotesRecentes(); // Atualizar lista de lotes
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao duplicar lote. Tente novamente.';
            alert(errorMsg);
        }
    });
}

// admin.js - Funções para o painel administrativo

$(document).ready(function() {
    // Carregar dados do dashboard ao iniciar
    loadDashboardData();
    
    // Configurar eventos de navegação
    setupNavigationEvents();
    
    // Configurar handlers para formulários
    setupFormHandlers();
    
    // Configurar logout
    $('#logout-btn').click(function(e) {
        e.preventDefault();
        logout();
    });
});

// Funções para carregar dados do dashboard
function loadDashboardData() {
    // Carregar contadores (KPIs)
    loadCounters();
    
    // Carregar lotes recentes
    loadRecentBatches();
    
    // Carregar gráficos
    loadCharts();
}

function loadCounters() {
    $.ajax({
        url: '/api/admin/dashboard/counters',
        type: 'GET',
        success: function(data) {
            // Atualizar contadores
            $('#total-lotes').text(data.total_lotes || 0);
            $('#lotes-em-producao').text(data.lotes_em_producao || 0);
            $('#apontamentos-hoje').text(data.apontamentos_hoje || 0);
            $('#apontamentos-andamento').text(data.apontamentos_em_andamento || 0);
            
            // Atualizar KPIs
            $('#tempo-medio').text(data.tempo_medio || 0);
            $('#eficiencia').text(data.eficiencia || 0);
            $('#atrasos').text(data.atrasos || 0);
            $('#produtividade').text(data.produtividade || 0);
        },
        error: function(xhr) {
            console.error('Erro ao carregar contadores:', xhr);
        }
    });
}

function loadRecentBatches() {
    $.ajax({
        url: '/api/admin/dashboard/recent-batches',
        type: 'GET',
        success: function(data) {
            const tbody = $('#recent-batches-table tbody');
            tbody.empty();
            
            if (data && data.length > 0) {
                data.forEach(function(batch) {
                    const statusClass = getStatusClass(batch.status);
                    const row = `
                        <tr>
                            <td>${batch.codigo}</td>
                            <td>${batch.produto}</td>
                            <td>${batch.data_criacao}</td>
                            <td><span class="badge ${statusClass}">${batch.status_display}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info view-batch" data-id="${batch.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
                
                // Anexar evento para visualizar lote
                $('.view-batch').click(function() {
                    const batchId = $(this).data('id');
                    viewBatch(batchId);
                });
            } else {
                tbody.append('<tr><td colspan="5" class="text-center">Nenhum lote encontrado</td></tr>');
            }
        },
        error: function(xhr) {
            console.error('Erro ao carregar lotes recentes:', xhr);
            $('#recent-batches-table tbody').html('<tr><td colspan="5" class="text-center">Erro ao carregar dados</td></tr>');
        }
    });
}

function loadCharts() {
    // Carregar dados para o gráfico de produção por produto
    $.ajax({
        url: '/api/admin/dashboard/production-by-product',
        type: 'GET',
        success: function(data) {
            renderProductionChart(data);
        },
        error: function(xhr) {
            console.error('Erro ao carregar dados de produção por produto:', xhr);
        }
    });
    
    // Carregar dados para o gráfico de status de lotes
    $.ajax({
        url: '/api/admin/dashboard/batch-status',
        type: 'GET',
        success: function(data) {
            renderBatchStatusChart(data);
        },
        error: function(xhr) {
            console.error('Erro ao carregar dados de status dos lotes:', xhr);
        }
    });
}

function renderProductionChart(data) {
    const ctx = document.getElementById('production-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Lotes produzidos',
                data: data.values,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Produto'
                    }
                }
            }
        }
    });
}

function renderBatchStatusChart(data) {
    const ctx = document.getElementById('batch-status-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Funções de navegação
function setupNavigationEvents() {
    // Produtos
    $('#list-products').click(function(e) {
        e.preventDefault();
        loadProducts();
    });
    
    // Fases
    $('#list-phases').click(function(e) {
        e.preventDefault();
        loadPhases();
    });
    
    // Lotes
    $('#list-batches').click(function(e) {
        e.preventDefault();
        loadBatches();
    });
    
    // Usuários
    $('#list-users').click(function(e) {
        e.preventDefault();
        loadUsers();
    });
}

// Funções para carregar listas
function loadProducts() {
    $.ajax({
        url: '/api/products/',
        type: 'GET',
        success: function(data) {
            // Limpar conteúdo atual
            $('#content-area').empty();
            
            // Criar tabela de produtos
            const productsList = `
                <div class="row mb-4">
                    <div class="col-md-12">
                        <h2><i class="fas fa-boxes me-2"></i>Produtos</h2>
                        <button class="btn btn-primary mb-3" data-bs-toggle="modal" data-bs-target="#productModal">
                            <i class="fas fa-plus me-2"></i>Novo Produto
                        </button>
                        <div class="card">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover" id="products-table">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Descrição</th>
                                                <th>Tempo Estimado</th>
                                                <th>Status</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#content-area').html(productsList);
            
            const tbody = $('#products-table tbody');
            tbody.empty();
            
            if (data && data.length > 0) {
                data.forEach(function(product) {
                    const row = `
                        <tr>
                            <td>${product.codigo}</td>
                            <td>${product.descricao}</td>
                            <td>${product.tempo_estimado_total} min</td>
                            <td>${product.ativo ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-danger">Inativo</span>'}</td>
                            <td>
                                <button class="btn btn-sm btn-info view-product" data-id="${product.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-warning edit-product" data-id="${product.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
                
                // Anexar eventos aos botões
                $('.view-product').click(function() {
                    const productId = $(this).data('id');
                    viewProduct(productId);
                });
                
                $('.edit-product').click(function() {
                    const productId = $(this).data('id');
                    editProduct(productId);
                });
                
                $('.delete-product').click(function() {
                    const productId = $(this).data('id');
                    deleteProduct(productId);
                });
            } else {
                tbody.append('<tr><td colspan="5" class="text-center">Nenhum produto encontrado</td></tr>');
            }
        },
        error: function(xhr) {
            console.error('Erro ao carregar produtos:', xhr);
        }
    });
}

function loadPhases() {
    // Implementação similar à loadProducts, mas para fases
}

function loadBatches() {
    // Implementação similar à loadProducts, mas para lotes
}

function loadUsers() {
    // Implementação similar à loadProducts, mas para usuários
}

// Funções para manipulação de formulários
function setupFormHandlers() {
    // Formulário de novo produto
    $('#product-form').submit(function(e) {
        e.preventDefault();
        
        const productData = {
            codigo: $('#product-codigo').val(),
            descricao: $('#product-descricao').val(),
            tempo_estimado_total: parseInt($('#product-tempo').val()),
            ativo: $('#product-ativo').is(':checked')
        };
        
        $.ajax({
            url: '/api/products/',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(productData),
            success: function(response) {
                // Fechar modal
                $('#productModal').modal('hide');
                
                // Mostrar mensagem de sucesso
                showAlert('success', 'Produto criado com sucesso!');
                
                // Recarregar lista de produtos
                if ($('#products-table').length) {
                    loadProducts();
                }
                
                // Limpar formulário
                $('#product-form')[0].reset();
            },
            error: function(xhr) {
                let message = 'Erro ao criar produto. Tente novamente.';
                if (xhr.responseJSON && xhr.responseJSON.detail) {
                    message = xhr.responseJSON.detail;
                }
                
                showAlert('danger', message);
            }
        });
    });
    
    // Outros formulários podem ser implementados de forma similar
}

// Funções de utilidade
function showAlert(type, message) {
    const alert = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    $('#alert-container').html(alert);
    
    // Auto-esconder após 5 segundos
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}

function getStatusClass(status) {
    switch (status) {
        case 'em_producao':
            return 'bg-primary';
        case 'em_pausa':
            return 'bg-warning';
        case 'concluido':
            return 'bg-success';
        case 'cancelado':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

function viewProduct(productId) {
    $.ajax({
        url: `/api/products/${productId}`,
        type: 'GET',
        success: function(product) {
            // Criar modal de visualização
            const modal = `
                <div class="modal fade" id="viewProductModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">Detalhes do Produto</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <p><strong>Código:</strong> ${product.codigo}</p>
                                        <p><strong>Descrição:</strong> ${product.descricao}</p>
                                        <p><strong>Tempo Estimado:</strong> ${product.tempo_estimado_total} min</p>
                                        <p><strong>Status:</strong> ${product.ativo ? 'Ativo' : 'Inativo'}</p>
                                    </div>
                                </div>
                                
                                <h6 class="mb-3">Fases do Produto</h6>
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
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Adicionar modal ao body
            $('body').append(modal);
            
            // Carregar fases do produto
            loadProductPhases(productId);
            
            // Exibir modal
            const viewModal = new bootstrap.Modal(document.getElementById('viewProductModal'));
            viewModal.show();
            
            // Remover modal ao fechar
            $('#viewProductModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },
        error: function(xhr) {
            console.error('Erro ao carregar detalhes do produto:', xhr);
        }
    });
}

function loadProductPhases(productId) {
    $.ajax({
        url: `/api/products/${productId}/phases`,
        type: 'GET',
        success: function(phases) {
            const tbody = $('#product-phases');
            tbody.empty();
            
            if (phases && phases.length > 0) {
                phases.forEach(function(phase) {
                    const row = `
                        <tr>
                            <td>${phase.ordem}</td>
                            <td>${phase.fase_descricao}</td>
                            <td>${phase.tempo_estimado} min</td>
                            <td>${phase.tempo_prateleira_horas} h</td>
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
        }
    });
}

function editProduct(productId) {
    // Implementação da edição de produto
}

function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        $.ajax({
            url: `/api/products/${productId}`,
            type: 'DELETE',
            success: function() {
                showAlert('success', 'Produto excluído com sucesso!');
                loadProducts();
            },
            error: function(xhr) {
                console.error('Erro ao excluir produto:', xhr);
                showAlert('danger', 'Erro ao excluir produto. Verifique se não há lotes associados.');
            }
        });
    }
}

function viewBatch(batchId) {
    // Implementação da visualização de lote
}

function logout() {
    $.ajax({
        url: '/logout',
        type: 'POST',
        success: function() {
            window.location.href = '/login';
        },
        error: function(xhr) {
            console.error('Erro ao fazer logout:', xhr);
        }
    });
}
