/**
 * JavaScript para a interface do operador
 */

let scanner = null;
let apontamentoAtual = null;
let timerInterval = null;
let startTime = null;

$(document).ready(function() {
    // Carregar lotes disponíveis
    loadLotes();
    
    // Event listeners
    $('#start-scanner').on('click', startScanner);
    $('#lote-select').on('change', onLoteSelected);
    $('#produto-select').on('change', onProdutoSelected);
    $('#fase-select').on('change', onFaseSelected);
    $('#iniciar-apontamento').on('click', iniciarApontamento);
    $('#finalizar-apontamento').on('click', finalizarApontamento);
    $('#apontamentos-tab').on('click', loadHistoricoApontamentos);
    
    // Desativar tab de apontamentos inicialmente
    $('#apontamento-container').hide();
    $('#historico-container').hide();
});

/**
 * Inicia o scanner de QR Code
 */
function startScanner() {
    if (scanner) {
        scanner.clear();
    }
    
    scanner = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 200, height: 200 }
    };
    
    scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    )
    .catch(err => {
        console.error(`Erro ao iniciar scanner: ${err}`);
        alert('Não foi possível iniciar a câmera. Verifique as permissões.');
    });
    
    $('#start-scanner').text('Scanner ativo').prop('disabled', true);
}

/**
 * Callback para quando um QR Code é lido com sucesso
 */
function onScanSuccess(decodedText) {
    // Parar o scanner após ler um código
    if (scanner) {
        scanner.stop();
        $('#start-scanner').text('Iniciar Scanner').prop('disabled', false);
    }
    
    // Verificar se é um QR code de máquina
    if (decodedText.startsWith('maquina:')) {
        // Se estamos no modo de escaneamento de máquina
        if ($('#machine-qr-reader').is(':visible')) {
            handleMachineQrCode(decodedText);
            return;
        }
    }
    
    // Processar o texto do QR Code de lote
    // Formato esperado: LOTE-{id}|PRODUTO-{id}|FASE-{id}
    try {
        const parts = decodedText.split('|');
        let loteId = null;
        let produtoId = null;
        let faseId = null;
        
        parts.forEach(part => {
            if (part.startsWith('LOTE-')) {
                loteId = part.replace('LOTE-', '');
            } else if (part.startsWith('PRODUTO-')) {
                produtoId = part.replace('PRODUTO-', '');
            } else if (part.startsWith('FASE-')) {
                faseId = part.replace('FASE-', '');
            }
        });
        
        if (loteId) {
            $('#lote-select').val(loteId).trigger('change');
            
            // Se tiver produto e lote, selecionar automaticamente
            if (produtoId) {
                setTimeout(() => {
                    $('#produto-select').val(produtoId).trigger('change');
                    
                    // Se tiver fase, selecionar automaticamente
                    if (faseId) {
                        setTimeout(() => {
                            $('#fase-select').val(faseId).trigger('change');
                        }, 500);
                    }
                }, 500);
            }
        } else {
            alert('QR Code inválido. Formato esperado: LOTE-{id}|PRODUTO-{id}|FASE-{id}');
        }
    } catch (error) {
        console.error('Erro ao processar QR Code:', error);
        alert('Erro ao processar QR Code. Formato inválido.');
    }
}

/**
 * Callback para falhas no scanner
 */
function onScanFailure(error) {
    // Não fazer nada, é normal durante o processo de escaneamento
    console.log(`Scanning em andamento...`);
}

/**
 * Carrega a lista de lotes disponíveis
 */
function loadLotes() {
    $.ajax({
        url: '/api/batches/',
        type: 'GET',
        success: function(lotes) {
            const loteSelect = $('#lote-select');
            loteSelect.empty();
            loteSelect.append('<option value="">Selecione um lote</option>');
            
            // Filtrar apenas lotes em produção
            const lotesEmProducao = lotes.filter(lote => lote.status === 'em_producao');
            
            lotesEmProducao.forEach(lote => {
                loteSelect.append(`<option value="${lote.id}">${lote.codigo} - ${lote.descricao}</option>`);
            });
        },
        error: function() {
            console.error('Erro ao carregar lotes');
            alert('Erro ao carregar lotes. Tente novamente.');
        }
    });
}

