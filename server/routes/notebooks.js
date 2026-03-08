const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Multerの設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and PDF files are allowed!'));
        }
    }
});

// ノート一覧取得
router.get('/', (req, res) => {
    try {
        const notebooks = db.prepare('SELECT * FROM notebooks ORDER BY created_at DESC').all();
        res.json(notebooks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ノート登録
router.post('/', upload.single('file'), (req, res) => {
    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
        return res.status(400).json({ error: 'Title and file are required' });
    }

    try {
        const info = db.prepare('INSERT INTO notebooks (title, file_name, file_type) VALUES (?, ?, ?)')
            .run(title, file.filename, file.mimetype);
        res.json({ id: info.lastInsertRowid, title, file_name: file.filename, file_type: file.mimetype });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ノート削除
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    try {
        const notebook = db.prepare('SELECT file_name FROM notebooks WHERE id = ?').get(id);
        if (notebook) {
            const filePath = path.join(__dirname, '../uploads', notebook.file_name);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notebook not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
