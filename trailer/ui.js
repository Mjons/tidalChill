/* Trailer player UI: preview + GPU export (WebCodecs H.264/VP9 + Opus audio via mp4-muxer) */
(()=>{
const $=id=>document.getElementById(id),T=window.TRAILER;
const cv=$('out'),X=cv.getContext('2d');cv.width=T.OW;cv.height=T.OH;
let busy=false,cancel=false,audioBuf=null,audioEl=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fontsReady(){try{await Promise.all(['600 100px "Pixelify Sans"','20px Silkscreen'].map(f=>document.fonts.load(f)));await document.fonts.ready;}catch(e){}}
function b64ToBuf(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;}
async function getAudio(){if(audioBuf||!window.TRAILER_AUDIO)return audioBuf;const ac=new (window.AudioContext||window.webkitAudioContext)({sampleRate:48000});
  audioBuf=await ac.decodeAudioData(b64ToBuf(window.TRAILER_AUDIO.data));ac.close();return audioBuf;}
function status(s){$('st').textContent=s;}
function prog(f){$('bar').style.width=Math.round(f*100)+'%';}

async function preview(){if(busy)return;busy=true;cancel=false;await fontsReady();T.fps=+$('fps').value;const n=T.frames();
  if(window.TRAILER_AUDIO){if(!audioEl){audioEl=new Audio('data:'+TRAILER_AUDIO.mime+';base64,'+TRAILER_AUDIO.data);}audioEl.currentTime=0;audioEl.play().catch(()=>{});}
  const t0=performance.now();let i=0;status('Playing preview (cuts may hitch while the sim fast-forwards)');
  while(i<n&&!cancel){const target=Math.min(n-1,Math.floor((performance.now()-t0)/1000*T.fps));
    while(i<target){T.frame(X,i);i++;}T.frame(X,i);i++;prog(i/n);await new Promise(r=>requestAnimationFrame(r));}
  if(audioEl)audioEl.pause();busy=false;status(cancel?'Stopped':'Preview done. Hit Export MP4 to render the real thing.');}

async function exportMp4(){if(busy)return;if(!window.VideoEncoder||!window.Mp4Muxer){status('This browser has no WebCodecs. Use Chrome or Edge.');return;}
  busy=true;cancel=false;$('save').hidden=true;await fontsReady();const fps=+$('fps').value;T.fps=fps;const n=T.frames(),w=T.OW,h=T.OH;
  try{
    const br=fps>30?16e6:11e6;let cfg=null,mc='avc';
    for(const cd of ['avc1.640033','avc1.640032','avc1.640028','avc1.4d0033','avc1.4d0028','avc1.42e033']){const c={codec:cd,width:w,height:h,bitrate:br,framerate:fps,avc:{format:'avc'}};try{if((await VideoEncoder.isConfigSupported(c)).supported){cfg=c;break;}}catch(e){}}
    if(!cfg)for(const cd of ['vp09.00.51.08','vp09.00.41.08']){const c={codec:cd,width:w,height:h,bitrate:br,framerate:fps};try{if((await VideoEncoder.isConfigSupported(c)).supported){cfg=c;mc='vp9';break;}}catch(e){}}
    if(!cfg)throw new Error('No hardware video encoder found for 1080x1920.');
    const ab=await getAudio();let acfg=null;
    if(ab&&window.AudioEncoder){const c={codec:'opus',sampleRate:48000,numberOfChannels:2,bitrate:160000};try{if((await AudioEncoder.isConfigSupported(c)).supported)acfg=c;}catch(e){}}
    const target=new Mp4Muxer.ArrayBufferTarget();
    const mux=new Mp4Muxer.Muxer({target,video:{codec:mc,width:w,height:h,frameRate:fps},audio:acfg?{codec:'opus',sampleRate:48000,numberOfChannels:2}:undefined,fastStart:'in-memory'});
    let err=null;const enc=new VideoEncoder({output:(c,m)=>mux.addVideoChunk(c,m),error:e=>err=e});enc.configure(cfg);
    if(acfg){const aenc=new AudioEncoder({output:(c,m)=>mux.addAudioChunk(c,m),error:e=>err=e});aenc.configure(acfg);
      const total=Math.min(ab.length,Math.round(T.DUR*48000)),L=ab.getChannelData(0),R=ab.numberOfChannels>1?ab.getChannelData(1):L,CH=4800;
      for(let o=0;o<total;o+=CH){const m=Math.min(CH,total-o),d=new Float32Array(m*2);d.set(L.subarray(o,o+m),0);d.set(R.subarray(o,o+m),m);
        const a=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round(o/48000*1e6),data:d});aenc.encode(a);a.close();}
      await aenc.flush();}
    const t0=performance.now();
    for(let i=0;i<n;i++){if(cancel||err)break;T.frame(X,i);const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});enc.encode(vf,{keyFrame:i%(fps*2)===0});vf.close();
      while(enc.encodeQueueSize>4)await sleep(1);
      if(i%5===0){prog(i/n);const el=(performance.now()-t0)/1000,f=(i+1)/n;status('Rendering '+Math.round(f*100)+'%'+(f>0.05?' · about '+Math.max(1,Math.round(el/f-el))+' s left':''));await sleep(0);}}
    if(err)throw err;if(cancel){status('Cancelled');busy=false;return;}
    await enc.flush();mux.finalize();const blob=new Blob([target.buffer],{type:'video/mp4'});const url=URL.createObjectURL(blob);
    const a=$('save');a.href=url;a.download='tidal-chill-trailer-9x16.mp4';a.hidden=false;prog(1);
    status('Done: '+(blob.size/1048576).toFixed(1)+' MB'+(acfg?' with sound':ab?' (no Opus encoder here, video only)':''));window.__lastExport=blob;a.click();
  }catch(e){status('Export failed: '+e.message);console.error(e);}
  busy=false;}

$('play').onclick=preview;$('exp').onclick=exportMp4;$('stop').onclick=()=>{cancel=true;};
fontsReady().then(()=>{T.fps=+$('fps').value;T.frame(X,0);for(let i=1;i<=Math.round(0.4*T.fps);i++)T.frame(X,i);status('Ready. Preview or export.');});
window.__exportMp4=exportMp4;
})();