/**
 * Handler para quando um lote é selecionado
 */
function onLoteSelected() {
    const loteId = $('#lote-select').val();
    
    if (!loteId) {
        $('#produto-container').hide();
        $('#fase-container').hide();
        $('#apontamento-container').hide();
        $('#next-steps-container').hide();
        $('#no-lote-selected').show();
        return;
    }
    
    // Carregar os próximos passos para este lote
    loadNextSteps(loteId);
    $('#no-lote-selected').hide();
    
    // Carregar produtos do lote
    $.ajax({
        url: `/api/batches/${loteId}/produtos`,
        type: 'GET',
        success: function(produtosLote) {
            const produtoSelect = $('#produto-select');
            produtoSelect.empty();
            produtoSelect.append('<option value="">Selecione um produto</option>');
            
            // Para cada produto do lote, buscar detalhes do produto
            const promises = produtosLote.map(produtoLote => {
                return $.ajax({
                    url: `/api/products/${produtoLote.produto_id}`,
                    type: 'GET'
                });
            });
            
            Promise.all(promises).then(produtos => {
                produtos.forEach(produto => {
                    produtoSelect.append(`<option value="${produto.id}">${produto.codigo} - ${produto.descricao}</option>`);
                });
                
                $('#produto-container').show();
            });
        },
        error: function() {
            console.error('Erro ao carregar produtos do lote');
            alert('Erro ao carregar produtos do lote. Tente novamente.');
        }
    });
}

/**
 * Handler para quando um produto é selecionado
 */
function onProdutoSelected() {
    const loteId = $('#lote-select').val();
    const produtoId = $('#produto-select').val();
    
    if (!loteId || !produtoId) {
        $('#fase-container').hide();
        return;
    }
    
    // Carregar fases do produto para este lote
    $.ajax({
        url: `/api/batches/${loteId}/fases?produto_id=${produtoId}`,
        type: 'GET',
        success: function(fasesLote) {
            const faseSelect = $('#fase-select');
            faseSelect.empty();
            faseSelect.append('<option value="">Selecione uma fase</option>');
            
            // Para cada fase do lote, buscar detalhes da fase
            const promises = fasesLote.map(faseLote => {
                return $.ajax({
                    url: `/api/phases/${faseLote.fase_id}`,
                    type: 'GET'
                });
            });
            
            Promise.all(promises).then(fases => {
                // Ordenar fases pela ordem
                fasesLote.sort((a, b) => a.ordem - b.ordem);
                
                fasesLote.forEach(faseLote => {
                    const fase = fases.find(f => f.id === faseLote.fase_id);
                    if (fase) {
                        faseSelect.append(`
                            <option value="${fase.id}" 
                                    data-ordem="${faseLote.ordem}" 
                                    data-tempo="${faseLote.tempo_estimado}">
                                ${fase.codigo} - ${fase.descricao}
                            </option>
                        `);
                    }
                });
                
                $('#fase-container').show();
            });
        },
        error: function() {
            console.error('Erro ao carregar fases do produto');
            alert('Erro ao carregar fases do produto. Tente novamente.');
        }
    });
}

/**
 * Handler para quando uma fase é selecionada
 */
