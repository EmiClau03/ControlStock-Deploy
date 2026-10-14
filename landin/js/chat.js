/**
 * Chatbot Asesor Virtual IA - Automotores Marcos
 * Interfaz interactiva y conexión con /api/public/chat
 */

(function () {
    let isOpen = false;
    let isLoading = false;
    let messageHistory = [];
    const STORAGE_KEY = 'am_chat_history_v1';

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
        container.className = 'fixed bottom-24 right-6 z-[48] flex flex-col items-end select-none';

        container.innerHTML = `
            <!-- Teaser Tooltip flotante (se oculta al abrir el chat) -->
            <div id="ai-chat-teaser" class="mb-3 bg-white text-slate-800 text-xs font-medium px-3 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105 animate-bounce">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>¿Buscás auto? <strong>Te asesoro con IA 👋</strong></span>
            </div>

            <!-- Botón Flotante Redondo -->
            <button id="ai-chat-toggle-btn" 
                    aria-label="Abrir Asesor Virtual"
                    class="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all duration-300 hover:scale-110 active:scale-95 relative">
                <i id="ai-chat-btn-icon" class="fa-solid fa-robot text-2xl transition-transform duration-300"></i>
                <span class="absolute -top-1 -right-1 flex h-4 w-4">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] text-white font-bold items-center justify-center">1</span>
                </span>
            </button>

            <!-- Ventana de Conversación (Modal / Drawer) -->
            <div id="ai-chat-window" 
                 class="hidden fixed sm:absolute bottom-0 sm:bottom-16 right-0 sm:right-0 w-full sm:w-[380px] md:w-[420px] h-[100dvh] sm:h-[580px] max-h-[100dvh] sm:max-h-[85vh] bg-white rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[50] transition-all duration-300 transform scale-95 opacity-0">
                
                <!-- Header -->
                <div class="bg-gradient-to-r from-slate-900 via-brand-900 to-blue-900 text-white p-4 flex items-center justify-between border-b border-white/10 shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
                                <i class="fa-solid fa-headset text-lg"></i>
                            </div>
                            <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                        </div>
                        <div>
                            <h3 class="font-heading font-bold text-sm tracking-wide flex items-center gap-1.5">
                                Marcos • Asesor Virtual
                                <span class="bg-blue-500/30 text-blue-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">IA</span>
                            </h3>
                            <p class="text-[11px] text-slate-300">Automotores Marcos • En línea</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-1">
                        <button id="ai-chat-reset-btn" title="Reiniciar conversación" class="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <i class="fa-solid fa-rotate-right text-xs"></i>
                        </button>
                        <button id="ai-chat-close-btn" title="Cerrar chat" class="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Lista de Mensajes -->
                <div id="ai-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70 text-sm">
                    <!-- Mensajes dinámicos aquí -->
                </div>

                <!-- Contenedor de Botones Rápidos (Quick Replies) -->
                <div id="ai-chat-quick-replies" class="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <!-- Botones rápidos generados por IA o bienvenida -->
                </div>

                <!-- Input Footer -->
                <div class="p-3 bg-white border-t border-slate-200">
                    <form id="ai-chat-form" class="flex items-center gap-2">
                        <input id="ai-chat-input" 
                               type="text" 
                               placeholder="Escribí qué auto buscás o tu duda..." 
                               maxlength="300"
                               autocomplete="off"
                               class="flex-1 bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all">
                        <button id="ai-chat-send-btn" 
                                type="submit" 
                                class="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center shadow-md transition-all active:scale-95 disabled:pointer-events-none">
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                    </form>
                    <div class="flex items-center justify-between mt-1.5 px-1">
                        <span class="text-[10px] text-slate-400 flex items-center gap-1">
                            <i class="fa-solid fa-sparkles text-blue-500"></i> Respuestas en segundos con IA
                        </span>
                        <a href="https://wa.me/5493562529773" target="_blank" class="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                            <i class="fa-brands fa-whatsapp"></i> Hablar con un humano
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
        const welcomeText = '¡Hola! Te doy la bienvenida a **Automotores Marcos**. Soy tu asesor virtual inteligente.\n\n¿Qué tipo de vehículo estás buscando hoy o qué consulta tenés?';
        const initialQuickReplies = [
            '🚗 Ver autos y SUVs',
            '🔥 Ver ofertas destacadas',
            '💳 ¿Cómo es la financiación?',
            '🤝 Entregar un usado (permuta)'
        ];

        addBotMessage({
            reply: welcomeText,
            quickReplies: initialQuickReplies,
            vehicles: []
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
        const icon = document.getElementById('ai-chat-btn-icon');

        win.classList.remove('hidden');
        setTimeout(() => {
            win.classList.remove('scale-95', 'opacity-0');
            win.classList.add('scale-100', 'opacity-100');
        }, 10);

        teaser.style.display = 'none';
        icon.className = 'fa-solid fa-chevron-down text-xl';

        scrollToBottom();
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input && window.innerWidth > 640) input.focus();
        }, 200);
    }

    function closeChat() {
        isOpen = false;
        const win = document.getElementById('ai-chat-window');
        const icon = document.getElementById('ai-chat-btn-icon');

        win.classList.remove('scale-100', 'opacity-100');
        win.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            win.classList.add('hidden');
        }, 300);

        icon.className = 'fa-solid fa-robot text-2xl';
    }

    // Agregar mensaje del usuario a la vista y al historial
    function addUserMessage(text) {
        messageHistory.push({ sender: 'user', text });
        saveHistory();

        const msgBox = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = 'flex justify-end';
        div.innerHTML = `
            <div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-xs sm:text-sm shadow-sm leading-relaxed break-words">
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
            quickReplies: data.quickReplies || []
        });
        saveHistory();

        renderBotMessageItem(data);
        renderQuickReplies(data.quickReplies || []);
    }

    function renderBotMessageItem(data) {
        const msgBox = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = 'flex flex-col items-start gap-2 max-w-[95%] sm:max-w-[90%]';

        // Formatear markdown básico (*negrita*, saltos de línea)
        let formattedText = escapeHtml(data.reply || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        let vehiclesHtml = '';
        if (data.vehicles && data.vehicles.length > 0) {
            vehiclesHtml = `
                <div class="grid grid-cols-1 gap-2 mt-2 w-full">
                    ${data.vehicles.map(v => `
                        <div class="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-shadow flex gap-3 items-center">
                            <div class="w-20 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                ${v.photoUrl 
                                    ? `<img src="${v.photoUrl}" alt="${v.brand} ${v.model}" class="w-full h-full object-cover">` 
                                    : `<i class="fa-solid fa-car text-slate-300 text-xl"></i>`}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-xs text-slate-800 truncate">${v.brand} ${v.model}</h4>
                                <p class="text-[11px] text-slate-500">${v.year} • ${v.mileage ? v.mileage.toLocaleString() + ' km' : '0 km'} • ${v.fuel || ''}</p>
                                <div class="flex items-center justify-between mt-1">
                                    <span class="text-xs font-bold text-blue-700">${v.is_offer && v.offer_price ? '$' + v.offer_price.toLocaleString() : (v.price ? '$' + v.price.toLocaleString() : 'Consultar')}</span>
                                    <button onclick="window.askForVehicle('${v.brand} ${v.model} (${v.year})')" 
                                            class="text-[10px] bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white px-2 py-1 rounded-md font-medium transition-colors">
                                        Me interesa
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        div.innerHTML = `
            <div class="flex items-start gap-2">
                <div class="w-7 h-7 rounded-full bg-slate-900 text-white flex-shrink-0 flex items-center justify-center text-[11px] shadow-sm mt-0.5">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="bg-white text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-xs sm:text-sm shadow-sm border border-slate-100 leading-relaxed">
                    ${formattedText}
                    ${vehiclesHtml}
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
                    class="quick-reply-pill flex-shrink-0 text-[11px] sm:text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-full px-3 py-1.5 transition-all active:scale-95 whitespace-nowrap">
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
        div.className = 'flex items-center gap-2 max-w-[80%]';
        div.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-slate-900 text-white flex-shrink-0 flex items-center justify-center text-[11px] shadow-sm">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span class="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
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
                div.className = 'flex justify-end';
                div.innerHTML = `
                    <div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-xs sm:text-sm shadow-sm leading-relaxed break-words">
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
