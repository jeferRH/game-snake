const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors()); 
app.use(express.json());

// Estas variables las configuraremos en el panel de Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Busca esta sección en tu server.js y reemplázala temporalmente:
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ username, password_hash: passwordHash }]).select();

        // ESTO NOS VA A DECIR EL ERROR REAL:
        if (error) {
            console.error("Error real de Supabase:", error);
            return res.status(400).json({ error: `Supabase dice: ${error.message} (Código: ${error.code})` });
        }
        
        res.json({ success: true, user: data[0].username });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inicio de sesión
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase
        .from('usuarios').select('*').eq('username', username).single();

    if (error || !user) return res.status(400).json({ error: 'Usuario no encontrado.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Contraseña incorrecta.' });

    res.json({ success: true, user: user.username });
});

// Guardar récord
app.post('/api/scores', async (req, res) => {
    const { username, score } = req.body;
    const { data: user } = await supabase.from('usuarios').select('id').eq('username', username).single();
    
    if (user) {
        await supabase.from('puntuaciones').insert([{ usuario_id: user.id, score: parseInt(score) }]);
        res.json({ success: true });
    } else { res.status(404).json({ error: 'Usuario inválido' }); }
});

// Tabla de posiciones
app.get('/api/scores/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('puntuaciones')
            .select('score, usuarios(username)')
            .order('score', { ascending: false })
            .limit(10);

        if (error) return res.status(400).json({ error: error.message });
        
        const formatted = data.map(item => ({ 
            username: item.usuarios ? item.usuarios.username : 'Anónimo', 
            score: item.score 
        }));
        res.json(formatted);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));