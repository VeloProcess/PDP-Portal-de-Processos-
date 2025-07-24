document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const appWrapper = document.querySelector('.app-wrapper');
    const errorMsg = document.getElementById('identificacao-error');
    let auth2 = null;

    // Configurações
    const DOMINIO_PERMITIDO = "@velotax.com.br";
    const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx0u-3qCjA-sVmkOSPDJSf4R2OKRnLxAb0j_gPQ_RaNLN8DzrMj9ZgFQWsUe8diN2grFg/exec";
    const CLIENT_ID = '827325386401-ahi2f9ume9i7lc28lau7j4qlviv5d22k.apps.googleusercontent.com';

    // Função para carregar a biblioteca gapi.auth2
    function loadGoogleAuth() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                console.error('gapi não está definido. Verifique o carregamento do script https://apis.google.com/js/api:client.js');
                reject(new Error('Falha ao carregar gapi'));
                return;
            }
            gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: CLIENT_ID,
                    scope: 'profile email'
                }).then(() => {
                    auth2 = gapi.auth2.getAuthInstance();
                    console.log('Google Auth inicializado com sucesso');
                    resolve(auth2);
                }).catch(error => {
                    console.error('Erro ao inicializar gapi.auth2:', error);
                    reject(error);
                });
            });
        });
    }

    // Função para lidar com o login do Google
    function handleGoogleSignIn(googleUser) {
        try {
            const profile = googleUser.getBasicProfile();
            if (!profile) {
                throw new Error('Perfil do usuário não encontrado');
            }
            const nome = profile.getName();
            const email = profile.getEmail().toLowerCase();
            console.log('Google Sign-In - Nome:', nome, 'Email:', email);

            if (email && email.endsWith(DOMINIO_PERMITIDO)) {
                const dadosAtendente = { nome, email, timestamp: Date.now() };
                try {
                    localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
                    console.log('Dados salvos no localStorage:', dadosAtendente);
                    identificacaoOverlay.style.display = 'none';
                    appWrapper.style.visibility = 'visible';
                    errorMsg.style.display = 'none';
                    iniciarBot(dadosAtendente);
                } catch (e) {
                    console.error('Erro ao salvar dados no localStorage:', e);
                    errorMsg.textContent = 'Erro ao salvar dados. Tente novamente.';
                    errorMsg.style.display = 'block';
                }
            } else {
                errorMsg.textContent = 'Acesso permitido apenas para e-mails corporativos!';
                errorMsg.style.display = 'block';
                if (auth2) {
                    auth2.signOut();
                }
            }
        } catch (error) {
            console.error('Erro ao processar login do Google:', error);
            errorMsg.textContent = 'Erro ao processar login. Tente novamente.';
            errorMsg.style.display = 'block';
        }
    }

    // Função para verificar a sessão existente
    function verificarIdentificacao(auth2) {
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;

        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            console.log('Dados salvos no localStorage:', dadosSalvosString);
            if (dadosSalvosString) {
                dadosSalvos = JSON.parse(dadosSalvosString);
                console.log('Dados parsed:', dadosSalvos);
            }
        } catch (e) {
            console.error('Erro ao parsear dados do localStorage:', e);
            localStorage.removeItem('dadosAtendenteChatbot');
        }

        if (dadosSalvos && dadosSalvos.email && dadosSalvos.email.endsWith(DOMINIO_PERMITIDO) && (Date.now() - dadosSalvos.timestamp < umDiaEmMs)) {
            console.log('Sessão válida, exibindo app-wrapper');
            identificacaoOverlay.style.display = 'none';
            appWrapper.style.visibility = 'visible';
            iniciarBot(dadosSalvos);
        } else {
            console.log('Sessão inválida ou expirada, exibindo login');
            identificacaoOverlay.style.display = 'flex';
            appWrapper.style.visibility = 'hidden';
            if (auth2 && auth2.isSignedIn.get()) {
                auth2.signOut();
                console.log('Usuário desconectado devido a sessão inválida');
            }
        }
    }

    // Inicializar Google Sign-In
    function initGoogleSignIn() {
        loadGoogleAuth().then(authInstance => {
            auth2 = authInstance;
            const signInButton = document.getElementById('google-signin-button');
            signInButton.addEventListener('click', () => {
                auth2.signIn().then(googleUser => {
                    handleGoogleSignIn(googleUser);
                }).catch(error => {
                    console.error('Erro ao fazer login com Google:', error);
                    errorMsg.textContent = 'Erro ao fazer login com Google. Tente novamente.';
                    errorMsg.style.display = 'block';
                });
            });
            verificarIdentificacao(auth2);
        }).catch(error => {
            console.error('Erro ao carregar Google Auth:', error);
            errorMsg.textContent = 'Erro ao carregar autenticação do Google. Verifique sua conexão.';
            errorMsg.style.display = 'block';
        });
    }

    // Função principal do bot
    function iniciarBot(dadosAtendente) {
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        const questionSearch = document.getElementById('question-search');
        
        let ultimaPergunta = '';
        let ultimaLinhaDaFonte = null;
        let isTyping = false;

        // Função para copiar texto para a área de transferência
        async function copiarTextoParaClipboard(texto) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (err) {
                console.warn('Método moderno de cópia falhou, tentando fallback...', err);
                const textArea = document.createElement("textarea");
                textArea.value = texto;
                textArea.style.position = "fixed";
                textArea.style.top = "-9999px";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (fallbackErr) {
                    console.error('Falha total ao copiar com ambos os métodos:', fallbackErr);
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        }

        // Filtro de busca de perguntas
        questionSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const questions = document.querySelectorAll('#quick-questions-list li, #more-questions-list li');
            questions.forEach(question => {
                const text = question.textContent.toLowerCase();
                question.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });

        // Indicador de digitação
        function showTypingIndicator() {
            if (isTyping) return;
            isTyping = true;
            const typingContainer = document.createElement('div');
            typingContainer.className = 'message-container bot typing-indicator';
            typingContainer.id = 'typing-indicator';
            typingContainer.innerHTML = `
                <div class="avatar bot">🤖</div>
                <div class="message-content">
                    <div class="message">
                        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                    </div>
                </div>`;
            chatBox.appendChild(typingContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function hideTypingIndicator() {
            isTyping = false;
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // Adicionar mensagem ao chat
        function addMessage(message, sender, options = {}) {
            const { sourceRow = null } = options;
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container', sender);
            const avatarDiv = `<div class="avatar">${sender === 'user' ? '👤' : '🤖'}</div>`;
            const messageContentDiv = `
                <div class="message-content">
                    <div class="message">${message.replace(/\n/g, '<br>')}</div>
                </div>`;
            messageContainer.innerHTML = sender === 'user' ? messageContentDiv + avatarDiv : avatarDiv + messageContentDiv;
            chatBox.appendChild(messageContainer);

            if (sender === 'bot' && sourceRow) {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.title = 'Copiar resposta';
                copyBtn.innerHTML = '📋';
                copyBtn.onclick = () => {
                    const textToCopy = messageContainer.querySelector('.message').textContent;
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
                messageContainer.appendChild(copyBtn);

                const feedbackContainer = document.createElement('div');
                feedbackContainer.className = 'feedback-container';
                const positiveBtn = document.createElement('button');
                positiveBtn.className = 'feedback-btn';
                positiveBtn.innerHTML = '👍';
                positiveBtn.title = 'Resposta útil';
                positiveBtn.onclick = () => enviarFeedback('logFeedbackPositivo', feedbackContainer);
                const negativeBtn = document.createElement('button');
                negativeBtn.className = 'feedback-btn';
                negativeBtn.innerHTML = '👎';
                negativeBtn.title = 'Resposta incorreta';
                negativeBtn.onclick = () => enviarFeedback('logFeedbackNegativo', feedbackContainer);
                feedbackContainer.appendChild(positiveBtn);
                feedbackContainer.appendChild(negativeBtn);
                messageContainer.querySelector('.message-content').appendChild(feedbackContainer);
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Enviar feedback
        async function enviarFeedback(action, container) {
            if (!ultimaPergunta || !ultimaLinhaDaFonte) return;
            container.innerHTML = '<span style="font-size: 12px; color: var(--cor-texto-principal);">Obrigado!</span>';
            try {
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: action,
                        question: ultimaPergunta,
                        sourceRow: ultimaLinhaDaFonte,
                        email: dadosAtendente.email
                    })
                });
                console.log('Feedback enviado:', response.status);
            } catch (error) {
                console.error("Erro ao enviar feedback:", error);
            }
        }

        // Buscar resposta do backend
        async function buscarResposta(textoDaPergunta) {
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) return;
            showTypingIndicator();
            try {
                const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error(`Erro de rede: ${response.status}`);
                }
                const data = await response.json();
                hideTypingIndicator();
                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow;
                    addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow });
                } else {
                    addMessage(data.mensagem || "Ocorreu um erro ao processar sua pergunta.", 'bot');
                }
            } catch (error) {
                hideTypingIndicator();
                console.error("Erro ao buscar resposta:", error);
                addMessage("Erro de conexão. Verifique o console (F12) para mais detalhes.", 'bot');
            }
        }

        // Enviar mensagem
        function handleSendMessage(text) {
            const trimmedText = text.trim();
            if (!trimmedText) return;
            addMessage(trimmedText, 'user');
            buscarResposta(trimmedText);
            userInput.value = '';
        }

        // Listeners de eventos
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                handleSendMessage(userInput.value); 
            }
        });
        
        sendButton.addEventListener('click', () => handleSendMessage(userInput.value));
        
        document.querySelectorAll('#quick-questions-list li, #more-questions-list li').forEach(item => {
            item.addEventListener('click', (e) => handleSendMessage(e.currentTarget.getAttribute('data-question')));
        });

        document.getElementById('expandable-faq-header').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('expanded');
            document.getElementById('more-questions').style.display = e.currentTarget.classList.contains('expanded') ? 'block' : 'none';
        });

        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
        });

        // Configurar tema inicial
        function setInitialTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                body.classList.add('dark-theme');
                themeSwitcher.innerHTML = '🌙';
            } else {
                body.classList.remove('dark-theme');
                themeSwitcher.innerHTML = '☀️';
            }
        }

        // Mensagem de boas-vindas
        const primeiroNome = dadosAtendente.nome.split(' ')[0];
        addMessage(`Olá, ${primeiroNome}! Como posso te ajudar?`, 'bot');
        setInitialTheme();
    }

    // Iniciar Google Sign-In
    initGoogleSignIn();
});
