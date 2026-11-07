'use strict';

// SHUSHU/TONG × SHINING NIKKI — Photoism-style three-cut photo booth.
// All camera footage and compositions stay in the visitor's browser.
// The live CAMERA fills the entire frame. A transparent virtual character is
// composited OVER the camera, not a small selfie pasted onto a scene.
const $ = id => document.getElementById(id);
const sceneFiles = ['assets/scene-pink.jpg','assets/scene-silver.jpg','assets/scene-blue.jpg'];
const characterFiles = ['assets/character-pink.png','assets/character-silver.png','assets/character-blue.png'];
const sceneNames = ['PINK','SILVER','BLUE'];
const stage = $('stage'), ctx = stage.getContext('2d',{alpha:false});
const strip = $('strip'), stripCtx = strip.getContext('2d');
const video = $('cameraVideo');
const imageCache = {};
const shots = [null,null,null];
let current = 0, cameraStream = null, uploaded = null;
let playing = false, shooting = false, screen = 'home';
let charScale=1, charOffsetX=0;
let drag=null;

function image(url){
  if(!imageCache[url]) {const im=new Image();im.src=url;imageCache[url]=im;}
  return imageCache[url];
}
for(const url of [...sceneFiles,...characterFiles,'assets/frame.jpg']) image(url);
function show(name){
  screen=name;
  $('homeScreen').classList.toggle('hidden',name!=='home');
  $('shootScreen').classList.toggle('hidden',name!=='shoot');
  $('resultScreen').classList.toggle('hidden',name!=='result');
  window.scrollTo(0,0);
}
function setStatus(text){$('status').textContent=text;}
function setCurrent(i){
  current=i;
  $('shotCounter').textContent=String(i+1).padStart(2,'0')+' / 03';
  $('stageBadge').textContent=String(i+1).padStart(2,'0')+' — '+sceneNames[i];
  $('instruction').textContent=[
    '01 · Pink. Step into the full camera view and pose together!',
    '02 · Silver. Move a little closer or farther away for your next pose.',
    '03 · Blue. One last picture with your virtual character!'
  ][i];
}
function source(){return uploaded||((playing&&video.readyState>=2)?video:null);}
function updateButtons(){
  $('captureBtn').disabled=shooting||!source();
  $('cameraBtn').disabled=shooting;
  $('uploadPhoto').disabled=shooting;
  $('characterSize').disabled=shooting;
  $('characterMove').disabled=shooting;
  $('resetFrame').disabled=shooting;
  $('livePill').classList.toggle('inactive',!playing||Boolean(uploaded));
  $('livePill').lastChild.textContent=uploaded?' UPLOADED PHOTO':playing?' LIVE CAMERA':' CAMERA PREVIEW';
}
function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
function syncControls(){
  $('characterSize').value=Math.round(charScale*100);
  $('characterSizeValue').textContent=Math.round(charScale*100)+'%';
  $('characterMove').value=Math.round(charOffsetX/10)*10;
  $('characterMoveValue').textContent=Math.abs(charOffsetX)<5?'CENTER':(charOffsetX>0?'+':'')+Math.round(charOffsetX);
}
function resetFrame(){charScale=1;charOffsetX=0;syncControls();}

