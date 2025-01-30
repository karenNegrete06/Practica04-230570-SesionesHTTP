import express, { request, response } from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'; //versión 4 de uuid
import os, { networkInterfaces } from 'os';
import macaddress from 'macaddress';
import moment from 'moment-timezone';


const app = express();
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

// Configuración de la sesión
app.use(session({
    secret: 'p2-KLNH#jinx-sesionespersistentes',  // Secreto para firmar la cookie de sesión
    resave: false,  // No resguardar la sesión si no ha sido modificada
    saveUninitialized: true,  // Guardar la sesión aunque no haya sido inicializada
    cookie: { maxAge: 5 * 60 * 1000}  // Usar secure: true si usas HTTPS
}));


// Ruta de bienvenida

app.get('/', (req, res) => {
    return res.status(200).json({
        message: "Bienvenid@ al API de control de Sesiones",
                                 author: "Karen Lizbeth Negrete Hernández"
    });
});

const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
};

const getServerMac = () => {
    return new Promise((resolve, reject) => {
        macaddress.one((err, mac) => {
            if (err) {
                reject(err);
            }
            resolve(mac);
        });
    });
};

app.post('/login', async (req, res) => {
    const { email, nickname, macAddress } = req.body;
    if (!email || !nickname || !macAddress) {
        return res.status(400).json({
            message: 'Se esperan campos requeridos'
        });
    }

    const sessionID = uuidv4();
    const createdAt_CDMX = moment().tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss');

    req.session.email = email;
    req.session.sessionID = sessionID;
    req.session.nickname = nickname;
    req.session.macAddress = macAddress;
    req.session.createdAt = createdAt_CDMX;
    req.session.lastAccessed = createdAt_CDMX;
    req.session.serverIp = getLocalIp();
    req.session.serverMac = await getServerMac();

    sessions[sessionID] = req.session;

    res.status(200).json({
        message: 'Se ha logueado de manera exitosa',
        sessionID
    });
});

app.post('/logout', (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    delete sessions[req.session.sessionID];
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: 'Error no se pudo cerrar sesión'
            });
        }
    });

    res.status(200).json({
        message: 'Logout exitoso'
    });
});

app.post('/update', (req, res) => {
    const { email, nickname } = req.body;

    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No hay una sesión activa'
        });
    }
    if (nickname) req.session.nickname = nickname;
    if (email) req.session.email = email;
   
    req.session.lastAccessed = moment().tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss');

    sessions[req.session.sessionID] = req.session;

    // Clonar el objeto de sesión sin la cookie
    const sessionData = { ...req.session };
    delete sessionData.cookie; // Eliminar la cookie de la respuesta

    res.status(200).json({
        message: 'Datos actualizados',
        session: sessionData
    });
});
app.get('/status', (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    const session = sessions[req.session.sessionID];
    const now = moment();
    const idleTime = now.diff(moment(session.lastAccessed, 'YYYY/MM/DD HH:mm:ss'), 'seconds');
    const duration = now.diff(moment(session.createdAt, 'YYYY/MM/DD HH:mm:ss'), 'seconds');
    
    // Crear una copia del objeto de sesión sin la propiedad 'cookie'
    const sessionData = { ...session };
    delete sessionData.cookie; // Eliminar la cookie

    res.status(200).json({
        message: 'Sesión activa',
        session: sessionData, // Usar sessionData sin la cookie
        idleTime: `${idleTime} segundos`,
        duration: `${duration} segundos`
    });
});
app.get('/sessionactives', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({
            message: 'No hay sesiones activas'
        });
    }

    const formattedSessions = {};
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        // Eliminar la propiedad 'cookie' antes de enviar la respuesta
        const { cookie, ...sessionWithoutCookie } = session;
        formattedSessions[sessionID] = {
            ...sessionWithoutCookie,
            createdAt: moment(session.createdAt).tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss'),
            lastAccessed: moment(session.lastAccessed).tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss')
        };
    }

    res.status(200).json({
        message: 'Sesiones activas',
        sessions: formattedSessions
    });
});

setInterval(() => {
    const now = moment();
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        const idleTime = now.diff(moment(session.lastAccessed, 'YYYY/MM/DD HH:mm:ss'), 'seconds');
        if (idleTime > 120) { 
            delete sessions[sessionID];
        }
    }
}, 60000);