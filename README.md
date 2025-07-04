# 🤖 Painel de Atendimento Inteligente e Hub de Operações

![Status do Projeto](https://img.shields.io/badge/status-ativo-brightgreen)
![Tecnologia](https://img.shields.io/badge/tecnologia-Google%20Workspace%20%26%20JS-blue)

## 📄 Descrição

Este projeto é uma plataforma de chatbot interativa e completa, projetada para servir como um **ponto central de operações e conhecimento** para equipes de atendimento. A aplicação combina um assistente virtual com um sistema de busca inteligente, ferramentas de produtividade e um painel de comunicação, com todo o seu conteúdo gerenciado de forma simples e centralizada através de uma Planilha Google.

A ferramenta foi desenvolvida para ser intuitiva, rápida e facilmente gerenciável por pessoas da equipe, permitindo que a base de conhecimento seja atualizada em tempo real sem a necessidade de alterar o código.


---

## ✨ Funcionalidades Principais

* **🧠 Chatbot com Busca Inteligente:**
    * Responde perguntas usando um **algoritmo de pontuação de relevância**, que analisa palavras-chave no título e no conteúdo para entregar a resposta mais provável, em vez de apenas a primeira que encontra.
    * Oferece **sugestões dinâmicas** de tópicos relacionados quando não tem certeza da resposta, guiando o usuário para a informação correta.

* **⚡ Interface de Produtividade para a Equipe:**
    * Layout profissional de 3 colunas com painéis para **Perguntas Frequentes**, o **Chat** principal e um **Mural de Notícias**.
    * **Atalhos e Ações Rápidas** clicáveis para as dúvidas mais comuns.
    * Botão para **Copiar (📋)** as respostas do bot com um único clique, agilizando a comunicação com o cliente final.

* **🎨 Experiência de Usuário Polida:**
    * **Tema Claro/Escuro (☀️/🌙)** com a preferência do usuário salva no navegador.
    * **Animação de "Digitando..."** para um feedback visual claro.
    * **Animações suaves** na entrada de mensagens para uma interação mais fluida.
    * Exibição de **respostas ricas**, incluindo textos formatados e **imagens**, diretamente no chat.

* **📢 Comunicação e Alertas:**
    * Painel de **"Notícias da Semana"** gerenciado de forma simples e manual no código HTML.
    * Sistema de **Alerta Crítico**, que exibe um pop-up obrigatório para garantir que comunicados urgentes sejam lidos por toda a equipe.

* **📊 Análise e Gestão:**
    * **Logging completo** de interações, registrando quem perguntou, o quê e quando, em abas separadas na planilha.
    * **Comandos analíticos** como `/top5` (para ver as perguntas mais feitas) e `/erros` (para ver as buscas que falharam), transformando o bot em uma ferramenta de BI.

* **🔒 Segurança e Personalização:**
    * Sistema de **identificação obrigatória** por nome e e-mail com **validação de domínio** (`@velotax.com.br`), com reset a cada 24 horas.
    * **Saudações personalizadas** que cumprimentam o usuário pelo nome e de acordo com o horário do dia.

---

## 🛠️ Tecnologias Utilizadas

* **Front-End:** HTML5, CSS3 (Flexbox, Grid, Variáveis CSS), JavaScript (ES6+)
* **Back-End (API):** Google Apps Script
* **Banco de Dados:** Google Sheets
* **Hospedagem:** GitHub Pages
* **Versionamento:** Git e GitHub

---

## ⚙️ Como Funciona (Arquitetura)

O sistema opera com uma arquitetura desacoplada que se comunica via uma API RESTful simples:

1.  **Interface (Front-End):** Um arquivo `chatbot.html` estático hospedado no GitHub Pages. Ele é responsável por toda a parte visual e pela captura das interações do usuário.
2.  **Cérebro (Back-End):** Um script publicado como **Google Apps Script Web App**. Ele recebe as perguntas, acessa a Planilha Google, executa a lógica de busca e pontuação, registra os logs e retorna a resposta em formato JSON.
3.  **Memória (Base de Dados):** Uma **Planilha Google** armazena todas as perguntas, respostas, palavras-chave e logs, permitindo que o conteúdo seja atualizado em tempo real por qualquer pessoa com permissão.

+----------------+      pergunta      +-------------------+      busca      +------------------+
| Painel (HTML)  |  --------------->  | Apps Script (API) |  ------------>  | Planilha Google  |
| (GitHub Pages) |  <---------------  |      (Cérebro)      |  <------------  |  (Base de Dados) |
+----------------+      resposta      +-------------------+      dados      +------------------+


---

## 🚀 Como Configurar o Projeto

1.  **Planilha Google:** Crie uma planilha com as abas `FAQ`, `Perguntas_Encontradas` e `Perguntas_Nao_Encontradas`. A aba `FAQ` deve ter, no mínimo, as colunas `Pergunta`, `Resposta` e `Palavras-chave`.
2.  **Google Apps Script:** Crie um projeto de script vinculado à planilha. Cole o código do back-end, preencha o `ID_DA_SUA_PLANILHA` e faça uma **Nova implantação** como `App da Web` com acesso para `Qualquer pessoa`.
3.  **Front-End:** No arquivo `chatbot.html`, cole a URL da sua nova implantação na constante `CHAT_API_URL`.
4.  **GitHub:** Faça o upload do arquivo `chatbot.html` (e da pasta `imagens`, se houver) para um repositório e ative o GitHub Pages.

---

## 👨‍💻 Autor

**[Gabriel Araujo]**
