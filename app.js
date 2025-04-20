const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // CSS, 이미지 등 정적 파일용

// 업로드 폴더 생성
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fileId = req.fileId;
        const folderPath = path.join(UPLOAD_FOLDER, fileId);
        fs.mkdirSync(folderPath, { recursive: true });
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const assignFileId = (req, res, next) => {
    req.fileId = uuidv4().slice(0, 8);
    next();
};

const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// 업로드 폼
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'upload.html'));
});

// 업로드 처리
app.post('/', assignFileId, upload.single('file'), (req, res) => {
    const fileId = req.fileId;
    const downloadUrl = `${req.protocol}://${req.get('host')}/download/${fileId}`;
    res.send(`
        <html><body>
        <p>업로드 완료!</p>
        <a href="${downloadUrl}">다운로드 페이지로 이동</a>
        </body></html>
    `);
});

// 다운로드 페이지
app.get('/download/:fileId', (req, res) => {
    const folder = path.join(UPLOAD_FOLDER, req.params.fileId);
    if (!fs.existsSync(folder)) {
        return res.status(404).send('파일을 찾을 수 없습니다.');
    }

    const files = fs.readdirSync(folder);
    if (files.length === 0) {
        return res.status(404).send('파일이 비어있습니다.');
    }

    const filename = files[0];
    res.send(`
        <html><body>
        <p>파일: ${filename}</p>
        <a href="/get/${req.params.fileId}/${encodeURIComponent(filename)}">다운로드</a>
        </body></html>
    `);
});

// 파일 다운로드 처리
app.get('/get/:fileId/:filename', (req, res) => {
    const folder = path.join(UPLOAD_FOLDER, req.params.fileId);
    const filePath = path.join(folder, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('파일이 존재하지 않습니다.');
    }
    res.download(filePath);
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
