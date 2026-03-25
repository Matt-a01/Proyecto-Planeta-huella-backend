require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Institution = require('./models/Institution');
const User = require('./models/User');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
//const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');

const app = express();

// SEGURIDAD 

// MIDDLEWARES GLOBALES
app.use(cors({
    origin: ['http://localhost:5173', 'https://proyecto-planeta-huella.onrender.com'] 
}));
app.use(express.json()); // Permite recibir datos en formato JSON

//Protege las cabeceras HTTP contra ataques cruzados (XSS)
app.use(helmet()); 

//Mongo Sanitize: Elimina cualquier signo "$" o "." de los inputs para evitar inyección de BD
//app.use(mongoSanitize());

//Rate Limiter: Protección contra BOTS y SPAM. 
// Limita a 5 peticiones por IP cada 15 minutos para las rutas de creación de cuentas y login.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos permitidos por IP
    message: { error: 'Demasiadas peticiones desde esta IP. Por favor, Intentalo mas tarde.' }
});

    // RUTAS (Endpoints)

//ruta para obtener todos los pines (InteractiveMap.jsx)
app.get('/api/pins', async (req, res) => {
try {
    // Devolver datos publicos
    const pins = await Institution.find({ role: { $ne: 'adoptante' } })
    .select('-password -email');
    res.json(pins);
} catch (error) {
    console.error("🔥 ERROR REAL DEL SERVIDOR:", error);
    res.status(500).json({ error: 'Error al obtener el mapa' });
}
});

//  Registrar institución y/o usuarios (AuthModal.jsx)
app.post('/api/register', authLimiter, [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio').escape(),
    body('email').isEmail().withMessage('Debe ser un correo válido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
    body('role').isIn(['adoptante', 'veterinaria', 'refugio']).withMessage('Rol inválido')
], async (req, res) => {

const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
}

try {      
    const { role, email } = req.body;

    //determina que el correo no exista en ninguna colección (en la DB)
    const userExists = await User.findOne({ email });
    const instExists = await Institution.findOne({ email });
    if (userExists || instExists) {
        return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    // Separa su categoria segun su rol
    let newAccount;
    if (role === 'adoptante') {
        newAccount = new User(req.body); //colección 'users'
    } else {
        newAccount = new Institution(req.body); //colección 'institutions'
    }

    await newAccount.save();

    //Auto key loging
    const token = jwt.sign({ id: newAccount._id, role: newAccount.role }, 'TOKEN_KEY', { expiresIn: '7d' });

    res.status(201).json({ 
        message: 'Registrado con éxito', 
        token, 
        user: { name: newAccount.name, role: newAccount.role, email: newAccount.email } 
        });
    } catch (error) {
        console.error("🔥 ERROR REAL DEL SERVIDOR:", error);
    res.status(400).json({ error: 'Error al registrar', details: error.message });
    }
});

//  LOGIN
app.post('/api/login', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {

const errors = validationResult(req);
    if (!errors.isEmpty()) {
return res.status(400).json({ error: 'Datos de acceso inválidos' });
}

try {
    const { email, password } = req.body;

    //Busca si es Usuario o si es Institución
    let account = await User.findOne({ email });
    if (!account) {
        account = await Institution.findOne({ email });
    }

    if (!account) {
        return res.status(400).json({ error: 'Usuario o contraseña no encontrados, verifique la informacion' });
    }

// Comparar la contraseña encriptada
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
        return res.status(400).json({ error: 'Usuario o contraseña no encontrados, verifique la informacion' });
    }

    // Crear token de sesión
    const token = jwt.sign({ id: account._id, role: account.role }, 'TOKEN_KEY', { expiresIn: '7d' });

    res.json({ 
    message: 'Login exitoso', 
    token, 
    user: { name: account.name, role: account.role, email: account.email } 
    });
    } catch (error) {
        console.error("🔥 ERROR REAL DEL SERVIDOR:", error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// CONEXIÓN A LA BASE DE DATOS
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log(`Conectado a MongoDB (${process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'TESTEO'})`);
    // Iniciador de servidor 
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(` Servidor corriendo en el puerto ${PORT}`));
})
.catch(err => console.error('Error conectando a MongoDB', err));   