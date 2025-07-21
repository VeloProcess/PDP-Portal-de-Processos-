document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('identificacao-overlay').style.display = 'flex';
      document.querySelector('.app-wrapper').style.display = 'none';
  });

  function waitForGoogleScript(callback, timeout = 10000, interval = 500) {
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
              // Adicionar depuração extra
              fetch('https://script.google.com/macros/s/AKfycbzt1HEcuB5I9AqmxvYW_API_XassgEvsjZ2UO_l9-8V7hF0q8EAvMVkhMcQwR7wBYx4/exec')
                  .then(response => console.log('Resposta da URL do Apps Script:', response.status, response.statusText))
                  .catch(err => console.error('Erro ao testar a URL do Apps Script:', err.message));
          }
      }
      check();
  }

  function submitForm(action) {
      const errorMessage = document.getElementById('identificacao-error');
      waitForGoogleScript(() => {
          const email = document.getElementById('email-input').value;
          const password = document.getElementById('password-input').value;

          if (!email.endsWith('@velotax.com.br')) {
              errorMessage.style.display = 'block';
              errorMessage.textContent = 'Acesso permitido apenas para e-mails @velotax.com.br!';
              return;
          }

          const payload = {
              action: action,
              email: email,
              senha: password
          };

          console.log('Enviando payload para o Apps Script:', payload);

          google.script.run
              .withSuccessHandler(function(response) {
                  console.log('Resposta do Apps Script:', response);
                  if (response.status === 'sucesso') {
                      errorMessage.style.display = 'none';
                      document.getElementById('identificacao-overlay').style.display = 'none';
                      document.querySelector('.app-wrapper').style.display = 'grid';
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
          messageElement.appendChild(messageContent);
          chatBox.appendChild(messageElement);
          chatBox.scrollTop = chatBox.scrollHeight;
      }

      function sendFeedback(tipo, sourceRow, question) {
          waitForGoogleScript(() => {
              const payload = {
                  action: tipo === 'positivo' ? 'logFeedbackPositivo' : 'logFeedbackNegativo',
                  question: question,
                  sourceRow: sourceRow,
                  email: localStorage.getItem('userEmail')
              };

              console.log('Enviando feedback:', payload);

              google.script.run
                  .withSuccessHandler(function(response) {
                      console.log('Feedback registrado:', response);
                      appendMessage('bot', 'Feedback registrado. Obrigado!');
                  })
                  .withFailureHandler(function(error) {
                      console.error('Erro no envio do feedback:', error);
                      appendMessage('bot', 'Erro ao registrar feedback: ' + error.message);
                  })
                  .processForm(payload);
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