function onFaseSelected() {
    const loteId = $('#lote-select').val();
    const produtoId = $('#produto-select').val();
    const faseId = $('#fase-select').val();
    
    if (!loteId || !produtoId || !faseId) {
        $('#apontamento-container').hide();
        return;
    }
    
    // Verificar se já existe um apontamento em andamento para esta combinação
    $.ajax({
        url: `/api/apontamentos/?lote_id=${loteId}&produto_id=${produtoId}&fase_id=${faseId}&status=iniciado`,
        type: 'GET',
        success: function(apontamentos) {
            // Preparar interface de apontamento
            const loteText = $('#lote-select option:selected').text();
            const produtoText = $('#produto-select option:selected').text();
            const faseText = $('#fase-select option:selected').text();
            const tempoEstimado = $('#fase-select option:selected').data('tempo');
            
            $('#lote-info').text(loteText);
            $('#produto-info').text(produtoText);
            $('#fase-info').text(faseText);
            $('#tempo-estimado').text(`${tempoEstimado} min`);
            $('#observacoes').val('');
            
            // Se já existe um apontamento em andamento, configurar para finalização
            if (apontamentos && apontamentos.length > 0) {
                apontamentoAtual = apontamentos[0];
                
                // Configurar interface para finalização
                $('#iniciar-apontamento').hide();
                $('#apontamento-actions').hide();
                
                // Carregar checklist
                loadChecklist(apontamentoAtual.id, faseId);
                
                // Iniciar timer desde o início do apontamento
                startTime = new Date(apontamentoAtual.data_inicio);
                updateTimer();
                timerInterval = setInterval(updateTimer, 1000);
                
                // Mostrar observações do apontamento
                $('#observacoes').val(apontamentoAtual.observacoes || '');
            } else {
                // Configurar interface para início de apontamento
                apontamentoAtual = null;
                $('#iniciar-apontamento').show();
                $('#apontamento-actions').show();
                $('#checklist-container').hide();
                
                // Parar timer se estiver rodando
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                
                $('#tempo-decorrido').text('00:00:00');
            }
            
            $('#apontamento-container').show();
        },
        error: function() {
            console.error('Erro ao verificar apontamentos existentes');
            alert('Erro ao verificar apontamentos. Tente novamente.');
        }
    });
}

/**
 * Carrega o checklist para a fase atual
 */
function loadChecklist(apontamentoId, faseId) {
    // Primeiro, carregar os itens do checklist para a fase
    $.ajax({
        url: `/api/phases/${faseId}/checklist`,
        type: 'GET',
        success: function(checklistItems) {
            if (!checklistItems || checklistItems.length === 0) {
                $('#checklist-container').hide();
                return;
            }
            
            // Depois, carregar as respostas existentes para o apontamento
            $.ajax({
                url: `/api/apontamentos/${apontamentoId}/checklist`,
                type: 'GET',
                success: function(respostas) {
                    const checklistContainer = $('#checklist-items');
                    checklistContainer.empty();
                    
                    checklistItems.forEach(item => {
                        // Verificar se já existe resposta para este item
                        const resposta = respostas.find(r => r.checklist_item_id === item.id);
                        const checked = resposta ? resposta.concluido : false;
                        const observacao = resposta ? resposta.observacao : '';
                        
                        // Classe para destacar itens obrigatórios ou concluídos
                        let itemClass = 'checklist-item';
                        if (item.obrigatorio) itemClass += ' required';
                        if (checked) itemClass += ' completed';
                        
                        checklistContainer.append(`
                            <div class="${itemClass}" data-item-id="${item.id}">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="check-${item.id}" 
                                           ${checked ? 'checked' : ''} ${item.obrigatorio ? 'required' : ''}>
                                    <label class="form-check-label" for="check-${item.id}">
                                        ${item.descricao}
                                        ${item.obrigatorio ? '<span class="text-danger">*</span>' : ''}
                                    </label>
                                </div>
                                <div class="mt-2">
                                    <input type="text" class="form-control form-control-sm" 
                                           placeholder="Observação (opcional)" value="${observacao || ''}">
                                </div>
                            </div>
                        `);
                    });
                    
                    // Adicionar evento para salvar resposta quando checkbox muda
                    $('.checklist-item .form-check-input').on('change', function() {
                        const itemId = $(this).closest('.checklist-item').data('item-id');
                        const concluido = $(this).is(':checked');
                        const observacao = $(this).closest('.checklist-item').find('input[type="text"]').val();
                        
                        salvarRespostaChecklist(apontamentoId, itemId, concluido, observacao);
                        
                        // Atualizar classes
                        if (concluido) {
                            $(this).closest('.checklist-item').addClass('completed');
                        } else {
                            $(this).closest('.checklist-item').removeClass('completed');
                        }
                    });
                    
                    // Adicionar evento para salvar observação quando valor muda
                    $('.checklist-item input[type="text"]').on('change', function() {
                        const itemId = $(this).closest('.checklist-item').data('item-id');
                        const concluido = $(this).closest('.checklist-item').find('.form-check-input').is(':checked');
                        const observacao = $(this).val();
                        
                        salvarRespostaChecklist(apontamentoId, itemId, concluido, observacao);
                    });
                    
                    $('#checklist-container').show();
                },
                error: function() {
                    console.error('Erro ao carregar respostas do checklist');
                }
            });
        },
        error: function() {
            console.error('Erro ao carregar itens do checklist');
            $('#checklist-container').hide();
        }
    });
}

