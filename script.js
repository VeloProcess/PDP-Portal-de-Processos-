document.addEventListener('DOMContentLoaded', () => {
    // ================== CONFIGURAÇÕES ==================
    const BACKEND_URL = "https://script.google.com/macros/s/AKfycbw8n95lQr5-RbxG9qYG7O_3ZEOVkVQ3K50C3iFM9JViLyEsa8hiDuRuCzlgy_YPoI43/exec";
    const DOMINIO_PERMITIDO = "@velotax.com.br";

    // ================== ELEMENTOS DO DOM ==================
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const identificacaoForm = document.getElementById('identificacao-form');
    const appWrapper = document.querySelector('.app-wrapper');

    // ================== VARIÁVEIS DE ESTADO ==================
    let ultimaPergunta = '';
    let ultimaResposta = '';
    let ultimaLinhaDaFonte = null;
    let isTyping = false;

    // ================== LÓGICA DE AUTENTICAÇÃO ==================
    function verificarIdentificacao() {
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;
        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            if (dadosSalvosString) dadosSalvos = JSON.parse(dadosSalvosString);
        } catch (e) {
            localStorage.removeItem('dadosAtendenteChatbot');
        }

        if (!dadosSalvos || (Date.now() - dadosSalvos.timestamp > umDiaEmMs) || !dadosSalvos.email.endsWith(DOMINIO_PERMITIDO)) {
            identificacaoOverlay.style.display = 'flex';
            appWrapper.style.visibility = 'hidden';
        } else {
            identificacaoOverlay.style.display = 'none';
            appWrapper.style.visibility = 'visible';
            iniciarBot(dadosSalvos);
        }
    }

    identificacaoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const nome = document.getElementById('nome-input').value.trim();
        const email = document.getElementById('email-input').value.trim().toLowerCase();
        const errorMsg = document.getElementById('identificacao-error');

        if (nome && email && email.endsWith(DOMINIO_PERMITIDO)) {
            const dadosAtendente = { nome, email, timestamp: Date.now() };
            localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
            identificacaoOverlay.style.display = 'none';
            appWrapper.style.visibility = 'visible';
            iniciarBot(dadosAtendente);
        } else {
            errorMsg.style.display = 'block';
        }
    });

    // ================== FUNÇÃO PRINCIPAL DO BOT ==================
    function iniciarBot(dadosAtendente) {
        // Elementos do DOM do bot
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        const questionSearch = document.getElementById('question-search');
        const expandableHeader = document.getElementById('expandable-faq-header');
        const moreQuestions = document.getElementById('more-questions');
        const allQuestionItems = document.querySelectorAll('#quick-questions-list li, #more-questions-list li');

        // --- FUNÇÕES AUXILIARES ---

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
        
        async function copiarTextoParaClipboard(texto) {
             try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (err) {
                const textArea = document.createElement("textarea");
                textArea.value = texto;
                textArea.style.position = "fixed"; 
                textArea.style.opacity = "0";
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
                ultimaLinhaDaFonte = sourceRow;
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
            container.innerHTML = `<span style="font-size: 12px; color: var(--cor-texto-secundario);">Obrigado!</span>`;
            try {
                await fetch(BACKEND_URL, {
                    method: 'POST',
                    mode: 'no-cors',
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
            if (!textoDaPergunta.trim()) return;
            showTypingIndicator();
            try {
                const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
                const data = await response.json();
                hideTypingIndicator();
                
                if (data.status === 'sucesso') {
                    addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow });
                } else {
                    addMessage(data.mensagem || "Ocorreu um erro.", 'bot');
                }
            } catch (error) {
                hideTypingIndicator();
                addMessage("Erro de conexão. Verifique o console (F12).", 'bot');
                console.error("Detalhes do erro de fetch:", error);
 }
        }

        function handleSendMessage(text) {
            const trimmedText = text.trim();
            if (!trimmedText) return;
            addMessage(trimmedText, 'user');
            buscarResposta(trimmedText);
            userInput.value = '';
        }
        
        // --- INICIALIZAÇÃO E EVENT LISTENERS ---
        
        // Listeners para envio de mensagem
        sendButton.addEventListener('click', () => handleSendMessage(userInput.value));
        userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(userInput.value); } });
        
        // Listener para todas as listas de perguntas
        allQuestionItems.forEach(item => {
            item.addEventListener('click', (e) => handleSendMessage(e.currentTarget.getAttribute('data-question')));
        });
        
        // Listener para a busca na sidebar
        questionSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            allQuestionItems.forEach(question => {
                const text = question.textContent.toLowerCase();
                question.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });

        // ================== CÓDIGO CORRIGIDO PARA O BOTÃO "OUTRAS PERGUNTAS" ==================
        expandableHeader.addEventListener('click', () => {
            const arrow = expandableHeader.querySelector('.arrow');
            const isExpanded = moreQuestions.style.display === 'block';

            if (isExpanded) {
                moreQuestions.style.display = 'none';
                arrow.classList.remove('expanded');
            } else {
                moreQuestions.style.display = 'block';
                arrow.classList.add('expanded');
            }
        });
        // =================================================================================

        // Lógica do Tema
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
        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
        });

        // Saudação inicial e tema
        const primeiroNome = dadosAtendente.nome.split(' ')[0];
        const hora = new Date().getHours();
        let saudacao = (hora >= 5 && hora < 12) ? 'Bom dia' : (hora >= 12 && hora < 18) ? 'Boa tarde' : 'Boa noite';
        addMessage(`${saudacao}, ${primeiroNome}! Como posso te ajudar?`, 'bot');
        setInitialTheme();
    }
    
    verificarIdentificacao();
});
