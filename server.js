const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const app = express();
const PORT = 3001;

const BASE = "D:\\AI_Agency\\projects\\SAN BERNARDO DEPAS - CASA -\\minideptos-lo-blanco";

// Cargar .env manualmente
const envPath = path.join(BASE, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    });
}

console.log('\n📂 Directorio base:', BASE);

// Servir archivos estáticos
app.use('/css', express.static(path.join(BASE, 'public', 'css')));
app.use('/js', express.static(path.join(BASE, 'public', 'js')));
app.use('/img', express.static(path.join(BASE, 'public', 'img')));
app.use('/assets', express.static(path.join(BASE, 'public', 'assets')));
app.use('/data', express.static(path.join(BASE, 'public', 'minideptos', 'data')));

// ====== RUTAS PRINCIPALES ======

function checkAndSend(res, req, archivo) {
    if (fs.existsSync(archivo)) {
        console.log('✅ GET ' + req.path);
        res.sendFile(archivo);
    } else {
        console.log('❌ NO ENCONTRADO:', archivo);
        res.status(404).send('<html><head><meta charset="UTF-8"><title>404</title><style>body{background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:"Segoe UI",sans-serif}h1{font-size:72px;margin:0;color:#f87171}p{font-size:20px;color:#94a3b8}a{color:#38bdf8;margin-top:20px;font-size:18px;text-decoration:none}</style></head><body><h1>404</h1><p>Página no encontrada</p><p style="font-size:14px;color:#64748b;margin:8px">' + req.url + '</p><a href="/">⬅ Volver al Inicio</a></body></html>');
    }
}

app.get('/', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'panel', 'index.html'));
});

app.get('/panel', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'panel', 'index.html'));
});

app.get('/projects', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'projects', 'index.html'));
});

app.get('/minideptos', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'index.html'));
});

app.get('/generar-planos', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'generar-planos.html'));
});

app.get('/landing', (req, res) => {
    checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: '✅ Online',
        project: 'Mini-Departamentos Lo Blanco',
        base: BASE,
        rutas: {
            home: `http://localhost:${PORT}/`,
            panel: `http://localhost:${PORT}/panel`,
            projects: `http://localhost:${PORT}/projects`,
            minideptos: `http://localhost:${PORT}/minideptos`,
            phased_api: `http://localhost:${PORT}/api/finanzas-phased`,
            health: `http://localhost:${PORT}/health`
        }
    });
});

