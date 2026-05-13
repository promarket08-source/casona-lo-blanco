const https = require('https');
const db = require('./database.js');
const BASE = 'api.telegram.org';
const fs = require('fs');
const path = require('path');

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
            timeout: 15000
        };
        const req = https.request(opts, res => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve(null); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject('timeout'); });
        req.write(body);
        req.end();
    });
}

async function send(chatId, text, extra = {}) {
    return api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false, ...extra });
}

async function sendWithKeyboard(chatId, text, buttons) {
    return api('sendMessage', {
        chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false,
        reply_markup: { inline_keyboard: buttons }
    });
}

async function answerCallback(queryId, text) {
    return api('answerCallbackQuery', { callback_query_id: queryId, text, show_alert: false });
}

async function editMessage(chatId, msgId, text) {
    return api('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML' });
}

// Descargar archivo de Telegram
async function downloadFile(fileId, destPath) {
    if (process.env.VERCEL) return null;
    try {
        const fileInfo = await api('getFile', { file_id: fileId });
        if (!fileInfo?.result?.file_path) return null;
        const filePath = fileInfo.result.file_path;
        const token = process.env.TELEGRAM_BOT_TOKEN;
        return new Promise((resolve) => {
            const dir = path.dirname(destPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const req = https.get(`https://api.telegram.org/file/bot${token}/${filePath}`, res => {
                if (res.statusCode !== 200) return resolve(null);
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    fs.writeFileSync(destPath, Buffer.concat(chunks));
                    resolve(destPath);
                });
            });
            req.on('error', () => resolve(null));
        });
    } catch { return null; }
}

async function setCommands() {
    const fullCmds = [
        { command: 'start', description: '🏠 Inicio — Todos los comandos' },
        { command: 'reporte', description: '📊 Reporte completo del proyecto' },
        { command: 'planos', description: '📐 Ver planos y distribución' },
        { command: 'finanzas', description: '💰 Estado financiero y rentabilidad' },
        { command: 'fase1', description: '📦 Fase 1 — 2 Deptos 3×9m' },
        { command: 'proveedores', description: '🏭 Comparativa de costos + Alibaba' },
        { command: 'link', description: '🔗 Links de acceso' },
        { command: 'boletas', description: '🧾 Últimas boletas registradas' },
        { command: 'gastos', description: '📊 Total gastado por categoría' },
        { command: 'fotos', description: '🖼️ Últimas imágenes del proyecto' },
        { command: 'buscar', description: '🔍 Buscar en la base de datos' },
        { command: 'stats', description: '📈 Estadísticas del proyecto' },
        { command: 'allow', description: '[Dueño] Autorizar usuario @username' },
        { command: 'deny', description: '[Dueño] Quitar acceso a usuario' },
        { command: 'allowlist', description: '[Dueño] Ver usuarios autorizados' }
    ];
    return api('setMyCommands', { commands: fullCmds });
}

// ====== COMANDOS ======

async function cmdStart(chatId) {
    const msg = `🏠 <b>Casona Lo Blanco — San Bernardo</b>

🚇 Estación Lo Blanco · Terreno 9×17m (153m²)
👥 Este es un chat compartido — todos ven la misma info

<b>📋 COMANDOS:</b>
/start — Esta ayuda
/reporte — Reporte completo
/planos — Planos y medidas
/finanzas — Estado financiero
/fase1 — Fase 1: 2 Deptos
/proveedores — Costos: William · Homecenter · Otal · Alibaba
/link — Links de acceso

<b>📸 ENVÍAME:</b>
• Fotos → se guardan automáticamente
• Boletas → las registro como gasto
• Links de YouTube → los guardo como referencia
• Texto → lo guardo como nota

<b>📊 CONSULTAS:</b>
/boletas — Últimas boletas
/gastos — Total por categoría
/fotos — Últimas imágenes
/stats — Estadísticas del proyecto
/buscar + texto — Busca en la BD

<b>🔐 ADMIN (solo dueño):</b>
/allow @usuario — Autorizar persona
/deny @usuario — Quitar acceso
/allowlist — Ver autorizados

👥 Comparte este bot: @sanbernardo360_bot`;
    await send(chatId, msg);
}

