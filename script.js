/**
 * Função global para iniciar toda a lógica do chatbot e da interface.
 * É chamada após um login bem-sucedido ou ao encontrar uma sessão válida.
 * @param {object} dadosAtendente - Os dados do usuário logado (nome, email, foto).
 */
function iniciarBot(dadosAtendente) {
    // Referências aos elementos do DOM
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;
    const questionSearch = document.getElementById('question-search');
    
    // Variáveis de estado do chat
    let ultimaPergunta = '';
    let ultimaLinhaDaFonte = null;
    let isTyping = false;
    
    // URL do Backend (Google Apps Script)
    [cite_start]const BACKEND_URL = "https://script.google.com/macros/s/AKfycbw8n95lQr5-RbxG9qYG7O_3ZEOVkVQ3K50C3iFM9JViLyEsa8hiDuRuCzlgy_YPoI43/exec"; [cite: 113]

    // Função para copiar texto para a área de transferência
    async function copiarTextoParaClipboard(texto) {
        try {
            [cite_start]await navigator.clipboard.writeText(texto); [cite: 113]
            [cite_start]return true; [cite: 114]
        } catch (err) {
            [cite_start]console.warn('Método moderno de cópia falhou, tentando fallback...', err); [cite: 114]
            [cite_start]const textArea = document.createElement("textarea"); [cite: 115]
            [cite_start]textArea.value = texto; [cite: 115]
            [cite_start]textArea.style.position = "fixed"; [cite: 115]
            [cite_start]document.body.appendChild(textArea); [cite: 115]
            [cite_start]textArea.focus(); [cite: 115]
            [cite_start]textArea.select(); [cite: 115]
            try {
                [cite_start]const successful = document.execCommand('copy'); [cite: 116]
                [cite_start]document.body.removeChild(textArea); [cite: 116]
                [cite_start]return successful; [cite: 116]
            } catch (fallbackErr) {
                [cite_start]console.error('Falha total ao copiar com ambos os métodos:', fallbackErr); [cite: 117]
                [cite_start]document.body.removeChild(textArea); [cite: 118]
                [cite_start]return false; [cite: 118]
            }
        }
    }

    // Funções para o indicador de "digitando"
    function showTypingIndicator() {
        if (isTyping) return;
        isTyping = true;
        [cite_start]const typingContainer = document.createElement('div'); [cite: 120]
        [cite_start]typingContainer.className = 'message-container bot typing-indicator'; [cite: 121]
        [cite_start]typingContainer.id = 'typing-indicator'; [cite: 121]
        typingContainer.innerHTML = `
            <div class="avatar bot">🤖</div>
            <div class="message-content">
                <div class="message">
                    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                </div>
            [cite_start]</div>`; [cite: 121]
        [cite_start]chatBox.appendChild(typingContainer); [cite: 122]
        [cite_start]chatBox.scrollTop = chatBox.scrollHeight; [cite: 122]
    }

    function hideTypingIndicator() {
        [cite_start]isTyping = false; [cite: 122]
        [cite_start]const typingIndicator = document.getElementById('typing-indicator'); [cite: 123]
        if (typingIndicator) {
            [cite_start]typingIndicator.remove(); [cite: 123]
        }
    }

    // Função para adicionar mensagens ao chat (com botões de copiar e feedback)
    function addMessage(message, sender, options = {}) {
        [cite_start]const { sourceRow = null } = options; [cite: 124]
        [cite_start]const messageContainer = document.createElement('div'); [cite: 125]
        [cite_start]messageContainer.classList.add('message-container', sender); [cite: 125]
        
        const avatarDiv = `<div class="avatar ${sender}">${sender === 'user' ? [cite_start]'👤' : '🤖'}</div>`; [cite: 125]
        const messageContentDiv = `
            <div class="message-content">
                <div class="message">${message.replace(/\n/g, '<br>')}</div>
            [cite_start]</div>`; [cite: 126]

        [cite_start]messageContainer.innerHTML = sender === 'user' ? messageContentDiv + avatarDiv : avatarDiv + messageContentDiv; [cite: 127]
        [cite_start]chatBox.appendChild(messageContainer); [cite: 127]

        // Adiciona botões de copiar e feedback APENAS para mensagens do bot que têm uma fonte
        [cite_start]if (sender === 'bot' && sourceRow) { [cite: 128]
            [cite_start]const copyBtn = document.createElement('button'); [cite: 128]
            [cite_start]copyBtn.className = 'copy-btn'; [cite: 129]
            [cite_start]copyBtn.title = 'Copiar resposta'; [cite: 129]
            [cite_start]copyBtn.innerHTML = '📋'; [cite: 129]
            [cite_start]copyBtn.onclick = () => { [cite: 130]
                [cite_start]const textToCopy = messageContainer.querySelector('.message').textContent; [cite: 130]
                [cite_start]copiarTextoParaClipboard(textToCopy).then(success => { [cite: 131]
                    if (success) {
                        [cite_start]copyBtn.innerHTML = '✅'; [cite: 131]
                        [cite_start]copyBtn.classList.add('copied'); [cite: 131]
                        setTimeout(() => {
                            [cite_start]copyBtn.innerHTML = '📋'; [cite: 131]
                            [cite_start]copyBtn.classList.remove('copied'); [cite: 131]
                        [cite_start]}, 2000); [cite: 132]
                    }
                });
            };
            [cite_start]messageContainer.appendChild(copyBtn); [cite: 133]

            [cite_start]const feedbackContainer = document.createElement('div'); [cite: 133]
            [cite_start]feedbackContainer.className = 'feedback-container'; [cite: 133]

            [cite_start]const positiveBtn = document.createElement('button'); [cite: 133]
            [cite_start]positiveBtn.className = 'feedback-btn positive'; [cite: 133]
            [cite_start]positiveBtn.innerHTML = '👍'; [cite: 133]
            [cite_start]positiveBtn.title = 'Resposta útil'; [cite: 134]
            [cite_start]positiveBtn.onclick = () => enviarFeedback('logFeedbackPositivo', feedbackContainer); [cite: 134]
            
            [cite_start]const negativeBtn = document.createElement('button'); [cite: 134]
            [cite_start]negativeBtn.className = 'feedback-btn negative'; [cite: 134]
            [cite_start]negativeBtn.innerHTML = '👎'; [cite: 134]
            [cite_start]negativeBtn.title = 'Resposta incorreta'; [cite: 135]
            [cite_start]negativeBtn.onclick = () => enviarFeedback('logFeedbackNegativo', feedbackContainer); [cite: 135]
            
            [cite_start]feedbackContainer.appendChild(positiveBtn); [cite: 135]
            [cite_start]feedbackContainer.appendChild(negativeBtn); [cite: 135]
            [cite_start]messageContainer.querySelector('.message-content').appendChild(feedbackContainer); [cite: 135]
        }
        
        [cite_start]chatBox.scrollTop = chatBox.scrollHeight; [cite: 136]
    }
    
    // Função para registrar o feedback
    async function enviarFeedback(action, container) {
        [cite_start]if (!ultimaPergunta || !ultimaLinhaDaFonte) return; [cite: 137]
        
        [cite_start]container.innerHTML = '<span style="font-size: 12px; color: var(--cor-texto-secundario);">Obrigado!</span>'; [cite: 138]

        try {
            [cite_start]await fetch(BACKEND_URL, { [cite: 138]
                [cite_start]method: 'POST', [cite: 138]
                mode: 'no-cors', // Importante para o Google Apps Script
                body: JSON.stringify({
                    [cite_start]action: action, [cite: 138]
                    [cite_start]question: ultimaPergunta, [cite: 138]
                    [cite_start]sourceRow: ultimaLinhaDaFonte, [cite: 138]
                    [cite_start]email: dadosAtendente.email [cite: 139]
                })
            });
        } catch (error) {
            [cite_start]console.error("Erro ao enviar feedback:", error); [cite: 140]
        }
    }
    
    // Função para buscar a resposta no backend
    async function buscarResposta(textoDaPergunta) {
        [cite_start]ultimaPergunta = textoDaPergunta; [cite: 141]
        [cite_start]ultimaLinhaDaFonte = null; [cite: 142]
        [cite_start]if (!textoDaPergunta.trim()) return; [cite: 142]

        addMessage(textoDaPergunta, 'user');
        showTypingIndicator();

        try {
            [cite_start]const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`; [cite: 142]
            [cite_start]const response = await fetch(url); [cite: 143]
            
            if (!response.ok) {
                [cite_start]throw new Error(`Erro de rede: ${response.status}`); [cite: 143]
            }
            
            [cite_start]const data = await response.json(); [cite: 145]
            [cite_start]hideTypingIndicator(); [cite: 145]

            if (data.status === 'sucesso') {
                [cite_start]ultimaLinhaDaFonte = data.sourceRow; [cite: 145]
                [cite_start]addMessage(data.resposta, 'bot', { sourceRow: data.sourceRow }); [cite: 146]
            } else {
                [cite_start]addMessage(data.mensagem || "Ocorreu um erro ao processar sua pergunta.", 'bot'); [cite: 146]
            }
        } catch (error) {
            [cite_start]hideTypingIndicator(); [cite: 147]
            [cite_start]console.error("Erro ao buscar resposta:", error); [cite: 148]
            [cite_start]addMessage("Erro de conexão. Verifique o console (F12) para mais detalhes.", 'bot'); [cite: 148]
        }
    }

    // Função para lidar com o envio de mensagens
    function handleSendMessage(text) {
        [cite_start]const trimmedText = text.trim(); [cite: 149]
        [cite_start]if (!trimmedText) return; [cite: 150]
        buscarResposta(trimmedText);
        [cite_start]userInput.value = ''; [cite: 150]
    }

    // Função para configurar o tema (claro/escuro)
    function setInitialTheme() {
        [cite_start]const savedTheme = localStorage.getItem('theme'); [cite: 154]
        [cite_start]if (savedTheme === 'dark') { [cite: 155]
            [cite_start]body.classList.add('dark-theme'); [cite: 155]
            [cite_start]themeSwitcher.innerHTML = '🌙'; [cite: 155]
        } else {
            [cite_start]body.classList.remove('dark-theme'); [cite: 156]
            [cite_start]themeSwitcher.innerHTML = '☀️'; [cite: 156]
        }
    }
    
    // --- Configuração dos Event Listeners ---
    userInput.addEventListener('keydown', (e) => {
        [cite_start]if (e.key === 'Enter') { [cite: 150]
            [cite_start]e.preventDefault(); [cite: 150]
            [cite_start]handleSendMessage(userInput.value); [cite: 150]
        }
    });

    [cite_start]sendButton.addEventListener('click', () => handleSendMessage(userInput.value)); [cite: 151]
    
    document.querySelectorAll('#quick-questions-list li, #more-questions-list li').forEach(item => {
        [cite_start]item.addEventListener('click', (e) => handleSendMessage(e.currentTarget.getAttribute('data-question'))); [cite: 151]
    });

    document.getElementById('expandable-faq-header').addEventListener('click', (e) => {
        [cite_start]e.currentTarget.classList.toggle('expanded'); [cite: 152]
        document.getElementById('more-questions').style.display = e.currentTarget.classList.contains('expanded') ? [cite_start]'block' : 'none'; [cite: 152]
    });

    themeSwitcher.addEventListener('click', () => {
        [cite_start]body.classList.toggle('dark-theme'); [cite: 153]
        [cite_start]const isDark = body.classList.contains('dark-theme'); [cite: 153]
        [cite_start]localStorage.setItem('theme', isDark ? 'dark' : 'light'); [cite: 153]
        themeSwitcher.innerHTML = isDark ? [cite_start]'🌙' : '☀️'; [cite: 153]
    });

    questionSearch.addEventListener('input', (e) => {
        [cite_start]const searchTerm = e.target.value.toLowerCase(); [cite: 118]
        [cite_start]document.querySelectorAll('#quick-questions-list li, #more-questions-list li').forEach(question => { [cite: 118]
            [cite_start]const text = question.textContent.toLowerCase(); [cite: 119]
            question.style.display = text.includes(searchTerm) ? [cite_start]'flex' : 'none'; [cite: 119]
        });
    });

    // --- Execução Inicial ---
    setInitialTheme();
    [cite_start]const primeiroNome = dadosAtendente.nome.split(' ')[0]; [cite: 157]
    
    // Limpa o chat antes de adicionar a primeira mensagem para evitar duplicatas ao recarregar
    chatBox.innerHTML = '';
    [cite_start]addMessage(`Olá, ${primeiroNome}! Como posso te ajudar?`, 'bot'); [cite: 158]
}

/**
 * Verifica se há uma sessão de login válida no localStorage quando a página carrega.
 */
function verificarIdentificacao() {
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.querySelector('.app-wrapper');
    [cite_start]const DOMINIO_PERMITIDO = "@velotax.com.br"; [cite: 107]
    const umDiaEmMs = 24 * 60 * 60 * 1000; [cite_start]// 24 horas [cite: 107]
    let dadosSalvos = null;

    try {
        [cite_start]const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot'); [cite: 107]
        if (dadosSalvosString) {
            [cite_start]dadosSalvos = JSON.parse(dadosSalvosString); [cite: 107]
        }
    } catch (e) {
        console.error("Erro ao ler dados do localStorage:", e);
        [cite_start]localStorage.removeItem('dadosAtendenteChatbot'); [cite: 107]
    }

    // Verifica se os dados existem, não expiraram e são do domínio permitido
    [cite_start]if (dadosSalvos && (Date.now() - dadosSalvos.timestamp < umDiaEmMs) && dadosSalvos.email.endsWith(DOMINIO_PERMITIDO)) { [cite: 107]
        [cite_start]loginScreen.style.display = 'none'; [cite: 108]
        [cite_start]appWrapper.classList.remove('hidden'); [cite: 108]
        [cite_start]iniciarBot(dadosSalvos); [cite: 108]
    } else {
        // Se a sessão for inválida, limpa o localStorage e mostra a tela de login
        localStorage.removeItem('dadosAtendenteChatbot');
        [cite_start]loginScreen.style.display = 'flex'; [cite: 107]
        [cite_start]appWrapper.classList.add('hidden'); [cite: 107]
    }
}

// Executa a verificação de sessão assim que o DOM estiver pronto
[cite_start]document.addEventListener('DOMContentLoaded', verificarIdentificacao); [cite: 106]
