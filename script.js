document.addEventListener('DOMContentLoaded', () => {
    // ================== CONFIGURAÇÕES ==================
    const BACKEND_URL = "https://script.google.com/macros/s/AKfycby4dwlNQkwQzuNEmEsrlZVvbKfdcxE2RP2kUPxxiOgIThe-mP4ZIXLaPY_EZQ-mcq7Q/exec";
    const DOMINIO_PERMITIDO = "@velotax.com.br";
    const CLIENT_ID = '827325386401-ahi2f9ume9i7lc28lau7j4qlviv5d22k.apps.googleusercontent.com';

    // Respostas estáticas de fallback (usadas se o fetch falhar)
    const FALLBACK_RESPONSES = {
        "e-mail de procuração, o que dizer?": "Por favor, envie um e-mail formal com o modelo de procuração fornecido pela Velotax, incluindo os dados do cliente e a assinatura digital. Consulte a base de conhecimento interna para o modelo exato.",
        "quero fazer a exclusão da minha conta": "Para excluir sua conta, envie uma solicitação formal ao suporte da Velotax com seu CPF e motivo da exclusão. O processo será concluído em até 7 dias úteis.",
        "problema no login do app": "Tente redefinir sua senha no aplicativo. Se o problema persistir, entre em contato com o suporte técnico pelo e-mail suporte@velotax.com.br.",
        "informação sobre os valores da restituição": "Os valores da restituição dependem da sua declaração de IR. Consulte o status no app da Velotax ou entre em contato com o suporte financeiro.",
        "retenção da chave pix": "A retenção da chave PIX pode ocorrer por inconsistências cadastrais. Verifique seus dados no app e contate o suporte financeiro para regularização.",
        "juros": "Os juros aplicados seguem as regras da Receita Federal. Para detalhes, consulte a seção financeira da base de conhecimento interna.",
        "desconto proporcional": "O desconto proporcional é calculado com base no período de uso do serviço. Consulte o suporte financeiro para mais informações.",
        "qual o prazo para a restituição?": "O prazo para restituição é de até 60 dias após a aprovação da Receita Federal. Verifique o status no app.",
        "como fazer estorno?": "O estorno deve ser solicitado pelo cliente via e-mail ao suporte financeiro, com justificativa e comprovantes. O prazo é de 5 dias úteis.",
        "portabilidade": "A portabilidade pode ser solicitada no app da Velotax. Consulte o suporte técnico para orientações detalhadas.",
        "o que fazer se caí na malha fina?": "Se caiu na malha fina, regularize sua situação na Receita Federal. Consulte o suporte técnico da Velotax para orientações.",
        "como declarar investimentos?": "Declare seus investimentos no app da Velotax, na seção 'Investimentos'. Consulte a base de conhecimento para exemplos."
    };

    // ================== ELEMENTOS DO DOM ==================
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const appWrapper = document.querySelector('.app-wrapper');
    const errorMsg = document.getElementById('identificacao-error');

    // ================== VARIÁVEIS DE ESTADO ==================
    let ultimaPergunta = '';
    let ultimaLinhaDaFonte = null;
    let isTyping = false;
    let dadosAtendente = null;
    let tokenClient = null;

    // ================== FUNÇÕES DE CONTROLE DE UI ==================
    function showOverlay() {
        identificacaoOverlay.classList.remove('hidden');
        appWrapper.classList.add('hidden');
    }
    function hideOverlay() {
        identificacaoOverlay.classList.add('hidden');
        appWrapper.classList.remove('hidden');
    }

    // ================== LÓGICA DE AUTENTICAÇÃO ==================
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
            errorMsg.classList.remove('hidden');
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
            if (email && email.endsWith(DOMINIO_PERMITIDO)) {
                dadosAtendente = { nome: user.name, email: user.email, timestamp: Date.now() };
                localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
                hideOverlay();
                iniciarBot(dadosAtendente);
            } else {
                errorMsg.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
                errorMsg.classList.remove('hidden');
            }
        })
        .catch(error => {
            errorMsg.textContent = 'Erro ao verificar login. Tente novamente.';
            errorMsg.classList.remove('hidden');
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
            localStorage.removeItem('dadosAtendenteChatbot');
            showOverlay();
        }
    }

    // ================== FUNÇÃO PRINCIPAL DO BOT ==================
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

        questionSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const questions = document.querySelectorAll('#quick-questions-list li, #more-questions-list-financeiro li, #more-questions-list-tecnico li');
            questions.forEach(question => {
                const text = question.textContent.toLowerCase();
                question.classList.toggle('hidden', !text.includes(searchTerm));
            });
        });

        function showTypingIndicator() {
            if (isTyping) return;
            isTyping = true;
            const typingContainer = document.createElement('div');
            typingContainer.className = 'message-container bot typing-indicator';
            typingContainer.id = 'typing-indicator';
            typingContainer.innerHTML = `<div class="avatar bot">🤖</div><div class="message-content"><div class="message"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
            chatBox.appendChild(typingContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function hideTypingIndicator() {
            isTyping = false;
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) typingIndicator.remove();
        }

        async function copiarTextoParaClipboard(texto) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (err) {
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
                    return false;
                }
            }
        }

        function addMessage(message, sender, options = {}) {
            const { sourceRow = null } = options;
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container', sender);
            const avatarDiv = `<div class="avatar">${sender === 'user' ? '👤' : '🤖'}</div>`;
            const messageContentDiv = `<div class="message-content"><div class="message">${message.replace(/\n/g, '<br>')}</div></div>`;
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

        async function enviarFeedback(action, container) {
            if (!ultimaPergunta || !ultimaLinhaDaFonte) return;
            container.textContent = 'Obrigado!';
            container.className = 'feedback-thanks';

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
                console.error("Erro ao enviar feedback:", error);
            }
        }

        async function buscarResposta(textoDaPergunta) {
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) return;
            showTypingIndicator();

            // Tenta usar o backend
            try {
                const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                console.log("Tentando fetch para:", url); // Log para debug
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                hideTypingIndicator();
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }
                const data = await response.json();
                
                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow;
                    addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow });
                } else {
                    throw new Error(data.mensagem || "Erro ao processar a pergunta no backend.");
                }
            } catch (error) {
                console.error("Erro ao conectar ao backend:", error, "URL:", url);
                hideTypingIndicator();

                // Fallback para respostas estáticas
                const normalizedQuestion = textoDaPergunta.toLowerCase().trim();
                const fallbackResponse = FALLBACK_RESPONSES[normalizedQuestion] || 
                    "Desculpe, não consegui conectar ao servidor. Tente novamente ou consulte a base de conhecimento interna.";
                addMessage(fallbackResponse, 'bot', { sourceRow: null });
            }
        }

        function handleSendMessage(text) {
            const trimmedText = text.trim();
            if (!trimmedText) return;
            addMessage(trimmedText, 'user');
            buscarResposta(trimmedText);
            userInput.value = '';
        }

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
            const moreQuestions = document.getElementById('more-questions');
            moreQuestions.classList.toggle('hidden', !e.currentTarget.classList.contains('expanded'));
        });
        
        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
        });

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

        const primeiroNome = dadosAtendente.nome.split(' ')[0];
        addMessage(`Olá, ${primeiroNome}! Como posso te ajudar hoje?`, 'bot');
        setInitialTheme();
    }

    initGoogleSignIn();
});
