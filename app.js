import {roomIdFor, validPresence, STALE_MS, EXPIRE_MS} from './protocol.js';

const $ = id => document.getElementById(id);
let L, map, joinRoom, room, watchId, heartbeat, sweep, me, generation = 0;
const peers = new Map(), markers = new Map(), connected = new Set();
const status = text => $('status').textContent = text;
const notice = text => $('notice').textContent = text;
const colors = ['#d07b48','#6478ab','#9c6393','#458b6d','#bd9b36'];
function color(id) { return colors[[...id].reduce((n,c)=>n+c.charCodeAt(0),0) % colors.length]; }
function removeMarker(id) { const item = markers.get(id); if(item){map.removeLayer(item.marker);map.removeLayer(item.circle);markers.delete(id);} }
function putMarker(id, person) {
  if(!person.position){removeMarker(id);return;}
  const p = person.position, hue = id === 'self' ? '#193a36' : color(id);
  let item = markers.get(id);
  if(!item){
    const label = document.createElement('span');
    const marker = L.marker([p.lat,p.lng],{icon:L.divIcon({className:'peer-dot',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);
    marker.bindTooltip(label,{permanent:true,direction:'bottom',offset:[0,10]});
    const circle = L.circle([p.lat,p.lng],{radius:p.accuracy,color:hue,weight:1,fillOpacity:.07}).addTo(map);
    item = {marker,circle,label};markers.set(id,item);
    marker.getElement().style.setProperty('--peer-color',hue);
  }
  item.label.textContent = person.name + (id==='self'?' · you':'');
  item.marker.setLatLng([p.lat,p.lng]);item.circle.setLatLng([p.lat,p.lng]).setRadius(p.accuracy);
  item.marker.getElement().classList.toggle('stale',Date.now()-p.timestamp>STALE_MS);
}
function render() {
  $('count').textContent = connected.size ? `${connected.size + 1} people` : 'Just you';
  const list = $('people');list.replaceChildren();
  for(const [id,p] of [['self',me],...peers]){
    if(!p)continue;
    const li=document.createElement('li'),button=document.createElement('button'),info=document.createElement('span');
    button.textContent=p.name+(id==='self'?' · you':'');button.disabled=!p.position;
    button.onclick=()=>map.setView([p.position.lat,p.position.lng],16);
    const age=p.position?Math.max(0,Math.floor((Date.now()-p.position.timestamp)/1000)):null;
    info.textContent=age===null?'No location yet':`${age}s ago · ±${Math.round(p.position.accuracy)}m`;
    li.append(button,info);list.append(li);putMarker(id,p);
  }
}
function send(target) { if(room && me) room.send('presence',me,target).catch(()=>notice('An update could not be sent. Waiting for the connection to recover.')); }
function stop() {
  generation++;if(watchId!==undefined)navigator.geolocation.clearWatch(watchId);watchId=undefined;
  clearInterval(heartbeat);clearInterval(sweep);room?.leave();room=me=null;
  peers.clear();connected.clear();for(const id of markers.keys())removeMarker(id);
  $('session').hidden=true;$('join-form').hidden=false;$('join').disabled=!joinRoom;
  $('password').value='';notice('');status('Sharing stopped. Join a room to start again.');
}
async function join(event){
  event.preventDefault();if(!joinRoom)return;
  const name=$('nickname').value.trim(),password=$('password').value;
  if(!name){$('nickname').focus();return;}
  if(!navigator.geolocation || !isSecureContext){status('Location sharing requires HTTPS and browser geolocation support.');return;}
  $('join').disabled=true;const token=++generation;status('Opening your room…');
  try{
    const roomId=await roomIdFor(password);if(token!==generation)return;
    room=joinRoom({app:'dev.kakkoi.together-map.v1',room:roomId,password,mode:'online',server:false,protocol:1,kinds:['presence'],maxMessageBytes:2048,rateLimit:5,validate:{presence:validPresence}});
    room.onError(()=>{if(token===generation)notice('A connection error occurred. Check your network; discovery will keep trying.');});
    me={v:1,name,position:null};
    room.onMessage('presence',(data,peerId)=>{
      if(token!==generation || !connected.has(peerId) || !validPresence(data))return;
      const previous=peers.get(peerId);
      if(data.position && previous?.position && data.position.timestamp<previous.position.timestamp)return;
      if(data.position?.timestamp>Date.now()+30_000)return;
      peers.set(peerId,{...data,seenAt:Date.now()});render();
    });
    room.onPeerJoin(peerId=>{if(token!==generation)return;connected.add(peerId);peers.set(peerId,{v:1,name:'Connecting…',position:null,seenAt:Date.now()});send(peerId);render();});
    room.onPeerLeave(peerId=>{if(token!==generation)return;connected.delete(peerId);peers.delete(peerId);removeMarker(peerId);render();});
    $('password').value='';$('identity').textContent=name;$('join-form').hidden=true;$('session').hidden=false;
    status('Waiting for location permission. Others can join with the same password.');render();
    watchId=navigator.geolocation.watchPosition(position=>{
      if(token!==generation)return;
      const first=!me.position;
      me.position={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,timestamp:position.timestamp};
      render();send();if(first)map.setView([me.position.lat,me.position.lng],15);
      status('Sharing your location. Waiting for peers or receiving live updates.');
    },error=>{
      if(token!==generation)return;
      if(error.code===1){stop();status('Location permission was denied. Allow it in browser settings, then join again.');}
      else {me.position=null;send();render();status(error.code===2?'Location unavailable. Waiting for GPS…':'Location timed out. Waiting for a fresh position…');}
    },{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
    heartbeat=setInterval(()=>send(),10000);
    sweep=setInterval(()=>{for(const [id,p] of peers){if(Date.now()-p.seenAt>EXPIRE_MS){peers.delete(id);removeMarker(id);}else if(p.position && Date.now()-p.position.timestamp>EXPIRE_MS){p.position=null;removeMarker(id);}}render();},5000);
  }catch(error){if(token!==generation)return;stop();status('Could not open the room. Check your connection and try again.');console.error('Room setup failed',error.name);}
}
$('join-form').addEventListener('submit',join);$('leave').onclick=stop;
$('locate').onclick=()=>{if(me?.position)map.setView([me.position.lat,me.position.lng],16);else status('Join and allow location access to center on yourself.');};
$('fit').onclick=()=>{const points=[...markers.values()].map(x=>x.marker.getLatLng());if(points.length)map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[innerWidth>600?390:40,innerWidth>600?40:320],paddingBottomRight:[50,50],maxZoom:16});};
addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(!document.hidden && room){send();render();}});
$('join').disabled=true;
try{
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  L=window.L;map=L.map('map',{zoomControl:false}).setView([35.36,132.75],5);L.control.zoom({position:'topright'}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tiles.on('tileerror',()=>notice('Map tiles could not load. Location sharing can still work.'));
  ({joinRoom}=await import('https://cdn.jsdelivr.net/gh/KakkoiDev/p2p-core@v0.1.0/p2p-core.js'));
  $('join').disabled=false;
}catch{status('Could not load the map or connection library. Check your network and reload.');}
