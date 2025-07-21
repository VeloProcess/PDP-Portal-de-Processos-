// Inicializa a interface: mostra o overlay e esconde o painel
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('identificacao-overlay').style.display = 'flex';
    document.querySelector('.app-wrapper').style.display = 'none';
});

// Função para enviar o formulário de login ou registro
function submitForm(action) {
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
        console.error('Biblioteca do Google Apps Script não carregada. Verifique a tag <script> no index.html.');
        const errorMessage = document.getElementById('identificacao-error');
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Erro: Não foi possível conectar ao servidor. Tente novamente mais tarde.';
        return;
    }

    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorMessage = document.getElementById('identificacao-error');

    // Validação do e-mail corporativo
    if (!email.endsWith('@velotax.com.br')) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
        return;
    }

    // Preparar os dados para enviar ao Apps Script
    const payload = {
        action: action,
        email: email,
        senha: password
    };

    // Enviar a requisição ao Apps Script
    google.script.run
        .withSuccessHandler(function(response) {
            if (response.status === 'sucesso') {
                errorMessage.style.display = 'none';
                document.getElementById('identificacao-overlay').style.display = 'none';
                document.querySelector('.app-wrapper').style.display = 'grid';
                // Armazenar o e-mail para uso no chatbot
                localStorage.setItem('userEmail', email);
                // Inicializar o chatbot
                initializeChatbot();
            } else {
                errorMessage.style.display = 'block';
                errorMessage.textContent = response.mensagem;
            }
        })
        .withFailureHandler(function(error) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Erro ao processar: ' + error.message;
        })
        .processForm(payload);
}

// Função para inicializar o chatbot
function initializeChatbot() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const questionItems = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');

    // Adicionar evento de envio de mensagem
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    // Adicionar eventos às perguntas frequentes
    questionItems.forEach(item => {
        item.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            userInput.value = question;
            sendMessage();
        });
    });

    // Função para enviar mensagem ao Apps Script
    function sendMessage() {
        if (typeof google === 'undefined' || !google.script || !google.script.run) {
            appendMessage('bot', 'Erro: Não foi possível conectar ao servidor. Verifique a conexão.');
            return;
        }

        const question = userInput.value.trim();
        if (!question) return;

        // Exibir a pergunta do usuário no chat
        appendMessage('user', question);
        userInput.value = '';

        // Enviar a pergunta ao Apps Script
        google.script.run
            .withSuccessHandler(function(response) {
                if (response.status === 'sucesso') {
                    appendMessage('bot', response.resposta, response.sourceRow);
                } else {
                    appendMessage('bot', response.mensagem);
                }
            })
            .withFailureHandler(function(error) {
                appendMessage('bot', 'Erro ao obter resposta: ' + error.message);
            })
            .doGet({ parameter: { pergunta: question, email: localStorage.getItem('userEmail') } });
    }

    // Função para adicionar mensagens ao chat
    function appendMessage(sender, message, sourceRow) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container', sender);
        
        const avatar = document.createElement('div');
        avatar.classList.add('avatar', sender);
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        const messageText = document.createElement('div');
        messageText.classList.add('message');
        messageText.innerHTML = message;

        messageContent.appendChild(messageText);

        if (sender === 'bot' && sourceRow) {
            const copyBtn = document.createElement('button');
            copyBtn.classList.add('copy-btn');
            copyBtn.innerHTML = '📋';
            copyBtn.onclick = function() {
                navigator.clipboard.writeText(message).then(() => {
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 1000);
                });
            };
            messageElement.appendChild(copyBtn);

            const feedbackContainer = document.createElement('div');
            feedbackContainer.classList.add('feedback-container');
            feedbackContainer.innerHTML = `
                <button class="feedback-btn positive" onclick="sendFeedback('positivo', '${sourceRow}', '${message.replace(/'/g, "\\'")}')">👍</button>
                <button class="feedback-btn negative" onclick="sendFeedback('negativo', '${sourceRow}', '${message.replace(/'/g, "\\'")}')">👎</button>
            `;
            messageContent.appendChild(feedbackContainer);
        }

        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para enviar feedback
    function sendFeedback(tipo, sourceRow, question) {
        if (typeof google === 'undefined' || !google.script || !google.script.run) {
            appendMessage('bot', 'Erro: Não foi possível conectar ao servidor para enviar feedback.');
            return;
        }

        const payload = {
            action: tipo === 'positivo' ? 'logFeedbackPositivo' : 'logFeedbackNegativo',
            question: question,
            sourceRow: sourceRow,
            email: localStorage.getItem('userEmail')
        };

        google.script.run
            .withSuccessHandler(function(response) {
                appendMessage('bot', 'Feedback registrado. Obrigado!');
            })
            .withFailureHandler(function(error) {
                appendMessage('bot', 'Erro ao registrar feedback: ' + error.message);
            })
            .processForm(payload);
    }
}

// Função para expandir/recolher perguntas frequentes
document.getElementById('expandable-faq-header').addEventListener('click', function() {
    const moreQuestions = document.getElementById('more-questions');
    const arrow = this.querySelector('.arrow');
    moreQuestions.classList.toggle('hidden-questions');
    arrow.textContent = moreQuestions.classList.contains('hidden-questions') ? '▶' : '▼';
});

// Inicializar o tema
document.getElementById('theme-switcher').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    this.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
});

// Inicializar a busca de perguntas
document.getElementById('question-search').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const questionItems = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');
    questionItems.forEach(item => {
        const question = item.getAttribute('data-question').toLowerCase();
        item.style.display = question.includes(searchTerm) ? '' : 'none';
    });
});
