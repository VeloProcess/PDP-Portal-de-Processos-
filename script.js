document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('identificacao-overlay').style.display = 'flex';
    document.querySelector('.app-wrapper').style.display = 'none';
});

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzt1HEcuB5I9AqmxvYW_API_XassgEvsjZ2UO_l9-8V7hF0q8EAvMVkhMcQwR7wBYx4/exec';

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
    .then(response => {
        if (!response.ok) throw new Error(`Erro na requisição: ${response.status}`);
        return response.json();
    })
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
        console.error('Erro no fetch:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Erro ao conectar ao servidor: ' + error.message;
    });
}

// ... (o restante do código permanece igual)