function drawCover(context,src,x,y,w,h,mirror=false){
  const sw=src.videoWidth||src.naturalWidth||src.width;
  const sh=src.videoHeight||src.naturalHeight||src.height;
  if(!sw||!sh)return;
  const sourceRatio=sw/sh, targetRatio=w/h;
  let sx=0,sy=0,cw=sw,ch=sh;
  if(sourceRatio>targetRatio){cw=sh*targetRatio;sx=(sw-cw)/2;}
  else{ch=sw/targetRatio;sy=(sh-ch)/2;}
  context.save();
  if(mirror){context.translate(x+w,y);context.scale(-1,1);context.drawImage(src,sx,sy,cw,ch,0,0,w,h);}
  else context.drawImage(src,sx,sy,cw,ch,x,y,w,h);
  context.restore();
}
function drawStage(){
  const w=900,h=900;
  ctx.clearRect(0,0,w,h);
  const userSource=source();
  if(userSource){
    // Entire camera image is the background, rather than a cutout in a corner.
    drawCover(ctx,userSource,0,0,w,h,userSource===video);
  } else {
    // While requesting permission, keep the original unmodified scene visible.
    const scene=image(sceneFiles[current]);
    if(scene.complete&&scene.naturalWidth)ctx.drawImage(scene,0,0,w,h);
    else{ctx.fillStyle='#d9f0fc';ctx.fillRect(0,0,w,h);}
    return;
  }
  const character=image(characterFiles[current]);
  if(character.complete&&character.naturalWidth){
    const size=900*charScale;
    const left=(900-size)/2+charOffsetX;
    const top=900-size; // keep feet/skirt at the bottom while resizing
    ctx.drawImage(character,left,top,size,size);
  }
}
function render(){
  if(screen==='shoot')drawStage();
  requestAnimationFrame(render);
}
function stopCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  playing=false;video.srcObject=null;
}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){
    setStatus('Your browser needs HTTPS or localhost for camera access. Upload a photo instead.');
    updateButtons();return;
  }
  stopCamera();setStatus('Requesting camera permission…');updateButtons();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'user',width:{ideal:1280},height:{ideal:960},aspectRatio:{ideal:1}},audio:false
    });
    if(screen!=='shoot'){stream.getTracks().forEach(t=>t.stop());return;}
    cameraStream=stream;video.srcObject=stream;await video.play();
    playing=true;
    if(uploaded?.objectUrl)URL.revokeObjectURL(uploaded.objectUrl);
    uploaded=null;
    setStatus('Camera ready! This is the full live view. Stand back to show more of yourself.');
  }catch(e){
    console.info('Camera permission / device error:',e);
    setStatus('Camera unavailable or permission denied. You can still upload a selfie.');
  }
  updateButtons();
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function countdown(){
  const el=$('countdown');
  el.classList.remove('hidden');
  for(let n=3;n>=1;n--){el.textContent=n;await wait(1000);}
  el.classList.add('hidden');
}
async function readyImage(url){
  const im=image(url);
  if(im.complete&&im.naturalWidth)return im;
  return new Promise((resolve,reject)=>{
    im.addEventListener('load',()=>resolve(im),{once:true});
    im.addEventListener('error',()=>reject(Error('Failed to load '+url)),{once:true});
  });
}
async function shootThree(){
  if(shooting||!source())return;
  shooting=true;updateButtons();$('captureBtn').textContent='SHOOTING…';
  try{
    await Promise.all(characterFiles.map(readyImage));
    for(let i=0;i<3;i++){
      setCurrent(i);setStatus('Photo '+(i+1)+' of 3 — look at the camera and pose!');
      await wait(850);await countdown();
      drawStage();
      shots[i]=stage.toDataURL('image/png');
      $('thumb'+i).src=shots[i];
      $('flash').classList.remove('blink');void $('flash').offsetWidth;$('flash').classList.add('blink');
      await wait(650);
    }
    await buildStrip();show('result');stopCamera();
  }catch(err){
    console.error(err);setStatus('Could not finish the photo session. Please check the assets and try again.');
  }finally{
    shooting=false;$('countdown').classList.add('hidden');
    $('captureBtn').textContent='START SHOOTING';updateButtons();
  }
}
async function buildStrip(){
  const frame=await readyImage('assets/frame.jpg');
  stripCtx.clearRect(0,0,635,2000);
  stripCtx.drawImage(frame,0,0,635,2000);
  // The frame artwork has original positions: pink / silver / blue.
  // Camera now shoots pink / silver / blue, matching the unchanged print layout.
  for(const {i,y} of [{i:0,y:225},{i:1,y:787},{i:2,y:1348}]){
    const im=await new Promise((resolve,reject)=>{
      const pic=new Image();pic.onload=()=>resolve(pic);pic.onerror=reject;pic.src=shots[i];
    });
    stripCtx.drawImage(im,63,y,507,507);
  }
}
function downloadStrip(){
  const a=document.createElement('a');a.download='SHUSHUTONG-SHINING-NIKKI-3-CUTS.png';
  a.href=strip.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
}
async function enterShoot(){
  if(shooting)return;
  shots.fill(null);
  for(let i=0;i<3;i++){
    const thumb=$('thumb'+i);
    thumb.src=sceneFiles[i];
    thumb.alt=sceneNames[i]+' virtual character';
    const caption=thumb.nextElementSibling;
    if(caption)caption.textContent=String(i+1).padStart(2,'0')+' · '+sceneNames[i];
  }
  resetFrame();setCurrent(0);show('shoot');updateButtons();
  await startCamera();
}
function backHome(){
  if(shooting)return;
  stopCamera();
  if(uploaded?.objectUrl)URL.revokeObjectURL(uploaded.objectUrl);
  uploaded=null;show('home');
}
$('homeStart').addEventListener('click',enterShoot);
$('goHome').addEventListener('click',backHome);
$('resultHome').addEventListener('click',backHome);
$('cameraBtn').addEventListener('click',startCamera);
$('captureBtn').addEventListener('click',shootThree);
$('retakeBtn').addEventListener('click',enterShoot);
$('downloadBtn').addEventListener('click',downloadStrip);
$('resetFrame').addEventListener('click',resetFrame);
$('characterSize').addEventListener('input',e=>{charScale=Number(e.target.value)/100;syncControls();});
$('characterMove').addEventListener('input',e=>{charOffsetX=Number(e.target.value);syncControls();});
$('uploadPhoto').addEventListener('change',e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){setStatus('Choose an image file (JPG or PNG).');return;}
  const objectUrl=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    if(uploaded?.objectUrl)URL.revokeObjectURL(uploaded.objectUrl);
    uploaded=img;uploaded.objectUrl=objectUrl;
    // Camera is stopped when using a still photo, avoids user assuming it is live.
    stopCamera();setStatus('Selfie loaded. Preview it with the character, then press START SHOOTING.');updateButtons();
  };
  img.onerror=()=>{URL.revokeObjectURL(objectUrl);setStatus('Could not load the uploaded image.');};
  img.src=objectUrl;e.target.value='';
});
// Drag virtual character left / right, like positioning a standee on a booth screen.
stage.addEventListener('pointerdown',e=>{
  if(shooting||screen!=='shoot'||!source())return;
  drag={start:e.clientX,offset:charOffsetX};stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!drag)return;
  const rect=stage.getBoundingClientRect();
  charOffsetX=clamp(drag.offset+(e.clientX-drag.start)*900/rect.width,-310,310);
  syncControls();
});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
  stage.addEventListener(event,()=>{drag=null;});
}
requestAnimationFrame(render);
updateButtons();
