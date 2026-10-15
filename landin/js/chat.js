/**
 * Chatbot Asesor Virtual IA - Automotores Marcos
 * Interfaz interactiva y conexión con /api/public/chat
 */

(function () {
    let isOpen = false;
    let isLoading = false;
    let closeTimer = null;
    let messageHistory = [];
    const STORAGE_KEY = 'am_chat_history_v2';

    // Cargar historial previo de sessionStorage si existe
    function loadSavedHistory() {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                messageHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('No se pudo leer el historial del chat:', e);
            messageHistory = [];
        }
    }

    function saveHistory() {
        try {
            // Guardar solo los últimos 15 mensajes
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messageHistory.slice(-15)));
        } catch (e) {
            console.warn('No se pudo guardar el historial:', e);
        }
    }

    // Inicializar widget en el DOM
    function initChatWidget() {
        // Contenedor principal del widget
        const container = document.createElement('div');
        container.id = 'ai-chat-widget';
        container.className = 'ai-chat-widget';

        container.innerHTML = `
            <div id="ai-chat-teaser" class="ai-chat-teaser">
                <span class="ai-chat-teaser-dot" aria-hidden="true"></span>
                <span>¿Buscás auto? <strong>Preguntale a Ciruela</strong></span>
            </div>

            <button id="ai-chat-toggle-btn" 
                    aria-label="Abrir chat con Ciruela"
                    aria-expanded="false"
                    aria-controls="ai-chat-window"
                    class="ai-chat-toggle">
                <span id="ai-chat-btn-icon" class="ai-chat-toggle-icon">
                    <img src="/assets/ciruela-assistant.png" alt="" class="ai-chat-toggle-image">
                    <i class="fa-solid fa-chevron-down ai-chat-toggle-close" aria-hidden="true"></i>
                </span>
                <span class="ai-chat-toggle-status" aria-hidden="true"></span>
            </button>

            <div id="ai-chat-window" 
                 class="ai-chat-window hidden"
                 role="dialog"
                 aria-label="Chat con Ciruela">
                
                <div class="ai-chat-header">
                    <div class="ai-chat-header-identity">
                        <div class="ai-chat-header-avatar">
                            <img src="/assets/ciruela-assistant.png" alt="">
                        </div>
                        <div class="ai-chat-header-copy">
                            <h3>Ciruela <span>Asesora virtual</span></h3>
                            <p><span class="ai-chat-online-dot" aria-hidden="true"></span> Automotores Marcos · En línea</p>
                        </div>
                    </div>

                    <div class="ai-chat-header-actions">
                        <button id="ai-chat-reset-btn" type="button" title="Reiniciar conversación" aria-label="Reiniciar conversación" class="ai-chat-icon-button">
                            <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                        </button>
                        <button id="ai-chat-close-btn" type="button" title="Cerrar chat" aria-label="Cerrar chat" class="ai-chat-icon-button">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <div id="ai-chat-messages" class="ai-chat-messages" aria-live="polite"></div>

                <div id="ai-chat-quick-replies" class="ai-chat-quick-replies"></div>

                <div class="ai-chat-footer">
                    <form id="ai-chat-form" class="ai-chat-form">
                        <input id="ai-chat-input" 
                               type="text" 
                               placeholder="Escribí qué auto buscás o tu duda..." 
                               maxlength="300"
                               autocomplete="off"
                               aria-label="Escribí tu mensaje"
                               class="ai-chat-input">
                        <button id="ai-chat-send-btn" 
                                type="submit" 
                                aria-label="Enviar mensaje"
                                class="ai-chat-send">
                            <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
                        </button>
                    </form>
                    <div class="ai-chat-footer-meta">
                        <span>
                            <i class="fa-solid fa-sparkles" aria-hidden="true"></i> Respuestas en segundos con Ciruela
                        </span>
                        <a href="#" onclick="event.preventDefault(); const url = (window.getWhatsAppUrl ? window.getWhatsAppUrl('Hola, quiero hablar con un vendedor') : 'https://wa.me/5493562563478?text=Hola'); window.open(url, '_blank');">
                            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Hablar con un vendedor
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        bindEvents();
        loadSavedHistory();

        if (messageHistory.length === 0) {
            renderInitialGreeting();
        } else {
            renderAllMessages();
        }
    }

    // Saludo inicial predeterminado
    function renderInitialGreeting() {
        const welcomeText = '¡Hola! Soy **Ciruela 🍒**, tu asesora virtual en **Automotores Marcos**.\n\n¿Qué tipo de vehículo estás buscando hoy o qué duda tenés? Si buscás un modelo puntual que no tengamos en stock, ¡avisame y te anoto en nuestra lista de espera para avisarte apenas ingrese!';
        const initialQuickReplies = [
            '🚗 Ver autos y SUVs',
            '🔥 Ver ofertas destacadas',
            '💳 ¿Cómo es la financiación?',
            '📝 Avisarme de nuevos ingresos',
            '🤝 Entregar mi usado (permuta)'
        ];

        addBotMessage({
            reply: welcomeText,
            quickReplies: initialQuickReplies,
            vehicles: [],
            whatsappLink: null
        });
    }

    // Asignación de Event Listeners
    function bindEvents() {
        const toggleBtn = document.getElementById('ai-chat-toggle-btn');
        const closeBtn = document.getElementById('ai-chat-close-btn');
        const resetBtn = document.getElementById('ai-chat-reset-btn');
        const teaser = document.getElementById('ai-chat-teaser');
        const form = document.getElementById('ai-chat-form');

        toggleBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', closeChat);
        teaser.addEventListener('click', openChat);

        resetBtn.addEventListener('click', () => {
            if (confirm('¿Querés reiniciar la conversación?')) {
                messageHistory = [];
                sessionStorage.removeItem(STORAGE_KEY);
                const msgBox = document.getElementById('ai-chat-messages');
                msgBox.innerHTML = '';
                renderInitialGreeting();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('ai-chat-input');
            const message = input.value.trim();
            if (!message || isLoading) return;

            input.value = '';
            sendMessage(message);
        });
    }

    function toggleChat() {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    function openChat() {
        isOpen = true;
        const win = document.getElementById('ai-chat-window');
        const teaser = document.getElementById('ai-chat-teaser');
        const widget = document.getElementById('ai-chat-widget');
        const toggle = document.getElementById('ai-chat-toggle-btn');

        clearTimeout(closeTimer);
        win.classList.remove('hidden');
        requestAnimationFrame(() => win.classList.add('is-visible'));

        teaser.style.display = 'none';
        widget.classList.add('chat-open');
        document.body.classList.add('ai-chat-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Cerrar chat con Ciruela');

        scrollToBottom();
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input && window.innerWidth > 640) input.focus();
        }, 200);
    }

    function closeChat() {
        isOpen = false;
        const win = document.getElementById('ai-chat-window');
        const widget = document.getElementById('ai-chat-widget');
        const toggle = document.getElementById('ai-chat-toggle-btn');

        win.classList.remove('is-visible');
        widget.classList.remove('chat-open');
        document.body.classList.remove('ai-chat-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir chat con Ciruela');
        closeTimer = setTimeout(() => {
            win.classList.add('hidden');
        }, 240);
    }

    // Agregar mensaje del usuario a la vista y al historial
    function addUserMessage(text) {
        messageHistory.push({ sender: 'user', text });
        saveHistory();

        const msgBox = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = 'ai-chat-message ai-chat-message-user';
        div.innerHTML = `
            <div class="ai-chat-user-bubble">
                ${escapeHtml(text)}
            </div>
        `;
        msgBox.appendChild(div);
        scrollToBottom();
    }

    // Agregar mensaje del bot a la vista
    function addBotMessage(data) {
        messageHistory.push({
            sender: 'bot',
            text: data.reply,
            vehicles: data.vehicles || [],
            quickReplies: data.quickReplies || [],
            whatsappLink: data.whatsappLink || null
        });
        saveHistory();

        renderBotMessageItem(data);
        renderQuickReplies(data.quickReplies || []);
    }

    function renderBotMessageItem(data) {
        const msgBox = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = 'ai-chat-message ai-chat-message-bot';

        // Formatear markdown básico (*negrita*, saltos de línea)
        let formattedText = escapeHtml(data.reply || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        let vehiclesHtml = '';
        if (data.vehicles && data.vehicles.length > 0) {
            vehiclesHtml = `
                <div class="ai-chat-vehicle-grid">
                    ${data.vehicles.map(v => `
                        <div class="ai-chat-vehicle-card">
                            <button type="button" class="ai-chat-vehicle-photo"
                                    onclick="if(window.openVehicleModal) window.openVehicleModal(${v.id})"
                                    aria-label="Ver fotos de ${v.brand} ${v.model}">
                                ${v.photoUrl 
                                    ? `<img src="${v.photoUrl}" alt="">`
                                    : `<i class="fa-solid fa-car" aria-hidden="true"></i>`}
                            </button>
                            <div class="ai-chat-vehicle-details">
                                <h4>${v.brand} ${v.model}</h4>
                                <p>${v.year} · ${v.mileage ? v.mileage.toLocaleString() + ' km' : '0 km'} · ${v.fuel || ''}</p>
                                <span class="ai-chat-vehicle-price">${v.is_offer && v.offer_price ? '$' + v.offer_price.toLocaleString() : (v.price ? '$' + v.price.toLocaleString() : 'Consultar')}</span>
                                <div class="ai-chat-vehicle-actions">
                                        <button type="button" onclick="if(window.openVehicleModal) window.openVehicleModal(${v.id})"
                                                class="ai-chat-vehicle-action ai-chat-vehicle-action-secondary"
                                                title="Ver fotos y ficha completa">
                                            Ver fotos
                                        </button>
                                        <button type="button" onclick="window.askForVehicle('${v.brand} ${v.model} (${v.year})')"
                                                class="ai-chat-vehicle-action ai-chat-vehicle-action-primary">
                                            Me interesa
                                        </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Bloque de WhatsApp directo si hay link generado por Ciruela
        let whatsappCta = '';
        if (data.whatsappLink) {
            whatsappCta = `
                <div class="ai-chat-whatsapp-cta">
                    <span>
                        <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> ¿Querés hablar directo con un vendedor?
                    </span>
                    <a href="${data.whatsappLink}" target="_blank" 
                       class="ai-chat-whatsapp-link">
                        <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
                        <span>Contactar por WhatsApp ahora</span>
                    </a>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="ai-chat-bot-row">
                <div class="ai-chat-message-avatar">
                    <img src="/assets/ciruela-assistant.png" alt="">
                </div>
                <div class="ai-chat-bot-bubble">
                    ${formattedText}
                    ${vehiclesHtml}
                    ${whatsappCta}
                </div>
            </div>
        `;

        msgBox.appendChild(div);
        scrollToBottom();
    }

    // Renderizar botones de respuesta rápida
    function renderQuickReplies(replies) {
        const container = document.getElementById('ai-chat-quick-replies');
        if (!replies || replies.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = replies.map(btnText => `
            <button type="button" 
                    class="quick-reply-pill ai-chat-quick-reply">
                ${escapeHtml(btnText)}
            </button>
        `).join('');

        container.querySelectorAll('.quick-reply-pill').forEach(button => {
            button.addEventListener('click', () => {
                const text = button.textContent.trim();
                sendMessage(text);
            });
        });
    }

    // Indicador de "escribiendo..."
    function showTypingIndicator() {
        const msgBox = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.id = 'ai-typing-indicator';
        div.className = 'ai-chat-message ai-chat-typing';
        div.innerHTML = `
            <div class="ai-chat-message-avatar">
                <img src="/assets/ciruela-assistant.png" alt="">
            </div>
            <div class="ai-chat-typing-bubble" aria-label="Ciruela está escribiendo">
                <span></span><span></span><span></span>
            </div>
        `;
        msgBox.appendChild(div);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();
    }

    // Envío de mensaje al backend
    async function sendMessage(text) {
        addUserMessage(text);
        renderQuickReplies([]); // Limpiar quick replies mientras responde

        isLoading = true;
        const sendBtn = document.getElementById('ai-chat-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        showTypingIndicator();

        try {
            const response = await fetch('/api/public/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: messageHistory.slice(-8)
                })
            });

            removeTypingIndicator();

            if (!response.ok) {
                throw new Error('Error en el servidor');
            }

            const data = await response.json();
            addBotMessage(data);

        } catch (error) {
            console.error('Error enviando mensaje al chatbot:', error);
            removeTypingIndicator();
            addBotMessage({
                reply: 'Disculpá, tuvimos un inconveniente momentáneo para procesar tu consulta. Si querés, podés escribirnos directamente a nuestro WhatsApp oficial: 3562-529773.',
                quickReplies: ['Hablar por WhatsApp', 'Reintentar'],
                vehicles: []
            });
        } finally {
            isLoading = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    // Re-renderizar todos los mensajes si venían de sessionStorage
    function renderAllMessages() {
        const msgBox = document.getElementById('ai-chat-messages');
        msgBox.innerHTML = '';
        messageHistory.forEach(item => {
            if (item.sender === 'user') {
                const div = document.createElement('div');
                div.className = 'ai-chat-message ai-chat-message-user';
                div.innerHTML = `
                    <div class="ai-chat-user-bubble">
                        ${escapeHtml(item.text)}
                    </div>
                `;
                msgBox.appendChild(div);
            } else {
                renderBotMessageItem(item);
                if (item.quickReplies) {
                    renderQuickReplies(item.quickReplies);
                }
            }
        });
        scrollToBottom();
    }

    function scrollToBottom() {
        const msgBox = document.getElementById('ai-chat-messages');
        if (msgBox) {
            msgBox.scrollTop = msgBox.scrollHeight;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Función global para cuando el usuario hace clic en "Me interesa" en una tarjeta
    window.askForVehicle = function (vehicleName) {
        sendMessage(`Me interesa el ${vehicleName}. ¿Qué detalles o financiación tienen?`);
    };

    // Inicializar al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatWidget);
    } else {
        initChatWidget();
    }
})();
