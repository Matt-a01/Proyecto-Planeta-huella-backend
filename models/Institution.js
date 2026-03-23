const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const InstitutionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    role: { type: String, enum: ['adoptante', 'refugio', 'veterinaria', 'campaña'] },
    location: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    },
    services: String,
    hours: String,
}, { timestamps: true }); 

// Encriptación de contraseña
InstitutionSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Exportamos el modelo para que otros archivos lo puedan usar
module.exports = mongoose.model('Institution', InstitutionSchema);