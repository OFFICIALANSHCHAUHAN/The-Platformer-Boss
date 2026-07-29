const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Send index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Game State
const GRAVITY = 0.5; const MAX_LEVELS = 50;
let players = {};
let level = 1;
let hearts = 0;
let platforms = [];
let heartItems = [];
let gameOver = false;
let winner = null;

function generateLevel(lvl){
  platforms = [{x:0,y:560,w:800,h:40}];
  heartItems = [];
  let platCount = 3 + Math.floor(lvl/5);
  for(let i=0;i<platCount;i++){
    let gap = 120 + lvl*2;
    platforms.push({x:100+i*gap%700, y:540-i*50, w:Math.max(60,120-lvl), h:10})
  }
  for(let i=0;i<10;i++){
    let p = platforms[Math.floor(Math.random()*platforms.length)];
    heartItems.push({x:p.x+p.w/2-10, y:p.y-20, w:20, h:20, collected:false})
  }
}
generateLevel(1);

function rectCollision(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

setInterval(()=>{
  for(let id in players){
    let p=players[id];
    if(p.keys.left)p.vx=-5; else if(p.keys.right)p.vx=5; else p.vx=0;
    if(p.keys.jump && p.onGround){p.vy=-12; p.onGround=false}
    p.vy+=GRAVITY; p.x+=p.vx; p.y+=p.vy; p.onGround=false;

    platforms.forEach(plat=>{
      if(rectCollision(p,plat)&&p.vy>0){p.y=plat.y-p.h; p.vy=0; p.onGround=true}
    })

    heartItems.forEach(h=>{
      if(!h.collected && rectCollision(p,h)){h.collected=true; p.hearts++}
    })

    let collectedCount = heartItems.filter(h=>h.collected).length;
    if(collectedCount >= 10){
      if(level >= MAX_LEVELS){gameOver=true; winner=p.name}
      else{level++; hearts=0; generateLevel(level); for(let pid in players){players[pid].hearts=0; players[pid].x=50; players[pid].y=500}}
    }
    if(p.y>600){p.x=50; p.y=500}
  }

  wss.clients.forEach(client=>{
    if(client.readyState===1){
      client.send(JSON.stringify({type:'state',players,platforms,heartItems,level,gameOver,winner}))
    }
  })
},1000/30);

wss.on('connection',ws=>{
  const id='p'+(Object.keys(players).length+1);
  const colors=['#00f0ff','#ff00ff'];
  players[id]={x:50,y:500,w:25,h:25,vx:0,vy:0,color:colors[0],keys:{left:false,right:false,jump:false},hearts:0,name:"Player",onGround:false};
  ws.id=id; ws.send(JSON.stringify({type:'init',id}));

  ws.on('message',msg=>{
    const data=JSON.parse(msg);
    if(data.type==='setname'&&players[id])players[id].name=data.name;
    if(data.type==='input'&&players[id])players[id].keys=data.keys;
    if(data.type==='cheat'){
      if(data.action==='setlevel'){level=data.level; generateLevel(level)}
      if(data.action==='sethearts'){players[id].hearts=data.hearts}
    }
  });
  ws.on('close',()=>{delete players[id]});
});

server.listen(PORT,()=>console.log('The Platformer Boss running on '+PORT))
