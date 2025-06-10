/**
 * Gerenciamento de Usuários - Controller JavaScript
 */

// Carregar lista de usuários quando o documento estiver pronto
$(document).ready(function() {
    // Carregar a lista de usuários ao iniciar a página
    loadUsers();
    
    // Configurar evento para o botão de atualizar
    $('#refresh-users').on('click', function() {
        loadUsers();
    });
    
    // Configurar evento para busca de usuários
    $('#search-users').on('input', function() {
        filterUsers($(this).val());
    });
    
    // Configurar evento para mostrar/esconder senha
    $('#show-password').on('change', function() {
        const passwordField = $('#user-senha');
        if ($(this).is(':checked')) {
            passwordField.attr('type', 'text');
        } else {
            passwordField.attr('type', 'password');
        }
    });
    
    // Configurar evento para o botão de salvar usuário
    $('#save-user').on('click', function() {
        saveUser();
    });
    
    // Permitir submissão do formulário com Enter
    $('#user-form').on('submit', function(e) {
        e.preventDefault();
        saveUser();
    });
    
    // Resetar formulário quando modal é fechado
    $('#userModal').on('hidden.bs.modal', function() {
        resetUserForm();
    });
});

/**
 * Carregar lista de usuários
 */
function loadUsers() {
    $('#users-table-body').html('<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></td></tr>');
    
    $.ajax({
        url: '/api/users',
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(users) {
            console.log('Usuários carregados:', users);
            displayUsers(users);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar usuários:', xhr.status, error);
            $('#users-table-body').html('<tr><td colspan="7" class="text-center text-danger">Erro ao carregar usuários. Por favor, tente novamente.</td></tr>');
            showAlert('danger', 'Falha ao carregar usuários. Por favor, tente novamente.');
        }
    });
}

/**
 * Exibir usuários na tabela
 */
function displayUsers(users) {
    if (!users || users.length === 0) {
        $('#users-table-body').html('<tr><td colspan="7" class="text-center">Nenhum usuário encontrado</td></tr>');
        return;
    }
    
    // Limpar tabela
    $('#users-table-body').empty();
    
    // Adicionar cada usuário à tabela
    users.forEach(function(user) {
        const statusBadge = user.ativo ? 
            '<span class="badge bg-success">Ativo</span>' : 
            '<span class="badge bg-danger">Inativo</span>';
        
        // Formatar perfil de usuário para exibição
        let roleBadge = '';
        switch(user.role) {
            case 'admin':
                roleBadge = '<span class="badge bg-primary">Administrador</span>';
                break;
            case 'operator':
                roleBadge = '<span class="badge bg-info">Operador</span>';
                break;
            case 'viewer':
                roleBadge = '<span class="badge bg-secondary">Visualizador</span>';
                break;
            default:
                roleBadge = '<span class="badge bg-light text-dark">' + user.role + '</span>';
        }
        
        const row = `
            <tr data-user-id="${user.id}">
                <td>${user.nome || '-'}</td>
                <td>${user.usuario}</td>
                <td>${user.email || '-'}</td>
                <td>${roleBadge}</td>
                <td>${user.grupo || '-'}</td>
                <td>${statusBadge}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-info view-user" data-user-id="${user.id}" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary edit-user" data-user-id="${user.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${user.ativo ? 'btn-danger' : 'btn-success'} toggle-user-status" 
                            data-user-id="${user.id}" 
                            data-status="${user.ativo}" 
                            title="${user.ativo ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${user.ativo ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </td>
            </tr>
        `;
        
        $('#users-table-body').append(row);
    });
    
    // Adicionar event listeners para os botões
    $('.view-user').on('click', function() {
        const userId = $(this).data('user-id');
        viewUser(userId);
    });
    
    $('.edit-user').on('click', function() {
        const userId = $(this).data('user-id');
        editUser(userId);
    });
    
    $('.toggle-user-status').on('click', function() {
        const userId = $(this).data('user-id');
        const isActive = $(this).data('status') === true;
        toggleUserStatus(userId, isActive);
    });
}

/**
 * Filtrar usuários na tabela
 */
