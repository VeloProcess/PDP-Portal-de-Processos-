document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('identificacao-overlay').style.display = 'flex';
    document.querySelector('.app-wrapper').style.display = 'none';
});

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzt1HEcuB5I9AqmxvYW_API_XassgEvsjZ2UO_l9-8V7hF0q8EAvMVkhMcQwR7wBYx4/exec';

// Função para enviar o formulário de login ou registro
function submitForm(action) {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorMessage = document.getElementById('identificacao-error');

    if (!email.endsWith('@velotax.com.br')) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
        return;
    }

    const payload = { action, email, senha: password };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sucesso') {
            errorMessage.style.display = 'none';
            document.getElementById('identificacao-overlay').style.display = 'none';
            document.querySelector('.app-wrapper').style.display = 'grid';
            localStorage.setItem('userEmail', email);
            initializeChatbot();
        } else {
            errorMessage.style.display = 'block';
            errorMessage.textContent = data.mensagem;
        }
    })
    .catch(error => {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Erro ao processar: ' + error.message;
    });
}

// Função para inicializar o chatbot
function initializeChatbot() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const questionItems = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    questionItems.forEach(item => {
        item.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            userInput.value = question;
            sendMessage();
        });
    });

    function sendMessage() {
        const question = userInput.value.trim();
        if (!question) return;

        appendMessage('user', question);
        userInput.value = '';

        fetch(`${APPS_SCRIPT_URL}?pergunta=${encodeURIComponent(question)}&email=${encodeURIComponent(localStorage.getItem('userEmail'))}`, {
            method: 'GET'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                appendMessage('bot', data.resposta, data.sourceRow);
            } else {
                appendMessage('bot', data.mensagem);
            }
        })
        .catch(error => {
            appendMessage('bot', 'Erro ao obter resposta: ' + error.message);
        });
    }

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

    function sendFeedback(tipo, sourceRow, question) {
        const payload = {
            action: tipo === 'positivo' ? 'logFeedbackPositivo' : 'logFeedbackNegativo',
            question: question,
            sourceRow: sourceRow,
            email: localStorage.getItem('userEmail')
        };

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            appendMessage('bot', 'Feedback registrado. Obrigado!');
        })
        .catch(error => {
            appendMessage('bot', 'Erro ao registrar feedback: ' + error.message);
        });
    }
}

document.getElementById('expandable-faq-header').addEventListener('click', function() {
    const moreQuestions = document.getElementById('more-questions');
    const arrow = this.querySelector('.arrow');
    moreQuestions.classList.toggle('hidden-questions');
    arrow.textContent = moreQuestions.classList.contains('hidden-questions') ? '▶' : '▼';
});

document.getElementById('theme-switcher').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    this.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
});

document.getElementById('question-search').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const questionItems = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');
    questionItems.forEach(item => {
        const question = item.getAttribute('data-question').toLowerCase();
        item.style.display = question.includes(searchTerm) ? '' : 'none';
    });
});
