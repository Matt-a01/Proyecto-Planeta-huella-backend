require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// SEGURIDAD 

app.use(cors({
    origin: ['http://localhost:5173', 'https://proyecto-planeta-huella.onrender.com'] 
}));
app.use(express.json()); // Permite recibir datos en formato JSON


//  MODELO DE DATOS (Estructura y Seguridad) 

const InstitutionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, //Contraseña guardada con encriptacion
    role: { type: String, enum: ['adoptante', 'refugio', 'veterinaria', 'campaña'] },

    // Datos para el mapa
    location: {    
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    },

    services: String,
    hours: String,
    }, { timestamps: true }); // Guarda la fecha de creación

    // encriptacion de contraseña antes de ser guardada
    InstitutionSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
    });

    const Institution = mongoose.model('Institution', InstitutionSchema);

    // RUTAS (Endpoints)

    //ruta para obtener todos los pines (InteractiveMap.jsx)
    app.get('/api/pins', async (req, res) => {
    try {
        // Devolver datos publicos
        const pins = await Institution.find({ role: { $ne: 'adoptante' } })
        .select('-password -email');
        res.json(pins);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el mapa' });
    }
    });

    // Registrar institución (AuthModal.jsx)
    app.get('/api/register', async (req, res) => {
    try {
        const newInst = new Institution(req.body);
        await newInst.save();
        res.status(201).json({ message: 'Registrado con éxito' });
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar. Quizás el correo ya existe.' });
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