async function cmdReporte(chatId) {
    const msg = `📊 <b>REPORTE COMPLETO — CASONA LO BLANCO</b>

━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Ubicación:</b> San Bernardo, Estación Lo Blanco
📐 <b>Terreno:</b> 9m × 17m = 153m²
🏠 <b>Casona:</b> 2 pisos (9×12m = 216m²) — 6 piezas
📦 <b>2 Deptos Arriendo:</b> 3×9m = 27m² c/u
🌿 <b>Patio:</b> 2×9m = 18m²
━━━━━━━━━━━━━━━━━━━━━━

<b>💰 FASE 1 — 2 DEPTOS (Recomendada)</b>
👷 William Díaz: $16.2M (54m² × $300K)
🛠️ Homecenter: $15.1M (materiales c/dcto)
🚜 Demo + permisos: $5.0M
🛡️ Contingencia: $3.6M
<b>• Total: ~$40M</b>
<b>• Ingreso: $700K/mes</b>
<b>• Payback: ~5.5 años</b>
<b>• Rentabilidad: ~18%</b>

<b>🇨🇳 Alternativas Alibaba (x Clau):</b>
• Casa expandible: ~$22-25M (riesgo normativo)
• Container 2 pisos: ~$25-30M

/link — Landing page online`;
    await send(chatId, msg);
}

async function cmdPlanos(chatId) {
    const msg = `📐 <b>PLANOS Y DISTRIBUCIÓN</b>

🏠 <b>Casona 2 Pisos (9×12m = 108m² c/piso)</b>
<b>PB:</b> Living 22m² · Cocina 14m² · Baño 9m² · Pieza 1 · Pieza 2
<b>PA:</b> Pieza 3 · 4 · 5 · 6 · Terraza 36m²

📦 <b>2 Deptos Arriendo (3×9m = 27m² c/u)</b>
• Depto 1 (PB): Living+Kitchen 9m² · Baño 2.7m² · Dormitorio 10.5m²
• Depto 2 (PA): Igual, acceso escalera exterior
🌿 Patio común 2×9m = 18m²

✅ 12m + 3m + 2m = <b>17m ✓</b>
✅ 108+108+27+27+18 = <b>153m² ✓</b>

🔗 https://minideptos-lo-blanco.vercel.app/minideptos#plano`;
    await send(chatId, msg);
}

async function cmdFinanzas(chatId) {
    const data = db.leer();
    const totalB = data.boletas.reduce((s, b) => s + (b.monto || 0), 0);

    let msg = `💰 <b>ESTADO FINANCIERO</b>

━━━━━━━━━━━━━━━━━━━━━━
<b>FASE 1 — 2 DEPTOS (Recomendada)</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>Inversión: ~$40M</b>
👷 William Díaz: $16.2M
🛠️ Homecenter: $15.1M
🚜 Demo + permisos: $5.0M
🛡️ Contingencia: $3.6M

<b>💰 Ingresos:</b>
• $350K c/u × 2 = $700K/mes
• Desde: mes 5
• Rentabilidad: ~18% anual
• Payback: ~5.5 años`;

    if (data.boletas.length > 0) {
        msg += `\n\n<b>🧾 Boletas registradas:</b> ${data.boletas.length}`;
        msg += `\n<b>💰 Total gastado:</b> $${totalB.toLocaleString('es-CL')}`;
    }
    if (data.pagos.length > 0) {
        msg += `\n<b>💳 Pagos registrados:</b> ${data.pagos.length}`;
    }

    msg += `\n\n🔗 https://minideptos-lo-blanco.vercel.app/minideptos#finanzas`;
    await send(chatId, msg);
}

