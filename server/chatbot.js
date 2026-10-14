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
            reply: `¡Muchas gracias! Ya registramos tu número (${phoneMatch[0]}). Un asesor de Automotores Marcos te va a escribir por WhatsApp a la brevedad para asesorarte personalmente.`,
            recommendedVehicleIds: availableVehicles.slice(0, 2).map(v => v.id),
            quickReplies: ['Ver más autos', 'Consultar financiación', 'Ubicación de la agencia'],
            leadCaptured: {
                nombre: 'Cliente Web',
                apellido: '',
                telefono: phoneMatch[0],
                vehiculo: 'Consulta general catálogo',
                mensaje: userMessage
            }
        };
    }

    if (lower.includes('hola') || lower.includes('buenas') || lower.includes('inicio')) {
        return {
            reply: '¡Hola! Bienvenido a Automotores Marcos. Soy tu asesor virtual. ¿Qué tipo de vehículo estás buscando hoy?',
            recommendedVehicleIds: availableVehicles.slice(0, 3).map(v => v.id),
            quickReplies: ['🚗 Autos y SUVs', '🔥 Ofertas destacadas', '💳 Planes de Financiación', '🤝 Entregar mi usado'],
            leadCaptured: null
        };
    }

    if (lower.includes('oferta') || lower.includes('promocion') || lower.includes('descuento')) {
        const ofertas = availableVehicles.filter(v => v.oferta || v.destacado);
        const selection = (ofertas.length ? ofertas : availableVehicles).slice(0, 3);
        return {
            reply: '¡Acá tenés nuestras mejores oportunidades y ofertas destacadas del momento! ¿Te gustaría que te coticemos alguno?',
            recommendedVehicleIds: selection.map(v => v.id),
            quickReplies: ['Quiero ver financiación', '¿Aceptan permuta?', 'Hablar por WhatsApp'],
            leadCaptured: null
        };
    }

    // Respuesta estándar con opciones
    const selection = availableVehicles.slice(0, 3);
    return {
        reply: 'Te comparto algunos de nuestros vehículos disponibles en salón. Contame qué año, marca o presupuesto tenés en mente, o pasame tu WhatsApp para que te contacte un asesor.',
        recommendedVehicleIds: selection.map(v => v.id),
        quickReplies: ['Ver financiación', 'Tengo un usado para entregar', 'Ver ofertas'],
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
Sos Marcos, el asesor virtual inteligente y cordial de "Automotores Marcos", una prestigiosa concesionaria de autos y motos ubicada en Morteros, Córdoba, Argentina.
Tu objetivo es ayudar a los clientes a encontrar el vehículo ideal, resolver sus dudas de forma clara y amigable, y capturar sus datos de contacto (Nombre y WhatsApp) cuando muestren interés real para que un vendedor humano los contacte.

Información del negocio:
- Ubicación: Morteros, Córdoba.
- Formas de pago: Recibimos usados / permutas en parte de pago, financiación bancaria y créditos a sola firma con cuotas fijas o en pesos.
- WhatsApp oficial de la agencia: 3562-529773.

Inventario actual disponible en salón (ÚNICAMENTE podés recomendar vehículos que estén en esta lista):
${JSON.stringify(availableVehicles, null, 2)}

Reglas obligatorias:
1. Respuestas concisas, claras y profesionales, con tono argentino cordial (usá tuteo respetuoso o voseo amigable, sin exagerar).
2. NUNCA inventes vehículos que no estén en la lista anterior. Si el cliente busca algo que no está, decile amablemente que no lo tenés en stock inmediato pero que ingresan unidades todas las semanas y recomendale la alternativa más parecida de la lista.
3. En cada respuesta, si corresponde según la consulta, seleccioná de 1 a 3 IDs de los vehículos más afines para colocarlos en "recommendedVehicleIds".
4. Si el cliente pregunta por financiación, permuta o muestra interés directo en comprar/probar un auto, pedile amablemente su Nombre y número de WhatsApp para que el equipo de ventas le prepare la cotización o coordine la visita.
5. Si el cliente PROPORCIONA su teléfono / WhatsApp y/o su nombre en el mensaje o en la conversación, extraelo y colócalo en el campo "leadCaptured". Si no ha proporcionado su teléfono todavía, "leadCaptured" debe ser null.
6. Generá siempre de 2 a 4 opciones cortas de respuesta rápida ("quickReplies") para facilitarle el próximo clic al usuario.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "reply": "Texto de la respuesta para el cliente",
  "recommendedVehicleIds": [1, 2],
  "quickReplies": ["Texto botón 1", "Texto botón 2", "Texto botón 3"],
  "leadCaptured": {
    "nombre": "Nombre del cliente si lo dio",
    "apellido": "",
    "telefono": "Número de teléfono extraído",
    "vehiculo": "Vehículo de interés",
    "mensaje": "Breve resumen de la consulta"
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
