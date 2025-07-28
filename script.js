document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando script.js às 01:41 PM -03, 28/07/2025');
    
    // ================== CONFIGURAÇÕES ==================
    const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwIjm6GehKDPlMQTAkIpUkGBeQbQogwYKeJ7VPfX93Fso6MWvmy_b7y68qzVVw9DhRG/exec";
    const DOMINIO_PERMITIDO = "@velotax.com.br";
    const CLIENT_ID = '827325386401-ahi2f9ume9i7lc28lau7j4qlviv5d22k.apps.googleusercontent.com';

    // ================== ELEMENTOS DO DOM ==================
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const appWrapper = document.querySelector('.app-wrapper');
    const errorMsg = document.getElementById('identificacao-error');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeSwitcher = document.getElementById('theme-switcher');
    const questionSearch = document.getElementById('question-search');

    // Verificar existência dos elementos
    if (!chatBox || !userInput || !sendButton || !identificacaoOverlay || !appWrapper) {
        console.error('Elementos DOM essenciais não encontrados:', { chatBox, userInput, sendButton, identificacaoOverlay, appWrapper });
        alert('Erro: Elementos da interface não encontrados. Verifique o HTML.');
        return;
    }

    // ================== VARIÁVEIS DE ESTADO ==================
    let ultimaPergunta = '';
    let ultimaLinhaDaFonte = null;
    let isTyping = false;
    let dadosAtendente = null;
    let tokenClient = null;
    let lastMessageTimestamp = 0; // Controle de duplicação por tempo
    let isSendingMessage = false; // Controle para debounce de mensagens do usuário
    let isBotInitialized = false; // Controle para inicialização única do bot
    let lastBotMessage = ''; // Controle para mensagens do bot

    // ================== FUNÇÕES DE CONTROLE DE UI ==================
    function showOverlay() {
        console.log('Exibindo overlay de identificação');
        identificacaoOverlay.classList.remove('hidden');
        appWrapper.classList.add('hidden');
    }

    function hideOverlay() {
        console.log('Ocultando overlay de identificação');
        identificacaoOverlay.classList.add('hidden');
        appWrapper.classList.remove('hidden');
    }

    // ================== LÓGICA DE AUTENTICAÇÃO ==================
    function waitForGoogleScript() {
        console.log('Aguardando carregamento do Google Identity Services');
        return new Promise((resolve, reject) => {
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (!script) {
                reject(new Error('Script Google Identity Services não encontrado.'));
                return;
            }
            if (window.google && window.google.accounts) {
                resolve(window.google.accounts);
                return;
            }
            script.addEventListener('load', () => {
                console.log('Script Google Identity Services carregado');
                if (window.google && window.google.accounts) {
                    resolve(window.google.accounts);
                } else {
                    reject(new Error('Falha ao carregar Google Identity Services.'));
                }
            });
            script.addEventListener('error', () => {
                reject(new Error('Erro ao carregar o script Google Identity Services.'));
            });
        });
    }

    function initGoogleSignIn() {
        console.log('Inicializando Google Sign-In');
        waitForGoogleScript().then(accounts => {
            tokenClient = accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'profile email',
                callback: handleGoogleSignIn
            });
            const signinButton = document.getElementById('google-signin-button');
            if (signinButton) {
                signinButton.addEventListener('click', () => {
                    console.log('Botão de login Google clicado');
                    tokenClient.requestAccessToken();
                });
            }
            verificarIdentificacao();
        }).catch(error => {
            console.error('Erro ao inicializar Google Sign-In:', error);
            errorMsg.textContent = 'Erro ao carregar autenticação do Google. Verifique sua conexão ou tente novamente.';
            errorMsg.classList.remove('hidden');
        });
    }

    function handleGoogleSignIn(response) {
        console.log('Processando resposta do Google Sign-In');
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${response.access_token}`
            }
        })
        .then(res => res.json())
        .then(user => {
            const email = user.email;
            console.log('Dados do usuário recebidos:', { email, name: user.name });
            if (email && email.endsWith(DOMINIO_PERMITIDO)) {
                dadosAtendente = { nome: user.name, email: user.email, timestamp: Date.now() };
                localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
                hideOverlay();
                iniciarBot(dadosAtendente);
            } else {
                console.error('E-mail não permitido:', email);
                errorMsg.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
                errorMsg.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Erro ao verificar login:', error);
            errorMsg.textContent = 'Erro ao verificar login. Tente novamente.';
            errorMsg.classList.remove('hidden');
        });
    }

    function verificarIdentificacao() {
        console.log('Verificando identificação do usuário');
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;
        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            if (dadosSalvosString) {
                dadosSalvos = JSON.parse(dadosSalvosString);
            }
        } catch (e) {
            console.error('Erro ao ler localStorage:', e);
            localStorage.removeItem('dadosAtendenteChatbot');
        }
        if (dadosSalvos && dadosSalvos.email && dadosSalvos.email.endsWith(DOMINIO_PERMITIDO) && (Date.now() - dadosSalvos.timestamp < umDiaEmMs)) {
            console.log('Usuário já autenticado:', dadosSalvos.email);
            hideOverlay();
            if (!isBotInitialized) {
                iniciarBot(dadosSalvos);
            }
        } else {
            console.log('Nenhum usuário autenticado encontrado');
            localStorage.removeItem('dadosAtendenteChatbot');
            showOverlay();
        }
    }

    // ================== FUNÇÃO PRINCIPAL DO BOT ==================
    function iniciarBot(dadosAtendente) {
        if (isBotInitialized) {
            console.warn('Bot já inicializado, ignorando nova inicialização');
            return;
        }
        isBotInitialized = true;
        console.log('Iniciando bot para:', dadosAtendente.email);

        // Abrir Gemini em nova aba
        const geminiButton = document.getElementById('gemini-button');
        if (geminiButton) {
            geminiButton.addEventListener('click', () => {
                console.log('Abrindo Gemini em nova aba');
                window.open('https://gemini.google.com/app?hl=pt-BR', '_blank');
            });
        }

        // Filtro de busca de perguntas
        questionSearch.addEventListener('input', (e) => {
            console.log('Filtrando perguntas:', e.target.value);
            const searchTerm = e.target.value.toLowerCase();
            const questions = document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li');
            questions.forEach(question => {
                const text = question.textContent.toLowerCase();
                question.classList.toggle('hidden', !text.includes(searchTerm));
            });
        });

        // Indicador de digitação
        function showTypingIndicator() {
            if (isTyping) return;
            isTyping = true;
            console.log('Exibindo indicador de digitação');
            const typingContainer = document.createElement('div');
            typingContainer.className = 'message-container bot typing-indicator';
            typingContainer.id = 'typing-indicator';
            typingContainer.innerHTML = `<div class="avatar bot">🤖</div><div class="message-content"><div class="message"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
            chatBox.appendChild(typingContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function hideTypingIndicator() {
            isTyping = false;
            console.log('Ocultando indicador de digitação');
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) typingIndicator.remove();
        }

        // Função para copiar texto para a área de transferência
        async function copiarTextoParaClipboard(texto) {
            console.log('Copiando texto:', texto);
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (err) {
                console.warn('Falha no navigator.clipboard, tentando fallback:', err);
                const textArea = document.createElement("textarea");
                textArea.value = texto;
                textArea.className = 'clipboard-helper';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return true;
                } catch (fallbackErr) {
                    document.body.removeChild(textArea);
                    console.error('Erro no fallback de cópia:', fallbackErr);
                    return false;
                }
            }
        }

        // Adicionar mensagem ao chat
        function addMessage(message, sender, options = {}) {
            const currentTime = Date.now();
            // Evita mensagens duplicadas
            if (sender === 'bot' && lastBotMessage === message && (currentTime - lastMessageTimestamp < 1000)) {
                console.warn('Mensagem do bot duplicada ignorada:', { message, timeDiff: currentTime - lastMessageTimestamp });
                return;
            }
            const lastMessage = chatBox.querySelector('.message-container:last-child .message')?.textContent;
            const lastSender = chatBox.querySelector('.message-container:last-child')?.classList.contains(sender);
            if (lastMessage === message && lastSender && (currentTime - lastMessageTimestamp < 500)) {
                console.warn('Mensagem duplicada ignorada:', { message, sender, timeDiff: currentTime - lastMessageTimestamp });
                return;
            }
            lastMessageTimestamp = currentTime;
            if (sender === 'bot') {
                lastBotMessage = message;
            }

            const messageContainer = document.createElement('div');
            messageContainer.className = `message-container ${sender}`;
            const avatar = document.createElement('span');
            avatar.className = `avatar ${sender}`;
            avatar.textContent = sender === 'user' ? '👤' : '🤖';
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.textContent = message;
            messageContent.appendChild(messageElement);

            if (sender === 'bot' && !options.isTyping && !options.isFeedback) {
                const feedbackContainer = document.createElement('div');
                feedbackContainer.className = 'feedback-container';
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.innerHTML = '📋';
                copyBtn.onclick = () => {
                    const textToCopy = messageElement.textContent;
                    console.log('Copiando texto:', textToCopy);
                    copiarTextoParaClipboard(textToCopy).then(success => {
                        if (success) {
                            copyBtn.innerHTML = '✅';
                            copyBtn.classList.add('copied');
                            setTimeout(() => {
                                copyBtn.innerHTML = '📋';
                                copyBtn.classList.remove('copied');
                            }, 2000);
                        } else {
                            alert('Não foi possível copiar o texto.');
                        }
                    });
                };
                const positiveFeedback = document.createElement('button');
                positiveFeedback.className = 'feedback-btn positive emoji-icon';
                positiveFeedback.innerHTML = '👍';
                positiveFeedback.onclick = () => {
                    console.log('Feedback positivo registrado');
                    feedbackContainer.textContent = 'Obrigado!';
                    feedbackContainer.className = 'feedback-thanks';
                    enviarFeedback('positivo', feedbackContainer);
                };
                const negativeFeedback = document.createElement('button');
                negativeFeedback.className = 'feedback-btn negative emoji-icon';
                negativeFeedback.innerHTML = '👎';
                negativeFeedback.onclick = () => {
                    console.log('Abrindo formulário de feedback negativo');
                    abrirFeedbackNegativo(feedbackContainer);
                };
                feedbackContainer.append(copyBtn, positiveFeedback, negativeFeedback);
                messageContent.appendChild(feedbackContainer);
            }

            messageContainer.append(avatar, messageContent);
            chatBox.appendChild(messageContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Enviar feedback
        async function enviarFeedback(tipo, container) {
            if (!ultimaPergunta || !dadosAtendente || !dadosAtendente.email) {
                console.error('Dados necessários para feedback ausentes:', { ultimaPergunta, dadosAtendente });
                addMessage('Erro: Não foi possível enviar o feedback. Tente novamente após enviar uma pergunta.', 'bot');
                return;
            }
            console.log(`Enviando feedback ${tipo}:`, { pergunta: ultimaPergunta, sourceRow: ultimaLinhaDaFonte });
            try {
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    mode: 'cors',
                    credentials: 'omit',
                    body: JSON.stringify({
                        action: tipo === 'positivo' ? 'logFeedbackPositivo' : 'logFeedbackNegativo',
                        question: ultimaPergunta,
                        sourceRow: ultimaLinhaDaFonte,
                        email: dadosAtendente.email,
                        sugestao: tipo === 'negativo' ? container.querySelector('.feedback-comment')?.value : undefined
                    })
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro HTTP: ${response.status} ${response.statusText} - ${errorText}`);
                }
                const data = await response.json();
                console.log(`Resposta do feedback ${tipo}:`, data);
                if (data.status === `feedback_${tipo}_recebido`) {
                    addMessage(`Feedback ${tipo} registrado com sucesso!`, 'bot');
                } else {
                    console.error(`Resposta inválida do backend para feedback ${tipo}:`, data);
                    addMessage(`Erro ao registrar feedback ${tipo}: ${data.mensagem || 'Resposta inválida do servidor'}`, 'bot');
                }
            } catch (error) {
                console.error(`Erro ao enviar feedback ${tipo}:`, error);
                addMessage(`Erro ao enviar feedback ${tipo}: ${error.message}. Verifique sua conexão.`, 'bot');
            }
        }

        // Abrir formulário de feedback negativo no chat
        function abrirFeedbackNegativo(container) {
            if (!ultimaPergunta || !dadosAtendente || !dadosAtendente.email) {
                console.error('Dados necessários para feedback ausentes:', { ultimaPergunta, dadosAtendente });
                addMessage('Erro: Não foi possível enviar o feedback. Tente novamente após enviar uma pergunta.', 'bot');
                return;
            }

            // Remove formulário existente
            const existingForm = document.querySelector('.feedback-form-container');
            if (existingForm) {
                console.warn('Formulário de feedback já existe, removendo o anterior');
                existingForm.remove();
            }

            console.log('Adicionando formulário de feedback no chat');
            const feedbackFormHtml = `
                <div class="feedback-form-container">
                    <div class="feedback-form">
                        <h3>Feedback</h3>
                        <textarea class="feedback-comment" placeholder="Digite sua sugestão" rows="4"></textarea>
                        <div class="feedback-button-container">
                            <button type="button" class="feedback-cancel">Cancelar</button>
                            <button type="submit" class="feedback-send">Enviar Feedback</button>
                        </div>
                    </div>
                </div>
            `;
            const feedbackContainer = document.createElement('div');
            feedbackContainer.innerHTML = feedbackFormHtml;
            chatBox.appendChild(feedbackContainer);
            chatBox.scrollTop = chatBox.scrollHeight;

            const feedbackForm = feedbackContainer.querySelector('.feedback-form');
            const feedbackComment = feedbackContainer.querySelector('.feedback-comment');
            const feedbackCancel = feedbackContainer.querySelector('.feedback-cancel');
            const feedbackSend = feedbackContainer.querySelector('.feedback-send');

            feedbackForm.onsubmit = async (e) => {
                e.preventDefault();
                const sugestao = feedbackComment.value.trim();
                if (!sugestao) {
                    console.warn('Sugestão vazia no feedback negativo');
                    alert('Por favor, insira uma sugestão.');
                    return;
                }
                console.log('Enviando feedback negativo:', { pergunta: ultimaPergunta, sourceRow: ultimaLinhaDaFonte, email: dadosAtendente.email, sugestao });
                container.textContent = 'Obrigado!';
                container.className = 'feedback-thanks';
                await enviarFeedback('negativo', feedbackContainer);
                feedbackContainer.remove();
            };

            feedbackCancel.onclick = () => {
                console.log('Cancelando feedback negativo');
                feedbackContainer.remove();
            };
        }

        // Buscar resposta do backend
        let isFetchingResponse = false; // Controle para evitar múltiplas requisições
        async function buscarResposta(textoDaPergunta) {
            if (isFetchingResponse) {
                console.warn('Requisição de resposta em andamento, ignorando');
                return;
            }
            isFetchingResponse = true;
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) {
                console.warn('Pergunta vazia, ignorando');
                isFetchingResponse = false;
                return;
            }
            console.log('Buscando resposta para:', textoDaPergunta);
            showTypingIndicator();
            try {
                const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                const response = await fetch(url);
                hideTypingIndicator();
                if (!response.ok) {
                    throw new Error(`Erro de rede: ${response.status}`);
                }
                const data = await response.json();
                console.log('Resposta do backend:', data);
                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow;
                    addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow });
                } else {
                    addMessage(data.mensagem || 'Ocorreu um erro ao processar sua pergunta.', 'bot');
                }
            } catch (error) {
                console.error('Erro ao buscar resposta:', error);
                hideTypingIndicator();
                addMessage('Erro de conexão. Verifique sua conexão ou a URL do backend.', 'bot');
            } finally {
                isFetchingResponse = false;
            }
        }

        // Enviar mensagem com debounce
        function handleSendMessage(text) {
            if (isSendingMessage) {
                console.warn('Envio de mensagem em andamento, ignorando');
                return;
            }
            isSendingMessage = true;
            const trimmedText = text.trim();
            if (!trimmedText) {
                console.warn('Mensagem vazia, ignorando');
                isSendingMessage = false;
                return;
            }
            console.log('Enviando mensagem do usuário:', trimmedText);
            addMessage(trimmedText, 'user');
            buscarResposta(trimmedText);
            userInput.value = '';
            setTimeout(() => {
                isSendingMessage = false;
            }, 500); // Debounce de 500ms
        }

        // Configurar eventos apenas uma vez
        function configurarEventos() {
            // Remove listeners anteriores clonando elementos
            const newSendButton = sendButton.cloneNode(true);
            sendButton.parentNode.replaceChild(newSendButton, sendButton);
            sendButton = newSendButton;

            const newUserInput = userInput.cloneNode(true);
            userInput.parentNode.replaceChild(newUserInput, userInput);
            userInput = newUserInput;

            // Adiciona novos listeners
            sendButton.addEventListener('click', () => {
                console.log('Botão de envio clicado');
                handleSendMessage(userInput.value);
            });

            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log('Tecla Enter pressionada');
                    e.preventDefault();
                    handleSendMessage(userInput.value);
                }
            });

            // Perguntas rápidas
            document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li').forEach(item => {
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                newItem.addEventListener('click', (e) => {
                    const pergunta = e.currentTarget.getAttribute('data-question');
                    console.log('Pergunta rápida clicada:', pergunta);
                    handleSendMessage(pergunta);
                });
            });

            // Expandir/recolher FAQ
            const expandableFaqHeader = document.getElementById('expandable-faq-header');
            if (expandableFaqHeader) {
                const newHeader = expandableFaqHeader.cloneNode(true);
                expandableFaqHeader.parentNode.replaceChild(newHeader, expandableFaqHeader);
                newHeader.addEventListener('click', (e) => {
                    console.log('Expandindo/recolhendo perguntas adicionais');
                    e.currentTarget.classList.toggle('expanded');
                    const moreQuestions = document.getElementById('more-questions');
                    moreQuestions.classList.toggle('hidden', !e.currentTarget.classList.contains('expanded'));
                });
            }

            // Alternar tema
            themeSwitcher.addEventListener('click', () => {
                console.log('Alternando tema');
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
            });
        }

        // Configurar tema inicial
        function setInitialTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
                themeSwitcher.innerHTML = '🌙';
            } else {
                document.body.classList.remove('dark-theme');
                themeSwitcher.innerHTML = '☀️';
            }
            console.log('Tema inicial configurado:', savedTheme || 'light');
        }

        // Mensagem de boas-vindas
        const primeiroNome = dadosAtendente.nome.split(' ')[0];
        console.log('Exibindo mensagem de boas-vindas para:', primeiroNome);
        addMessage(`Olá, ${primeiroNome}! Como posso te ajudar hoje?`, 'bot');
        setInitialTheme();
        configurarEventos();
    }

    // Inicia a aplicação
    console.log('Iniciando aplicação');
    initGoogleSignIn();
});
