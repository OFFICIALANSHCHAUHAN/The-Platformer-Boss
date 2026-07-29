const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"><title>The Platformer Boss - Neon</title><style>body{margin:0;background:#0a0a1a;overflow:hidden;font-family:Arial}canvas{display:block;background:#0a0a1a;background-image:linear-gradient(#1a1a3a 1px,transparent 1px),linear-gradient(90deg,#1a1a3a 1px,transparent 1px);background-size:40px 40px;touch-action:none}#hud{position:absolute;top:10px;width:100%;text-align:center;color:#00f0ff;font-weight:bold;font-size:14px;text-shadow:0 0 10px #00f0ff}#logo{position:absolute;top:10px;right:15px;color:#ff00ff;font-weight:bold;font-size:18px;text-shadow:0 0 10px #ff00ff}#menu{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,30,0.98);color:#00f0ff;padding:15px;border-radius:10px;border:2px solid #ff00ff;display:none;z-index:20;width:95%;max-width:420px;max-height:85%;overflow-y:auto}#menu h2{text-align:center;color:#ff00ff;text-shadow:0 0 10px #ff00ff}#menu.player-box{border:1px solid #00f0ff;padding:8px;margin:5px;border-radius:8px;background:#111133}#menu input{margin:3px;padding:4px;width:60px;background:#1a1a3a;color:#00f0ff;border:1px solid #00f0ff}#menu button{margin:3px;padding:6px 10px;background:#ff00ff;color:white;border:none;border-radius:5px;box-shadow:0 0 10px #ff00ff}#namePrompt{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#111133;padding:20px;border-radius:10px;border:2px solid #00f0ff;z-index:30;text-align:center;color:#00f0ff;box-shadow:0 0 20px #00f0ff}#win{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,30,0.95);color:#ff00ff;padding:30px;border-radius:15px;border:2px solid #ff00ff;font-size:24px;text-align:center;display:none;z-index:10;box-shadow:0 0 30px #ff00ff}.btn{position:absolute;bottom:40px;width:70px;height:70px;background:rgba(0,240,255,0.15);border:3px solid #00f0ff;border-radius:50%;color:#00f0ff;font-size:35px;display:flex;align-items:center;justify-content:center;user-select:none;box-shadow:0 0 20px #00f0ff}#left{left:20px}#right{left:110px}#jump{right:110px}#attack{right:20px;background:rgba(255,0,85,0.2);border-color:#ff0055;color:#ff0055;box-shadow:0 0 20px #ff0055}</style></head><body><div id="hud">NEON PLATFORMER BOSS - LOADING...</div><div id="logo">BOSS</div><div id="namePrompt"><h3>Enter Username</h3><input id="nameInput" placeholder="Your Name"><button onclick="setName()">Join</button></div><div id="menu"><h2>🔥 SECRET ADMIN MENU 🔥</h2><div id="playerControls"></div><button id="close">Close</button></div><div id="win"></div><canvas id="game"></canvas><div class="btn" id="left">←</div><div class="btn" id="right">→</div><div class="btn" id="jump">↑</div><div class="btn" id="attack">A</div><script>const canvas=document.getElementById('game');canvas.width=window.innerWidth;canvas.height=window.innerHeight-120;const ctx=canvas.getContext('2d');const ws=new WebSocket('wss://'+location.host);let myId=null;let gameState={players:{},platforms:[],coin:{},boss:null,level:1};const keys={left:false,right:false,jump:false,attack:false};let keyComboTimer=null;let comboStartTime=0;function setName(){ws.send(JSON.stringify({type:'setname',name:document.getElementById('nameInput').value||"Player"}));document.getElementById('namePrompt').style.display='none'}ws.onmessage=(e)=>{const data=JSON.parse(e.data);if(data.type==='init')myId=data.id;if(data.type==='state'){gameState=data;updateMenu();if(data.gameOver){document.getElementById('win').style.display='block';document.getElementById('win').innerHTML=\`🏆 WINNER: \${data.winner}! 🏆<br>Beat The Neon Boss!<br><button onclick="location.reload()">Play Again</button>\`}let hud="NEON PLATFORMER | LVL:"+data.level+"/50 ";for(let id in data.players){hud+=data.players[id].name+" L"+data.players[id].level+" "+data.players[id].score+"🟡 ";}document.getElementById('hud').innerText=hud}};function sendInput(){ws.send(JSON.stringify({type:'input',keys}))}['left','right','jump','attack'].forEach(id=>{const btn=document.getElementById(id);btn.addEventListener('touchstart',()=>{if(!comboStartTime)comboStartTime=Date.now();keys[id]=true;if(keys.left&&keys.right&&keys.jump){clearTimeout(keyComboTimer);keyComboTimer=setTimeout(()=>{if(Date.now()-comboStartTime>=5000){document.getElementById('menu').style.display='block'}},5000)}sendInput()});btn.addEventListener('touchend',()=>{keys[id]=false;if(!keys.left&&!keys.right&&!keys.jump&&!keys.attack)comboStartTime=0;sendInput()})});canvas.addEventListener('touchstart',(e)=>{if(document.getElementById('menu').style.display==='block'){let rect=canvas.getBoundingClientRect();let x=e.touches[0].clientX-rect.left;let y=e.touches[0].clientY-rect.top;ws.send(JSON.stringify({type:'cheat',action:'teleport',x,y}))}});function updateMenu(){let html="";for(let id in gameState.players){let p=gameState.players[id];html+=\`<div class="player-box"><b>\${p.name} \${id===myId?'(YOU)':''}</b><br>LVL:<input type="number" id="lvl_\${id}" value="\${p.level}" min="1" max="50"> COINS:<input type="number" id="coin_\${id}" value="\${p.score}" min="0"> DJ:<input type="checkbox" id="dj_\${id}" \${p.doubleJump?'checked':''} onchange="dj('\${id}')"><br><button onclick="apply('\${id}')">Apply</button><button onclick="skip('\${id}')">Skip LVL</button><button onclick="kick('\${id}')">Kick</button></div>\`}html+=\`<div class="player-box"><b>GLOBAL</b><br><button onclick="spawnCoin()">Spawn Coin</button><button onclick="setBossHP()">Boss HP:10</button></div>\`;document.getElementById('playerControls').innerHTML=html}function apply(id){ws.send(JSON.stringify({type:'cheat',action:'set',target:id,level:parseInt(document.getElementById('lvl_'+id).value),score:parseInt(document.getElementById('coin_'+id).value)}))}function dj(t){ws.send(JSON.stringify({type:'cheat',action:'dj',target:t,value:document.getElementById('dj_'+t).checked}))}function skip(t){ws.send(JSON.stringify({type:'cheat',action:'skip',target:t}))}function kick(t){ws.send(JSON.stringify({type:'cheat',action:'kick',target:t}))}function spawnCoin(){ws.send(JSON.stringify({type:'cheat',action:'spawncoin'}))}function setBossHP(){ws.send(JSON.stringify({type:'cheat',action:'bossHP',hp:10}))}document.getElementById('close').onclick=()=>{document.getElementById('menu').style.display='none'};function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#00aaff';ctx.lineWidth=2;gameState.platforms.forEach(p=>{ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.shadowColor='#00aaff';ctx.shadowBlur=10;ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.shadowBlur=0});if(gameState.boss){ctx.fillStyle='#ff0044';ctx.shadowColor='#ff0044';ctx.shadowBlur=20;ctx.fillRect(gameState.boss.x,gameState.boss.y,gameState.boss.w,gameState.boss.h);ctx.shadowBlur=0;ctx.fillStyle='white';ctx.font='bold 14px Arial';ctx.fillText('BOSS:'+gameState.boss.hp,gameState.boss.x,gameState.boss.y-8)}ctx.fillStyle='#ffdd00';ctx.shadowColor='#ffdd00';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(gameState.coin.x,gameState.coin.y,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;for(let id in gameState.players){let p=gameState.players[id];ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=15;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.shadowBlur=0;ctx.fillStyle='white';ctx.font='12px Arial';ctx.fillText(p.name,p.x,p.y-5);if(p.doubleJump){ctx.fillStyle='#00ff00';ctx.fillText('DJ',p.x+25,p.y-5)}if(p.attacking){ctx.strokeStyle='#ff0055';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,35,0,Math.PI*2);ctx.stroke()}}requestAnimationFrame(draw)}draw();</script></body></html>`;

