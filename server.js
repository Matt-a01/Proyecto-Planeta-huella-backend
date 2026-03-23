require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Institution = require('./models/Institution');

const app = express();

// SEGURIDAD 

app.use(cors({
    origin: ['http://localhost:5173', 'https://proyecto-planeta-huella.onrender.com'] 
}));
app.use(express.json()); // Permite recibir datos en formato JSON

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
app.post('/api/register', async (req, res) => {
try {      
    const newInst = new Institution(req.body);

    res.status(201).json({ message: 'Registrado con éxito' });
} catch (error) {
    res.status(400).json({ error: 'Error al registrar. Verifique su informacion' });
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