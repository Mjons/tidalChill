/* Tidal Chill trailer score: a 20 s chiptune built from the trailer's own cue table.
   Rendered offline with WebAudio, so it always lines up with the cuts. 120 BPM, 0.5 s beats. */
(()=>{
const SR=48000,B=0.5;
const mtof=n=>440*Math.pow(2,(n-69)/12);
const hash=(a,b=0)=>{let h=(Math.round(a*997)*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;};
// chords as midi notes (root first)
const CH={Fmaj7:[53,57,60,64],Em7:[52,55,59,62],Dm7:[50,53,57,60],Am:[57,60,64,69],F:[53,57,60,65],C:[48,52,55,60],G:[55,59,62,67],Cmaj9:[48,52,55,59,62]};

async function render(){
  const T=window.TRAILER,C=T.C,SEG=T.SEG,DUR=T.DUR;
  const ac=new OfflineAudioContext(2,SR*DUR,SR);
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=8;comp.ratio.value=5;comp.attack.value=0.003;comp.release.value=0.18;
  const master=ac.createGain();master.connect(comp).connect(ac.destination);
  master.gain.setValueAtTime(1,0);master.gain.setValueAtTime(1,DUR-0.7);master.gain.linearRampToValueAtTime(0,DUR);
  // reverb from a decaying noise impulse
  const ir=ac.createBuffer(2,SR*1.8,SR);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(hash(i,c+1)*2-1)*Math.pow(1-i/d.length,3);}
  const rev=ac.createConvolver();rev.buffer=ir;const revG=ac.createGain();revG.gain.value=0.25;rev.connect(revG).connect(master);
  const mus=ac.createGain();mus.connect(master);const sfx=ac.createGain();sfx.gain.value=0.85;sfx.connect(master);
  const arpLP=ac.createBiquadFilter();arpLP.type='lowpass';arpLP.frequency.value=3200;arpLP.connect(mus);
  const bassLP=ac.createBiquadFilter();bassLP.type='lowpass';bassLP.frequency.value=900;bassLP.connect(mus);
  const nb=ac.createBuffer(1,SR*2,SR);{const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=hash(i,9)*2-1;}

  // black hole tape-stop: pitch factor applied to every note after it starts
  const bh=SEG.find(s=>s.ev==='blackhole'),bh0=bh?bh.t0:1e9,bh1=bh?bh.t1:1e9;
  const pf=t=>t<bh0?1:Math.max(0.12,Math.pow(0.5,(Math.min(t,bh1)-bh0)/0.62));

  function tone(type,f,t,dur,peak,dest,o={}){const os=ac.createOscillator();os.type=type;const a=o.a??0.004,rel=o.rel??0.04;
    const f0=f*pf(t),fe=(o.f1||f)*pf(t+dur);os.frequency.setValueAtTime(f0,t);if(Math.abs(fe-f0)>0.01)os.frequency.exponentialRampToValueAtTime(Math.max(5,fe),t+dur);
    if(o.det)os.detune.value=o.det;
    if(o.vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=o.vib[0];lg.gain.value=o.vib[1];l.connect(lg).connect(os.frequency);l.start(t);l.stop(t+dur+0.05);}
    const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);
    if(o.pluck)g.gain.exponentialRampToValueAtTime(1e-4,t+dur);else{g.gain.setValueAtTime(peak,t+Math.max(a,dur-rel));g.gain.linearRampToValueAtTime(0,t+dur);}
    os.connect(g).connect(dest);if(o.send){const s=ac.createGain();s.gain.value=o.send;g.connect(s).connect(rev);}os.start(t);os.stop(t+dur+0.02);}
  function noise(t,dur,peak,dest,o={}){const s=ac.createBufferSource();s.buffer=nb;s.loop=true;const fl=ac.createBiquadFilter();fl.type=o.type||'lowpass';
    fl.frequency.setValueAtTime(o.f||1000,t);if(o.f1)fl.frequency.exponentialRampToValueAtTime(o.f1,t+dur);fl.Q.value=o.q??0.7;
    const g=ac.createGain(),a=o.a??0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);
    if(o.hold){g.gain.setValueAtTime(peak,t+a+o.hold);}g.gain.exponentialRampToValueAtTime(1e-4,t+dur);
    s.connect(fl).connect(g).connect(dest);if(o.send){const sg=ac.createGain();sg.gain.value=o.send;g.connect(sg).connect(rev);}s.start(t,hash(t,3)*1.5);s.stop(t+dur+0.02);}
  const kick=(t,p=0.9,lo=42)=>tone('sine',160,t,0.34,p,mus,{f1:lo,pluck:1,a:0.002});
  const snare=(t,p=0.34)=>{noise(t,0.17,p,mus,{type:'bandpass',f:1900,q:0.9,send:0.15});tone('triangle',200,t,0.09,p*0.5,mus,{f1:150,pluck:1});};
  const hat=(t,p=0.06)=>noise(t,0.04,p,mus,{type:'highpass',f:7500});
  const crash=(t,p=0.2)=>noise(t,1.2,p,mus,{type:'highpass',f:5200,send:0.35});
  const boom=(t,p=0.8,len=1.2)=>{tone('sine',75,t,len,p,sfx,{f1:24,pluck:1,a:0.003});noise(t,len,p*0.75,sfx,{f:900,f1:70,send:0.2});};
  const whoosh=(t,dur,p,f,f1)=>noise(t,dur,p,sfx,{type:'bandpass',f,f1,q:1.2,a:dur*0.45});
  const blip=(t,p=0.12)=>tone('sine',1250,t,0.035,p,sfx,{pluck:1,a:0.001});

  /* 1. boring elevator chord, then glitch stutter */
  for(const n of [60,64,67])tone('sine',mtof(n),0,C.boringEnd,0.024,mus,{a:0.2,vib:[5,2.5]});
  tone('triangle',mtof(76),0.05,0.4,0.03,mus,{pluck:1,send:0.3});tone('triangle',mtof(74),0.5,0.4,0.03,mus,{pluck:1,send:0.3});
  for(let k=0;k<8;k++){const t=C.glitchIn[0]+k*0.031;tone('square',300+hash(k,5)*1700,t,0.028,0.07,sfx,{a:0.001});}
  noise(C.glitchIn[0],0.25,0.18,sfx,{type:'bandpass',f:3000,f1:400,q:3});

  /* 2. chill groove (lo-fi chiptune) from the glitch to the riser */
  const chill=[[1.0,3.0,'Fmaj7'],[3.0,4.0,'Em7']];
  for(const [a,b,c] of chill){const ch=CH[c];for(const n of ch)tone('triangle',mtof(n),a,b-a,0.03,mus,{a:0.25,rel:0.2,send:0.4});
    for(let t=a,k=0;t<b-1e-6;t+=B/2,k++){tone('square',mtof(ch[[0,1,2,3,2,1][k%6]]+12),t,0.22,0.035,arpLP,{pluck:1,send:0.25});}
    for(let t=a;t<b-1e-6;t+=B)tone('triangle',mtof(ch[0]-12),t,0.42,0.16,bassLP,{pluck:1});}
  for(let t=1.0;t<4.0-1e-6;t+=B){const beat=Math.round(t/B);if(beat%4===2)kick(t,0.55);if(beat%4===0)snare(t,0.16);hat(t+B/2,0.035);}
  for(const [a,b] of C.swipes)whoosh(a,b-a+0.15,0.16,500,3200);

  /* 3. riser into the drop */
  const r0=4.0,r1=C.montage;for(const n of CH.Dm7)tone('triangle',mtof(n),r0,r1-r0,0.025,mus,{a:0.05,rel:0.3,send:0.4});
  noise(r0,r1-r0+0.02,0.22,sfx,{type:'highpass',f:400,f1:7000,a:(r1-r0)*0.95});tone('square',220,r0,r1-r0,0.04,arpLP,{f1:880,a:0.6});
  {let t=r0,step=B/2;while(t<r1-0.03){snare(t,0.06+0.22*(t-r0)/(r1-r0));t+=step;if(t>r0+0.5)step=B/4;if(t>r0+0.8)step=B/8;}}

  /* 4. the drop: full chiptune chaos under the montage */
  const prog=['Am','F','C','G','Am','F'];
  for(let t=C.montage,bi=0;t<bh1-1e-6;t+=B,bi++){
    const bar=Math.floor(bi/4),ch=CH[prog[bar%prog.length]],beat=bi%4,inBH=t>=bh0;
    if(!inBH){kick(t,0.72);if(beat===1||beat===3)snare(t);for(let h=1;h<4;h++)hat(t+h*B/4,h===2?0.07:0.04);}
    if(beat===0){for(const n of ch)tone('sawtooth',mtof(n+12),t,0.28,0.042,mus,{pluck:1,send:0.35});if(!inBH||bi===Math.round((bh0-C.montage)/B))crash(t,0.14);}
    for(let e=0;e<2;e++){const tt=t+e*B/2;tone('sawtooth',mtof(ch[0]-12+(e?12:0)),tt,0.22,0.16,bassLP,{pluck:1});}
    for(let s=0;s<4;s++){const tt=t+s*B/4,k=bi*4+s,pat=[0,1,2,3,4,3,2,1],n=ch[pat[k%8]%ch.length]+12*(1+(pat[k%8]>=4?1:0));tone('square',mtof(n),tt,0.11,0.065,arpLP,{pluck:1,send:0.2});}
  }
  // black hole: drums slow down and sink, a sub drone falls away
  if(bh){[0,0.55,1.15,1.7].forEach((o,k)=>kick(bh0+o,0.55-0.1*k,30));tone('sine',58,bh0,bh1-bh0,0.15,sfx,{f1:22,a:0.3,rel:0.4});
    noise(bh0,bh1-bh0,0.1,sfx,{type:'lowpass',f:2400,f1:120,a:0.8,send:0.4});}

  /* event hits, cut crashes and widget taps */
  for(const s of SEG){const t=s.t0;blip(t-0.18);if(s.ev!=='blackhole')crash(t,0.12);
    switch(s.ev){
      case 'storm':for(const z of s.zap){noise(t+z,0.05,0.35,sfx,{type:'highpass',f:2500});noise(t+z,1.1,0.5,sfx,{f:3500,f1:150,send:0.3});}break;
      case 'hurricane':noise(t,s.len+0.2,0.32,sfx,{type:'bandpass',f:380,f1:1500,q:1.4,a:0.25});break;
      case 'tsunami':noise(t,s.len,0.45,sfx,{f:260,a:0.35,hold:0.6});whoosh(t+0.2,1.0,0.18,800,2600);break;
      case 'volcano':boom(t+0.05,0.7,1.0);break;
      case 'meteor':whoosh(t,0.95,0.32,4200,350);boom(t+1.0,0.85,1.1);break;
      case 'alien':tone('sine',520,t,s.len,0.1,sfx,{vib:[6.5,28],a:0.08,send:0.4});for(const o of [0.25,0.55,0.75])tone('square',1800,t+o,0.13,0.1,sfx,{f1:160,a:0.002});break;
      case 'nuke':tone('sine',2200,t,0.08,0.08,sfx,{pluck:1});boom(t+0.04,0.8,1.5);mus.gain.setValueAtTime(1,t);mus.gain.linearRampToValueAtTime(0.35,t+0.03);mus.gain.linearRampToValueAtTime(1,t+1.1);break;
      case 'party':for(const [o,d] of [[0.02,0.34],[0.45,0.13]])for(const n of [70,74,77])tone('sawtooth',mtof(n),t+o,d,0.05,arpLP,{a:0.01,rel:0.03});break;
      case 'glitch':for(let k=0;k<16;k++){const tt=t+k*B/8;tone('square',200+hash(k,11)*2200,tt,0.05,0.06,sfx,{a:0.001});if(k%2)mus.gain.setValueAtTime(0,tt);else mus.gain.setValueAtTime(1,tt);}
        mus.gain.setValueAtTime(1,s.t1);noise(t,s.len,0.12,sfx,{type:'bandpass',f:5000,f1:300,q:6});break;
    }}

  /* 5. end card: soft landing */
  const e0=C.end;kick(e0,0.7);crash(e0,0.18);for(const n of CH.Cmaj9)tone('triangle',mtof(n),e0,DUR-e0,0.02,mus,{a:0.08,rel:0.8,send:0.5});
  tone('triangle',mtof(36),e0,DUR-e0,0.07,bassLP,{a:0.02,rel:0.8});
  for(let t=e0+0.25,k=0;t<DUR-0.3;t+=B/2,k++)tone('sine',mtof(CH.Cmaj9[k%5]+24),t,0.5,0.05,mus,{pluck:1,send:0.5});

  const buf=await ac.startRendering();
  let pk=0;for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v;}}
  if(pk>0){const g=0.95/pk;for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=g;}}
  return buf;
}
let cache=null;
window.TRAILER_MUSIC={render:()=>cache||(cache=render())};
})();