function filterUsers(searchText) {
    searchText = searchText.toLowerCase();
    
    $('#users-table-body tr').each(function() {
        const row = $(this);
        const rowText = row.text().toLowerCase();
        
        if (rowText.includes(searchText)) {
            row.show();
        } else {
            row.hide();
        }
    });
}

/**
 * Visualizar detalhes do usuário
 */
function viewUser(userId) {
    $.ajax({
        url: `/api/users/${userId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(user) {
            console.log('Detalhes do usuário carregados:', user);
            
            const statusBadge = user.ativo ? 
                '<span class="badge bg-success">Ativo</span>' : 
                '<span class="badge bg-danger">Inativo</span>';
            
            // Formatar perfil de usuário para exibição
            let roleName = '';
            switch(user.role) {
                case 'admin':
                    roleName = 'Administrador';
                    break;
                case 'operator':
                    roleName = 'Operador';
                    break;
                case 'viewer':
                    roleName = 'Visualizador';
                    break;
                default:
                    roleName = user.role;
            }
            
            // Formatação da data de criação (se disponível)
            let createdAt = user.created_at ? 
                new Date(user.created_at).toLocaleString('pt-BR') : 
                'Não disponível';
                
            // Formatação da data de atualização (se disponível)
            let updatedAt = user.updated_at ? 
                new Date(user.updated_at).toLocaleString('pt-BR') : 
                'Não disponível';
            
            const userDetails = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${user.nome || user.usuario}</h5>
                        <div class="mb-3">${statusBadge}</div>
                        
                        <ul class="list-group list-group-flush mb-3">
                            <li class="list-group-item d-flex justify-content-between">
                                <span>ID:</span> <span class="text-muted">${user.id}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Nome de Usuário:</span> <span class="text-muted">${user.usuario}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Email:</span> <span class="text-muted">${user.email || 'Não informado'}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Perfil:</span> <span class="text-muted">${roleName}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Grupo:</span> <span class="text-muted">${user.grupo || 'Não informado'}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Criado em:</span> <span class="text-muted">${createdAt}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <span>Atualizado em:</span> <span class="text-muted">${updatedAt}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            `;
            
            $('#user-details-content').html(userDetails);
            $('#viewUserModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar detalhes do usuário:', xhr.status, error);
            showAlert('danger', 'Falha ao carregar detalhes do usuário.');
        }
    });
}

/**
 * Editar usuário
 */
function editUser(userId) {
    console.log('Editando usuário ID:', userId);
    
    // Carregar dados do usuário
    $.ajax({
        url: `/api/users/${userId}`,
        type: 'GET',
        xhrFields: {
            withCredentials: true
        },
        headers: {
            'Accept': 'application/json'
        },
        success: function(user) {
            console.log('Dados do usuário para edição:', user);
            
            // Preencher formulário com os dados atuais
            $('#user-nome').val(user.nome || '');
            $('#user-usuario').val(user.usuario);
            $('#user-email').val(user.email || '');
            $('#user-role').val(user.role);
            $('#user-grupo').val(user.grupo || '');
            $('#user-ativo').prop('checked', user.ativo);
            
            // Campo de senha não é preenchido para edição
            $('#user-senha').val('');
            // Campo de senha é opcional na edição
            $('#user-senha').prop('required', false);
            $('.password-row').css('opacity', '0.6');
            
            // Configurar modal para modo de edição
            $('.modal-title').text('Editar Usuário');
            $('#save-user').data('mode', 'edit');
            $('#save-user').data('id', userId);
            
            // Exibir modal
            $('#userModal').modal('show');
        },
        error: function(xhr, status, error) {
            console.error('Erro ao carregar dados do usuário para edição:', xhr.status, error);
            showAlert('danger', 'Não foi possível carregar os dados do usuário para edição.');
        }
    });
}

/**
 * Alternar status do usuário (ativar/desativar)
 */
