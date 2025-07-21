document.addEventListener('DOMContentLoaded', () => {
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const identificacaoForm = document.getElementById('identificacao-form');
    const appWrapper = document.querySelector('.app-wrapper');

    function verificarIdentificacao() {
        const DOMINIO_PERMITIDO = "@velotax.com.br";
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
        const DOMINIO_PERMITIDO = "@velotax.com.br";
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

    function verificarAlertasCriticos() {
        const alertOverlay = document.getElementById('alert-overlay');
        const alertContent = document.getElementById('alert-content');
        const alertCloseBtn = document.getElementById('alert-close-btn');
        const criticalAlertItem = document.querySelector('.news-item.critical-alert');
        if (criticalAlertItem) {
            const alertHtml = criticalAlertItem.innerHTML;
            const foiVisto = sessionStorage.getItem('alertaVisto');
            if (foiVisto !== alertHtml) {
                alertContent.innerHTML = alertHtml;
                alertOverlay.classList.remove('hidden');
            }
            alertCloseBtn.onclick = () => {
                alertOverlay.classList.add('hidden');
                sessionStorage.setItem('alertaVisto', alertHtml);
            };
        }
    }

    function iniciarBot(dadosAtendente) {
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        let ultimaPergunta = '';
        let ultimaLinhaDaFonte = null;

        // Substitua com a URL mais recente da sua implantação do Apps Script
        const CHAT_API_URL = "https://script.google.com/macros/s/AKfycbzo0z6SUHZMzwtP3TSeUzNHVzTNyeJgqWY3c5qzoRJbzSj_omx7GuIKIzZ4cTsVWyYuwA/exec";

        function toggleLoader(show) {
            const existingLoader = document.getElementById('loader');
            if (show && !existingLoader) {
                const loaderElement = document.createElement('div');
                loaderElement.id = 'loader';
                loaderElement.classList.add('loader-container');
                loaderElement.innerHTML = `<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
                chatBox.appendChild(loaderElement);
                chatBox.scrollTop = chatBox.scrollHeight;
            } else if (!show && existingLoader) {
                existingLoader.remove();
            }
        }

        function addMessage(message, sender, options = {}) {
            const { imageUrls = [], sourceRow = null } = options;
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');

            const textElement = document.createElement('div');
            if (message) {
                textElement.innerHTML = message.replace(/\n/g, '<br>');
            }
            messageContainer.appendChild(textElement);

            if (sender === 'bot' && Array.isArray(imageUrls) && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    if (url) {
                        const imageElement = document.createElement('img');
                        imageElement.src = url;
                        imageElement.alt = "Imagem de suporte";
                        messageContainer.appendChild(imageElement);
                    }
                });
            }

            if (sender === 'bot' && message && !message.includes("assistente de atendimento") && !message.includes("Você também pode ter interesse em:")) {
                const copyBtn = document.createElement('button');
                copyBtn.classList.add('copy-btn');
                copyBtn.innerHTML = '📋';
                copyBtn.title = 'Copiar resposta';
                messageContainer.style.paddingRight = '40px';
                copyBtn.onclick = () => {
                    const textToCopy = textElement.textContent.trim();
                    const textArea = document.createElement("textarea");
                    textArea.value = textToCopy;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        copyBtn.innerHTML = '✅';
                        setTimeout(() => { copyBtn.innerHTML = '📋'; }, 2000);
                    } catch (err) {
                        console.error('Falha ao copiar texto: ', err);
                    }
                    document.body.removeChild(textArea);
                };
                messageContainer.appendChild(copyBtn);

                if (sourceRow) {
                    const feedbackContainer = document.createElement('div');
                    feedbackContainer.className = 'feedback-container';

                    const positiveBtn = document.createElement('button');
                    positiveBtn.className = 'feedback-btn';
                    positiveBtn.innerHTML = '👍';
                    positiveBtn.title = 'Resposta útil';
                    positiveBtn.onclick = () => {
                        enviarFeedback('logFeedbackPositivo', feedbackContainer);
                    };

                    const negativeBtn = document.createElement('button');
                    negativeBtn.className = 'feedback-btn';
                    negativeBtn.innerHTML = '👎';
                    negativeBtn.title = 'Resposta incorreta';
                    negativeBtn.onclick = () => {
                        enviarFeedback('logFeedbackNegativo', feedbackContainer);
                    };

                    feedbackContainer.appendChild(positiveBtn);
                    feedbackContainer.appendChild(negativeBtn);
                    messageContainer.appendChild(feedbackContainer);
                }
            }

            chatBox.appendChild(messageContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        async function enviarFeedback(action, container) {
            if (!ultimaPergunta || !ultimaLinhaDaFonte) return;

            container.innerHTML = '<span style="font-size: 12px; color: #888;">Obrigado!</span>';

            try {
                await fetch(CHAT_API_URL, {
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

        function criarBotoesDeSugestao(sugestoes) {
            if (!sugestoes || sugestoes.length === 0) return;

            const container = document.createElement('div');
            container.className = 'suggestion-buttons-container';
            sugestoes.forEach(sugestao => {
                const button = document.createElement('button');
                button.className = 'suggestion-btn';
                button.innerText = sugestao;
                button.onclick = () => handleSendMessage(sugestao);
                container.appendChild(button);
            });
            chatBox.appendChild(container);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        async function buscarResposta(textoDaPergunta) {
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) return;
            toggleLoader(true);

            if (!CHAT_API_URL || CHAT_API_URL === "COLOQUE_SUA_URL_FINAL_AQUI") {
                toggleLoader(false);
                addMessage("ERRO DE CONFIGURAÇÃO: A URL do script não foi definida no código do chatbot.", 'bot');
                return;
            }

            try {
                const url = `${CHAT_API_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Erro de rede! Status: ${response.status}`);
                const data = await response.json();
                toggleLoader(false);

                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow;
                    addMessage(data.resposta, 'bot', { imageUrls: data.imagens, sourceRow: data.sourceRow });
                    if (data.sugestoes && data.sugestoes.length > 0) {
                        addMessage("Você também pode ter interesse em:", 'bot');
                        criarBotoesDeSugestao(data.sugestoes);
                    }
                } else {
                    addMessage(data.mensagem, 'bot');
                }
            } catch (error) {
                toggleLoader(false);
                console.error("Erro ao buscar resposta:", error);
                addMessage("Erro de conexão com o sistema de respostas. Verifique o console (F12).", 'bot');
            }
        }

        function handleSendMessage(text) {
            if (!text || !text.trim()) return;
            document.querySelectorAll('.suggestion-buttons-container').forEach(el => el.remove());
            addMessage(text, 'user');
            buscarResposta(text);
            if (userInput) userInput.value = '';
        }

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage(userInput.value);
            }
        });

        document.getElementById('sidebar').addEventListener('click', (e) => {
            if (e.target && e.target.tagName === 'LI') handleSendMessage(e.target.innerText);
        });

        document.querySelector('#quick-actions-container .quick-actions-grid').addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('quick-action')) handleSendMessage(e.target.innerText);
        });

        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            themeSwitcher.innerHTML = isDark ? '🌙' : '☀️';
            localStorage.setItem('theme', isDark ? 'dark-theme' : 'light-theme');
        });

        function setInitialTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark-theme') {
                body.classList.add('dark-theme');
                themeSwitcher.innerHTML = '🌙';
            } else {
                body.classList.remove('dark-theme');
                themeSwitcher.innerHTML = '☀️';
            }
        }

        const primeiroNome = dadosAtendente.nome.split(' ')[0];
        const hora = new Date().getHours();
        let saudacao = (hora >= 5 && hora < 12) ? 'Bom dia' : (hora >= 12 && hora < 18) ? 'Boa tarde' : 'Boa noite';
        addMessage(`${saudacao}, ${primeiroNome}! Sou o assistente de atendimento. Como posso ajudar?`, 'bot');

        setInitialTheme();
        verificarAlertasCriticos();
    }

    verificarIdentificacao();
});