/**
 * Salva uma resposta do checklist
 */
function salvarRespostaChecklist(apontamentoId, itemId, concluido, observacao) {
    $.ajax({
        url: `/api/apontamentos/${apontamentoId}/checklist`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            apontamento_id: apontamentoId,
            checklist_item_id: itemId,
            concluido: concluido,
            observacao: observacao
        }),
        error: function() {
            console.error('Erro ao salvar resposta do checklist');
            alert('Erro ao salvar resposta. Tente novamente.');
        }
    });
}

/**
 * Inicia um novo apontamento
 */
function iniciarApontamento() {
    const loteId = $('#lote-select').val();
    const produtoId = $('#produto-select').val();
    const faseId = $('#fase-select').val();
    const observacoes = $('#observacoes').val();
    const maquinaId = $('#apontamento-form').data('maquina-id');
    
    if (!loteId || !produtoId || !faseId) {
        alert('Selecione lote, produto e fase para iniciar o apontamento.');
        return;
    }
    
    // Verificar se foi selecionada uma máquina quando o checkbox está marcado
    if ($('#iniciar-apontamento').is(':checked') && !maquinaId) {
        alert('Escaneie ou selecione uma máquina para iniciar o apontamento.');
        return;
    }
    
    // Preparar dados do apontamento
    const apontamentoData = {
        lote_id: parseInt(loteId),
        produto_id: parseInt(produtoId),
        fase_id: parseInt(faseId),
        observacoes: observacoes,
        status: 'iniciado'
    };
    
    // Adicionar ID da máquina se estiver disponível
    if (maquinaId) {
        apontamentoData.maquina_id = parseInt(maquinaId);
    }
    
    $.ajax({
        url: '/api/appointments/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(apontamentoData),
        success: function(apontamento) {
            alert('Apontamento iniciado com sucesso!');
            apontamentoAtual = apontamento;
            
            // Atualizar interface
            $('#iniciar-apontamento').hide();
            $('#apontamento-actions').hide();
            
            // Iniciar timer
            startTime = new Date();
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            
            // Carregar checklist
            loadChecklist(apontamento.id, faseId);
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao iniciar apontamento. Tente novamente.';
            alert(errorMsg);
        }
    });
}

/**
 * Finaliza um apontamento existente
 */
function finalizarApontamento() {
    if (!apontamentoAtual) {
        alert('Nenhum apontamento em andamento.');
        return;
    }
    
    // Verificar se todos os itens obrigatórios foram concluídos
    let todosObrigatoriosConcluidos = true;
    $('.checklist-item.required').each(function() {
        const concluido = $(this).find('.form-check-input').is(':checked');
        if (!concluido) {
            todosObrigatoriosConcluidos = false;
            return false; // break
        }
    });
    
    if (!todosObrigatoriosConcluidos) {
        alert('Complete todos os itens obrigatórios do checklist antes de finalizar.');
        return;
    }
    
    const observacoes = $('#observacoes').val();
    
    $.ajax({
        url: `/api/apontamentos/${apontamentoAtual.id}`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            observacoes: observacoes,
            status: 'finalizado'
        }),
        success: function() {
            alert('Apontamento finalizado com sucesso!');
            
            // Parar timer
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // Resetar formulário
            $('#lote-select').val('').trigger('change');
            $('#produto-container').hide();
            $('#fase-container').hide();
            $('#apontamento-container').hide();
            
            // Limpar variáveis
            apontamentoAtual = null;
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.detail 
                ? xhr.responseJSON.detail 
                : 'Erro ao finalizar apontamento. Tente novamente.';
            alert(errorMsg);
        }
    });
}

/**
 * Atualiza o timer de tempo decorrido
 */
function updateTimer() {
    if (!startTime) return;
    
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000); // segundos
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    $('#tempo-decorrido').text(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
}

/**
 * Processa um QR code de máquina
 * @param {string} qrCode - Código QR escaneado no formato 'maquina:codigo'
 */
