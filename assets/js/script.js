document.addEventListener('DOMContentLoaded', () => {
    const identificacaoOverlay = document.getElementById('identificacao-overlay');
    const identificacaoForm = document.getElementById('identificacao-form');
    const appWrapper = document.querySelector('.app-wrapper');
    const emojis = ['😀', '😂', '😊', '😍', '👍', '👎', '❤️', '🔥', '🎉', '🤔', '😎', '🙏'];

    function verificarIdentificacao() {
        const DOMINIO_PERMITIDO = "@velotax.com.br";
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        let dadosSalvos = null;
        try {
            const dadosSalvosString = localStorage.getItem('dadosAtendenteChatbot');
            if(dadosSalvosString) dadosSalvos = JSON.parse(dadosSalvosString);
        } catch(e) { 
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
            const dadosAtendente = { 
                nome, 
                email, 
                timestamp: Date.now() 
            };
            localStorage.setItem('dadosAtendenteChatbot', JSON.stringify(dadosAtendente));
            identificacaoOverlay.style.display = 'none';
            appWrapper.style.visibility = 'visible';
            iniciarBot(dadosAtendente);
        } else {
            errorMsg.style.display = 'block';
        }
    });

    function iniciarBot(dadosAtendente) {
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const themeSwitcher = document.getElementById('theme-switcher');
        const body = document.body;
        const fileInput = document.getElementById('file-input');
        const filePreviewContainer = document.getElementById('file-preview-container');
        const filePreviewName = document.getElementById('file-preview-name');
        const filePreviewRemove = document.getElementById('file-preview-remove');
        const questionSearch = document.getElementById('question-search');
        
        let ultimaPergunta = '';
        let ultimaResposta = '';
        let ultimaLinhaDaFonte = null;
        let isTyping = false;
        let selectedFile = null;

        // URL do seu backend Google Apps Script
        const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzo0z6SUHZMzwtP3TSeUzNHVzTNyeJgqWY3c5qzoRJbzSj_omx7GuIKIzZ4cTsVWyYuwA/exec";
        function processImageFile(file) {
            if (!/^image\/(png|jpg|jpeg)$/.test(file.type)) {
                addMessage("Apenas imagens (PNG, JPG, JPEG) são suportadas para leitura automática.", 'bot');
                return;
            }
            
            // Mostra preview ao usuário
            const reader = new FileReader();
            reader.onload = function(e) {
                addMessage('<b>Imagem enviada:</b><br><img src="' + e.target.result + '" style="max-width:120px;max-height:120px;">', 'user', {file});
            };
            reader.readAsDataURL(file);

            // Envia para OCR no backend
            const ocrReader = new FileReader();
            ocrReader.onload = function(e) {
                showTypingIndicator();
                fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'processImage',
                        image: e.target.result.split(',')[1], // só base64
                        email: dadosAtendente.email,
                        filename: file.name
                    })
                })
                .then(res => res.json())
                .then(data => {
                    hideTypingIndicator();
                    if (data && data.text) {
                        addMessage("<b>Texto reconhecido na imagem:</b><br>" + data.text, 'bot');
                        // Automaticamente já pergunta ao bot usando texto extraído
                        buscarResposta(data.text);
                    } else {
                        addMessage("Não foi possível reconhecer o texto na imagem.", 'bot');
                    }
                })
                .catch(e => {
                    hideTypingIndicator();
                    addMessage("Erro ao processar a imagem. Tente novamente.", 'bot');
                });
            };
            ocrReader.readAsDataURL(file);
        }
        // Selecionar arquivo
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedFile = e.target.files[0];
                filePreviewName.textContent = selectedFile.name;
                filePreviewContainer.style.display = 'block';
            }
        });

        // Remover arquivo selecionado
        filePreviewRemove.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = '';
            filePreviewContainer.style.display = 'none';
        });

        // Buscar perguntas
        questionSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const questions = document.querySelectorAll('#quick-questions-list li, #more-questions-list li');
            
            questions.forEach(question => {
                const text = question.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    question.style.display = 'flex';
                } else {
                    question.style.display = 'none';
                }
            });
        });

        function showTypingIndicator() {
            if (isTyping) return;
            
            isTyping = true;
            const typingContainer = document.createElement('div');
            typingContainer.className = 'typing-indicator';
            typingContainer.id = 'typing-indicator';
            
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                typingContainer.appendChild(dot);
            }
            
            chatBox.appendChild(typingContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function hideTypingIndicator() {
            isTyping = false;
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        function addMessage(message, sender, options = {}) {
            const { imageUrls = [], sourceRow = null, file = null } = options;
            
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container', sender);
            
            const avatar = document.createElement('div');
            avatar.className = `avatar ${sender}`;
            avatar.innerHTML = sender === 'user' ? '👤' : '🤖';
            messageContainer.appendChild(avatar);
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            if (message) {
                messageElement.innerHTML = message.replace(/\n/g, '<br>');
                if (sender === 'bot') {
                    ultimaResposta = message;
                }
            }
            messageContent.appendChild(messageElement);
            
            // Adicionar timestamp
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const timeElement = document.createElement('div');
            timeElement.className = 'message-time';
            timeElement.textContent = timeString;
            messageContent.appendChild(timeElement);
            
            if (sender === 'bot' && message && !message.includes("assistente de atendimento")) {
                const copyBtn = document.createElement('button');
                copyBtn.classList.add('copy-btn');
                copyBtn.innerHTML = '📋';
                copyBtn.title = 'Copiar resposta';
                messageElement.style.paddingRight = '40px';
                copyBtn.onclick = () => {
                    const textToCopy = messageElement.textContent.trim();
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        copyBtn.classList.add('copied');
                        setTimeout(() => { copyBtn.classList.remove('copied'); }, 2000);
                    }).catch(err => {
                        console.error('Falha ao copiar texto: ', err);
                    });
                };
                messageContainer.appendChild(copyBtn);

                if (sourceRow) {
                    const feedbackContainer = document.createElement('div');
                    feedbackContainer.className = 'feedback-container';

                    // Adicionar elementos de confetti
                    for (let i = 0; i < 5; i++) {
                        const confetti = document.createElement('div');
                        confetti.className = 'feedback-confetti';
                        confetti.style.left = `${i * 20}px`;
                        feedbackContainer.appendChild(confetti);
                    }

                    const positiveBtn = document.createElement('button');
                    positiveBtn.className = 'feedback-btn';
                    positiveBtn.innerHTML = '👍';
                    positiveBtn.title = 'Resposta útil';
                    positiveBtn.onclick = () => {
                        positiveBtn.classList.add('active', 'positive');
                        negativeBtn.classList.remove('active');
                        enviarFeedback('logFeedbackPositivo', feedbackContainer);
                    };

                    const negativeBtn = document.createElement('button');
                    negativeBtn.className = 'feedback-btn';
                    negativeBtn.innerHTML = '👎';
                    negativeBtn.title = 'Resposta incorreta';
                    negativeBtn.onclick = () => {
                        negativeBtn.classList.add('active', 'negative');
                        positiveBtn.classList.remove('active');
                        enviarFeedback('logFeedbackNegativo', feedbackContainer);
                    };

                    feedbackContainer.appendChild(positiveBtn);
                    feedbackContainer.appendChild(negativeBtn);
                    messageContent.appendChild(feedbackContainer);
                }
            }
            
            if (sender === 'bot' && Array.isArray(imageUrls) && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    if (url) {
                        const imageElement = document.createElement('img');
                        imageElement.src = url;
                        imageElement.alt = "Imagem de suporte";
                        messageContent.appendChild(imageElement);
                    }
                });
            }
            
            if (sender === 'user' && file) {
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview';
                
                const fileIcon = document.createElement('span');
                fileIcon.className = 'file-preview-icon';
                fileIcon.textContent = '📄';
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                
                filePreview.appendChild(fileIcon);
                filePreview.appendChild(fileName);
                messageContent.appendChild(filePreview);
            }
            
            messageContainer.appendChild(messageContent);
            chatBox.appendChild(messageContainer);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        
        async function enviarFeedback(action, container) {
            if (!ultimaPergunta || !ultimaResposta) return;
            
            container.innerHTML = '<span style="font-size: 12px; color: var(--cor-azul-medio);">Obrigado pelo feedback!</span>';

            try {
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: action,
                        question: ultimaPergunta,
                        sourceRow: ultimaLinhaDaFonte || 'N/A',
                        email: dadosAtendente.email,
                        resposta: ultimaResposta
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao enviar feedback');
                }
            } catch (error) {
                console.error("Erro ao enviar feedback:", error);
            }
        }
        
        async function buscarResposta(textoDaPergunta) {
            ultimaPergunta = textoDaPergunta;
            ultimaLinhaDaFonte = null;
            if (!textoDaPergunta.trim()) return;

            showTypingIndicator();
            
            try {
                const url = `${BACKEND_URL}?pergunta=${encodeURIComponent(textoDaPergunta)}&email=${encodeURIComponent(dadosAtendente.email)}`;
                const response = await fetch(url);
                
                const data = await response.json();
                hideTypingIndicator();
                
                if (data.status === 'sucesso') {
                    ultimaLinhaDaFonte = data.sourceRow || null;
                    addMessage(data.resposta, 'bot', { 
                        imageUrls: data.imagens || [], 
                        sourceRow: data.sourceRow 
                    });
                } else {
                    addMessage(data.mensagem || "Ocorreu um erro desconhecido.", 'bot');
                }
            } catch (error) {
                hideTypingIndicator();
                console.error("Erro ao buscar resposta:", error);
                addMessage("Erro ao conectar com o serviço de respostas. Por favor, tente novamente mais tarde.", 'bot');
            }
        }

        function handleSendMessage(text) {
            if (!text && !selectedFile) return;
            
            if (selectedFile) {
                if (/^image\/(png|jpg|jpeg)$/.test(selectedFile.type)) {
                    processImageFile(selectedFile);
                } else {
                    addMessage("<b>Arquivo enviado:</b> " + selectedFile.name, 'user', { file: selectedFile });
                    addMessage("Recebi seu arquivo. Ainda não processamos esse tipo automaticamente.", 'bot');
                }
                selectedFile = null;
                fileInput.value = '';
                filePreviewContainer.style.display = 'none';
            }

            if (text) {
                addMessage(text, 'user');
                buscarResposta(text);
                userInput.value = '';
            }
        }

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                handleSendMessage(userInput.value); 
            }
        });
        
        sendButton.addEventListener('click', () => {
            handleSendMessage(userInput.value);
        });
        
        // Event listener para perguntas frequentes
        document.querySelectorAll('#quick-questions-list li, #more-questions-list li').forEach(item => {
            item.addEventListener('click', (e) => {
                const question = e.currentTarget.getAttribute('data-question');
                if (question) {
                    handleSendMessage(question);
                }
            });
        });

        const expandableHeader = document.getElementById('expandable-faq-header');
        const moreQuestions = document.getElementById('more-questions');

        expandableHeader.addEventListener('click', () => {
            expandableHeader.classList.toggle('expanded');
            const isExpanded = moreQuestions.style.display === 'block';
            moreQuestions.style.display = isExpanded ? 'none' : 'block';
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
        let saudacao = (hora >= 5 && hora < 12) ? 'Bom dia' : 
                     (hora >= 12 && hora < 18) ? 'Boa tarde' : 'Boa noite';
        addMessage(`${saudacao}, ${primeiroNome}! Sou o assistente de atendimento. Como posso ajudar?`, 'bot');
        
        setInitialTheme();
    }

    verificarIdentificacao();
});