async function cmdFase1(chatId) {
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
• <b>Total: $15.1M</b> 🏷️ <i>-15% dcto + envío gratis</i>

<b>🚜 Otros:</b>
• Demolición parcial: $2.5M
• Arquitecto + permisos: $2.5M
• Contingencia 10%: $3.6M

<b>📅 Timeline:</b>
Mes 1 → Permisos + materiales ($5M)
Mes 2 → Demo + fundaciones ($6M)
Mes 3 → Estructura + instalar ($18M)
Mes 4 → Terminaciones ($11M)
Mes 5 → <b>🎉 $700K/mes!</b>`;
    await send(chatId, msg);
}

async function cmdProveedores(chatId) {
    const data = db.leer();
    let msg = `🏭 <b>COMPARATIVA DE PROVEEDORES</b>

<b>⭐ William Díaz (tu cuñado)</b>
• $300K/m² — Mano de obra directa
• 54m² = $16.2M | Proyecto completo: ~$81M

<b>🛠️ Homecenter Constructor</b>
• Materiales con -15% dcto + envío gratis
• ~$15.1M para 2 deptos

<b>🏭 Casas Otal (@otalcasasprefabricadas)</b>
• $700K/m² — Llave en mano premium
• 2 deptos: $37.8M | Completo: $189M

<b>🇨🇳 Alibaba — Casa Expandible (x Clau)</b>
• ~$22-25M para 2 deptos (importado)
• ⚠️ Riesgo: norma sísmica chilena

<b>🇨🇳 Alibaba — Container 2 Pisos (x Clau)</b>
• ~$25-30M para 2 deptos (importado)
• ⚠️ Permiso DOM complejo`;

    if (data.proveedores.length > 0) {
        msg += `\n\n<b>📋 Proveedores en DB:</b> ${data.proveedores.length}`;
    }

    msg += `\n\n💡 <b>Recomendación:</b> William + Homecenter = más seguro`;
    await send(chatId, msg);
}

async function cmdLink(chatId) {
    const msg = `🔗 <b>LINKS DE ACCESO</b>

<b>🏠 Landing Page:</b>
https://minideptos-lo-blanco.vercel.app

<b>📊 Panel de Control:</b>
https://minideptos-lo-blanco.vercel.app/panel

<b>🎨 Generar Planos con IA:</b>
https://minideptos-lo-blanco.vercel.app/generar-planos

<b>📐 Plano:</b>
https://minideptos-lo-blanco.vercel.app/minideptos#plano

<b>💰 Finanzas:</b>
https://minideptos-lo-blanco.vercel.app/minideptos#finanzas

<b>📦 Fase 1:</b>
https://minideptos-lo-blanco.vercel.app/minideptos#phased

<b>📅 Cronograma:</b>
https://minideptos-lo-blanco.vercel.app/minideptos#timeline

<b>🏭 Proveedores:</b>
https://minideptos-lo-blanco.vercel.app/minideptos#proveedores

<b>📦 GitHub:</b>
https://github.com/promarket08-source/casona-lo-blanco

━━━━━━━━━━━━━━━━━━━━━━
👥 Bot compartido: @sanbernardo360_bot`;
    await send(chatId, msg);
}

async function cmdBoletas(chatId) {
    const data = db.leer();
    const boletas = data.boletas;
    if (boletas.length === 0) return await send(chatId, '🧾 No hay boletas registradas aún. Envíame una foto de una boleta y la guardo automáticamente.');

    let msg = `🧾 <b>Últimas boletas (${boletas.length} total):</b>\n\n`;
    const ultimas = boletas.slice(-10).reverse();
    ultimas.forEach((b, i) => {
        msg += `${i + 1}. <b>$${b.monto?.toLocaleString('es-CL')}</b> — ${b.descripcion || 'Sin desc'}\n`;
        msg += `   📁 ${b.categoria} | ${new Date(b.fecha).toLocaleDateString('es-CL')}\n`;
        if (b.proveedor) msg += `   🏪 ${b.proveedor}\n`;
        msg += '\n';
    });
    const total = boletas.reduce((s, b) => s + (b.monto || 0), 0);
    msg += `<b>💰 Total gastado: $${total.toLocaleString('es-CL')}</b>`;
    await send(chatId, msg);
}

async function cmdGastos(chatId) {
    const data = db.leer();
    const cats = {};
    data.boletas.forEach(b => {
        const c = b.categoria || 'general';
        cats[c] = (cats[c] || 0) + (b.monto || 0);
    });

    if (Object.keys(cats).length === 0) return await send(chatId, '📊 No hay gastos registrados aún.');

    let msg = `📊 <b>Gastos por categoría:</b>\n\n`;
    const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, e) => s + e[1], 0);
    entries.forEach(([cat, monto]) => {
        const pct = ((monto / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(pct / 5)) || '▏';
        msg += `${bar} <b>$${monto.toLocaleString('es-CL')}</b> — ${cat} (${pct}%)\n`;
    });
    msg += `\n<b>💰 Total: $${total.toLocaleString('es-CL')}</b>`;
    await send(chatId, msg);
}

async function cmdFotos(chatId) {
    const data = db.leer();
    const imgs = data.imagenes;
    if (imgs.length === 0) return await send(chatId, '🖼️ No hay imágenes guardadas aún. Envíame fotos y las guardo automáticamente.');

    let msg = `🖼️ <b>Últimas imágenes (${imgs.length} total):</b>\n\n`;
    const ultimas = imgs.slice(-5).reverse();
    ultimas.forEach(img => {
        msg += `📸 ${img.descripcion || 'Sin descripción'}\n`;
        msg += `   📅 ${new Date(img.fecha).toLocaleDateString('es-CL')} | 👤 ${img.usuario}\n\n`;
    });
    await send(chatId, msg);
}

async function cmdStats(chatId) {
    const est = db.estadisticas();
    const msg = `📈 <b>Estadísticas del Proyecto</b>

━━━━━━━━━━━━━━━━━━━━━━
📦 Boletas: <b>${est.boletas}</b>
💳 Pagos: <b>${est.pagos}</b>
🖼️ Imágenes: <b>${est.imagenes}</b>
🎬 Videos: <b>${est.videos}</b>
📱 Redes: <b>${est.redes}</b>
📝 Notas: <b>${est.notas}</b>
🏭 Proveedores: <b>${est.materiales}</b>
<b>💰 Total gastado: $${est.totalGastado.toLocaleString('es-CL')}</b>

━━━━━━━━━━━━━━━━━━━━━━
🤖 Bot activo · Datos en la nube (Vercel)`;
    await send(chatId, msg);
}

async function cmdBuscar(chatId, query) {
    const results = db.buscar(query);
    if (results.length === 0) return await send(chatId, `🔍 No encontré nada para "${query}"`);

    let msg = `🔍 <b>Resultados para "${query}":</b>\n\n`;
    results.forEach((r, i) => {
        const item = r.item;
        const tipo = r.tipo;
        let texto = '';
        if (item.descripcion) texto = item.descripcion;
        else if (item.concepto) texto = item.concepto;
        else if (item.titulo) texto = item.titulo;
        else if (item.texto) texto = item.texto.length > 80 ? item.texto.substring(0, 80) + '...' : item.texto;
        msg += `${i + 1}. [${tipo}] ${texto}\n`;
        if (item.monto) msg += `   💰 $${item.monto.toLocaleString('es-CL')}\n`;
    });
    await send(chatId, msg);
}

// ====== PROCESAR FOTOS ======
async function procesarFoto(chatId, photo, caption, msg) {
    const fileId = photo[photo.length - 1].file_id;
    const imgDir = path.join(__dirname, 'public', 'img', 'uploads');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

    const fileName = `telegram_${Date.now()}.jpg`;
    const filePath = path.join(imgDir, fileName);
    const saved = await downloadFile(fileId, filePath);

    const descripcion = caption || 'Foto desde Telegram';
    db.agregarImagen({
        descripcion,
        ruta_local: saved ? `/img/uploads/${fileName}` : null,
        url: null,
        tipo: 'telegram',
        chatId,
        usuario: msg.from?.first_name || 'Anónimo'
    });

    const data = db.leer();
    const totalImgs = data.imagenes.length;

    let reply = `📸 <b>Foto guardada!</b>\n\n`;
    if (caption) reply += `📝 ${caption}\n\n`;
    reply += `📅 ${new Date().toLocaleDateString('es-CL')}\n`;
    reply += `📸 Total imágenes: ${totalImgs}\n\n`;
    reply += `📊 /fotos — Ver todas\n`;
    reply += `📊 /stats — Estadísticas`;

    await send(chatId, reply);
}

// ====== PROCESAR BOLETAS (fotos con texto "boleta" o "gasto") ======
async function procesarBoleta(chatId, photo, caption, msg) {
    const fileId = photo[photo.length - 1].file_id;
    const imgDir = path.join(__dirname, 'public', 'img', 'boletas');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

    const fileName = `boleta_${Date.now()}.jpg`;
    const filePath = path.join(imgDir, fileName);
    await downloadFile(fileId, filePath);

    // Intentar extraer monto del caption
    let monto = 0;
    let descripcion = caption || 'Boleta sin descripción';
    let categoria = 'general';
    let proveedor = 'No especificado';

    if (caption) {
        // Buscar montos en el texto: $123.456 o 123456 o "$50,000"
        const montoMatch = caption.match(/(\$\s*[\d.,]+|[\d]{5,})/);
        if (montoMatch) {
            monto = parseInt(montoMatch[1].replace(/[$.]/g, '')) || 0;
        }

        // Categorías por palabras clave
        const lower = caption.toLowerCase();
        if (lower.includes('material') || lower.includes('homecenter') || lower.includes('ferretería')) categoria = 'materiales';
        else if (lower.includes('comida') || lower.includes('super') || lower.includes('almuerzo')) categoria = 'alimentacion';
        else if (lower.includes('herramienta') || lower.includes('equipo')) categoria = 'herramientas';
        else if (lower.includes('transporte') || lower.includes('flete') || lower.includes('envío')) categoria = 'transporte';
        else if (lower.includes('permiso') || lower.includes('dom') || lower.includes('arquitecto')) categoria = 'permisos';

        // Proveedor
        if (lower.includes('homecenter')) proveedor = 'Homecenter';
        else if (lower.includes('sodimac')) proveedor = 'Sodimac';
        else if (lower.includes('easy')) proveedor = 'Easy';
        else if (lower.includes('william')) proveedor = 'William Díaz';
    }

    db.agregarBoleta({
        descripcion,
        monto,
        categoria,
        archivo: `/img/boletas/${fileName}`,
        proveedor,
        chatId,
        usuario: msg.from?.first_name || 'Anónimo'
    });

    let reply = `🧾 <b>Boleta registrada!</b>\n\n`;
    reply += `📝 ${descripcion}\n`;
    reply += `💰 <b>$${monto.toLocaleString('es-CL')}</b>\n`;
    reply += `📁 ${categoria}\n`;
    reply += `🏪 ${proveedor}\n\n`;
    if (!monto) reply += `💡 <i>No detecté monto. Para mejor resultado escribe: "Boleta Homecenter $25.000"</i>\n\n`;
    reply += `📊 /boletas — Ver todas\n`;
    reply += `📊 /gastos — Total por categoría`;

    await send(chatId, reply);
}

// ====== PROCESAR VIDEOS Y LINKS ======
async function procesarLink(chatId, text, msg) {
    // YouTube
    const ytMatch = text.match(/(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([\w-]+)/i);
    if (ytMatch) {
        db.agregarVideo({
            titulo: text.substring(0, 80),
            url: ytMatch[0].startsWith('http') ? ytMatch[0] : `https://${ytMatch[0]}`,
            plataforma: 'youtube',
            chatId,
            usuario: msg.from?.first_name || 'Anónimo'
        });
        return await send(chatId, `🎬 <b>Video guardado!</b>\n${text.substring(0, 100)}\n\n🎥 /stats — Ver estadísticas`);
    }

    // Instagram
    const igMatch = text.match(/(?:instagram\.com)\/[\w/]+/i);
    if (igMatch) {
        db.agregarRed({
            texto: text.substring(0, 100),
            url: igMatch[0].startsWith('http') ? igMatch[0] : `https://${igMatch[0]}`,
            plataforma: 'instagram',
            tipo: 'post',
            chatId,
            usuario: msg.from?.first_name || 'Anónimo'
        });
        return await send(chatId, `📱 <b>Post de Instagram guardado!</b>\n📊 /stats — Ver estadísticas`);
    }

    // Alibaba u otros links
    const linkMatch = text.match(/https?:\/\/[^\s]+/);
    if (linkMatch) {
        db.agregarNota({
            texto: `Link compartido: ${text.substring(0, 200)}`,
            categoria: 'links',
            chatId,
            usuario: msg.from?.first_name || 'Anónimo'
        });
        return await send(chatId, `🔗 <b>Link guardado como referencia!</b>\n📊 /stats — Ver todos los registros`);
    }

    return false;
}

