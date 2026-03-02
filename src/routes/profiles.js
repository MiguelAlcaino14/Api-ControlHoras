"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.patch('/liberar/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('usuarios') // Asegúrate que en Supabase se llame 'usuarios'
        .update({
        is_released: true,
        released_at: new Date().toISOString()
    })
        .eq('id', id)
        .select();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({
        message: 'Perfil liberado con éxito',
        profile: data ? data[0] : null
    });
});
exports.default = router;
//# sourceMappingURL=profiles.js.map