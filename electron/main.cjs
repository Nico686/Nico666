const { app, BrowserWindow, dialog } = require('electron');
const { fork } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
let serverProcess, windowRef, port = 8765;
function ping(p){return new Promise(resolve=>{const req=http.get({hostname:'127.0.0.1',port:p,path:'/api/feishu/status',timeout:700},res=>{res.resume();resolve(res.statusCode===200)});req.on('error',()=>resolve(false));req.on('timeout',()=>{req.destroy();resolve(false)});});}
async function findPort(){for(let p=8765;p<=8785;p++)if(await ping(p))return {port:p,existing:true};return {port:8765,existing:false};}
async function startServer(){const found=await findPort();port=found.port;if(found.existing)return;const root=app.isPackaged?process.resourcesPath: path.resolve(__dirname,'..');const script=app.isPackaged?path.join(process.resourcesPath,'tools','local-server.cjs'):path.join(root,'tools','local-server.cjs');serverProcess=fork(script,[],{env:{...process.env,HUIDI_PORT:String(port),HUIDI_NO_BROWSER:'1'},stdio:'ignore'});for(let i=0;i<80;i++){if(await ping(port))return;await new Promise(r=>setTimeout(r,250));}throw new Error('本地服务启动超时');}
async function createWindow(){await startServer();windowRef=new BrowserWindow({width:1440,height:920,minWidth:1024,minHeight:700,autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false}});await windowRef.loadURL('http://127.0.0.1:'+port+'/workspace.html');windowRef.on('closed',()=>windowRef=null);}
app.whenReady().then(createWindow).catch(e=>dialog.showErrorBox('MLXG Docs 启动失败',String(e)));
app.on('window-all-closed',()=>{if(serverProcess&&!serverProcess.killed)serverProcess.kill();if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>{if(serverProcess&&!serverProcess.killed)serverProcess.kill();});
