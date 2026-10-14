const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Servicio del Chatbot Asesor IA con Google Gemini para Automotores Marcos
 */

// Inicializar cliente Gemini si existe la API KEY
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'tu_api_key_aqui') {
        return null;
    }
    return new GoogleGenerativeAI(apiKey.trim());
}

/**
 * Obtener vehículos disponibles para proveer como contexto a Gemini
 */
async function getAvailableVehiclesContext(db) {
    try {
        const vehicles = await db.all(`
            SELECT v.id, v.brand, v.model, v.year, v.color, v.mileage, v.price, v.fuel, v.transmission,
                   v.status, v.is_offer, v.offer_price, v.is_hotsale,
                   (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) as photoCount
            FROM vehicles v
            WHERE v.status IN ('Disponible', 'Muy Visto', 'Nuevo Ingreso')
            ORDER BY 
                CASE WHEN v.status = 'Muy Visto' THEN 0 
                     WHEN v.status = 'Nuevo Ingreso' THEN 1 
                     ELSE 2 END ASC,
                photoCount DESC
            LIMIT 50
        `);

        return vehicles.map(v => ({
            id: v.id,
            marca: v.brand,
            modelo: v.model,
            año: v.year,
            color: v.color,
            km: v.mileage,
            precio: v.price ? `$${v.price}` : 'Consultar',
            oferta: v.is_offer ? (v.offer_price ? `$${v.offer_price}` : 'Precio Especial') : null,
            combustible: v.fuel,
            transmision: v.transmission,
            destacado: v.status === 'Muy Visto' || v.is_hotsale === 1
        }));
    } catch (error) {
        console.error('Error al obtener vehículos para el chatbot:', error);
        return [];
    }
}

/**
 * Fallback guiado cuando aún no hay API KEY configurada
 */
function generateFallbackResponse(userMessage, availableVehicles) {
    const lower = (userMessage || '').toLowerCase();
    
    // Si el usuario deja datos de contacto
    const phoneMatch = userMessage.match(/\b(?:\+?54\s?9?)?\d{6,13}\b/);
    if (phoneMatch) {
        return {
            reply: `¡Muchas gracias! Ya registré tu número (${phoneMatch[0]}). Soy Ciruela 🍒 y ya le pasé tu consulta a uno de nuestros vendedores de Automotores Marcos para que te escriba por WhatsApp a la brevedad.`,
            recommendedVehicleIds: availableVehicles.slice(0, 2).map(v => v.id),
            quickReplies: ['Ver más autos', 'Consultar financiación', 'Hablar por WhatsApp'],
            whatsappLink: `https://wa.me/5493562529773?text=Hola!%20Dej%C3%A9%20mis%20datos%20con%20Ciruela%20en%20la%20web%20y%20quiero%20hacer%20una%20consulta`,
            leadCaptured: {
                nombre: 'Cliente Web',
                apellido: '',
                telefono: phoneMatch[0],
                vehiculo: 'Consulta Asesor Ciruela',
                mensaje: userMessage
            }
        };
    }

    if (lower.includes('financia') || lower.includes('pago') || lower.includes('cuota') || lower.includes('dolar') || lower.includes('cheque') || lower.includes('usado') || lower.includes('dni')) {
        return {
            reply: '¡En Automotores Marcos te damos todas las facilidades para que te lleves tu vehículo! 🍒\n\n• **Recibimos usados** en parte de pago al mejor valor.\n• **Financiación SOLO CON DNI** (fácil, rápida y en cuotas).\n• **Recibimos cheques**.\n• **Recibimos dólares sin intereses**.\n\n¿Querés que te preparemos una propuesta a medida o coordinamos para ver algún auto?',
            recommendedVehicleIds: availableVehicles.slice(0, 3).map(v => v.id),
            quickReplies: ['Quiero entregar mi usado', 'Financiar solo con DNI', 'Pagar en dólares', 'Hablar con vendedor'],
            whatsappLink: 'https://wa.me/5493562529773?text=Hola!%20Quiero%20consultar%20por%20financiaci%C3%B3n%20con%20DNI%20o%20recibir%20usado',
            leadCaptured: null
        };
    }

    if (lower.includes('hola') || lower.includes('buenas') || lower.includes('inicio')) {
        return {
            reply: '¡Hola! Soy Ciruela 🍒, tu asesora virtual de Automotores Marcos. ¿Qué tipo de auto o moto estás buscando hoy? Recordá que recibimos usados, financiamos solo con DNI, y aceptamos cheques y dólares sin intereses.',
            recommendedVehicleIds: availableVehicles.slice(0, 3).map(v => v.id),
            quickReplies: ['🚗 Autos y SUVs', '🔥 Ver ofertas', '💳 Financiación', '📝 Lista de espera'],
            whatsappLink: null,
            leadCaptured: null
        };
    }

    if (lower.includes('oferta') || lower.includes('promocion') || lower.includes('descuento')) {
        const ofertas = availableVehicles.filter(v => v.oferta || v.destacado);
        const selection = (ofertas.length ? ofertas : availableVehicles).slice(0, 3);
        return {
            reply: '¡Acá tenés nuestras mejores oportunidades y ofertas destacadas! Recordá que recibimos tu usado, financiamos solo con DNI y aceptamos cheques y dólares sin intereses. ¿Te gustaría que te armemos un plan?',
            recommendedVehicleIds: selection.map(v => v.id),
            quickReplies: ['Quiero ver financiación', '¿Aceptan permuta?', 'Hablar con vendedor'],
            whatsappLink: 'https://wa.me/5493562529773?text=Hola!%20Vi%20las%20ofertas%20en%20la%20web%20con%20Ciruela',
            leadCaptured: null
        };
    }

    // Respuesta estándar con opciones
    const selection = availableVehicles.slice(0, 3);
    return {
        reply: 'Te comparto algunos de nuestros vehículos disponibles en salón. Recordá que recibimos tu usado, financiamos solo con DNI y recibimos cheques o dólares sin intereses. ¡Avisame cuál te gusta!',
        recommendedVehicleIds: selection.map(v => v.id),
        quickReplies: ['Ver financiación', 'Anotarme en lista de espera', 'Hablar por WhatsApp'],
        whatsappLink: null,
        leadCaptured: null
    };
}

