'use strict';

// SHUSHU/TONG × SHINING NIKKI photo booth.
// All selfie capture and photo compositing happens inside the visitor's browser.
// No API key, server upload, or build tools needed.
const $ = id => document.getElementById(id);
const sceneFiles = ['assets/scene-pink.jpg', 'assets/scene-blue.jpg', 'assets/scene-silver.jpg'];
const sceneNames = ['PINK', 'BLUE', 'SILVER'];
const stage = $('stage'), ctx = stage.getContext('2d', {alpha:false});
const strip = $('strip'), stripCtx = strip.getContext('2d');
const video = $('cameraVideo');
const imageCache = {};
const shots = [null,null,null];
let current = 0, cameraStream = null, uploaded = null;
let playing = false, shooting = false, screen = 'home';
let selfieSegmenter = null, segmenting = false, lastSegment = 0, hasSegment = false;
let segmentFailed = false, segmentationSource = null;
const cutout = document.createElement('canvas'); cutout.width=640;cutout.height=640;
const cutoutCtx = cutout.getContext('2d', {willReadFrequently:false});
const blend = document.createElement('canvas');blend.width=900;blend.height=900;
const blendCtx = blend.getContext('2d');

function image(url) {
  if (!imageCache[url]) {
    const img = new Image(); img.src = url; imageCache[url] = img;
  }
  return imageCache[url];
}
for(const f of [...sceneFiles,'assets/frame.jpg']) image(f);
function displayScreen(name) {
  screen=name;
  $('homeScreen').classList.toggle('hidden',name!=='home');
  $('shootScreen').classList.toggle('hidden',name!=='shoot');
  $('resultScreen').classList.toggle('hidden',name!=='result');
  window.scrollTo({top:0,behavior:'instant'});
}
function setStatus(message){$('status').textContent=message;}
function setCurrent(i){
  current=i; $('shotCounter').textContent=String(i+1).padStart(2,'0')+' / 03';
  $('stageBadge').textContent=String(i+1).padStart(2,'0')+' — '+sceneNames[i];
  $('instruction').textContent=['Pose with the pink virtual character.','Now pose with the blue virtual character.','One last pose with the silver virtual character!'][i];
}
function haveSource(){return Boolean((playing&&video.readyState>=2)||uploaded);}
function updateButtons(){
  $('captureBtn').disabled=shooting || !haveSource();
  $('cameraBtn').disabled=shooting;
  $('uploadPhoto').disabled=shooting;
}
function loadScript(src,timeout=11000){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');let done=false;
    const t=setTimeout(()=>{if(!done){done=true;s.remove();reject(new Error('timeout'));}},timeout);
    s.onload=()=>{if(!done){done=true;clearTimeout(t);resolve();}};
    s.onerror=()=>{if(!done){done=true;clearTimeout(t);reject(new Error('network'));}};
    s.src=src;s.async=true;document.head.appendChild(s);
  });
}
async function enableCutout(){
  if(selfieSegmenter||segmentFailed)return;
  try{
    if(!window.SelfieSegmentation) await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');
    if(!window.SelfieSegmentation)throw Error('unavailable');
    const mp = new window.SelfieSegmentation({
      locateFile:f=>'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/'+f
    });
    mp.setOptions({modelSelection:1});
    mp.onResults(result=>{
      try{
        if(!result.segmentationMask||!result.image)return;
        const source=result.image;
        const sw=source.videoWidth||source.naturalWidth||source.width;
        const sh=source.videoHeight||source.naturalHeight||source.height;
        if(!sw||!sh)return;
        // Center-crop video and corresponding mask to a square without distorting faces.
        const s=Math.min(sw,sh),sx=(sw-s)/2,sy=(sh-s)/2;
        cutoutCtx.clearRect(0,0,640,640);
        cutoutCtx.globalCompositeOperation='source-over';
        cutoutCtx.drawImage(result.segmentationMask,sx,sy,s,s,0,0,640,640);
        cutoutCtx.globalCompositeOperation='source-in';
        cutoutCtx.drawImage(source,sx,sy,s,s,0,0,640,640);
        cutoutCtx.globalCompositeOperation='source-over';
        hasSegment=true;
        segmentationSource=source;
      } catch(e){console.warn('Cutout frame skipped',e);}
    });
    selfieSegmenter=mp;
  }catch(err){
    segmentFailed=true;
    console.info('Cutout unavailable: showing a blended selfie instead.',err);
  }
}
async function segmentFrame(time){
  if(screen!=='shoot'||!selfieSegmenter||segmenting||shooting||!haveSource()||time-lastSegment<130)return;
  const source=uploaded||video;
  if(source===video&&video.readyState<2)return;
  segmenting=true;lastSegment=time;
  try{await selfieSegmenter.send({image:source});}
  catch(e){segmentFailed=true;selfieSegmenter=null;hasSegment=false;console.info('Using blend mode',e);}
  finally{segmenting=false;}
}
function drawCover(g,source,x,y,w,h,flip=false){
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
  if(!sw||!sh)return;
  const sratio=w/h,iratio=sw/sh;
  let sx=0,sy=0,ww=sw,hh=sh;
  if(iratio>sratio){ww=sh*sratio;sx=(sw-ww)/2;}
  else{hh=sw/sratio;sy=(sh-hh)/2;}
  if(flip){g.save();g.translate(x+w,0);g.scale(-1,1);g.drawImage(source,sx,sy,ww,hh,0,y,w,h);g.restore();}
  else g.drawImage(source,sx,sy,ww,hh,x,y,w,h);
}
function drawBlended(g,source,side){
  const w=900,h=900;blendCtx.clearRect(0,0,w,h);
  const isLeft=side==='left',areaW=550;
  const x=isLeft?0:w-areaW;
  drawCover(blendCtx,source,x,0,areaW,h,source===video);
  // Fade the join to the virtual-character scene (offline fallback).
  blendCtx.globalCompositeOperation='destination-in';
  const gradient=isLeft?blendCtx.createLinearGradient(0,0,areaW,0):blendCtx.createLinearGradient(w-areaW,0,w,0);
  if(isLeft){gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(.76,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');}
  else{gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.24,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,1)');}
  blendCtx.fillStyle=gradient;blendCtx.fillRect(0,0,w,h);
  blendCtx.globalCompositeOperation='source-over';g.drawImage(blend,0,0);
}
function drawStage(){
  const w=900,h=900;
  ctx.fillStyle='#d5edfa';ctx.fillRect(0,0,w,h);
  const scene=image(sceneFiles[current]);
  if(scene.complete&&scene.naturalWidth)ctx.drawImage(scene,0,0,w,h);
  const source=uploaded||((playing&&video.readyState>=2)?video:null);
  if(source){
    const side=current===2?'right':'left';
    if(hasSegment&&selfieSegmenter&&segmentationSource){
      // Match the camera-person silhouette to the original character's empty space.
      const x=side==='left'?-90:370;
      ctx.save();
      if(source===video){ctx.translate(x+690,0);ctx.scale(-1,1);ctx.drawImage(cutout,0,65,690,800);}
      else ctx.drawImage(cutout,x,65,690,800);
      ctx.restore();
    } else drawBlended(ctx,source,side);
  } else {
    // This stays visible while requesting permission; it does not change user's artwork.
    const left=current!==2;
    ctx.fillStyle='#ffffffa6';ctx.fillRect(left?25:480,230,390,160);
    ctx.fillStyle='#7c5773';ctx.textAlign='center';ctx.font='bold 24px Arial';
    ctx.fillText('Your selfie here ♡',left?220:675,310);
    ctx.font='16px Arial';ctx.fillText('Allow camera or upload photo',left?220:675,344);
  }
}
function render(time){
  if(screen==='shoot'){
    drawStage();segmentFrame(time);
  }
  requestAnimationFrame(render);
}
function stopCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}
  playing=false;video.srcObject=null;
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setStatus('Camera requires HTTPS or localhost. You can upload a selfie instead.');updateButtons();return;}
  stopCamera();setStatus('Requesting camera permission…');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    if(screen!=='shoot'){stream.getTracks().forEach(t=>t.stop());return;}
    cameraStream=stream;video.srcObject=stream;await video.play();
    playing=true;uploaded=null;hasSegment=false;segmentationSource=null;
    setStatus('Camera ready! Press START SHOOTING for 3 automatic photos.');
    updateButtons();enableCutout();
  }catch(err){
    setStatus('Camera unavailable or access denied. Choose OR UPLOAD A SELFIE instead.');
    console.info('Camera could not start',err);updateButtons();
  }
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function countDown(){
  const countdown=$('countdown');
  countdown.classList.remove('hidden');
  for(let n=3;n>0;n--){countdown.textContent=n;await wait(1000);}
  countdown.classList.add('hidden');
}
async function shootThree(){
  if(shooting||!haveSource())return;
  shooting=true;updateButtons();
  $('captureBtn').textContent='SHOOTING…';
  try{
    for(let i=0;i<3;i++){
      setCurrent(i);await wait(400);
      setStatus('Photo '+(i+1)+' of 3 — get ready!');
      await countDown();
      drawStage();shots[i]=stage.toDataURL('image/png');
      $('thumb'+i).src=shots[i];
      $('flash').classList.remove('blink');void $('flash').offsetWidth;$('flash').classList.add('blink');
      await wait(650);
    }
    await buildStrip();displayScreen('result');stopCamera();
  }catch(e){
    console.error(e);setStatus('Something went wrong during capture. Please try again.');
  }finally{shooting=false;$('captureBtn').textContent='START SHOOTING';updateButtons();}
}
async function readyImage(url){
  const im=image(url);if(im.complete&&im.naturalWidth)return im;
  return new Promise((res,rej)=>{im.onload=()=>res(im);im.onerror=rej;});
}
async function buildStrip(){
  const frame=await readyImage('assets/frame.jpg');
  stripCtx.clearRect(0,0,635,2000);stripCtx.drawImage(frame,0,0,635,2000);
  // Exact image windows in user's supplied three-cut frame.
  // Requested shooting order is pink → blue → silver.
  // Her original printed frame orders them pink → silver → blue.
  const placements=[{n:0,y:225},{n:2,y:787},{n:1,y:1348}];
  for(const {n,y} of placements){
    const photo=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=shots[n];});
    stripCtx.drawImage(photo,63,y,507,507);
  }
}
function downloadStrip(){
  const a=document.createElement('a');a.download='SHUSHUTONG-SHINING-NIKKI-3-CUTS.png';
  a.href=strip.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
}
async function enterShoot(){
  if(shooting)return;
  for(let i=0;i<3;i++){shots[i]=null;$('thumb'+i).src=sceneFiles[i];}
  setCurrent(0);displayScreen('shoot');updateButtons();await startCamera();
}
function backHome(){if(shooting)return;stopCamera();uploaded=null;hasSegment=false;displayScreen('home');}
$('homeStart').addEventListener('click',enterShoot);
$('goHome').addEventListener('click',backHome);
$('resultHome').addEventListener('click',backHome);
$('cameraBtn').addEventListener('click',startCamera);
$('captureBtn').addEventListener('click',shootThree);
$('retakeBtn').addEventListener('click',enterShoot);
$('downloadBtn').addEventListener('click',downloadStrip);
$('uploadPhoto').addEventListener('change',e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){setStatus('Please select an image file.');return;}
  const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{
    if(uploaded?.datasetUrl)URL.revokeObjectURL(uploaded.datasetUrl);
    uploaded=img;uploaded.datasetUrl=url;hasSegment=false;segmentationSource=null;
    setStatus('Selfie loaded! Click START SHOOTING for three photos.');updateButtons();enableCutout();
  };
  img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Could not read that image. Try another one.');};
  img.src=url;e.target.value='';
});
requestAnimationFrame(render);
updateButtons();
