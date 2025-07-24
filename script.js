document.addEventListener('DOMContentLoaded', () => {
    // Configurações
    const DOMINIO_PERMITIDO = "@velotax.com.br";
    const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzUkip3uXIbxEOwv-8G2uRUGhfUF-evG90uHf4Ibd8R8ZHm7q3ONqL5OhNCE7Lc1YBG/exec";
    const CLIENT_ID = '827325386401-ahi2f9ume9i7lc28lau7j4qlviv5d22k.apps.googleusercontent.com';

    // Elementos do DOM
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const appWrapper = document.querySelector('.app-wrapper');
    const errorMsg = document.getElementById('identificacao-error');

    let ultimaPergunta = '';
    let ultimaLinhaDaFonte = null;
    let isTyping = false;
    let dadosAtendente = null;
    let tokenClient = null;

    // Utiliza classes para esconder/mostrar overlay (evita inline style)
    function showOverlay() {
        identificacaoOverlay.classList.remove('hidden');
        appWrapper.classList.add('hidden');
    }
    function hideOverlay() {
        identificacaoOverlay.classList.add('hidden');
        appWrapper.classList.remove('hidden');
    }

    // Verifica se o script do Google Identity está carregado
    function waitForGoogleScript() {
        return new Promise((resolve, reject) => {
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (!script) {
                reject(new Error('Script Google Identity Services não encontrado no HTML.'));
                return;
            }
            if (window.google && window.google.accounts) {
                resolve(window.google.accounts);
                return;
            }
            script.addEventListener('load', () => {
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
        waitForGoogleScript().then(accounts => {
            tokenClient = accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'profile email',
                callback: handleGoogleSignIn
            });
            document.getElementById('google-signin-button').addEventListener('click', function() {
                tokenClient.requestAccessToken();
            });
            verificarIdentificacao();
        }).catch(error => {
            errorMsg.textContent = 'Erro ao carregar autenticação do Google. Verifique sua conexão ou tente novamente mais tarde.';
            errorMsg.style.display = 'block';
        });
    }

    function handleGoogleSignIn(response) {
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${response.access_token}`
            }
        })
        .then(res => res.json())
        .then(user => {
            const email = user.email;
            if (email.endsWith(DOMINIO_PERMITIDO)) {
                dadosAtendente = { nome: user.name, email: user.email, timestamp: Date.now() };
                localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
                hideOverlay();
                iniciarBot(dadosAtendente);
            } else {
                errorMsg.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
                errorMsg.style.display = 'block';
            }
        })
        .catch(error => {
            errorMsg.textContent = 'Erro ao verificar login. Tente novamente.';
            errorMsg.style.display = 'block';
        });
    }

    function verificarIdentificacao() {
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;
        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            if (dadosSalvosString) {
                dadosSalvos = JSON.parse(dadosSalvosString);
            }
        } catch (e) {
            localStorage.removeItem('dadosAtendenteChatbot');
        }
        if (dadosSalvos && dadosSalvos.email && dadosSalvos.email.endsWith(DOMINIO_PERMITIDO) && (Date.now() - dadosSalvos.timestamp < umDiaEmMs)) {
            hideOverlay();
            iniciarBot(dadosSalvos);
        } else {
            showOverlay();
        }
    }

    // Função principal do bot
    function iniciarBot(dadosAtendente) {
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        const questionSearch = document.getElementById('question-search');
        document.getElementById('gemini-button').addEventListener('click', function() {
    window.open('https://gemini.google.com/app?hl=pt-BR', '_blank');
});

        // Filtro de busca de perguntas
        questionSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const questions = document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li');
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
            if (typingIndicator) typingIndicator.remove();
        }

        // Função para copiar texto para a área de transferência
        async function copiarTextoParaClipboard(texto) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (err) {
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
                    document.body.removeChild(textArea);
                    return false;
                }
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
                await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: action,
                        question: ultimaPergunta,
                        sourceRow: ultimaLinhaDaFonte,
                        email: dadosAtendente.email
                    })
                });
            } catch (error) {
                // Silenciar erro de feedback
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
                hideTypingIndicator();
                if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
                const data = await response.json();
                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow;
                    addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow });
                } else {
                    addMessage(data.mensagem || "Ocorreu um erro ao processar sua pergunta.", 'bot');
                }
            } catch (error) {
                hideTypingIndicator();
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
        document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li').forEach(item => {
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

    initGoogleSignIn();
});
