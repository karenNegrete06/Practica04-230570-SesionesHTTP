//Exportacion 
import express, {request,response}  from "express";
import session from "express-session";
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import os from "os";

const app=express();
const PORT =3000;

app.listen( PORT,()=>{
   console.log(`servidor iniciado en http://localhost:${PORT}`)
})

app.use(express.json())
app.use(express.urlencoded({extended:true}));

//Sesiones almacenamiento en Memoria(RAM)
const sessions={};

app.use(
    session({
        secret: "P4-KLHN#jinx-SesionesHTTP-VariablesDeSesion",
        resave:false,
        saveUninitialized:false,
        cookie:{maxAge:5*60*1000}
    })
)

app.get('/',(request,response)=>{
    return response.status(200).json({message:"Bienvenid@ al API de control de Sesiones",
                                            author: "Karen Lizbeth Negrete Hernández"})
})
//funcion de utilidad que nos permitiera acceder a la informacion de la interfaz de red
const getLocalIP=()=>{
    const networkInterfaces=os.networkInterfaces();
    for(const interfaceName in networkInterfaces){
        const interfaces = networkInterfaces[interfaceName];
        for(const iface of interfaces){
            if(iface.family === "IPv4" && !iface.internal){
                return iface.address;
            }
        }
    }
    return null;
}

app.post('/login',(request,response)=>{
    const{email,nickname,macAddress}=request.body;

    if(!email|| !nickname || !macAddress){
        return response.status(400).json({message:"Se esperan campos requeridos"})
    }
    const sessionId=uuidv4();
    const now = new Date();

    session[sessionId]={
        sessionId,
        email,
        nickname,
        macAddress,
        ip:getLocalIP(),
        createAt:now,
        lastAccesed:now
    };

    response.status(200).json({
        message:"Se ha logrado de manera existosa",
        sessionId,
    });
})
app.post("/logout",(request,response)=>{
    const {sessionId}=request.body;
    if(!sessionId|| !sessions[sessionId]){
        return response.status(404).json({message:" No se ha encontrado una sesion activa"});
    }
    delete sessions[sessionId];
    request.session.destroy((err)=>{
        if(err){
            return response.status(500).send('Error al cerrar sesion')
        }
    })
    response.status(200).json({message:"Logout succesful"});
});

app.post("/update",(request,response)=>{
   const {sessionId,email,nickname}=request.body;
   if(!sessionId||!sessions[sessionId]){
    return response.status(404).json({message:"No existe una sesion activa"})
   }
   if(email) sessions[sessionId].email=email;
   if(nickname)sessions[sessionId].nickname=nickname;
    IdleDeadline()
    sessions[sessionId].lastAcceses=newDate();
})

app.get("/status",(request,response)=>{
    const sessionId=request.query.sessionId;
    if(!sessionId|| !session[sessionId]){
        response.status(404).json({message:"No hay session activa"})
    }
    response.status(200).json({
        message:"Sesion Activa",
        session:sessions[sessionId]
    })
})