const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:[YOUR-PASSWORD]@db.kdhbanudissgvtwhzzgq.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = 3000;
const SECRET = 'warehouse_secret';

const users = [
  { username:'admin', password:'123456', role:'admin' }
];

const DB_FILE = './inventory.json';
const LOG_FILE = './logs.json';

function load(file, def=[]){
  if(!fs.existsSync(file)){
    fs.writeFileSync(file, JSON.stringify(def,null,2));
  }
  return JSON.parse(fs.readFileSync(file));
}

function save(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

function auth(req,res,next){
  const token = req.headers.authorization;

  if(!token){
    return res.status(401).json({error:'未登录'});
  }

  try{
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  }catch{
    res.status(401).json({error:'登录失效'});
  }
}

app.post('/api/login',(req,res)=>{

  const {username,password} = req.body;

  const user = users.find(
    u=>u.username===username && u.password===password
  );

  if(!user){
    return res.status(401).json({error:'账号或密码错误'});
  }

  const token = jwt.sign(user, SECRET);

  res.json({token, role:user.role});
});

app.get('/api/items', async (req, res) => {

  const result = await pool.query(
    'SELECT * FROM inventory ORDER BY id DESC'
  );

  res.json(result.rows);

});

app.post('/api/add', async (req, res) => {

  const {
    model,
    name,
    category,
    stock,
    min
  } = req.body;

  await pool.query(
    `INSERT INTO inventory
    (model,name,category,stock,min)
    VALUES ($1,$2,$3,$4,$5)`,
    [model,name,category,stock,min]
  );

  await pool.query(
    `INSERT INTO logs
    (user_name,action,model,quantity,time)
    VALUES ($1,$2,$3,$4,$5)`,
    [
      'admin',
      '新增库存',
      model,
      stock,
      new Date().toLocaleString()
    ]
  );

  res.json({
    success:true
  });

});

app.get('/api/logs', async (req, res) => {

  const result = await pool.query(
    'SELECT * FROM logs ORDER BY id DESC'
  );

  res.json(result.rows);

});

app.listen(PORT,()=>{
  console.log('企业版系统启动成功：http://localhost:3000');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

app.post('/api/ocr-upload', upload.single('image'), async (req, res) => {
  try {
    const result = await Tesseract.recognize(
      req.file.path,
      'chi_sim+eng'
    );

    const text = result.data.text;

    console.log('OCR识别结果:', text);

    // 自动识别数量
    const qtyMatch = text.match(/数量[:：]?\s*(\d+)/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 0;

    // 自动识别型号
    const modelMatch = text.match(/型号[:：]?\s*([A-Za-z0-9\-]+)/);
    const model = modelMatch ? modelMatch[1] : '';

    // 读取库存
    let inventory = JSON.parse(fs.readFileSync('inventory.json'));

    // 自动扣库存
    inventory = inventory.map(item => {
      if (item.name === model) {
        item.stock = Number(item.stock) - quantity;
      }
      return item;
    });

    fs.writeFileSync('inventory.json', JSON.stringify(inventory, null, 2));

    // 写日志
    const logs = JSON.parse(fs.readFileSync('logs.json'));

    logs.unshift({
      type: 'OCR自动出库',
      model,
      quantity,
      time: new Date().toLocaleString()
    });

    fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));

    res.json({
      success: true,
      text,
      model,
      quantity
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'OCR识别失败'
    });
  }
});