// API: Datos financieros phased
app.get('/api/finanzas-phased', (req, res) => {
    const dataPath = path.join(BASE, 'public', 'minideptos', 'data', 'phased-financials.json');
    if (fs.existsSync(dataPath)) {
        res.json(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
    } else {
        res.status(404).json({ error: 'Datos no encontrados' });
    }
});

// ====== API: GENERACIÓN DE IMÁGENES CON IA ======

app.post('/api/generate-image', express.json({ limit: '10mb' }), async (req, res) => {
    const { prompt, width = 1024, height = 768 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

    const hfToken = process.env.HF_TOKEN || '';
    if (!hfToken) {
        return res.json({
            status: 'no_token',
            error: 'Configura HF_TOKEN en .env',
            prompt
        });
    }

    // Usar Hugging Face router endpoint con FLUX.1-schnell (rápido y gratuito)
    const model = "black-forest-labs/FLUX.1-schnell";

    const body = JSON.stringify({
        inputs: prompt,
        parameters: {
            width: Math.min(width, 1024),
            height: Math.min(height, 768),
            num_inference_steps: 4,
            guidance_scale: 0
        }
    });

    const options = {
        hostname: 'router.huggingface.co',
        path: `/hf-inference/models/${model}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 60000
    };

    return new Promise((resolve) => {
        const creq = https.request(options, (cres) => {
            const chunks = [];
            cres.on('data', c => chunks.push(c));
            cres.on('end', () => {
                const buf = Buffer.concat(chunks);
                const ct = cres.headers['content-type'] || '';
                if (ct.includes('image')) {
                    const b64 = buf.toString('base64');
                    res.json({ status: 'succeeded', output: [`data:${ct};base64,${b64}`] });
                } else {
                    try {
                        const json = JSON.parse(buf.toString());
                        if (json.error) {
                            res.json({ status: 'error', error: json.error, ...json });
                        } else {
                            res.json(json);
                        }
                    } catch {
                        res.json({ status: 'error', error: 'Respuesta inesperada', raw: buf.toString().substring(0, 500) });
                    }
                }
                resolve();
            });
        });
        creq.on('error', (err) => { res.status(500).json({ error: err.message }); resolve(); });
        creq.on('timeout', () => { creq.destroy(); res.status(504).json({ error: 'Timeout' }); resolve(); });
        creq.write(body);
        creq.end();
    });
});

// ====== API: CEREBRAS — LLM Ultra-Rápido ======

app.post('/api/cerebras/chat', express.json({ limit: '10mb' }), async (req, res) => {
    const { messages, model = 'qwen-3-235b-a22b-instruct-2507', max_tokens = 2048, temperature = 0.7 } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array requerido' });

    const apiKey = process.env.CEREBRAS_API_KEY || '';
    if (!apiKey) return res.status(500).json({ error: 'CEREBRAS_API_KEY no configurada' });

    const body = JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        stream: false
    });

    const options = {
        hostname: 'api.cerebras.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
    };

    return new Promise((resolve) => {
        const creq = https.request(options, (cres) => {
            const chunks = [];
            cres.on('data', c => chunks.push(c));
            cres.on('end', () => {
                const buf = Buffer.concat(chunks);
                try {
                    const json = JSON.parse(buf.toString());
                    if (json.error) {
                        res.json({ status: 'error', error: json.error });
                    } else {
                        const reply = json.choices?.[0]?.message?.content || '';
                        res.json({ status: 'success', reply, model: json.model, usage: json.usage });
                    }
                } catch {
                    res.json({ status: 'error', raw: buf.toString().substring(0, 500) });
                }
                resolve();
            });
        });
        creq.on('error', (err) => { res.status(500).json({ error: err.message }); resolve(); });
        creq.on('timeout', () => { creq.destroy(); res.status(504).json({ error: 'Timeout Cerebras' }); resolve(); });
        creq.write(body);
        creq.end();
    });
});

app.post('/api/cerebras/generate', express.json({ limit: '10mb' }), async (req, res) => {
    const { prompt, model = 'qwen-3-235b-a22b-instruct-2507', max_tokens = 2048, temperature = 0.7 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt requerido' });

    // Reutilizar el endpoint de chat con formato simple
    req.body.messages = [{ role: 'user', content: prompt }];
    req.body.max_tokens = max_tokens;
    req.body.temperature = temperature;
    req.body.model = model;
    return app._router.stack.find(l => l.route && l.route.path === '/api/cerebras/chat').route.stack[0].handle(req, res);
});

app.get('*', (req, res) => {
    console.log('⚠️  Ruta:', req.method, req.url);
    res.status(404).send(`<html><head><meta charset="UTF-8"><title>404</title><style>body{background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:'Segoe UI',sans-serif}h1{font-size:72px;margin:0;color:#f87171}p{font-size:20px;color:#94a3b8}a{color:#38bdf8;margin-top:20px;font-size:18px;text-decoration:none}</style></head><body><h1>404</h1><p>Ruta no encontrada</p><a href="/">⬅ Volver al Inicio</a></body></html>`);
});

// ====== TELEGRAM BOT — @sanbernardo_360_bot ======

const telegram = require('./telegram.js');

let lastUpdateId = 0;

async function pollTelegram() {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return;

        const body = JSON.stringify({ offset: lastUpdateId + 1, timeout: 5 });
        const opts = {
            hostname: 'api.telegram.org',
            path: `/bot${token}/getUpdates`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 15000
        };

        const result = await new Promise((resolve, reject) => {
            const req = https.request(opts, res => {
                let chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                    catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.write(body);
            req.end();
        });

        if (result?.ok && result.result?.length) {
            for (const update of result.result) {
                if (update.update_id > lastUpdateId) {
                    lastUpdateId = update.update_id;
                    telegram.handleUpdate(update).catch(() => {});
                }
            }
        }
    } catch {}
}

// Webhook endpoint (para cuando el server sea público)
app.post('/telegram-webhook', express.json(), async (req, res) => {
    telegram.handleUpdate(req.body).catch(() => {});
    res.send('ok');
});

// Endpoint para enviar mensaje manualmente
app.post('/api/telegram/send', express.json(), async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) return res.status(400).json({ error: 'chatId y message requeridos' });
    await telegram.send(chatId, message);
    res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         🚀  SERVIDOR EMPRENDE360  CORRIENDO             ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  🏠 Panel:     http://localhost:3001/                     ║');
    console.log('║  📋 Proyectos: http://localhost:3001/projects             ║');
    console.log('║  🏠 Landing:   http://localhost:3001/minideptos           ║');
    console.log('║  💹 API Phased: http://localhost:3001/api/finanzas-phased║');
    console.log('║  🔍 Health:    http://localhost:3001/health               ║');
    console.log('║  🤖 Telegram:  @sanbernardo_360_bot                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📍 Carpeta:', BASE);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Iniciar polling de Telegram
    telegram.setCommands().then(() => {
        console.log('🤖 Bot Telegram comandos configurados: @sanbernardo_360_bot');
    }).catch(() => {});
    lastUpdateId = 0;
    setInterval(pollTelegram, 3000);
    console.log('🤖 Polling Telegram activo (c/3s)');
});

process.on('SIGINT', () => {
    console.log('\n⛔ Servidor detenido.');
    process.exit(0);
});