function handleMachineQrCode(qrCode) {
    // Extrai o código da máquina do QR code
    const machineCode = qrCode.replace('maquina:', '');
    
    // Buscar detalhes da máquina pelo código
    $.ajax({
        url: `/api/machines/by-code/${machineCode}`,
        type: 'GET',
        success: function(machine) {
            // Selecionar a máquina na interface
            if (machine && machine.id) {
                // Armazenar o ID da máquina no formulário
                $('#apontamento-form').data('maquina-id', machine.id);
                
                // Atualizar a UI para mostrar a máquina selecionada
                $('#selected-machine-name').text(machine.nome);
                $('#machine-selection-container').addClass('machine-selected');
                $('#scan-machine-btn').html('<i class="fas fa-check-circle"></i> Máquina Selecionada');
                
                // Mostrar mensagem de sucesso
                showAlert('success', `Máquina "${machine.nome}" selecionada com sucesso!`);
                
                // Ocultar o leitor de QR após seleção bem-sucedida
                $('#machine-qr-reader').hide();
                $('#machine-selector-container').show();
            } else {
                showAlert('danger', 'Máquina não encontrada com este código.');
            }
        },
        error: function() {
            showAlert('danger', 'Erro ao buscar máquina. Verifique se o QR code é válido.');
        }
    });
}

/**
 * Exibe um alerta na interface do usuário
 * @param {string} type - Tipo de alerta (success, danger, warning, info)
 * @param {string} message - Mensagem a ser exibida
 */
