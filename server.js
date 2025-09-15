const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.json());

// Endpoint para obtener la hora actual del servidor
app.get('/api/current-time', (req, res) => {
    try {
        const now = new Date();
        
        // Configurar para Argentina (GMT-3)
        const argentinaTime = new Date(now.toLocaleString("en-US", {
            timeZone: "America/Argentina/Buenos_Aires"
        }));

        res.json({
            timestamp: argentinaTime.getTime(),
            iso: argentinaTime.toISOString(),
            local: argentinaTime.toLocaleString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }),
            timezone: 'America/Argentina/Buenos_Aires',
            offset: -3
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la hora actual' });
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint de salud del servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Servidor DVR Calculator funcionando correctamente'
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores del servidor
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor DVR Calculator iniciado en http://localhost:${PORT}`);
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
    console.log(`⚡ API de tiempo disponible en: http://localhost:${PORT}/api/current-time`);
    console.log(`💚 Estado del servidor: http://localhost:${PORT}/health`);
    console.log(`⏰ Zona horaria configurada: America/Argentina/Buenos_Aires (GMT-3)`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('🔴 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🔴 Servidor cerrado por el usuario');
    process.exit(0);
});
