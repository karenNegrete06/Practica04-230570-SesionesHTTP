import express from 'express';
import session from 'express-session';
import moment from 'moment-timezone';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

// Configuración de la sesión
app.use(session({
    secret: 'p2-KLNH#jinx-sesionespersistentes',  // Secreto para firmar la cookie de sesión
    resave: false,  // No resguardar la sesión si no ha sido modificada
    saveUninitialized: true,  // Guardar la sesión aunque no haya sido inicializada
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }  // Usar secure: true si usas HTTPS
}));

// Middleware para manejar la sesión y registrar la última vez de acceso
app.use((req, res, next) => {
    if (!req.session) {
        req.session = {};  // Inicializar req.session si no está definido
    }

    if (!req.session.createdAt) {
        req.session.createdAt = new Date();  // Asignamos la fecha de la creación de la sesión
    }
    req.session.lastAcces = new Date();  // Asignamos la última vez que se accedió a la sesión
    next();
});

// Función para obtener la IP del cliente
const getClientIp = (req) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return ip;
};

// Función para obtener la MAC Address
const getMacAddress = () => {
    // Esta función es un ejemplo, y solo devuelve un valor fijo.
    // Para obtener la MAC real del cliente, se necesita acceder a la red de bajo nivel
    // lo cual no es posible desde Node.js directamente en la mayoría de los entornos.
    return "00:14:22:01:23:45"; // Ejemplo de MAC
};

// Función para calcular el tiempo de inactividad
const getInactiveTime = (lastAccessed) => {
    const now = new Date();
    return Math.floor((now - new Date(lastAccessed)) / 1000); // En segundos
};

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Bienvenid@ al API de control de Sesiones",
        author: "Karen Lizbeth Negrete Hernández"
    });
});

// Ruta para iniciar sesión
app.get('/login/:user/:email', (req, res) => {
    const { user, email } = req.params;
    
    if (!req.session.User) {
        req.session.User = user;  // Guardar el nombre de usuario en la sesión
        req.session.email = email; // Guardar el email del usuario
        req.session.createdAt = new Date();  // Registrar la creación de la sesión
    }

    req.session.lastAcces = new Date();  // Registrar el último acceso
    req.session.sessionId = uuidv4();  // Asignar un UUID único para la sesión
    req.session.clientIp = getClientIp(req); // Asignar IP del cliente
    req.session.clientMac = getMacAddress(); // Asignar MAC del cliente
    req.session.serverIp = getClientIp(req); // IP del servidor
    req.session.serverMac = getMacAddress(); // MAC del servidor
    
    res.send(`Sesión iniciada para el usuario: ${user}`);
});

// Ruta para actualizar la información de la sesión
app.get('/update', (req, res) => {
    if (req.session.User) {
        req.session.lastAcces = new Date();  // Actualizar el último acceso
        res.send(`La fecha del último acceso ha sido actualizada`);
    } else {
        res.send(`No hay sesión activa`);
    }
});

// Ruta para obtener el estado de la sesión
app.get('/status', (req, res) => {
    if (req.session && req.session.createdAt && req.session.User) {
        const now = new Date();
        const started = new Date(req.session.createdAt);
        const lastUpdate = new Date(req.session.lastAcces);

        const sessionAgeMs = now - started;
        const hours = Math.floor(sessionAgeMs / (1000 * 60 * 60));
        const minutes = Math.floor(sessionAgeMs % (1000 * 60 * 60) / (1000 * 60));
        const seconds = Math.floor(sessionAgeMs % (1000 * 60) / 1000);

        const createdAt_CDMX = moment(started).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
        const lastAcces_CDMX = moment(lastUpdate).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');

        res.send(`
            <h1>Estado de la sesión</h1>
            <p><strong>Usuario:</strong> ${req.session.User}</p>
            <p><strong>Email:</strong> ${req.session.email}</p>
            <p><strong>ID de sesión:</strong> ${req.session.sessionId}</p>
            <p><strong>Fecha de creación de la sesión:</strong> ${createdAt_CDMX}</p>
            <p><strong>Último acceso:</strong> ${lastAcces_CDMX}</p>
            <p><strong>IP del cliente:</strong> ${req.session.clientIp}</p>
            <p><strong>MAC del cliente:</strong> ${req.session.clientMac}</p>
            <p><strong>IP del servidor:</strong> ${req.session.serverIp}</p>
            <p><strong>MAC del servidor:</strong> ${req.session.serverMac}</p>
            <p><strong>Antigüedad de la sesión:</strong> ${hours} horas, ${minutes} minutos y ${seconds} segundos</p>
        `);
    } else {
        res.send('No hay una sesión activa. La sesión ha expirado o nunca fue iniciada.');
    }
});

// Ruta para listar las sesiones activas
app.get('/listCurrentSessions', (req, res) => {
    res.status(200).json({
        message: "Sesiones activas",
        sessions: req.session
    });
});

// Ruta para cerrar la sesión
app.get('/logout', (req, res) => {
    if (req.session.User) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Error al cerrar sesión.');
            }

            req.session = null;
            res.send('Sesión cerrada correctamente');
        });
    } else {
        res.send('No hay una sesión activa para cerrar');
    }
});

// Destrucción automática de sesión después de 2 minutos de inactividad
setInterval(() => {
    const now = new Date();
    for (const sessionId in req.session) {
        const session = req.session[sessionId];
        const inactiveTime = getInactiveTime(session.lastAcces);

        if (inactiveTime >= 120) { // Si la sesión tiene más de 2 minutos de inactividad
            delete req.session[sessionId]; // Destruir la sesión
            console.log(`Sesión ${sessionId} destruida por inactividad`);
        }
    }
}, 60000); // Verificar cada minuto

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});