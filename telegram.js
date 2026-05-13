const https = require('https');
const BASE = 'api.telegram.org';

function api(method, data) {
    return new Promise((resolve, reject) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return reject('No TELEGRAM_BOT_TOKEN');

        const body = JSON.stringify(data);
        const opts = {
            hostname: BASE,
            path: `/bot${token}/${method}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 10000
        };
        const req = https.request(opts, res => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                catch { resolve(null); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject('timeout'); });
        req.write(body);
        req.end();
    });
}

// Enviar mensaje a un chat
async function send(chatId, text, extra = {}) {
    return api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false, ...extra });
}

// Configurar comandos del bot
async function setCommands() {
    return api('setMyCommands', {
        commands: [
            { command: 'start', description: '🏠 Inicio — Comandos disponibles' },
            { command: 'reporte', description: '📊 Reporte completo del proyecto' },
            { command: 'planos', description: '📐 Ver planos y distribución' },
            { command: 'finanzas', description: '💰 Estado financiero y rentabilidad' },
            { command: 'fase1', description: '📦 Fase 1 — 2 Deptos 3×9m' },
            { command: 'proveedores', description: '🏭 Comparativa de costos' },
            { command: 'link', description: '🔗 Links de acceso al proyecto' }
        ]
    });
}

// ====== COMANDOS ======

function cmdStart(chatId) {
    const msg = `🏠 <b>Casona Lo Blanco — San Bernardo</b>

🚇 Estación Lo Blanco · Terreno 9×17m (153m²)

<b>Comandos disponibles:</b>
/start — Esta ayuda
/reporte — Reporte completo del proyecto
/planos — Ver planos y distribución
/finanzas — Estado financiero
/fase1 — Fase 1: 2 Deptos 3×9m
/proveedores — Comparativa de costos
/link — Links de acceso

👥 Invita a tu equipo al bot para que todos vean la info.`;
    send(chatId, msg);
}

function cmdReporte(chatId) {
    const msg = `📊 <b>REPORTE COMPLETO — CASONA LO BLANCO</b>

━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Ubicación:</b> San Bernardo, Estación Lo Blanco
📐 <b>Terreno:</b> 9m × 17m = 153m²
🏠 <b>Casona:</b> 2 pisos (9×12m = 216m²) — 6 piezas
📦 <b>2 Deptos Arriendo:</b> 3×9m = 27m² c/u
🌿 <b>Patio:</b> 2×9m = 18m²
━━━━━━━━━━━━━━━━━━━━━━

<b>💰 FINANZAS — Fase 1 (Recomendada)</b>
• Mano obra (William Díaz): $16.2M
• Materiales (Homecenter): $15.1M
• Otros: $8.6M
• <b>Total: ~$40M</b>
• Ingreso mensual: $700K
• Payback: ~5.5 años
• Rentabilidad: ~18%

<b>📈 ESTRATEGIA</b>
Fase 1 → 2 deptos (4 meses) → $700K/mes
Fase 2 → Casona (con flujo de deptos)

<b>👷 PROVEEDORES</b>
• William Díaz: $300K/m²
• Homecenter Constructor: -15% + envío gratis
• Casas Otal: $700K/m² llave en mano

/link — Abrir landing page y planos`;
    send(chatId, msg);
}

function cmdPlanos(chatId) {
    const msg = `📐 <b>PLANOS Y DISTRIBUCIÓN</b>

🏠 <b>Casona 2 Pisos (9×12m = 108m² c/piso)</b>
<b>PB:</b> Living 22m² · Cocina 14m² · Baño 9m² · Pieza 1 · Pieza 2 · Hall+Escalera
<b>PA:</b> Pieza 3 · Pieza 4 · Pieza 5 · Pieza 6 · Terraza 36m²

📦 <b>2 Deptos Arriendo (3×9m = 27m² c/u)</b>
• Depto 1 (PB): Living+Kitchen 9m² · Baño 2.7m² · Dormitorio 10.5m²
• Depto 2 (PA): Igual distribución, acceso por escalera exterior
🌿 Patio común 18m²

✅ <b>Medidas verificadas:</b> 12m + 3m + 2m = 17m ✓
✅ <b>Superficie total:</b> 108+108+27+27+18 = 153m² ✓

🔗 <b>Ver plano interactivo:</b>
http://localhost:3001/minideptos#plano`;
    send(chatId, msg);
}

function cmdFinanzas(chatId) {
    const msg = `💰 <b>ESTADO FINANCIERO</b>

━━━━━━━━━━━━━━━━━━━━━━
<b>FASE 1 — 2 DEPTOS (RECOMENDADA)</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>Inversión: ~$40M</b>
👷 William Díaz: $16.2M (54m² × $300K)
🛠️ Homecenter Materiales: $15.1M
🚜 Demolición + permisos: $5.0M
🛡️ Contingencia: $3.6M

<b>Ingresos:</b>
💰 Arriendo: $350K c/u = $700K/mes
📆 Desde: mes 5
📈 Rentabilidad: ~18% anual
⏱️ Payback: ~5.5 años

<b>vs OTRAS OPCIONES:</b>
🏭 Casas Otal (llave en mano): $700K/m²
🏗️ Steel Frame mercado: ~$450K/m²
⭐ William + Homecenter: ~$300K/m² + materiales

🔗 <b>Análisis completo:</b>
http://localhost:3001/minideptos#finanzas`;
    send(chatId, msg);
}

function cmdFase1(chatId) {
    const msg = `📦 <b>FASE 1 — 2 DEPTOS 3×9m</b>

<b>Inversión Total: ~$40.000.000</b>

<b>👷 Mano de obra — William Díaz</b>
• $300K/m² × 54m² = $16.2M

<b>🛠️ Materiales — Homecenter Constructor</b>
• Paneles Steel Frame: $3.5M
• Inst. eléctrica: $2.2M
• Inst. sanitaria: $1.8M
• Pisos vinílicos SPC: $1.4M
• 2 Kitchenettes: $2.4M
• 2 Baños completos: $1.6M
• Puertas + ventanas PVC: $2.1M
• Pintura + acabados: $1.2M
• Conexiones agua/luz/gas: $1.6M
• <b>Total materiales: $15.1M</b>
• 🏷️ <i>Descuento -15% + envío gratis</i>

<b>🚜 Otros:</b>
• Demolición parcial: $2.5M
• Arquitecto + permisos: $2.5M
• Contingencia 10%: $3.6M

<b>📅 Timeline:</b>
Mes 1 → Permisos + compras ($5M)
Mes 2 → Demolición + fundaciones ($6M)
Mes 3 → Estructura + instalar ($18M)
Mes 4 → Terminaciones ($11M)
Mes 5 → <b>🎉 $700K/mes!</b>

🔗 http://localhost:3001/minideptos#phased`;
    send(chatId, msg);
}

function cmdProveedores(chatId) {
    const msg = `🏭 <b>COMPARATIVA DE PROVEEDORES</b>

<b>⭐ William Díaz (tu cuñado)</b>
• $300K/m² — Mano de obra
• Precio directo, sin margen
• Confianza total
• 54m² (2 deptos) = $16.2M

<b>🛠️ Homecenter Constructor</b>
• Materiales con descuento
• Envío gratis a obra
• Todo en 1 lugar
• ~$15.1M para 2 deptos

<b>🏭 Casas Otal (@otalcasasprefabricadas)</b>
• $700K/m² — Llave en mano
• Premium, todo incluido
• 2 deptos: $37.8M
• Proyecto completo: $189M

<b>🏗️ Steel Frame (referencia mercado)</b>
• ~$450K/m²
• 2 deptos solo estructura: ~$24.3M

<b>💡 Recomendación:</b>
Fase 1 con William + Homecenter = ~$40M
vs Otal = $37.8M (solo estructura, sin terminar)

🔗 http://localhost:3001/minideptos#proveedores`;
    send(chatId, msg);
}

function cmdLink(chatId) {
    const msg = `🔗 <b>LINKS DE ACCESO</b>

<b>🏠 Landing Page (proyecto completo):</b>
http://localhost:3001/minideptos

<b>📊 Panel de Control:</b>
http://localhost:3001/panel

<b>🎨 Generar Planos con IA:</b>
http://localhost:3001/generar-planos

<b>📐 Plano y distribución:</b>
http://localhost:3001/minideptos#plano

<b>💰 Análisis financiero:</b>
http://localhost:3001/minideptos#finanzas

<b>📦 Fase 1 — 2 Deptos:</b>
http://localhost:3001/minideptos#phased

<b>📅 Cronograma:</b>
http://localhost:3001/minideptos#timeline

<b>🏭 Proveedores:</b>
http://localhost:3001/minideptos#proveedores

━━━━━━━━━━━━━━━━━━━━━━
ℹ️ Servidor en localhost:3001
👥 Comparte este bot con tu equipo usando @sanbernardo_360_bot`;
    send(chatId, msg);
}

// Procesar mensajes entrantes
async function handleUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === '/start' || text.startsWith('/start')) return cmdStart(chatId);
    if (text === '/reporte') return cmdReporte(chatId);
    if (text === '/planos') return cmdPlanos(chatId);
    if (text === '/finanzas') return cmdFinanzas(chatId);
    if (text === '/fase1') return cmdFase1(chatId);
    if (text === '/proveedores') return cmdProveedores(chatId);
    if (text === '/link' || text === '/links') return cmdLink(chatId);

    // Mensaje desconocido
    send(chatId, `🤖 Comando no reconocido. Usa /start para ver los comandos disponibles.`);
}

module.exports = { send, setCommands, handleUpdate, api, cmdStart, cmdReporte, cmdPlanos, cmdFinanzas, cmdFase1, cmdProveedores, cmdLink };
