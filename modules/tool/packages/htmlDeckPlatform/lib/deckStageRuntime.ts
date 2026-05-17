/**
 * 行为对齐 Huashu-Design assets/deck_stage.js（1920×1080 画布、缩放铺满、键盘/点击翻页、打印分页）。
 * 为本插件独立重写，避免逐字复制上游文件。
 */
export function buildDeckStageScript(): string {
  return `(function(){
if(typeof customElements==='undefined')return;
if(customElements.get('deck-stage'))return;
var SK='huashu-deck-slide-';
class DeckStage extends HTMLElement{
constructor(){super();this.attachShadow({mode:'open'});this._i=0;this._slides=[];this._key=SK+(location.pathname||'d');}
connectedCallback(){
this._w=parseInt(this.getAttribute('width'),10)||1920;
this._h=parseInt(this.getAttribute('height'),10)||1080;
this._render();
var init=function(){
this._collect();this._listen();if(!this._hash())this._restore();this._paint();this._printCss();
}.bind(this);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else requestAnimationFrame(init);
}
_collect(){
this._slides=Array.from(this.querySelectorAll(':scope > section'));
this._slides.forEach(function(s,idx){
if(!s.getAttribute('data-screen-label'))s.setAttribute('data-screen-label',String(idx+1).padStart(2,'0'));
});
}
_render(){
this.shadowRoot.innerHTML='<style>'+
':host{display:block;position:fixed;inset:0;background:#0a0a0a;overflow:hidden;font-family:-apple-system,"PingFang SC",sans-serif}'+
'.stage{position:absolute;top:0;left:0;transform-origin:top left;will-change:transform;background:transparent}'+
'.wrap{width:100%;height:100%;position:relative}'+
'::slotted(section){display:none;width:100%;height:100%;position:absolute;inset:0;overflow:hidden;margin:0;padding:0;box-sizing:border-box}'+
'::slotted(section.active){display:block}'+
'.counter{position:fixed;bottom:52px;right:52px;background:rgba(0,0,0,.65);color:#fff;padding:6px 14px;border-radius:999px;font-size:13px;font-variant-numeric:tabular-nums;z-index:100;user-select:none;opacity:.7;transition:opacity .2s}'+
'.counter:hover{opacity:1}'+
'.nav-zone{position:fixed;top:0;bottom:0;width:15%;cursor:pointer;z-index:50}'+
'.nav-zone.left{left:0}.nav-zone.right{right:0}'+
'.nav-hint{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:999px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0;transition:opacity .2s}'+
'.nav-zone.left .nav-hint{left:20px}.nav-zone.right .nav-hint{right:20px}'+
'.nav-zone:hover .nav-hint{opacity:1}'+
'@media print{'+
':host{position:static;background:#fff}'+
'.counter,.nav-zone{display:none!important}'+
'.stage{position:static!important;transform:none!important}'+
'::slotted(section){display:block!important;position:relative!important;page-break-after:always}'+
'}'+
'</style>'+
'<div class="stage" id="st" style="width:'+this._w+'px;height:'+this._h+'px"><div class="wrap"><slot></slot></div></div>'+
'<div class="nav-zone left" id="nl"><div class="nav-hint">‹</div></div>'+
'<div class="nav-zone right" id="nr"><div class="nav-hint">›</div></div>'+
'<div class="counter" id="ct">1 / 1</div>';
}
_listen(){
var self=this;
window.addEventListener('resize',function(){self._scale();});
document.addEventListener('keydown',function(e){
if(e.target.matches('input,textarea,[contenteditable]'))return;
switch(e.key){
case'ArrowRight':case' ':case'PageDown':e.preventDefault();self._next();break;
case'ArrowLeft':case'PageUp':e.preventDefault();self._prev();break;
case'Home':e.preventDefault();self.go(0);break;
case'End':e.preventDefault();self.go(self._slides.length-1);break;
default:if(e.key>='1'&&e.key<='9'){var j=parseInt(e.key,10)-1;if(j<self._slides.length){e.preventDefault();self.go(j);}}
}
});
this.shadowRoot.getElementById('nl').addEventListener('click',function(){self._prev();});
this.shadowRoot.getElementById('nr').addEventListener('click',function(){self._next();});
window.addEventListener('hashchange',function(){if(self._hash())self._paint();});
}
_hash(){
var m=location.hash.match(/^#slide-(\\d+)$/);
if(m){var idx=parseInt(m[1],10)-1;if(idx>=0&&idx<this._slides.length){this._i=idx;return true;}}
return false;
}
_restore(){try{var v=localStorage.getItem(this._key);if(v!=null){var n=parseInt(v,10);if(!isNaN(n)&&n>=0&&n<this._slides.length)this._i=n;}}catch(e){}}
_save(){try{localStorage.setItem(this._key,String(this._i));}catch(e){}}
_scale(){
var st=this.shadowRoot.getElementById('st');if(!st)return;
var vw=window.innerWidth,vh=window.innerHeight,s=Math.min(vw/this._w,vh/this._h);
var ox=(vw-this._w*s)/2,oy=(vh-this._h*s)/2;
st.style.transform='translate('+ox+'px,'+oy+'px) scale('+s+')';
}
_paint(){
this._slides.forEach(function(s,j){s.classList.toggle('active',j===this._i);}.bind(this));
var ct=this.shadowRoot.getElementById('ct');
if(ct)ct.textContent=(this._i+1)+' / '+this._slides.length;
if(location.hash!=='#slide-'+(this._i+1))try{history.replaceState(null,'','#slide-'+(this._i+1));}catch(e){}
this._scale();this._save();
try{window.dispatchEvent(new CustomEvent('deck-stage-change',{detail:{index:this._i,total:this._slides.length}}));}catch(e){}
}
_printCss(){
if(document.getElementById('huashu-deck-print'))return;
var st=document.createElement('style');
st.id='huashu-deck-print';
st.textContent='@media print{@page{size:'+this._w+'px '+this._h+'px;margin:0}body{margin:0}deck-stage{position:static!important}deck-stage>section{display:block!important;position:relative!important;width:'+this._w+'px!important;height:'+this._h+'px!important;page-break-after:always;overflow:hidden}deck-stage>section:last-child{page-break-after:auto}}';
document.head.appendChild(st);
}
_next(){if(this._i<this._slides.length-1){this._i++;this._paint();}}
_prev(){if(this._i>0){this._i--;this._paint();}}
go(n){if(n>=0&&n<this._slides.length){this._i=n;this._paint();}}
}
customElements.define('deck-stage',DeckStage);
})();`;
}
