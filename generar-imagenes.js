const https = require('https');
const fs = require('fs');
const path = require('path');

const IMG_DIR = "D:\\AI_Agency\\projects\\SAN BERNARDO DEPAS - CASA -\\minideptos-lo-blanco\\public\\img";

const images = [
    { name: "01-terreno.jpg", prompt: "Vista aerea drone de un terreno rectangular 9x17 metros en San Bernardo Chile, dos casas antiguas siendo demolidas, terreno baldio, zona residencial cerca de estacion de metro, fotografia aerea realista" },
    { name: "02-construccion.jpg", prompt: "Render arquitectonico 3D de casa moderna 2 pisos en construccion, estructura steel frame metalica vista, paneles SIP instalandose, construccion en progreso, estilo fotografia constructiva" },
    { name: "03-casona.jpg", prompt: "Vista exterior casona moderna 2 pisos terminada, fachada siding gris perla, grandes ventanales PVC, jardin frontal pasto arboles, porton automatizado, San Bernardo Chile, dia soleado" },
    { name: "04-interior.jpg", prompt: "Interior luminoso casa moderna, living comedor amplio, cocina abierta con isla, pisos madera clara, grandes ventanales luz natural, decoracion contemporanea chilena, colores neutros" },
    { name: "05-dormitorio.jpg", prompt: "Dormitorio moderno acogedor, cama grande ropa blanca, luz natural ventana, piso vinilico madera, decoracion minimalista colores neutros, paredes blancas" },
    { name: "06-bano.jpg", prompt: "Bano moderno amplio, ducha vidrio templado, lavamanos doble, ceramica gris, iluminacion LED, espejo grande, minimalista contemporaneo chileno" },
    { name: "07-depto-arriendo.jpg", prompt: "Vista exterior departamento modulo prefabricado moderno 27m2, estilo moderno, entrada independiente, jardin, fachada madera y metal, San Bernardo Chile" },
    { name: "08-nocturna.jpg", prompt: "Vista nocturna casa moderna iluminada, fachada luces calidas, ventanas iluminadas, jardin con iluminacion landscaping, cielo estrellado, atmosfera acogedora" }
];

async function generateImage(prompt, outputPath) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ inputs: prompt, parameters: { width: 1024, height: 768, num_inference_steps: 4, guidance_scale: 0 } });
        const options = {
            hostname: 'router.huggingface.co',
            path: '/hf-inference/models/black-forest-labs/FLUX.1-schnell',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.HF_TOKEN,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 60000
        };
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                const ct = res.headers['content-type'] || '';
                if (ct.includes('image')) {
                    fs.writeFileSync(outputPath, buf);
                    resolve();
                } else {
                    reject(new Error(buf.toString().substring(0, 200)));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(body);
        req.end();
    });
}

(async () => {
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const outPath = path.join(IMG_DIR, img.name);
        process.stdout.write(`[${i+1}/${images.length}] Generando ${img.name}... `);
        try {
            await generateImage(img.prompt, outPath);
            const size = fs.statSync(outPath).size;
            console.log(`✓ ${(size/1024).toFixed(0)}KB`);
        } catch (err) {
            console.log(`✗ ${err.message}`);
        }
    }
    console.log('\n✅ Todas las imágenes generadas en:', IMG_DIR);
})();
