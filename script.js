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

System: Desculpe-me, mas parece que a resposta anterior foi cortada, e o artefato para `script.js` está incompleto. Vou fornecer os códigos completos e funcionais para `style.css`, `script.js` e `index.html`, garantindo que estejam separados, conforme solicitado. Esses códigos são baseados na versão simplificada com login por nome e e-mail `@velotax.com.br`, usando `google.script.run` para evitar problemas de CORS e resolver o erro de timeout ("Biblioteca do Google Apps Script não carregada"). O `Code.gs` (artefato `5b751676-8797-414c-8ff8-286394adbcb4`, versão `b36e65d7-0acc-49a6-84d8-c26ae079ee06`) já foi fornecido e deve ser usado no backend. Você precisará reimplantar o Apps Script e atualizar a URL no `index.html`.

---

### 1. `style.css`
<xaiArtifact artifact_id="72cec25f-b3b9-4c8c-b949-43080c0b2cd9" artifact_version_id="71f8a50a-2272-4d48-883f-ae080a75915c" title="style.css" contentType="text/css">
#identificacao-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

#identificacao-box {
    background: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    max-width: 400px;
    width: 90%;
}

.input-group {
    margin-bottom: 15px;
    text-align: left;
}

.input-group label {
    display: block;
    margin-bottom: 5px;
}

.input-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin: 5px;
}

button:hover {
    background: #0056b3;
}

#identificacao-error {
    color: red;
    display: none;
    margin-top: 10px;
}

.app-wrapper {
    display: grid;
    grid-template-columns: 1fr 3fr;
    gap: 20px;
    padding: 20px;
}

#sidebar {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
}

#question-search {
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

#quick-questions-list, #more-questions {
    list-style: none;
    padding: 0;
}

#quick-questions-list li, #more-questions li {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #ddd;
}

#quick-questions-list li:hover, #more-questions li:hover {
    background: #e9ecef;
}

#expandable-faq-header {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hidden-questions {
    display: none;
}

#theme-switcher {
    margin-top: 10px;
}

#chat-box {
    height: 400px;
    overflow-y: auto;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 8px;
}

#input-container {
    display: flex;
    margin-top: 10px;
}

#user-input {
    flex-grow: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px 0 0 4px;
}

#send-button {
    border-radius: 0 4px 4px 0;
}

.message-container {
    display: flex;
    margin-bottom: 10px;
}

.message-container.user {
    justify-content: flex-end;
}

.avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    text-align: center;
    line-height: 30px;
    margin: 0 10px;
}

.user .avatar {
    background: #007bff;
    color: white;
}

.bot .avatar {
    background: #28a745;
    color: white;
}

.message-content {
    max-width: 70%;
}

.message {
    padding: 10px;
    border-radius: 8px;
    background: #f1f1f1;
}

.user .message {
    background: #007bff;
    color: white;
}

.copy-btn {
    margin-left: 10px;
    background: none;
    border: none;
    cursor: pointer;
}

.copy-btn.copied::after {
    content: 'Copiado!';
    color: green;
    font-size: 12px;
    position: absolute;
}

.feedback-container {
    margin-top: 5px;
}

.feedback-btn {
    background: none;
    border: none;
    cursor: pointer;
    margin: 0 5px;
}

body.dark-theme {
    background: #343a40;
    color: #f8f9fa;
}

body.dark-theme #identificacao-box {
    background: #495057;
    color: #f8f9fa;
}

body.dark-theme #sidebar {
    background: #495057;
}

body.dark-theme .message {
    background: #495057;
}

body.dark-theme .user .message {
    background: #0056b3;
}
