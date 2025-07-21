document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('identificacao-overlay').style.display = 'flex';
    document.querySelector('.app-wrapper').style.display = 'none';
});

function waitForGoogleScript(callback, timeout = 20000, interval = 500) {
    const startTime = Date.now();
    function check() {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            console.log('Biblioteca do Google Apps Script carregada com sucesso.');
            callback();
        } else if (Date.now() - startTime < timeout) {
            console.warn('Biblioteca do Google Apps Script ainda não carregada. Aguardando...');
            setTimeout(check, interval);
        } else {
            console.error('Erro: Biblioteca do Google Apps Script não carregada após o tempo limite. Verifique a URL do script e a conexão de rede.');
            const errorMessage = document.getElementById('identificacao-error');
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Erro: Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
        }
    }
    check();
}

function submitForm(action) {
    const errorMessage = document.getElementById('identificacao-error');
    const nome = document.getElementById('nome-input').value.trim();
    const email = document.getElementById('email-input').value.trim();

    if (!nome) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Por favor, insira seu nome.';
        return;
    }

    if (!email.endsWith('@velotax.com.br')) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
        return;
    }

    waitForGoogleScript(() => {
        const payload = { action, nome, email };
        console.log('Enviando payload para o Apps Script:', payload);

        google.script.run
            .withSuccessHandler(function(response) {
                console.log('Resposta do Apps Script:', response);
                if (response.status === 'sucesso') {
                    errorMessage.style.display = 'none';
                    document.getElementById('identificacao-overlay').style.display = 'none';
                    document.querySelector('.app-wrapper').style.display = 'grid';
                    localStorage.setItem('userNome', nome);
                    localStorage.setItem('userEmail', email);
                    initializeChatbot();
                } else {
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = response.mensagem;
                }
            })
            .withFailureHandler(function(error) {
                console.error('Erro no google.script.run:', error);
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Erro ao processar: ' + error.message;
            })
            .processForm(payload);
    });
}

function initializeChatbot() {
    console.log('Inicializando chatbot...');
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

        waitForGoogleScript(() => {
            console.log('Enviando pergunta:', question);
            google.script.run
                .withSuccessHandler(function(response) {
                    console.log('Resposta do chatbot:', response);
                    if (response.status === 'sucesso') {
                        appendMessage('bot', response.resposta, response.sourceRow);
                    } else {
                        appendMessage('bot', response.mensagem);
                    }
                })
                .withFailureHandler(function(error) {
                    console.error('Erro no envio da pergunta:', error);
                    appendMessage('bot', 'Erro ao obter resposta: ' + error.message);
                })
                .doGet({ parameter: { pergunta: question, email: localStorage.getItem('userEmail') } });
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
        messageElement _
