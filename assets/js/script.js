document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DE IDENTIFICAÇÃO E INICIALIZAÇÃO ---
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const identificacaoForm = document.getElementById('identificacao-form');
    const appWrapper = document.querySelector('.app-wrapper');

    function verificarIdentificacao() {
        const DOMINIO_PERMITIDO = "@velotax.com.br";
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;

        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            if (dadosSalvosString) {
                dadosSalvos = JSON.parse(dadosSalvosString);
            }
        } catch (e) {
            console.error("Erro ao ler dados do localStorage. Removendo dados corrompidos.", e);
            localStorage.removeItem('dadosAtendenteChatbot');
        }
        
        if (!dadosSalvos || (Date.now() - dadosSalvos.timestamp > umDiaEmMs) || !dadosSalvos.email.endsWith(DOMINIO_PERMITIDO)) {
            identificacaoOverlay.classList.remove('hidden');
            appWrapper.classList.add('hidden');
        } else {
            identificacaoOverlay.classList.add('hidden');
            appWrapper.classList.remove('hidden');
            iniciarBot(dadosSalvos);
        }
    }

    identificacaoForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const DOMINIO_PERMITIDO = "@velotax.com.br";
        const nomeInput = document.getElementById('nome-input');
        const emailInput = document.getElementById('email-input');
        const errorMsg = document.getElementById('identificacao-error');

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();

        if (nome && email && email.endsWith(DOMINIO_PERMITIDO)) {
            const dadosAtendente = { 
                nome: nome, 
                email: email, 
                timestamp: Date.now() 
            };
            localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
            identificacaoOverlay.classList.add('hidden');
            appWrapper.classList.remove('hidden');
            iniciarBot(dadosAtendente);
        } else {
            errorMsg.style.display = 'block';
            nomeInput.focus();
        }
    });

    // --- FUNÇÃO PRINCIPAL QUE INICIA O BOT APÓS IDENTIFICAÇÃO ---
    function iniciarBot(dadosAtendente) {
        // Referências aos elementos do painel
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const quickQuestionsList = document.getElementById('quick-questions-list');
        const quickActionsContainer = document.getElementById('quick-actions-container');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        
        // <<<--- VERIFIQUE E COLE SUA URL AQUI ---<<<
        const CHAT_API_URL = "https://script.google.com/macros/s/AKfycbzo0z6SUHZMzwtP3TSeUzNHVzTNyeJgqWY3c5qzoRJbzSj_omx7GuIKIzZ4cTsVWyYuwA/exec"; 

        let ultimoTopico = '';
        const perguntasDeContinuacao = [
            'qual o passo a passo', 'como funciona', 'e os custos', 'quais os requisitos', 'por que',
            'onde', 'como fazer', 'me explique melhor', 'fale mais', 'detalhes'
        ];

        function enviarSaudacaoInicial(nome) {
            const hora = new Date().getHours();
            let saudacao = (hora >= 5 && hora < 12) ? 'Bom dia' : (hora >= 12 && hora < 18) ? 'Boa tarde' : 'Boa noite';
            const primeiroNome = nome.split(' ')[0];
            const mensagemCompleta = `${saudacao}, ${primeiroNome}! Sou o assistente de atendimento. Como posso ajudar?`;
            addMessage(mensagemCompleta, 'bot');
        }

        function toggleLoader(show) {
            const existingLoader = document.getElementById('loader');
            if (show) {
                if (!existingLoader) {
                    const loaderElement = document.createElement('div');
                    loaderElement.id = 'loader';
                    loaderElement.classList.add('loader-container');
                    loaderElement.innerHTML = `<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
                    chatBox.appendChild(loaderElement);
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            } else {
                if (existingLoader) { existingLoader.remove(); }
            }
        }

        function addMessage(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');
            messageElement.innerHTML = message;
            if (sender === 'bot' && !message.includes("Sou o assistente")) {
                const copyBtn = document.createElement('button');
                copyBtn.classList.add('copy-btn');
                copyBtn.innerHTML = '📋';
                copyBtn.title = 'Copiar resposta';
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = message;
                    navigator.clipboard.writeText(tempDiv.textContent || "").then(() => {
                        copyBtn.innerHTML = '✅';
                        setTimeout(() => { copyBtn.innerHTML = '📋'; }, 2000);
                    });
                };
                messageElement.appendChild(copyBtn);
            }
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        async function buscarResposta(textoDaPergunta) {
            if (!textoDaPergunta.trim()) return;
            toggleLoader(true);
            try {
                const identificacaoFormatada = `${dadosAtendente.nome} (${dadosAtendente.email})`;
                const url = `${CHAT_API_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&usuario=${encodeURIComponent(identificacaoFormatada)}`;
                const response = await fetch(url);
                const data = await response.json();
                toggleLoader(false);

                if (data.status === 'sucesso') {
                    addMessage(data.resposta, 'bot');
                    ultimoTopico = data.contexto || '';
                } else {
                    addMessage(data.mensagem, 'bot');
                    ultimoTopico = '';
                }
            } catch (error) {
                toggleLoader(false);
                console.error("Erro ao buscar resposta:", error);
                addMessage("Erro de conexão com o sistema de respostas.", 'bot');
                ultimoTopico = '';
            }
        }

        function handleSendMessage(text) {
            if (!text || !text.trim()) return;
            let perguntaFinal = text;
            const textoNormalizado = text.toLowerCase().trim();
            if (perguntasDeContinuacao.some(frase => textoNormalizado.includes(frase)) && ultimoTopico) {
                perguntaFinal = textoNormalizado + ' ' + ultimoTopico;
            } else {
                ultimoTopico = '';
            }
            addMessage(text, 'user');
            buscarResposta(perguntaFinal);
            if (userInput.value) { userInput.value = ''; }
        }

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage(userInput.value);
            }
        });

        quickQuestionsList.addEventListener('click', (e) => {
            if (e.target && e.target.tagName === 'LI') {
                handleSendMessage(e.target.innerText);
            }
        });

        quickActionsContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('quick-action')) {
                handleSendMessage(e.target.innerText);
            }
        });

        // Lógica do Seletor de Tema
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            body.classList.add(savedTheme);
            if (savedTheme === 'dark-theme') {
                themeSwitcher.innerHTML = '🌙';
            }
        }
        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            if (body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark-theme');
                themeSwitcher.innerHTML = '🌙';
            } else {
                localStorage.removeItem('theme');
                themeSwitcher.innerHTML = '☀️';
            }
        });
        
        // Envia a saudação inicial
        enviarSaudacaoInicial(dadosAtendente.nome);
    }
    
    // Inicia o processo de verificação assim que a página carrega
    verificarIdentificacao();
});