/**
 * Procesa el mensaje del usuario con Gemini
 */
async function processChatMessage({ message, history = [], db }) {
    const availableVehicles = await getAvailableVehiclesContext(db);
    const genAI = getGeminiClient();

    // Si no está configurada la API Key, usar modo fallback
    if (!genAI) {
        console.warn('⚠️ GEMINI_API_KEY no configurada. Usando respuesta guiada de respaldo.');
        return generateFallbackResponse(message, availableVehicles);
    }

    const systemPrompt = `
Sos Ciruela 🍒, la asesora virtual inteligente, comercial y muy cordial de "Automotores Marcos", concesionaria líder de autos y motos ubicada en Morteros, Córdoba, Argentina.
Tu objetivo principal es ayudar a los clientes a encontrar su próximo vehículo, resolver sus dudas de manera ágil y detectar cuándo un cliente tiene INTERÉS VERDADERO de compra para conectarlo de inmediato con un vendedor humano o tomarle sus datos de contacto.

Información clave de la agencia y BENEFICIOS EXCLUSIVOS DE COMPRA:
- Ubicación: Morteros, Córdoba.
- Formas de pago y financiación (PUNTOS FUERTES DE VENTA QUE DEBES DESTACAR SIEMPRE QUE PREGUNTEN):
  * RECIBIMOS USADOS / PERMUTAS en parte de pago (a excelente cotización).
  * FINANCIACIÓN SOLO CON DNI: Fácil, rápida y con mínimos requisitos.
  * RECIBIMOS CHEQUES.
  * RECIBIMOS DÓLARES SIN INTERESES (al mejor tipo de cambio, sin ningún recargo ni comisión).
- WhatsApp oficial de ventas: 3562-529773 (número para enlaces: 5493562529773).

Inventario actual en salón (ÚNICAMENTE podés recomendar vehículos que estén en esta lista):
${JSON.stringify(availableVehicles, null, 2)}

Reglas de comportamiento y psicología de ventas:
1. Tono y Personalidad: Sos Ciruela 🍒. Hablás con tono argentino cordial (tuteo respetuoso o voseo amigable, cercano, profesional y entusiasta).
2. Si el cliente pregunta por financiación, formas de pago, entrega de dinero, usados, cuotas, dólares o cheques:
   - EXPLICÁLE CLARAMENTE Y CON ENTUSIASMO los beneficios oficiales:
     "Recibimos usados en parte de pago, hacemos financiación SOLO CON DNI, y recibimos cheques y dólares sin intereses."
3. Si el vehículo ESTÁ en stock:
   - Recomendá de 1 a 3 opciones afines y poné sus IDs en "recommendedVehicleIds".
   - Destacá año, precio y kilometraje.
4. DETECCIÓN DE INTERÉS GENUINO:
   - Se considera verdadero interés si el cliente pregunta por cuotas/financiación, si quiere entregar un usado en parte de pago, si pregunta por ir a probarlo/verlo en la agencia en Morteros, o si muestra entusiasmo con un auto específico.
   - En ese momento, Ciruela debe invitarlo a dar el siguiente paso comercial:
     * Pedirle con calidez su Nombre y número de WhatsApp para que el equipo de ventas le prepare la cotización o coordine la visita.
     * Ofrecerle también hablar ya mismo por WhatsApp con un vendedor.
     * En esos casos de alto interés, generá en "whatsappLink" un enlace con mensaje prearmado:
       "https://wa.me/5493562529773?text=Hola!%20Estuve%20hablando%20con%20Ciruela%20en%20la%20web%20y%20me%20interesa%20[Nombre_Auto]"
5. GESTIÓN DE STOCK QUE NO TENEMOS (LISTA DE ESPERA / ALERTA DE INGRESO):
   - Si el cliente busca una marca, modelo o tipo de auto que NO está en el inventario actual:
     * Aclará con amabilidad que en este momento no lo tenés en el salón, pero que ingresan unidades permanentemente todas las semanas.
     * OFRECÉLE ANOTARLO EN LA LISTA DE ESPERA: Decile que si te deja su Nombre y WhatsApp, le avisamos apenas ingrese esa unidad o ni bien se consiga una.
     * Si el cliente acepta o proporciona su teléfono para un auto sin stock, extraelo en "leadCaptured" poniendo en el campo "vehiculo": "[PEDIDO DE INGRESO] " + el modelo buscado (ej: "[PEDIDO DE INGRESO] Peugeot 208 diesel").
     * En "mensaje" indicá: "El cliente busca este vehículo que no está en stock actualmente. Solicita aviso cuando ingrese."
6. CAPTURA DE LEADS:
   - Si el cliente PROPORCIONA su teléfono / WhatsApp en cualquier momento, extraelo en "leadCaptured". Si no proporcionó teléfono todavía, "leadCaptured" debe ser null.
7. QUICK REPLIES:
   - Generá siempre de 2 a 4 opciones cortas de respuesta rápida ("quickReplies") que empujen la conversación hacia la compra o la cotización.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "reply": "Texto de la respuesta para el cliente firmado o con la voz de Ciruela 🍒",
  "recommendedVehicleIds": [1, 2],
  "quickReplies": ["Texto botón 1", "Texto botón 2"],
  "whatsappLink": "https://wa.me/5493562529773?text=... (o null si aún es una charla inicial)",
  "leadCaptured": {
    "nombre": "Nombre del cliente si lo dio",
    "apellido": "",
    "telefono": "Número de teléfono extraído",
    "vehiculo": "Nombre del auto de stock O '[PEDIDO DE INGRESO] Modelo buscado'",
    "mensaje": "Resumen claro de la consulta o pedido de ingreso"
  } // o null si no dio teléfono
}
`;

    const candidateModels = [process.env.GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest'].filter(Boolean);

    // Formatear historial garantizando que empiece con 'user' y alterne roles según exige Gemini API
    const formattedHistory = [];
    let lastRole = null;
    for (const item of (history || []).slice(-10)) {
        const text = typeof item.text === 'string' ? item.text : '';
        if (!text.trim()) continue;

        if (item.sender === 'user') {
            if (lastRole !== 'user') {
                formattedHistory.push({ role: 'user', parts: [{ text }] });
                lastRole = 'user';
            }
        } else if (item.sender === 'bot') {
            // Solo agregar mensaje de 'model' si previamente hubo un 'user'
            if (lastRole === 'user') {
                formattedHistory.push({ role: 'model', parts: [{ text }] });
                lastRole = 'model';
            }
        }
    }

    for (const modelName of candidateModels) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.4
                },
                systemInstruction: systemPrompt
            });

            const chat = model.startChat({ history: formattedHistory });
            const result = await chat.sendMessage(message);
            const responseText = result.response.text();
            
            const parsed = JSON.parse(responseText);
            return parsed;
        } catch (geminiError) {
            console.warn(`Intento con ${modelName} falló (${geminiError.message.slice(0, 80)}). Probando siguiente opción...`);
        }
    }

    // Si fallan todos los modelos, usar modo de respaldo guiado
    console.warn('⚠️ Todos los modelos de Gemini experimentan alta demanda. Usando respuesta guiada de respaldo.');
    return generateFallbackResponse(message, availableVehicles);
}

module.exports = {
    processChatMessage,
    getAvailableVehiclesContext
};
