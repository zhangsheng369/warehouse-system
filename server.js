const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

/* =========================
   模拟数据库
========================= */

let items = [
  {
    model: 'A100',
    name: '测试物料',
    category: '电子',
    stock: 50,
    min: 10
  }
];

let logs = [
  {
    time: new Date().toLocaleString(),
    user: 'admin',
    action: '系统初始化',
    model: 'SYSTEM'
  }
];

/* =========================
   登录
========================= */

app.post('/api/login', (req, res) => {

  const { username, password } = req.body;

  if (username === 'admin' && password === '123456') {

    return res.json({
      token: 'admin-token'
    });

  }

  res.json({
    error: '账号或密码错误'
  });

});

/* =========================
   获取库存
========================= */

app.get('/api/items', (req, res) => {

  res.json(items);

});

/* =========================
   新增库存
========================= */

app.post('/api/add', (req, res) => {

  const item = req.body;

  items.push(item);

  logs.push({
    time: new Date().toLocaleString(),
    user: 'admin',
    action: '新增库存',
    model: item.model
  });

  res.json({
    success: true
  });

});

/* =========================
   获取日志
========================= */

app.get('/api/logs', (req, res) => {

  res.json(logs);

});

/* =========================
   OCR识别
========================= */

app.post('/api/ocr-upload', upload.single('image'), async (req, res) => {

  try {

    const result = await Tesseract.recognize(
      req.file.path,
      'chi_sim+eng'
    );

    res.json({
      success: true,
      text: result.data.text
    });

  } catch (err) {

    res.json({
      success: false,
      error: err.message
    });

  }

});

/* =========================
   启动
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log('server running');

});