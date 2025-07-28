document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando script.js');
    
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
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackComment = document.getElementById('feedback-comment');
    const feedbackCancel = document.getElementById('feedback-cancel');
    const feedbackSend = document.getElementById('feedback-send');

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

    function showFeedbackOverlay() {
        console.log('Exibindo overlay de feedback');
        feedbackOverlay.classList.remove('hidden');
        feedbackComment.focus();
    }

    function hideFeedbackOverlay() {
        console.log('Ocultando overlay de feedback');
        feedbackOverlay.classList.add('hidden');
        feedbackComment.value = '';
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
            document.getElementById('google-signin-button').addEventListener('click', () => {
                console.log('Botão de login Google clicado');
                tokenClient.requestAccessToken();
            });
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
            iniciarBot(dadosSalvos);
        } else {
            console.log('Nenhum usuário autenticado encontrado');
            localStorage.removeItem('dadosAtendenteChatbot');
            showOverlay();
        }
    }

    // ================== FUNÇÃO PRINCIPAL DO BOT ==================
    function iniciarBot(dadosAtendente) {
        console.log('Iniciando bot para:', dadosAtendente.email);

        // Abrir Gemini em nova aba
        document.getElementById('gemini-button').addEventListener('click', () => {
            console.log('Abrindo Gemini em nova aba');
            window.open('https://gemini.google.com/app?hl=pt-BR', '_blank');
        });

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
            const { sourceRow = null } = options;
            console.log('Adicionando mensagem:', { message, sender, sourceRow });
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container', sender);
            const avatarDiv = `<div class="avatar">${sender === 'user' ? '👤' : '🤖'}</div>`;
            const messageContentDiv = `<div class="message-content"><div class="message bot-msg">${message.replace(/\n/g, '<br>')}</div></div>`;
            messageContainer.innerHTML = sender === 'user' ? messageContentDiv + avatarDiv : avatarDiv + messageContentDiv;
            chatBox.appendChild(messageContainer);

            if (sender === 'bot' && sourceRow) {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.title = 'Copiar resposta';
                copyBtn.innerHTML = '📋';
                copyBtn.onclick = () => {
                    const textToCopy = messageContainer.querySelector('.message').textContent;
                    console.log('Botão de cópia clicado, texto:', textToCopy);
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
                messageContainer.querySelector('.message').appendChild(copyBtn);

                const feedbackContainer = document.createElement('div');
                feedbackContainer.className = 'feedback-container';
                const positiveBtn = document.createElement('button');
                positiveBtn.className = 'feedback-btn';
                positiveBtn.innerHTML = '👍';
                positiveBtn.title = 'Resposta útil';
                positiveBtn.onclick = () => enviarFeedbackPositivo(feedbackContainer);
                const negativeBtn = document.createElement('button');
                negativeBtn.className = 'feedback-btn';
                negativeBtn.innerHTML = '👎';
                negativeBtn.title = 'Resposta incorreta';
                negativeBtn.onclick = () => abrirFeedbackNegativo(feedbackContainer);
                feedbackContainer.appendChild(positiveBtn);
                feedbackContainer.appendChild(negativeBtn);
                messageContainer.querySelector('.message-content').appendChild(feedbackContainer);
            }
            console.log('Rolando chat para a última mensagem');
            setTimeout(() => {
                chatBox.scrollTop = chatBox.scrollHeight;
            }, 100);
        }

        // Enviar feedback positivo
        async function enviarFeedbackPositivo(container) {
            if (!ultimaPergunta) {
                console.warn('Nenhuma pergunta para feedback positivo');
                return;
            }
            console.log('Enviando feedback positivo:', ultimaPergunta);
            container.textContent = 'Obrigado!';
            container.className = 'feedback-thanks';

            try {
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'logFeedbackPositivo',
                        question: ultimaPergunta,
                        email: dadosAtendente.email
                    })
                });
                const data = await response.json();
                console.log('Resposta do feedback positivo:', data);
                if (data.status === 'feedback_positivo_recebido') {
                    addMessage('Feedback positivo registrado com sucesso!', 'bot');
                } else {
                    addMessage('Erro ao registrar feedback positivo: ' + data.mensagem, 'bot');
                }
            } catch (error) {
                console.error('Erro ao enviar feedback positivo:', error);
                addMessage('Erro ao enviar feedback positivo. Verifique sua conexão.', 'bot');
            }
        }

        // Abrir overlay de feedback negativo
        function abrirFeedbackNegativo(container) {
            console.log('Abrindo overlay de feedback negativo');
            showFeedbackOverlay();
            feedbackForm.onsubmit = async (e) => {
                e.preventDefault();
                const sugestao = feedbackComment.value.trim();
                if (!sugestao) {
                    console.warn('Sugestão vazia no feedback negativo');
                    alert('Por favor, insira uma sugestão.');
                    return;
                }
                console.log('Enviando feedback negativo:', { pergunta: ultimaPergunta, sugestao });
                container.textContent = 'Obrigado!';
                container.className = 'feedback-thanks';

                try {
                    const response = await fetch(BACKEND_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'logFeedbackNegativo',
                            question: ultimaPergunta,
                            sourceRow: ultimaLinhaDaFonte,
                            email: dadosAtendente.email,
                            sugestao: sugestao
                        })
                    });
                    const data = await response.json();
                    console.log('Resposta do feedback negativo:', data);
                    if (data.status === 'feedback_negativo_recebido') {
                        addMessage('Feedback negativo registrado com sucesso!', 'bot');
                    } else {
                        addMessage('Erro ao registrar feedback negativo: ' + data.mensagem, 'bot');
                    }
                } catch (error) {
                    console.error('Erro ao enviar feedback negativo:', error);
                    addMessage('Erro ao enviar feedback negativo. Verifique sua conexão.', 'bot');
                }
                hideFeedbackOverlay();
            };
        }

        // Fechar overlay de feedback negativo
        feedbackCancel.onclick = () => {
            console.log('Cancelando feedback negativo');
            hideFeedbackOverlay();
        };

        // Buscar resposta do backend
        async function buscarResposta(textoDaPergunta) {
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) {
                console.warn('Pergunta vazia, ignorando');
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
                addMessage('Erro de conexão. Verifique se a URL do backend está correta.', 'bot');
            }
        }

        // Enviar mensagem
        function handleSendMessage(text) {
            const trimmedText = text.trim();
            if (!trimmedText) {
                console.warn('Mensagem vazia, ignorando');
                return;
            }
            console.log('Enviando mensagem do usuário:', trimmedText);
            addMessage(trimmedText, 'user');
            buscarResposta(trimmedText);
            userInput.value = '';
        }

        // Listeners de eventos
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log('Tecla Enter pressionada');
                e.preventDefault();
                handleSendMessage(userInput.value);
            }
        });

        sendButton.addEventListener('click', () => {
            console.log('Botão de envio clicado');
            handleSendMessage(userInput.value);
        });

        document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li').forEach(item => {
            item.addEventListener('click', (e) => {
                const pergunta = e.currentTarget.getAttribute('data-question');
                console.log('Pergunta rápida clicada:', pergunta);
                handleSendMessage(pergunta);
            });
        });

        document.getElementById('expandable-faq-header').addEventListener('click', (e) => {
            console.log('Expandindo/recolhendo perguntas adicionais');
            e.currentTarget.classList.toggle('expanded');
            const moreQuestions = document.getElementById('more-questions');
            moreQuestions.classList.toggle('hidden', !e.currentTarget.classList.contains('expanded'));
        });

        themeSwitcher.addEventListener('click', () => {
            console.log('Alternando tema');
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
        });

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
    }

    // Inicia a aplicação
    console.log('Iniciando aplicação');
    initGoogleSignIn();
});
