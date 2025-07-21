const BACKEND_URL = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', () => {
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const identificacaoForm = document.getElementById('identificacao-form');
    const identificacaoError = document.getElementById('identificacao-error');
    const appWrapper = document.querySelector('.app-wrapper');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeSwitcher = document.getElementById('theme-switcher');
    const questionSearch = document.getElementById('question-search');
    const quickQuestionsList = document.getElementById('quick-questions-list');
    const moreQuestions = document.getElementById('more-questions');
    const expandableFaqHeader = document.getElementById('expandable-faq-header');
    const noticiasContent = document.getElementById('noticias-content');

    appWrapper.style.visibility = 'visible';

    window.openTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        const selectedTab = document.getElementById(tabName);
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
        document.querySelector(`button[onclick="openTab('${tabName}')"]`).classList.add('active');

        if (tabName === 'noticias') {
            carregarNoticias();
        }
    };

    identificacaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome-input').value;
        const email = document.getElementById('email-input').value;
        const defaultPassword = 'default123';

        if (!email.endsWith('@velotax.com.br')) {
            identificacaoError.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
            identificacaoError.style.display = 'block';
            return;
        }

        try {
            console.log('Tentando login para:', email);
            let response = await fetch(`${BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha: defaultPassword })
            });
            let data = await response.json();

            if (data.status === 'sucesso') {
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', nome);
                identificacaoOverlay.style.display = 'none';
                appWrapper.style.display = 'block';
                openTab('chat');
                console.log('Login bem-sucedido, interface exibida');
            } else {
                console.log('Login falhou, tentando registrar:', data.mensagem);
                response = await fetch(`${BACKEND_URL}/api/registrar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha: defaultPassword })
                });
                data = await response.json();

                if (data.status === 'sucesso') {
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userName', nome);
                    identificacaoOverlay.style.display = 'none';
                    appWrapper.style.display = 'block';
                    openTab('chat');
                    console.log('Registro bem-sucedido, interface exibida');
                } else {
                    identificacaoError.textContent = data.mensagem || 'Erro ao registrar usuário.';
                    identificacaoError.style.display = 'block';
                    console.error('Erro ao registrar:', data.mensagem);
                }
            }
        } catch (error) {
            identificacaoError.textContent = 'Erro ao conectar com o servidor. Verifique se ele está rodando em http://127.0.0.1:3000.';
            identificacaoError.style.display = 'block';
            console.error('Erro ao fazer login/registro:', error.message, error.stack);
        }
    });

    async function carregarNoticias() {
        noticiasContent.innerHTML = '<p>Carregando notícias...</p>';
        try {
            console.log('Carregando notícias de:', `${BACKEND_URL}/api/noticias`);
            const response = await fetch(`${BACKEND_URL}/api/noticias`, { signal: AbortSignal.timeout(5000) });
            const data = await response.json();
            console.log('Resposta da API de notícias:', data);
            if (data.status === 'ok' && data.noticias.length > 0) {
                noticiasContent.innerHTML = data.noticias.map(noticia => {
                    let alertClass = '';
                    if (noticia.titulo.toLowerCase().includes('crítico') || noticia.titulo.toLowerCase().includes('urgente')) {
                        alertClass = 'critical-alert';
                    } else if (noticia.titulo.toLowerCase().includes('aviso') || noticia.titulo.toLowerCase().includes('alerta')) {
                        alertClass = 'warning-alert';
                    } else {
                        alertClass = 'info-alert';
                    }
                    return `
                        <div class="news-item ${alertClass}">
                            <h3>${noticia.titulo}</h3>
                            <small>${noticia.data}</small>
                            <p>${noticia.conteudo}</p>
                        </div>
                    `;
                }).join('');
            } else {
                noticiasContent.innerHTML = '<p class="error">Nenhuma notícia disponível. Verifique a planilha ou a conexão com o servidor.</p>';
                console.warn('Nenhuma notícia retornada pela API');
            }
        } catch (error) {
            noticiasContent.innerHTML = '<p class="error">Erro ao conectar com o servidor. Verifique se ele está rodando em http://127.0.0.1:3000.</p>';
            console.error('Erro ao carregar notícias:', error.message, error.stack);
        }
    }

    sendButton.addEventListener('click', async () => {
        const pergunta = userInput.value.trim();
        const email = localStorage.getItem('userEmail');
        if (!pergunta) return;

        const userMessage = document.createElement('div');
        userMessage.className = 'message-container user';
        userMessage.innerHTML = `
            <div class="avatar user">U</div>
            <div class="message-content">
                <div class="message">${pergunta}</div>
            </div>
        `;
        chatBox.appendChild(userMessage);

        try {
            console.log('Enviando pergunta:', pergunta);
            const response = await fetch(`${BACKEND_URL}/api/perguntar?pergunta=${encodeURIComponent(pergunta)}&email=${encodeURIComponent(email)}`);
            const data = await response.json();
            console.log('Resposta da API de pergunta:', data);
            const botMessage = document.createElement('div');
            botMessage.className = 'message-container bot';
            botMessage.innerHTML = `
                <div class="avatar bot">B</div>
                <div class="message-content">
                    <div class="message">${data.resposta}</div>
                    ${data.sourceRow ? `
                    <div class="feedback-container">
                        <button class="feedback-btn positive" onclick="enviarFeedback('logFeedbackPositivo', '${encodeURIComponent(pergunta)}', ${data.sourceRow})">👍</button>
                        <button class="feedback-btn negative" onclick="enviarFeedback('logFeedbackNegativo', '${encodeURIComponent(pergunta)}', ${data.sourceRow})">👎</button>
                    </div>
                    <button class="copy-btn" onclick="copyToClipboard('${encodeURIComponent(data.resposta)}')">📋</button>
                    ` : ''}
                </div>
            `;
            chatBox.appendChild(botMessage);
        } catch (error) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message-container bot';
            errorMessage.innerHTML = `
                <div class="avatar bot">B</div>
                <div class="message-content">
                    <div class="message error">Erro ao obter resposta. Verifique se o servidor está rodando em http://127.0.0.1:3000.</div>
                </div>
            `;
            chatBox.appendChild(errorMessage);
            console.error('Erro ao enviar pergunta:', error.message, error.stack);
        }

        userInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });

    window.copyToClipboard = function(text) {
        const decodedText = decodeURIComponent(text);
        navigator.clipboard.writeText(decodedText).then(() => {
            const copyBtn = event.target;
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 1000);
        });
    };

    window.enviarFeedback = async (action, pergunta, sourceRow) => {
        const email = localStorage.getItem('userEmail');
        try {
            console.log('Enviando feedback:', { action, pergunta, sourceRow, email });
            const response = await fetch(`${BACKEND_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, question: pergunta, sourceRow, email })
            });
            const data = await response.json();
            if (data.status === 'sucesso') {
                alert('Feedback enviado com sucesso!');
                const feedbackBtn = event.target;
                feedbackBtn.classList.add('active');
            } else {
                alert('Erro ao enviar feedback.');
            }
        } catch (error) {
            alert('Erro ao enviar feedback.');
            console.error('Erro ao enviar feedback:', error.message, error.stack);
        }
    };

    themeSwitcher.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        themeSwitcher.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeSwitcher.textContent = '☀️';
    }

    questionSearch.addEventListener('input', () => {
        const searchTerm = questionSearch.value.toLowerCase();
        const questions = document.querySelectorAll('#quick-questions-list li, .more-questions-list li');
        questions.forEach(question => {
            const text = question.textContent.toLowerCase();
            question.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

    quickQuestionsList.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            userInput.value = item.dataset.question;
            sendButton.click();
        });
    });

    expandableFaqHeader.addEventListener('click', () => {
        const isExpanded = moreQuestions.style.display === 'block';
        moreQuestions.style.display = isExpanded ? 'none' : 'block';
        expandableFaqHeader.classList.toggle('expanded', !isExpanded);
    });

    moreQuestions.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            userInput.value = item.dataset.question;
            sendButton.click();
        });
    });
});