// ====== COMANDOS DE ADMINISTRACIÓN ======

async function cmdAllowList(chatId) {
    if (!db.esOwner(chatId)) return await send(chatId, '⛔ Solo el dueño del bot puede usar este comando.');
    const info = db.listarAutorizados();
    const data = db.leer();
    let msg = `🔐 <b>Usuarios Autorizados</b>\n\n`;
    msg += `👑 <b>Dueño:</b> ${data.meta?.ownerNombre || chatId} (${info.owner})\n\n`;
    if (info.lista.length > 1) {
        msg += `<b>Autorizados (${info.lista.length - 1}):</b>\n`;
        info.lista.forEach((id, i) => {
            if (id !== info.owner) msg += `${i}. ID: ${id}\n`;
        });
    } else {
        msg += `No hay otros usuarios autorizados aún.\n`;
    }
    msg += `\n📌 Para agregar: /allow <i>@username</i> o <i>chatId</i>`;
    await send(chatId, msg);
}

async function cmdAllow(chatId, args, msg) {
    if (!db.esOwner(chatId)) return await send(chatId, '⛔ Solo el dueño del bot puede usar este comando.');
    if (!args) return await send(chatId, 'ℹ️ Usa: /allow @username o /allow 123456789');

    // Si es @username, intentar resolverlo
    const target = args.replace('@', '').trim();
    let targetId = parseInt(target);

    if (isNaN(targetId)) {
        // Intentar resolver username a chatId
        try {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const resolveBody = JSON.stringify({});
            const result = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: 'api.telegram.org',
                    path: `/bot${token}/getUpdates`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': 2 }
                }, res => {
                    let chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve(null); } });
                });
                req.on('error', () => resolve(null));
                req.write('{}');
                req.end();
            });

            // Buscar el username en los mensajes recientes
            if (result?.result) {
                for (const upd of result.result) {
                    const from = upd.message?.from;
                    if (from && (from.username?.toLowerCase() === target.toLowerCase() || from.first_name?.toLowerCase() === target.toLowerCase())) {
                        targetId = from.id;
                        break;
                    }
                }
            }
        } catch {}
    }

    if (isNaN(targetId)) {
        return await send(chatId, `❌ No pude encontrar a "${target}". Pídele que primero me envíe un mensaje al bot y luego intenta de nuevo.`);
    }

    db.agregarAutorizado(targetId, target);
    await send(chatId, `✅ <b>Usuario autorizado!</b>\nID: ${targetId}\nYa puede usar el bot.`);
}

