const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');

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

app.get('/api/items',auth,(req,res)=>{
  res.json(load(DB_FILE));
});

app.post('/api/add',auth,(req,res)=>{

  const items = load(DB_FILE);

  items.push(req.body);

  save(DB_FILE,items);

  const logs = load(LOG_FILE);

  logs.push({
    user:req.user.username,
    action:'新增库存',
    model:req.body.model,
    time:new Date().toLocaleString()
  });

  save(LOG_FILE,logs);

  res.json({success:true});
});

app.get('/api/logs',auth,(req,res)=>{
  res.json(load(LOG_FILE));
});

app.listen(PORT,()=>{
  console.log('企业版系统启动成功：http://localhost:3000');
});