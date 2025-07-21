// Função para enviar o formulário de login ou registro
function submitForm(action) {
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
                document.querySelector('.app-wrapper').style.display = 'block';
                // Armazenar o e-mail para uso no chatbot
                localStorage.setItem('userEmail', email);
                // Inicializar o chatbot (se necessário)
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

// Função para inicializar o chatbot (adapte conforme sua lógica atual)
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
        messageElement.classList.add('message', sender);
        messageElement.innerHTML = message;

        if (sender === 'bot' && sourceRow) {
            const feedbackButtons = `
                <div class="feedback-buttons">
                    <button onclick="sendFeedback('positivo', '${sourceRow}', '${message}')">👍</button>
                    <button onclick="sendFeedback('negativo', '${sourceRow}', '${message}')">👎</button>
                </div>`;
            messageElement.innerHTML += feedbackButtons;
        }

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para enviar feedback
    function sendFeedback(tipo, sourceRow, question) {
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

// Inicializar o tema (adapte conforme seu código atual)
document.getElementById('theme-switcher').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    this.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
});

// Inicializar a busca de perguntas (adapte conforme necessário)
document.getElementById('question-search').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const questionItems = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');
    questionItems.forEach(item => {
        const question = item.getAttribute('data-question').toLowerCase();
        item.style.display = question.includes(searchTerm) ? '' : 'none';
    });
});
