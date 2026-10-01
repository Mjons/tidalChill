/* Tidal Chill trailer director: drives the real sim (window.TL) frame by frame and
   composites a 1080x1920 phone-in-hand trailer. Deterministic: same seed, same frames. */
(()=>{
const OW=1080,OH=1920,DUR=20;
const PH={x:190,y:300,w:700,h:1520,r:96};               // phone body
const SC={x:PH.x+15,y:PH.y+15,w:670,h:1490,r:80};        // screen (sim is 134 cols x5)
const PX=5,WV=134;                                        // sim pixel scale, visible sim columns
const WG={x:SC.x+26,y:SC.y+1072,w:SC.w-52,h:300};        // events widget
const CELLS=[['surprise','\u{1F3B2}','SURPRISE'],['storm','⛈️','STORM'],['hurricane','\u{1F300}','HURRICANE'],['tsunami','\u{1F30A}','TSUNAMI'],
 ['volcano','\u{1F30B}','VOLCANO'],['nuke','☢️','NUKE'],['alien','\u{1F6F8}','ALIENS'],['meteor','☄️','METEOR'],
 ['blackhole','⚫','BLACK HOLE'],['party','\u{1F389}','PARTY'],['glitch','\u{1F47E}','GLITCH'],['calm','☀️','CALM']];

/* ---------- ONE cue table: retime here ---------- */
const C={
  boringEnd:0.95, glitchIn:[0.95,1.2],
  swipes:[[2.05,2.6,0,1],[2.8,3.35,1,2],[3.5,3.9,2,0]],   // [start,end,fromPage,toPage]
  montage:5.0, end:17.5,
  vo:[{t:0.12,d:1.75,txt:'YOUR WALLPAPER\nIS BORING.'},{t:2.05,d:1.85,txt:"MINE'S A\nWHOLE BEACH."},{t:4.0,d:0.95,txt:'WATCH THIS.'}],
  endTitle:17.62, endLine:18.35
};
// montage segments: ev, length (s), fast-forward into the event (s), time of day, wallpaper offset, playback speed
const SEG=[
 {ev:'storm',    len:1.1, ff:21,  ph:0.56, off:0.5,  sp:1.0, zap:[0.1,0.55], name:'STORM',     col:'#9fb4ff'},
 {ev:'hurricane',len:1.1, ff:59,  ph:0.52, off:0.5,  sp:2.5,                 name:'HURRICANE', col:'#8fe3c8'},
 {ev:'tsunami',  len:1.3, ff:30.2,ph:0.47, off:0.5,  sp:1.6,                 name:'TSUNAMI',   col:'#5fd0ff'},
 {ev:'volcano',  len:1.2, ff:33,  ph:0.71, off:0.5,  sp:1.5,                 name:'VOLCANO',   col:'#ff8a3d'},
 {ev:'meteor',   len:1.3, ff:14.5,ph:0.42, off:0.5,  sp:1.0,                 name:'METEOR',    col:'#ffd166'},
 {ev:'alien',    len:1.2, ff:43.6,ph:0.60, off:0.5,  sp:1.0,                 name:'ALIENS',    col:'#c58bff'},
 {ev:'nuke',     len:1.2, ff:0.25,ph:0.50, off:0.05, sp:1.2,                 name:'NUKE',      col:'#ffb347'},
 {ev:'party',    len:1.1, ff:128, ph:0.80, off:0.5,  sp:1.0,                 name:'BEACH PARTY',col:'#ff6ad5'},
 {ev:'glitch',   len:1.1, ff:52.6,ph:0.50, off:0.5,  sp:1.0,                 name:'GLITCH',    col:'#66ffd9'},
 {ev:'blackhole',len:1.9, ff:77,  ph:0.50, off:0.5,  sp:3.6,                 name:'BLACK HOLE',col:'#ff9a5a', sub:'oh no.'}
];
let acc=C.montage;for(const s of SEG){s.t0=acc;acc+=s.len;s.t1=acc;s.cell=CELLS.findIndex(c=>c[0]===s.ev);}

/* ---------- utils ---------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*k;
const ease=k=>k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,easeOut=k=>1-Math.pow(1-k,3);
const hash=(a,b=0)=>{let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;};
function rr(X,x,y,w,h,r){X.beginPath();X.moveTo(x+r,y);X.arcTo(x+w,y,x+w,y+h,r);X.arcTo(x+w,y+h,x,y+h,r);X.arcTo(x,y+h,x,y,r);X.arcTo(x,y,x+w,y,r);X.closePath();}
const PIX='"Pixelify Sans", ui-monospace, monospace',SILK='Silkscreen, ui-monospace, monospace',SANS='"Google Sans", Roboto, "Segoe UI", Arial, sans-serif';
const EMO='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

/* ---------- state ---------- */
let fps=30,seg=-1,ended=false,booted=false,avg=[40,60,110],cueFired=new Set();
const tiny=document.createElement('canvas');tiny.width=tiny.height=1;const TX=tiny.getContext('2d',{willReadFrequently:true});

function boot(){window.TLseed(20261001);TL.time=0;TL.spd=0;TL.newSea();TL.phase=0.70;TL.off=0;for(let k=0;k<45;k++)TL.sim(1/30);seg=-1;ended=false;booted=true;cueFired.clear();}
function setupSeg(s){TL.newSea();TL.ev(s.ev);const n=Math.round(s.ff*30);for(let k=0;k<n;k++)TL.sim(1/30);TL.phase=s.ph;TL.off=s.off;}
function pageAt(t){let p=0;for(const [a,b,f,to] of C.swipes){if(t>=b)p=to;else if(t>a){p=lerp(f,to,ease((t-a)/(b-a)));break;}}return p;}

/* advance the sim to time t (frame i) */
function advance(i){
  const t=i/fps,dt=1/fps;if(!booted||i===0)boot();
  if(t>=C.end){if(!ended){ended=true;TL.newSea();TL.phase=0.735;TL.off=0;for(let k=0;k<20;k++)TL.sim(1/30);}TL.sim(dt);TL.draw();return;}
  const si=SEG.findIndex(s=>t>=s.t0&&t<s.t1);
  if(si>=0){const s=SEG[si];if(si!==seg){seg=si;setupSeg(s);}
    const loc=t-s.t0;if(s.zap)for(const z of s.zap){const key=si+':'+z;if(loc>=z&&!cueFired.has(key)){cueFired.add(key);TL.zap(true);}}
    TL.sim(dt*s.sp);TL.draw();return;}
  // intro: calm sunset beach, wallpaper follows the home-screen page
  TL.off=pageAt(t)/2;TL.sim(dt);TL.draw();
}

/* ---------- drawing ---------- */
function drawBg(X,t){
  const g=X.createLinearGradient(0,0,0,OH);g.addColorStop(0,'#0c1530');g.addColorStop(1,'#04060d');X.fillStyle=g;X.fillRect(0,0,OW,OH);
  const [r,gg,b]=avg;const rg=X.createRadialGradient(540,1040,120,540,1040,900);rg.addColorStop(0,`rgba(${r},${gg},${b},0.55)`);rg.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=rg;X.fillRect(0,0,OW,OH);
  for(let k=0;k<70;k++){const x=hash(k,1)*OW,y=(hash(k,2)*OH+t*(8+hash(k,3)*14))%OH,s=hash(k,4)<0.2?6:3,a=0.15+0.35*(0.5+0.5*Math.sin(t*2+k));X.fillStyle=`rgba(220,230,255,${a})`;X.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,s,s);}
}
function drawBoring(X,x,y,w,h){const g=X.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#6f8494');g.addColorStop(1,'#a8b6bd');X.fillStyle=g;X.fillRect(x,y,w,h);
  X.globalAlpha=0.35;X.fillStyle='#8aa0ad';X.beginPath();X.arc(x+w*0.2,y+h*0.32,w*0.55,0,7);X.fill();X.fillStyle='#5f7584';X.beginPath();X.arc(x+w*0.9,y+h*0.78,w*0.6,0,7);X.fill();X.globalAlpha=1;}
function drawSim(X,dx,dy){const H=TL.H,sx=Math.round(TL.off*(TL.W-WV));X.drawImage(TL.cvs,sx,0,WV,H,SC.x+dx,SC.y+dy,WV*PX,H*PX);}

function statusBar(X){X.fillStyle='#fff';X.font=`500 30px ${SANS}`;X.textBaseline='middle';X.textAlign='left';X.fillText('9:41',SC.x+56,SC.y+44);
  const rx=SC.x+SC.w-60;X.fillRect(rx-4,SC.y+33,40,22);X.fillRect(rx+36,SC.y+39,4,10);           // battery
  for(let k=0;k<4;k++)X.fillRect(rx-70+k*9,SC.y+52-k*6-6,6,k*6+6);                                    // signal
  X.beginPath();X.moveTo(rx-108,SC.y+34);X.lineTo(rx-80,SC.y+34);X.lineTo(rx-94,SC.y+56);X.closePath();X.fill();        // wifi
  X.fillStyle='#000';X.beginPath();X.arc(SC.x+SC.w/2,SC.y+44,15,0,7);X.fill();}                  // punch hole
function glance(X,ox){X.save();X.shadowColor='rgba(0,0,0,0.45)';X.shadowBlur=10;X.fillStyle='#fff';X.textAlign='left';X.textBaseline='alphabetic';
  X.font=`400 40px ${SANS}`;X.fillText('Thu, Oct 1',SC.x+56+ox,SC.y+170);X.font=`400 28px ${SANS}`;X.fillText('☀  22°C',SC.x+56+ox,SC.y+214);X.restore();}
function widget(X,ox,press,pressA){const {x,y,w,h}=WG,gx=x+ox;X.save();rr(X,gx,y,w,h,22);X.fillStyle='rgba(8,14,30,0.62)';X.fill();X.strokeStyle='rgba(120,150,210,0.35)';X.lineWidth=2;X.stroke();
  const cw=(w-20-3*8)/4,ch=(h-20-2*8)/3;
  CELLS.forEach((c,i)=>{const cx=gx+10+(i%4)*(cw+8),cy=y+10+Math.floor(i/4)*(ch+8);const on=i===press?pressA:0;
    rr(X,cx,cy,cw,ch,12);X.fillStyle=on?`rgba(${Math.round(lerp(22,255,on))},${Math.round(lerp(36,180,on))},${Math.round(lerp(62,80,on))},0.95)`:'rgba(22,36,62,0.82)';X.fill();
    X.textAlign='center';X.textBaseline='middle';X.font=`34px ${EMO}`;X.fillStyle='#fff';X.fillText(c[1],cx+cw/2,cy+ch*0.4);
    X.font=`15px ${SILK}`;X.fillStyle=on>0.5?'#1a0f05':'#dfe7fb';X.fillText(c[2],cx+cw/2,cy+ch*0.78);});
  X.restore();}
function cellCenter(i){const cw=(WG.w-20-24)/4,ch=(WG.h-20-16)/3;return [WG.x+10+(i%4)*(cw+8)+cw/2,WG.y+10+Math.floor(i/4)*(ch+8)+ch/2];}
function appPage(X,ox,n,seed){const cols=4,sz=104,gap=(SC.w-cols*sz)/(cols+1);const pal=['#ff6b6b','#ffd166','#06d6a0','#4cc9f0','#b388ff','#f78c6b','#90be6d','#577590'];
  for(let k=0;k<n;k++){const cx=SC.x+ox+gap+(k%cols)*(sz+gap),cy=SC.y+880+Math.floor(k/cols)*(sz+70);rr(X,cx,cy,sz,sz,30);X.fillStyle=pal[(k+seed)%pal.length];X.fill();
    X.fillStyle='rgba(255,255,255,0.85)';rr(X,cx+sz*0.3,cy+sz*0.3,sz*0.4,sz*0.4,10);X.fill();}}
function dots(X,pg){for(let k=0;k<3;k++){const a=1-Math.min(1,Math.abs(pg-k));X.fillStyle=`rgba(255,255,255,${0.35+0.6*a})`;X.beginPath();X.arc(SC.x+SC.w/2+(k-1)*22,WG.y-26,5+2*a,0,7);X.fill();}}
function touch(X,x,y,age){if(age<0||age>0.45)return;const k=age/0.45;X.save();X.fillStyle=`rgba(255,255,255,${0.45*(1-k)})`;X.beginPath();X.arc(x,y,30,0,7);X.fill();
  X.strokeStyle=`rgba(255,255,255,${0.8*(1-k)})`;X.lineWidth=4;X.beginPath();X.arc(x,y,30+k*46,0,7);X.stroke();X.restore();}

function caption(X,txt,age,dur,size,col,shadow,y0){if(age<0||age>dur)return;const pop=age<0.14?lerp(1.28,1,easeOut(age/0.14)):1;const a=Math.min(1,age/0.06,(dur-age)/0.12);
  X.save();X.globalAlpha=a;X.translate(540,y0);X.scale(pop,pop);X.textAlign='center';X.textBaseline='middle';X.font=`600 ${size}px ${PIX}`;
  const lines=txt.split('\n'),lh=size*1.02,oy=-(lines.length-1)*lh/2;
  lines.forEach((ln,k)=>{X.fillStyle=shadow;X.fillText(ln,7,oy+k*lh+7);X.fillStyle=col;X.fillText(ln,0,oy+k*lh);});X.restore();}

function compose(X,i){
  const t=i/fps;
  if(i%3===0){TX.drawImage(TL.cvs,0,0,1,1);const d=TX.getImageData(0,0,1,1).data;avg=[d[0],d[1],d[2]];}
  drawBg(X,t);
  // phone body
  const s=SEG.find(q=>t>=q.t0&&t<q.t1),loc=s?t-s.t0:0;
  const kick=s&&loc<0.12?1+0.018*(1-loc/0.12):1;
  X.save();X.translate(540,1060);X.scale(kick,kick);X.translate(-540,-1060);
  X.save();X.shadowColor='rgba(0,0,0,0.6)';X.shadowBlur=60;X.shadowOffsetY=30;rr(X,PH.x,PH.y,PH.w,PH.h,PH.r);X.fillStyle='#14161b';X.fill();X.restore();
  const eg=X.createLinearGradient(PH.x,0,PH.x+PH.w,0);eg.addColorStop(0,'#3a3f48');eg.addColorStop(0.5,'#1b1e24');eg.addColorStop(1,'#3a3f48');rr(X,PH.x,PH.y,PH.w,PH.h,PH.r);X.strokeStyle=eg;X.lineWidth=5;X.stroke();
  X.fillStyle='#2a2e36';rr(X,PH.x+PH.w-1,PH.y+300,8,120,4);X.fill();rr(X,PH.x+PH.w-1,PH.y+460,8,70,4);X.fill();
  // screen
  X.save();rr(X,SC.x,SC.y,SC.w,SC.h,SC.r);X.clip();
  const sh=TL.peek().shake||0,dx=Math.round((hash(i,7)-0.5)*sh*14),dy=Math.round((hash(i,8)-0.5)*sh*10);
  if(t<C.glitchIn[0])drawBoring(X,SC.x,SC.y,SC.w,SC.h);
  else if(t<C.glitchIn[1]){drawSim(X,0,0);const k=(t-C.glitchIn[0])/(C.glitchIn[1]-C.glitchIn[0]);const band=24;
    for(let y=0;y<SC.h;y+=band){if(hash(Math.floor(y/band),i)>k){X.save();X.beginPath();X.rect(SC.x,SC.y+y,SC.w,band);X.clip();drawBoring(X,SC.x+(hash(y,i+3)-0.5)*80,SC.y,SC.w,SC.h);X.restore();}
      else if(hash(y,i+9)<0.25){X.globalCompositeOperation='lighter';X.fillStyle='rgba(255,0,120,0.25)';X.fillRect(SC.x,SC.y+y,SC.w,band);X.globalCompositeOperation='source-over';}}}
  else drawSim(X,dx,dy);
  // cut flash
  if(s&&loc<0.1){X.fillStyle=`rgba(255,255,255,${0.75*(1-loc/0.1)})`;X.fillRect(SC.x,SC.y,SC.w,SC.h);}
  if(t>=C.end&&t<C.end+0.25){X.fillStyle=`rgba(255,255,255,${1-(t-C.end)/0.25})`;X.fillRect(SC.x,SC.y,SC.w,SC.h);}
  // home screen overlay
  const pg=t<C.montage?pageAt(t):0,ox=-pg*SC.w;
  glance(X,ox);appPage(X,ox+SC.w,8,0);appPage(X,ox+2*SC.w,4,3);
  let press=-1,pa=0;if(s){press=s.cell;pa=loc<0.3?1-loc/0.3:0;}
  const pre=SEG.find(q=>t>=q.t0-0.18&&t<q.t0);if(pre){press=pre.cell;pa=1;}
  widget(X,ox,press,pa);dots(X,pg);statusBar(X);
  X.fillStyle='rgba(255,255,255,0.8)';rr(X,SC.x+SC.w/2-70,SC.y+SC.h-24,140,7,4);X.fill();
  // touches
  for(const [a,b,f,to] of C.swipes){if(t>=a-0.05&&t<=b+0.05){const k=clamp((t-a)/(b-a),0,1);const dir=to>f?-1:1;touch(X,SC.x+SC.w/2-dir*230+dir*460*ease(k),SC.y+640,t<b?0.05:(t-b)*4);}}
  for(const q of SEG){const age=t-(q.t0-0.18);if(age>=0&&age<0.45){const [cx,cy]=cellCenter(q.cell);touch(X,cx,cy,age);}}
  X.restore();X.restore();
  // captions
  for(const v of C.vo)caption(X,v.txt,t-v.t,v.d,v.txt.includes('\n')?92:100,'#f6ecd9','#2b3a7a',165);
  if(s){caption(X,s.name,loc,s.len,s.name.length>9?112:132,'#fff',s.col,165);
    if(s.sub)caption(X,s.sub,loc-0.55,s.len-0.55,52,'#dfe7fb','rgba(0,0,0,0.6)',262);}
  if(t>=C.endTitle){const age=t-C.endTitle;caption(X,'TIDAL CHILL',age,99,138,'#fff','#ff6ad5',150);caption(X,'YOUR BEACH. YOUR CHAOS.',t-C.endLine,99,50,'#ffd9a8','rgba(0,0,0,0.55)',258);
    const a=clamp((t-C.endLine)/0.3,0,1);X.globalAlpha=a;X.fillStyle='#bcd0ff';X.font=`30px ${SILK}`;X.textAlign='center';X.textBaseline='middle';X.fillText('LIVE WALLPAPER FOR ANDROID',540,1872);X.globalAlpha=1;}
}

/* ---------- public API ---------- */
window.TRAILER={OW,OH,DUR,C,SEG,
  get fps(){return fps},set fps(v){fps=v},
  frame(X,i){advance(i);compose(X,i);},
  frames(){return Math.round(DUR*fps);}
};
})();