function showAlert(type, message) {
    const alertDiv = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`);
    
    $('#alerts-container').append(alertDiv);
    
    // Auto-fechar após 5 segundos
    setTimeout(() => {
        alertDiv.alert('close');
    }, 5000);
}

/**
 * Carrega o histórico de apontamentos do operador
 */
function loadHistoricoApontamentos() {
    // Esconder outras áreas
    $('#apontamento-container').hide();
    
    // Mostrar área de histórico
    $('#historico-container').show();
    
    // Carregar apontamentos
    $.ajax({
        url: '/api/appointments/',
        type: 'GET',
        success: function(apontamentos) {
            const tbody = $('#historico-apontamentos');
            tbody.empty();
            
            // Se não houver apontamentos
            if (!apontamentos || apontamentos.length === 0) {
                tbody.append(`
                    <tr>
                        <td colspan="8" class="text-center">Nenhum apontamento encontrado.</td>
                    </tr>
                `);
                return;
            }
            
            // Ordenar por data, mais recentes primeiro
            apontamentos.sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio));
            
            // Para cada apontamento, buscar informações adicionais
            apontamentos.forEach(apontamento => {
                // Buscar lote
                $.ajax({
                    url: `/api/batches/${apontamento.lote_id}`,
                    type: 'GET',
                    success: function(lote) {
                        // Buscar produto
                        $.ajax({
                            url: `/api/products/${apontamento.produto_id}`,
                            type: 'GET',
                            success: function(produto) {
                                // Buscar fase
                                $.ajax({
                                    url: `/api/phases/${apontamento.fase_id}`,
                                    type: 'GET',
                                    success: function(fase) {
                                        // Adicionar linha na tabela
                                        tbody.append(`
                                            <tr>
                                                <td>${formatDate(apontamento.data_inicio)}</td>
                                                <td>${lote.codigo}</td>
                                                <td>${produto.codigo}</td>
                                                <td>${fase.codigo}</td>
                                                <td>${formatTime(apontamento.data_inicio)}</td>
                                                <td>${apontamento.data_fim ? formatTime(apontamento.data_fim) : '-'}</td>
                                                <td>${apontamento.tempo_real ? apontamento.tempo_real + ' min' : '-'}</td>
                                                <td>${formatStatus(apontamento.status)}</td>
                                            </tr>
                                        `);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        },
        error: function() {
            console.error('Erro ao carregar histórico de apontamentos');
            alert('Erro ao carregar histórico. Tente novamente.');
        }
    });
}

// Funções para iniciar e finalizar apontamentos
function startAppointment(phaseId) {
    $.ajax({
        url: '/api/apontamentos/start',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            fase_lote_id: phaseId
        }),
        success: function(data) {
            // Armazenar o apontamento atual
            currentAppointment = data;
            
            // Atualizar interface para apontamento em andamento
            updateInterfaceForActiveAppointment();
            
            // Iniciar cronômetro
            startTimer();
            
            showAlert('success', 'Apontamento iniciado com sucesso!');
        },
        error: function(xhr) {
            let message = 'Erro ao iniciar apontamento. Tente novamente.';
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                message = xhr.responseJSON.detail;
            }
            
            showAlert('danger', message);
        }
    });
}

function finishAppointment() {
    if (!currentAppointment) {
        showAlert('warning', 'Nenhum apontamento em andamento.');
        return;
    }
    
    // Verificar se há checklist pendente
    if (currentAppointment.requires_checklist && !currentAppointment.checklist_complete) {
        // Mostrar modal de checklist
        showChecklistModal(currentAppointment.id);
        return;
    }
    
    // Se não houver checklist ou já estiver completo, finalizar diretamente
    completeAppointment();
}

function completeAppointment(checklistData = null) {
    const data = {
        apontamento_id: currentAppointment.id
    };
    
    // Incluir dados do checklist, se fornecidos
    if (checklistData) {
        data.checklist_respostas = checklistData;
    }
    
    $.ajax({
        url: '/api/apontamentos/finish',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            // Parar cronômetro
            stopTimer();
            
            // Limpar apontamento atual
            currentAppointment = null;
            
            // Atualizar interface
            updateInterfaceForNoAppointment();
            
            // Recarregar fases do lote atual
            const batchId = $('#batch-select').val();
            if (batchId) {
                loadBatchPhases(batchId);
            }
            
            showAlert('success', 'Apontamento finalizado com sucesso!');
        },
        error: function(xhr) {
            let message = 'Erro ao finalizar apontamento. Tente novamente.';
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                message = xhr.responseJSON.detail;
            }
            
            showAlert('danger', message);
        }
    });
}

// Funções para mostrar e processar checklist
function showChecklistModal(appointmentId) {
    // Buscar itens do checklist para esta fase
    $.ajax({
        url: `/api/apontamentos/${appointmentId}/checklist`,
        type: 'GET',
        success: function(items) {
            // Criar conteúdo do modal
            let checklistItems = '';
            
            if (items && items.length > 0) {
                items.forEach(function(item, index) {
                    checklistItems += `
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="check-item-${item.id}" data-item-id="${item.id}" required>
                                <label class="form-check-label" for="check-item-${item.id}">
                                    ${item.descricao}
                                </label>
                            </div>
                        </div>
                    `;
                });
            } else {
                checklistItems = '<p>Nenhum item de checklist encontrado.</p>';
            }
            
            const modal = `
                <div class="modal fade" id="checklistModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">Checklist de Finalização</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="checklist-form">
                                    ${checklistItems}
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-primary" id="complete-checklist">Finalizar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Adicionar modal ao body
            $('body').append(modal);
            
            // Exibir modal
            const checklistModal = new bootstrap.Modal(document.getElementById('checklistModal'));
            checklistModal.show();
            
            // Configurar evento para finalizar
            $('#complete-checklist').click(function() {
                const formValid = $('#checklist-form')[0].checkValidity();
                
                if (formValid) {
                    // Coletar respostas do checklist
                    const respostas = [];
                    
                    $('#checklist-form input[type="checkbox"]').each(function() {
                        respostas.push({
                            checklist_item_id: $(this).data('item-id'),
                            resposta: $(this).is(':checked') ? 'sim' : 'não'
                        });
                    });
                    
                    // Fechar modal
                    checklistModal.hide();
                    
                    // Finalizar apontamento com os dados do checklist
                    completeAppointment(respostas);
                    
                    // Remover modal do DOM
                    $('#checklistModal').on('hidden.bs.modal', function () {
                        $(this).remove();
                    });
                } else {
                    // Mostrar validação
                    $('#checklist-form').addClass('was-validated');
                }
            });
        },
        error: function(xhr) {
            console.error('Erro ao carregar checklist:', xhr);
            showAlert('danger', 'Erro ao carregar checklist. Tentando finalizar sem checklist...');
            
            // Tentar finalizar sem checklist
            completeAppointment();
        }
    });
}

