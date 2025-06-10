/**
 * Funções para gerenciamento de próximos passos de um lote
 */

/**
 * Carrega e exibe os próximos passos para um lote
 */
function loadNextSteps(loteId) {
    $.ajax({
        url: `/api/next-steps/${loteId}`,
        type: 'GET',
        success: function(response) {
            displayNextSteps(response);
        },
        error: function() {
            console.error('Erro ao carregar próximos passos');
            $('#next-steps-container').hide();
        }
    });
}

/**
 * Exibe os próximos passos na interface
 */
function displayNextSteps(data) {
    const container = $('#next-steps-container');
    container.empty();
    
    // Informações do lote e produto
    const header = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h5>Progresso do Lote: ${data.lote.codigo}</h5>
            <span class="badge bg-info">${data.produto.descricao}</span>
        </div>
    `;
    
    // Barra de progresso
    const progressBar = `
        <div class="progress mb-3" style="height: 20px;">
            <div class="progress-bar bg-success" role="progressbar" 
                 style="width: ${data.progresso}%;" 
                 aria-valuenow="${data.progresso}" aria-valuemin="0" aria-valuemax="100">
                ${data.progresso}% Completo
            </div>
        </div>
        <p class="text-muted small mb-3">
            <i class="fas fa-tasks me-1"></i> ${data.fases_concluidas} de ${data.total_fases} fases concluídas
        </p>
    `;
    
    // Lista de próximos passos
    let stepsHtml = '<div class="list-group">';
    
    data.proximos_passos.forEach(function(fase) {
        const statusIcon = fase.concluida 
            ? '<i class="fas fa-check-circle text-success"></i>' 
            : (fase.proximo ? '<i class="fas fa-arrow-circle-right text-primary"></i>' : '<i class="fas fa-clock text-secondary"></i>');
        
        const statusClass = fase.concluida 
            ? 'list-group-item-success' 
            : (fase.proximo ? 'list-group-item-primary' : '');
            
        const emAndamentoTag = fase.em_andamento 
            ? `<span class="badge bg-warning text-dark ms-2">Em andamento por ${fase.operador_nome || 'outro operador'}</span>` 
            : '';
        
        stepsHtml += `
            <div class="list-group-item ${statusClass} d-flex justify-content-between align-items-center" 
                 data-fase-id="${fase.fase_id}" data-ordem="${fase.ordem}">
                <div>
                    <span class="me-2">${statusIcon}</span>
                    <strong>${fase.descricao}</strong>
                    ${emAndamentoTag}
                </div>
                <span class="badge bg-secondary rounded-pill">${fase.ordem}</span>
            </div>
        `;
    });
    
    stepsHtml += '</div>';
    
    // Mensagem de orientação
    let orientationMessage = '';
    const nextStep = data.proximos_passos.find(fase => fase.proximo && !fase.concluida);
    
    if (nextStep) {
        if (nextStep.em_andamento) {
            orientationMessage = `
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    A fase <strong>${nextStep.descricao}</strong> já está em andamento por outro operador.
                </div>
            `;
        } else {
            orientationMessage = `
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    Próximo passo: <strong>${nextStep.descricao}</strong>
                </div>
            `;
        }
    } else if (data.fases_concluidas === data.total_fases) {
        orientationMessage = `
            <div class="alert alert-success mt-3">
                <i class="fas fa-check-circle me-2"></i>
                Todas as fases deste lote foram concluídas!
            </div>
        `;
    } else {
        orientationMessage = `
            <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Existem fases pendentes anteriores que precisam ser concluídas primeiro.
            </div>
        `;
    }
    
    // Montar conteúdo completo
    container.append(header + progressBar + stepsHtml + orientationMessage);
    container.show();
}