async function cmdDeny(chatId, args) {
    if (!db.esOwner(chatId)) return await send(chatId, '⛔ Solo el dueño del bot puede usar este comando.');
    if (!args) return await send(chatId, 'ℹ️ Usa: /deny @username o /deny 123456789');

    const target = parseInt(args.replace('@', '').trim());
    if (isNaN(target)) return await send(chatId, '❌ Especifica un ID numérico o @username');

    db.quitarAutorizado(target);
    await send(chatId, `✅ Usuario ${target} removido del acceso.`);
}

// ====== HANDLER PRINCIPAL ======
async function handleUpdate(update) {
    // === CALLBACK QUERY (botones inline) ===
    if (update.callback_query) {
        const cb = update.callback_query;
        const data = cb.data;
        const chatId = cb.message.chat.id;
        const msgId = cb.message.message_id;

        await answerCallback(cb.id, 'Procesando...');

        if (data.startsWith('approve:')) {
            const parts = data.split(':');
            const userId = parseInt(parts[1]);
            const userName = parts[2] || 'Usuario';

            db.agregarAutorizado(userId, userName);

            await editMessage(chatId, msgId,
                `✅ <b>Solicitud APROBADA</b>\n\n👤 ${userName} (ID: <code>${userId}</code>)\n✅ Ya tiene acceso al bot.`
            );

            // Notificar al usuario que fue aprobado
            await send(userId, `✅ <b>Acceso concedido!</b>\n\nEl dueño ha aprobado tu solicitud. Bienvenido al proyecto Casona Lo Blanco 🏠\n\nEnvía /start para comenzar.`);

            return;
        }

        if (data.startsWith('deny:')) {
            const parts = data.split(':');
            const userId = parseInt(parts[1]);
            const userName = parts[2] || 'Usuario';

            await editMessage(chatId, msgId,
                `❌ <b>Solicitud RECHAZADA</b>\n\n👤 ${userName} (ID: <code>${userId}</code>)\n❌ No tiene acceso al bot.`
            );

            await send(userId, `❌ <b>Acceso denegado</b>\n\nEl dueño ha rechazado tu solicitud de acceso al proyecto Casona Lo Blanco.`);

            return;
        }

        return;
    }

    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const caption = msg.caption?.trim();
    const nombre = msg.from?.first_name || 'Usuario';

    // Registrar al primer usuario como dueño
    const esOwner = db.setOwner(chatId, nombre);

    // Verificar autorización
    if (!db.esAutorizado(chatId) && !esOwner) {
        const data = db.leer();
        if (data.owner) {
            // Enviar solicitud al dueño con botones
            const solicitudTexto = `🔐 <b>Solicitud de acceso</b>\n\n👤 <b>${nombre}</b>\n🆔 ID: <code>${chatId}</code>\n📝 "${text || '📸 Envió una foto'}"\n\n¿Apruebas su acceso al proyecto?`;
            await sendWithKeyboard(data.owner, solicitudTexto, [
                [{ text: '✅ Aprobar', callback_data: `approve:${chatId}:${nombre}` }],
                [{ text: '❌ Rechazar', callback_data: `deny:${chatId}:${nombre}` }]
            ]);
        }
        return await send(chatId, `🔐 <b>Acceso restringido</b>\n\nEste bot es privado del proyecto Casona Lo Blanco.\n\n⏳ Se ha enviado una solicitud al dueño. Espera su aprobación.`);
    }

    // === FOTOS ===
    if (msg.photo) {
        if (caption && /boleta|gasto|pago|factura|recibo/i.test(caption)) {
            return await procesarBoleta(chatId, msg.photo, caption, msg);
        }
        return await procesarFoto(chatId, msg.photo, caption, msg);
    }

    // === DOCUMENTOS ===
    if (msg.document) {
        const docDir = path.join(__dirname, 'public', 'docs');
        if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
        const fileName = `doc_${Date.now()}_${msg.document.file_name || 'documento'}`;
        const filePath = path.join(docDir, fileName);
        await downloadFile(msg.document.file_id, filePath);

        db.agregarNota({
            texto: `Documento: ${msg.document.file_name || 'sin nombre'} — ${caption || 'sin descripción'}`,
            categoria: 'documentos',
            chatId,
            usuario: msg.from?.first_name || 'Anónimo'
        });

        return send(chatId, `📄 <b>Documento guardado:</b> ${msg.document.file_name}\n📊 /stats — Ver estadísticas`);
    }

    if (!text) return;

    // === COMANDOS ===
    if (text === '/start' || text.startsWith('/start')) return await cmdStart(chatId);
    if (text === '/reporte') return await cmdReporte(chatId);
    if (text === '/planos') return await cmdPlanos(chatId);
    if (text === '/finanzas') return await cmdFinanzas(chatId);
    if (text === '/fase1') return await cmdFase1(chatId);
    if (text === '/proveedores') return await cmdProveedores(chatId);
    if (text === '/link' || text === '/links') return await cmdLink(chatId);
    if (text === '/boletas') return await cmdBoletas(chatId);
    if (text === '/gastos') return await cmdGastos(chatId);
    if (text === '/fotos') return await cmdFotos(chatId);
    if (text === '/stats') return await cmdStats(chatId);
    if (text.startsWith('/buscar ')) return await cmdBuscar(chatId, text.replace('/buscar ', ''));
    if (text === '/allowlist' || text === '/lista') return await cmdAllowList(chatId);
    if (text.startsWith('/allow ')) return await cmdAllow(chatId, text.replace('/allow ', ''), msg);
    if (text.startsWith('/deny ')) return cmdDeny(chatId, text.replace('/deny ', ''));

    // === LINKS (YouTube, Instagram, etc) ===
    const linkResult = await procesarLink(chatId, text, msg);
    if (linkResult) return;

    // === TEXTO GENÉRICO → guardar como nota ===
    db.agregarNota({
        texto: text.substring(0, 500),
        categoria: 'chat',
        chatId,
        usuario: msg.from?.first_name || 'Anónimo'
    });

    const data = db.leer();
    const totalNotas = data.notas.length;

    await send(chatId, `📝 <b>Nota guardada!</b>\n\n"${text.length > 80 ? text.substring(0, 80) + '...' : text}"\n\n📝 Total notas: ${totalNotas}\n📊 /stats — Ver todo\n🔍 /buscar <i>palabra</i> — Buscar en notas`);
}

module.exports = { send, sendWithKeyboard, setCommands, handleUpdate, api };