const server = http.createServer((req, res) => {res.writeHead(200,{'Content-Type':'text/html'});res.end(HTML);});
const wss = new WebSocket.Server({ server });
const GRAVITY = 0.5; const MAX_LEVELS = 50; const BOSS_LEVELS = [10,20,30,40,50];
let players = {}; let level = 1; let coin = {x:400,y:250}; let boss = null; let gameOver = false; let winner = null;

function generateLevel(lvl) {
  let plats = [{x:0,y:560,w:800,h:40}];
  let platCount = 4 + Math.floor(lvl / 4);
  let spacing = 80 - Math.min(30, lvl);
  for(let i=0; i<platCount; i++){
    let gap = Math.random()*200 + 100 + lvl*3;
    plats.push({x:100+i*gap%700,y:500-i*spacing,w:Math.max(50,120-lvl),h:10})
  }
  if(BOSS_LEVELS.includes(lvl)){boss={x:350,y:150,w:120,h:90,hp:10};coin.y=100;}else{boss=null;coin.x=plats[plats.length-1].x+60;coin.y=plats[plats.length-1].y-20;}
  return plats;
}
let platforms = generateLevel(level);
function rectCollision(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function updatePhysics(){
  if(gameOver) return;
  for(let id in players){
    let p=players[id]; p.attacking=false;
    if(p.keys.left)p.vx=-5; else if(p.keys.right)p.vx=5; else p.vx=0;
    if(p.keys.jump){
      if(p.onGround){p.vy=-12; p.onGround=false; p.jumps=1}
      else if(p.jumps===1 && p.doubleJump){p.vy=-12; p.jumps=2}
    }
    if(p.keys.attack &&!p.attackCooldown){p.attacking=true; p.attackCooldown=20} // ATTACK
    if(p.attackCooldown)p.attackCooldown--;

    p.vy+=GRAVITY; p.x+=p.vx; p.y+=p.vy; p.onGround=false;
    for(let plat of platforms){if(rectCollision(p,plat)&&p.vy>0){p.y=plat.y-p.h; p.vy=0; p.onGround=true; p.jumps=0}}
    if(p.y>600){p.x=50; p.y=500; p.score=Math.max(0,p.score-1)}

    // BOSS FIGHT - Must use A button
    if(boss&&p.attacking){
      let dx=p.x+p.w/2-boss.x-boss.w/2; let dy=p.y+p.h/2-boss.y-boss.h/2;
      if(Math.sqrt(dx*dx+dy*dy)<50){ // attack range
        boss.hp--;
        if(boss.hp<=0){
          level++;
          for(let pid in players)players[pid].level=level;
          platforms=generateLevel(level);
          if(level>=MAX_LEVELS){gameOver=true; winner=p.name}
        }
      }
    }

    // COIN
    let dx=p.x+p.w/2-coin.x; let dy=p.y+p.h/2-coin.y;
    if(Math.sqrt(dx*dx+dy*dy)<20 &&!boss){
      p.score++; level++; for(let pid in players)players[pid].level=level; platforms=generateLevel(level);
      if(level>=MAX_LEVELS){gameOver=true; winner=p.name}
    }
  }
  wss.clients.forEach(client=>{if(client.readyState===WebSocket.OPEN){client.send(JSON.stringify({type:'state',players,platforms,coin,boss,level,isBossLevel:BOSS_LEVELS.includes(level),gameOver,winner}))}})
}

wss.on('connection',ws=>{
  const id='p'+(Object.keys(players).length+1); const colors=['#00f0ff','#ff00ff'];
  players[id]={x:id==='p1'?50:700,y:500,w:25,h:25,vx:0,vy:0,color:colors[Object.keys(players).length%2],keys:{left:false,right:false,jump:false,attack:false},score:0,level:1,onGround:false,doubleJump:true,jumps:0,attacking:false,attackCooldown:0,name:"Player"};
  ws.id=id; ws.send(JSON.stringify({type:'init',id}));
  ws.on('message',msg=>{
    const data=JSON.parse(msg);
    if(data.type==='setname'&&players[id])players[id].name=data.name;
    if(data.type==='input'&&players[id])players[id].keys=data.keys;
    if(data.type==='cheat'){
      if(data.action==='set'&&players[data.target]){players[data.target].level=data.level; players[data.target].score=data.score;}
      if(data.action==='dj'&&players[data.target])players[data.target].doubleJump=data.value;
      if(data.action==='skip'&&players[data.target]){players[data.target].level++; platforms=generateLevel(players[data.target].level)}
      if(data.action==='kick'&&players[data.target])delete players[data.target];
      if(data.action==='spawncoin'){coin.x=Math.random()*700+50; coin.y=Math.random()*300+100}
      if(data.action==='teleport'&&players[id]){players[id].x=data.x; players[id].y=data.y}
      if(data.action==='bossHP'&&boss)boss.hp=data.hp;
    }
  });
  ws.on('close',()=>{delete players[id]});
});

setInterval(updatePhysics,1000/60); server.listen(PORT,()=>console.log('Neon Boss running on '+PORT))