// Funções para o cronômetro
function initTimer() {
    // Verificar se há algum apontamento em andamento
    $.ajax({
        url: '/api/apontamentos/active',
        type: 'GET',
        success: function(data) {
            if (data && data.id) {
                // Há um apontamento ativo
                currentAppointment = data;
                
                // Atualizar interface
                updateInterfaceForActiveAppointment();
                
                // Calcular tempo decorrido
                const startTime = new Date(data.data_inicio);
                const now = new Date();
                elapsedSeconds = Math.floor((now - startTime) / 1000);
                
                // Iniciar cronômetro
                startTimer();
                
                // Carregar lote e fase
                $('#batch-select').val(data.lote_id);
                loadBatchPhases(data.lote_id);
                
                // Mostrar informações do lote
                loadBatch(data.lote_id);
            }
        },
        error: function(xhr) {
            console.error('Erro ao verificar apontamentos ativos:', xhr);
        }
    });
}

function startTimer() {
    if (!timerInterval) {
        updateTimerDisplay();
        
        timerInterval = setInterval(function() {
            elapsedSeconds++;
            updateTimerDisplay();
        }, 1000);
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        elapsedSeconds = 0;
    }
}

function updateTimerDisplay() {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    const display = 
        (hours < 10 ? '0' + hours : hours) + ':' +
        (minutes < 10 ? '0' + minutes : minutes) + ':' +
        (seconds < 10 ? '0' + seconds : seconds);
    
    $('#timer-display').text(display);
}

// Funções para atualizar a interface
function updateInterfaceForActiveAppointment() {
    // Atualizar botões
    $('#start-btn').addClass('d-none');
    $('#finish-btn').removeClass('d-none');
    
    // Desabilitar seleção de lote e fase
    $('#batch-select, #phase-select').prop('disabled', true);
    
    // Mostrar cronômetro
    $('#timer-container').removeClass('d-none');
    
    // Mostrar informações do apontamento atual
    showCurrentAppointmentInfo();
}

function updateInterfaceForNoAppointment() {
    // Atualizar botões
    $('#start-btn').removeClass('d-none');
    $('#finish-btn').addClass('d-none');
    
    // Habilitar seleção de lote
    $('#batch-select').prop('disabled', false);
    
    // Ocultar cronômetro
    $('#timer-container').addClass('d-none');
    
    // Limpar informações do apontamento atual
    $('#current-appointment-info').addClass('d-none');
}

function showCurrentAppointmentInfo() {
    if (!currentAppointment) return;
    
    // Formatar hora de início
    const startTime = new Date(currentAppointment.data_inicio).toLocaleTimeString('pt-BR');
    
    const html = `
        <div class="alert alert-info">
            <h5><i class="fas fa-info-circle me-2"></i>Apontamento em Andamento</h5>
            <p><strong>Fase:</strong> ${currentAppointment.fase_descricao}</p>
            <p><strong>Iniciado às:</strong> ${startTime}</p>
            <p><strong>Tempo estimado:</strong> ${currentAppointment.tempo_estimado} min</p>
        </div>
    `;
    
    $('#current-appointment-info').html(html);
    $('#current-appointment-info').removeClass('d-none');
}

// Configuração de eventos
function setupEventHandlers() {
    // Evento para seleção de lote
    $('#batch-select').change(function() {
        const batchId = $(this).val();
        
        if (batchId) {
            loadBatchPhases(batchId);
            loadBatch(batchId);
        } else {
            // Limpar seleção de fase
            $('#phase-select').empty().prop('disabled', true);
            $('#phase-select').append('<option value="">Selecione uma fase</option>');
            
            // Ocultar informações do lote
            $('#batch-info').addClass('d-none');
        }
    });
    
    // Evento para botão de iniciar apontamento
    $('#start-btn').click(function() {
        const phaseId = $('#phase-select').val();
        
        if (!phaseId) {
            showAlert('warning', 'Selecione uma fase para iniciar o apontamento.');
            return;
        }
        
        startAppointment(phaseId);
    });
    
    // Evento para botão de finalizar apontamento
    $('#finish-btn').click(function() {
        finishAppointment();
    });
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
