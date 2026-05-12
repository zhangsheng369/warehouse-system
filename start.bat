@echo off

cd /d %~dp0

echo =====================
echo 企业版仓库系统启动中
echo =====================

IF NOT EXIST node_modules (
  echo 正在安装依赖...
  npm install
)

start http://localhost:3000

npm start

pause