function toggleUserStatus(userId, isCurrentlyActive) {
    const confirmMsg = isCurrentlyActive ? 
        'Tem certeza que deseja desativar este usuário?' : 
        'Tem certeza que deseja reativar este usuário?';
        
    if (!confirm(confirmMsg)) {
        return;
    }
    
    $.ajax({
        url: `/api/users/${userId}`,
        type: 'PUT',
        contentType: 'application/json',
        xhrFields: {
            withCredentials: true
        },
        data: JSON.stringify({
            ativo: !isCurrentlyActive
        }),
        success: function(response) {
            console.log('Status do usuário alterado:', response);
            
            const actionMsg = isCurrentlyActive ? 'desativado' : 'ativado';
            showAlert('success', `Usuário ${actionMsg} com sucesso.`);
            
            // Recarregar lista de usuários
            loadUsers();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao alterar status do usuário:', xhr.status, error);
            
            let errorMsg = `Não foi possível ${isCurrentlyActive ? 'desativar' : 'ativar'} o usuário.`;
            
            // Verificar se há uma mensagem de erro específica da API
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                errorMsg += ` Motivo: ${xhr.responseJSON.detail}`;
            }
            
            showAlert('danger', errorMsg);
        }
    });
}

/**
 * Salvar usuário (criar ou atualizar)
 */
function saveUser() {
    // Validar formulário
    if (!$('#user-form')[0].checkValidity()) {
        $('#user-form')[0].reportValidity();
        return;
    }
    
    // Coletar dados do formulário
    const userData = {
        nome: $('#user-nome').val().trim(),
        usuario: $('#user-usuario').val().trim(),
        email: $('#user-email').val().trim(),
        role: $('#user-role').val(),
        grupo: $('#user-grupo').val().trim() || null,
        ativo: $('#user-ativo').is(':checked')
    };
    
    // Adicionar senha apenas se estiver preenchida ou se for um novo usuário
    const senha = $('#user-senha').val();
    const mode = $('#save-user').data('mode') || 'create';
    
    if (senha || mode === 'create') {
        userData.senha = senha;
    }
    
    console.log('Dados do usuário para salvar:', userData);
    
    // Definir URL e método com base no modo (criar ou editar)
    let url = '/api/users';
    let method = 'POST';
    
    if (mode === 'edit') {
        const userId = $('#save-user').data('id');
        url = `/api/users/${userId}`;
        method = 'PUT';
    }
    
    // Enviar requisição para salvar usuário
    $.ajax({
        url: url,
        type: method,
        contentType: 'application/json',
        xhrFields: {
            withCredentials: true
        },
        data: JSON.stringify(userData),
        success: function(response) {
            console.log('Usuário salvo:', response);
            
            // Fechar modal
            $('#userModal').modal('hide');
            
            // Exibir mensagem de sucesso
            const actionMsg = mode === 'create' ? 'cadastrado' : 'atualizado';
            showAlert('success', `Usuário ${actionMsg} com sucesso.`);
            
            // Recarregar lista de usuários
            loadUsers();
        },
        error: function(xhr, status, error) {
            console.error('Erro ao salvar usuário:', xhr.status, error);
            
            let errorMsg = `Não foi possível ${mode === 'create' ? 'cadastrar' : 'atualizar'} o usuário.`;
            
            // Verificar se há uma mensagem de erro específica da API
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                errorMsg += ` Motivo: ${xhr.responseJSON.detail}`;
            }
            
            showAlert('danger', errorMsg);
        }
    });
}

/**
 * Resetar formulário de usuário
 */
function resetUserForm() {
    // Limpar campos
    $('#user-form')[0].reset();
    
    // Restaurar estado padrão dos campos de senha
    $('#user-senha').prop('required', true);
    $('.password-row').css('opacity', '1');
    
    // Restaurar configurações do modal para criação
    $('.modal-title').text('Novo Usuário');
    $('#save-user').data('mode', 'create');
    $('#save-user').removeData('id');
}

/**
 * Exibir alerta
 */
function showAlert(type, message) {
    // Criar elemento de alerta
    const alert = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
    `;
    
    // Adicionar alerta ao container
    if ($('#alerts-container').length === 0) {
        $('nav').after('<div id="alerts-container" class="container mt-3"></div>');
    }
    
    // Adicionar alerta ao container
    $('#alerts-container').append(alert);
    
    // Remover alerta após 5 segundos
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}
