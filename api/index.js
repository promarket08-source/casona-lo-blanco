const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ====== CONFIG ======
const BASE = path.join(__dirname, '..');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json({ limit: '10mb' }));

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

// ====== SERVERLESS HANDLER ======
// Configurar rutas existentes del server.js
function setupRoutes() {
    // Servir estáticos
    app.use('/css', express.static(path.join(BASE, 'public', 'css')));
    app.use('/js', express.static(path.join(BASE, 'public', 'js')));
    app.use('/img', express.static(path.join(BASE, 'public', 'img')));
    app.use('/assets', express.static(path.join(BASE, 'public', 'assets')));
    app.use('/data', express.static(path.join(BASE, 'public', 'minideptos', 'data')));

    function checkAndSend(res, req, archivo) {
        if (fs.existsSync(archivo)) {
            res.sendFile(archivo);
        } else {
            res.status(404).send('Not found');
        }
    }

    app.get('/', (req, res) => res.redirect('/minideptos'));
    app.get('/panel', (req, res) => checkAndSend(res, req, path.join(BASE, 'public', 'panel', 'index.html')));
    app.get('/minideptos', (req, res) => checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'index.html')));
    app.get('/generar-planos', (req, res) => checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'generar-planos.html')));
    app.get('/landing', (req, res) => checkAndSend(res, req, path.join(BASE, 'public', 'minideptos', 'index.html')));
    app.get('/projects', (req, res) => checkAndSend(res, req, path.join(BASE, 'public', 'projects', 'index.html')));

    // Health
    app.get('/health', (req, res) => {
        res.json({ status: '✅ Online', project: 'Casona Lo Blanco', version: '3.0' });
    });

    // API: Datos financieros
    app.get('/api/finanzas-phased', (req, res) => {
        const dataPath = path.join(BASE, 'public', 'minideptos', 'data', 'phased-financials.json');
        if (fs.existsSync(dataPath)) {
            res.json(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
        } else {
            res.status(404).json({ error: 'Datos no encontrados' });
        }
    });

    // API: Generate Image
    app.post('/api/generate-image', async (req, res) => {
        const { prompt, width = 1024, height = 768 } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

        const hfToken = process.env.HF_TOKEN || '';
        if (!hfToken) return res.json({ status: 'no_token', error: 'Configura HF_TOKEN en .env' });

        const body = JSON.stringify({
            inputs: prompt,
            parameters: { width: Math.min(width, 1024), height: Math.min(height, 768), num_inference_steps: 4, guidance_scale: 0 }
        });

        try {
            const response = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
                method: 'POST', headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60000)
            });
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('image')) {
                const buf = Buffer.from(await response.arrayBuffer());
                res.json({ status: 'succeeded', output: [`data:${contentType};base64,${buf.toString('base64')}`] });
            } else {
                const json = await response.json();
                res.json({ status: 'error', error: json.error || 'Error desconocido' });
            }
        } catch (err) {
            res.json({ status: 'error', error: err.message });
        }
    });

    // API: Cerebras Chat
    app.post('/api/cerebras/chat', async (req, res) => {
        const { messages, model = 'qwen-3-235b-a22b-instruct-2507', max_tokens = 2048, temperature = 0.7 } = req.body;
        if (!messages) return res.status(400).json({ error: 'messages requerido' });
        const apiKey = process.env.CEREBRAS_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'CEREBRAS_API_KEY no configurada' });

        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, max_tokens, temperature, stream: false }),
                signal: AbortSignal.timeout(30000)
            });
            const json = await response.json();
            if (json.error) return res.json({ status: 'error', error: json.error });
            res.json({ status: 'success', reply: json.choices?.[0]?.message?.content || '', model: json.model });
        } catch (err) {
            res.json({ status: 'error', error: err.message });
        }
    });

    // API: Cerebras Generate
    app.post('/api/cerebras/generate', async (req, res) => {
        req.body.messages = [{ role: 'user', content: req.body.prompt || '' }];
        // Forward to chat handler
        const chatHandler = app._router.stack.find(l => l.route?.path === '/api/cerebras/chat');
        if (chatHandler) chatHandler.route.stack[0].handle(req, res);
    });

    // Webhook de Telegram
    const telegram = require('../telegram.js');
    app.post('/telegram-webhook', async (req, res) => {
        try {
            await telegram.handleUpdate(req.body);
        } catch (e) {
            console.error('Webhook error:', e.message);
        }
        res.send('ok');
    });

    // API: Enviar mensaje manual
    app.post('/api/telegram/send', async (req, res) => {
        const { chatId, message } = req.body;
        if (!chatId || !message) return res.status(400).json({ error: 'chatId y message requeridos' });
        await telegram.send(chatId, message);
        res.json({ ok: true });
    });

    // 404
    app.get('*', (req, res) => {
        res.status(404).send(`<html><body style="background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h1 style="font-size:72px;color:#f87171;margin:0">404</h1><p style="color:#94a3b8">Página no encontrada</p><a href="/minideptos" style="color:#38bdf8">⬅ Volver al inicio</a></div></body></html>`);
    });
}

setupRoutes();

// ====== EXPORT PARA VERCEL ======
module.exports = app;

// ====== MODO SERVIDOR LOCAL (SOLO RAILWAY/LOCAL) ======
if (require.main === module || process.env.RAILWAY_ENVIRONMENT) {
    const telegram = require('../telegram.js');
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        // Configurar webhook de Telegram si estamos en Railway
        const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;
        if (process.env.TELEGRAM_BOT_TOKEN) {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const webhookUrl = `${baseUrl}/telegram-webhook`;
            fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`)
                .then(r => r.json())
                .then(d => console.log('🤖 Webhook Telegram:', d.description || d.error))
                .catch(e => console.log('🤖 Webhook error:', e.message));
        }
    });
}
