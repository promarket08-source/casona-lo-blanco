const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'proyecto.json');

// Estructura inicial
function estructuraBase() {
    return {
        meta: {
            creado: new Date().toISOString(),
            actualizado: new Date().toISOString(),
            proyecto: 'Casona Lo Blanco',
            version: '1.0'
        },
        boletas: [],
        pagos: [],
        imagenes: [],
        videos: [],
        redes: [],
        notas: [],
        eventos: [],
        materiales: [],
        proveedores: [],
        autorizados: [],
        owner: null
    };
}

function leer() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch {}
    const base = estructuraBase();
    guardar(base);
    return base;
}

function guardar(data) {
    data.meta.actualizado = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ====== AGREGAR DATOS ======

function agregarBoleta({ descripcion, monto, categoria, archivo, proveedor, chatId, usuario }) {
    const data = leer();
    data.boletas.push({
        id: data.boletas.length + 1,
        fecha: new Date().toISOString(),
        descripcion: descripcion || 'Sin descripción',
        monto: monto || 0,
        categoria: categoria || 'general',
        archivo: archivo || null,
        proveedor: proveedor || 'No especificado',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.boletas[data.boletas.length - 1];
}

function agregarPago({ concepto, monto, metodo, estado, chatId, usuario }) {
    const data = leer();
    data.pagos.push({
        id: data.pagos.length + 1,
        fecha: new Date().toISOString(),
        concepto: concepto || 'Sin concepto',
        monto: monto || 0,
        metodo: metodo || 'transferencia',
        estado: estado || 'pendiente',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.pagos[data.pagos.length - 1];
}

function agregarImagen({ descripcion, url, ruta_local, tipo, chatId, usuario }) {
    const data = leer();
    data.imagenes.push({
        id: data.imagenes.length + 1,
        fecha: new Date().toISOString(),
        descripcion: descripcion || 'Sin descripción',
        url: url || null,
        ruta_local: ruta_local || null,
        tipo: tipo || 'foto',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.imagenes[data.imagenes.length - 1];
}

function agregarVideo({ titulo, url, plataforma, chatId, usuario }) {
    const data = leer();
    data.videos.push({
        id: data.videos.length + 1,
        fecha: new Date().toISOString(),
        titulo: titulo || 'Sin título',
        url: url,
        plataforma: plataforma || 'youtube',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.videos[data.videos.length - 1];
}

function agregarRed({ texto, url, plataforma, tipo, chatId, usuario }) {
    const data = leer();
    data.redes.push({
        id: data.redes.length + 1,
        fecha: new Date().toISOString(),
        texto: texto || '',
        url: url || null,
        plataforma: plataforma || 'instagram',
        tipo: tipo || 'post',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.redes[data.redes.length - 1];
}

function agregarNota({ texto, categoria, chatId, usuario }) {
    const data = leer();
    data.notas.push({
        id: data.notas.length + 1,
        fecha: new Date().toISOString(),
        texto: texto,
        categoria: categoria || 'general',
        chatId,
        usuario: usuario || 'Anónimo'
    });
    guardar(data);
    return data.notas[data.notas.length - 1];
}

// ====== CONSULTAS ======

function resumenFinanciero() {
    const data = leer();
    const boletas = data.boletas;
    const totalGastado = boletas.reduce((s, b) => s + (b.monto || 0), 0);
    const porCategoria = {};
    boletas.forEach(b => {
        const cat = b.categoria || 'general';
        porCategoria[cat] = (porCategoria[cat] || 0) + (b.monto || 0);
    });

    return {
        totalBoletas: boletas.length,
        totalGastado,
        porCategoria,
        ultimas5: boletas.slice(-5).reverse()
    };
}

function ultimosRegistros(tipo, limite = 5) {
    const data = leer();
    const items = data[tipo] || [];
    return items.slice(-limite).reverse();
}

function buscar(query) {
    const data = leer();
    const q = query.toLowerCase();
    const resultados = [];

    ['boletas', 'pagos', 'imagenes', 'videos', 'redes', 'notas', 'materiales'].forEach(tipo => {
        (data[tipo] || []).forEach(item => {
            const texto = JSON.stringify(item).toLowerCase();
            if (texto.includes(q)) {
                resultados.push({ tipo, item });
            }
        });
    });

    return resultados.slice(0, 10);
}

function estadisticas() {
    const data = leer();
    return {
        boletas: data.boletas.length,
        pagos: data.pagos.length,
        imagenes: data.imagenes.length,
        videos: data.videos.length,
        redes: data.redes.length,
        notas: data.notas.length,
        materiales: data.materiales.length,
        totalGastado: data.boletas.reduce((s, b) => s + (b.monto || 0), 0)
    };
}

// ====== CONTROL DE ACCESO ======

// Verificar si un chatId está autorizado
function esAutorizado(chatId) {
    const data = leer();
    // Si no hay owner, cualquiera puede usar (primera vez)
    if (!data.owner) return true;
    return data.autorizados.includes(chatId) || data.owner === chatId;
}

// Registrar el primer usuario como owner
function setOwner(chatId, nombre) {
    const data = leer();
    if (!data.owner) {
        data.owner = chatId;
        data.autorizados.push(chatId);
        if (!data.meta) data.meta = {};
        data.meta.ownerNombre = nombre || 'Owner';
        guardar(data);
    }
    return data.owner === chatId;
}

// Verificar si es el owner
function esOwner(chatId) {
    const data = leer();
    return data.owner === chatId;
}

// Agregar usuario autorizado
function agregarAutorizado(chatId, nombre) {
    const data = leer();
    if (!data.autorizados.includes(chatId)) {
        data.autorizados.push(chatId);
        guardar(data);
    }
    return true;
}

// Quitar usuario autorizado
function quitarAutorizado(chatId) {
    const data = leer();
    data.autorizados = data.autorizados.filter(id => id !== chatId);
    guardar(data);
    return true;
}

// Listar autorizados
function listarAutorizados() {
    const data = leer();
    return { owner: data.owner, lista: data.autorizados };
}

module.exports = {
    leer, guardar,
    agregarBoleta, agregarPago, agregarImagen, agregarVideo, agregarRed, agregarNota,
    resumenFinanciero, ultimosRegistros, buscar, estadisticas,
    esAutorizado, setOwner, esOwner, agregarAutorizado, quitarAutorizado, listarAutorizados
};
