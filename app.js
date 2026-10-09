"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const HASH=location.hostname.endsWith("github.io")||location.protocol==="file:";
const SITE=location.host||"drnested";
const CATS={videos:"ویدیوها",minecraft:"ماینکرافت"};
const PANELS={
 videosnews:{t:"اخبار ویدیوها",i:"🎬",d:"آخرین خبرهای ویدیوها",cat:"videos"},
 minecraftnews:{t:"اخبار ماینکرافت",i:"⛏️",d:"آپدیت‌ها و اتفاقات جدید",cat:"minecraft"},
 telegram:{t:"تلگرام",i:"✈️",d:"عضو کانال تلگرام شو",link:"https://t.me/D_rNeste_D",txt:"t.me/D_rNeste_D"},
 youtube:{t:"یوتیوب",i:"▶️",d:"کانال رسمی یوتیوب",link:"https://youtube.com/@DrNesteD",txt:"youtube.com/@DrNesteD"}
};
const DEFAULTS=[
 {id:"d1",cat:"videos",title:"به سایت خوش اومدی!",body:"ویدیوهای جدید به‌زودی اینجا اطلاع‌رسانی می‌شن. یوتیوب رو دنبال کن 🔔",ts:0},
 {id:"d2",cat:"minecraft",title:"اخبار ماینکرافت از اینجا",body:"هر آپدیت و اتفاق جدید ماینکرافت همین‌جا منتشر می‌شه ⛏️",ts:0}
];
let sb=null,user=null,news=[],loaded=false,mode="user",openKey=null,lastFocus=null,fails=0,lockUntil=0,adminCat="videos";
try{ if(window.supabase&&window.CFG&&/^https:\/\//.test(CFG.url)&&!/YOUR-/.test(CFG.url)) sb=supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true}}); }catch(e){}

function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
const dateOf=n=>n.ts?new Date(n.ts).toLocaleDateString("fa-IR"):"";

/* ---------- data ---------- */
async function loadNews(){
 if(sb){
  const {data,error}=await sb.from("news").select("id,cat,title,body,author,created_at").order("created_at",{ascending:false}).limit(100);
  if(!error&&data)news=data.map(n=>({...n,ts:Date.parse(n.created_at)||0}));
 }
 loaded=true;renderLatest();if(openKey)renderPanel(openKey,true);
}
function list(cat){let a=cat?news.filter(n=>n.cat===cat):news.slice();if(!a.length)a=DEFAULTS.filter(n=>!cat||n.cat===cat);return a}
async function addNews(cat,title,body){
 if(!sb||!user||!user.admin)return "اتصال دیتابیس یا دسترسی ادمین موجود نیست";
 const {error}=await sb.from("news").insert({cat,title:title.slice(0,120),body:body.slice(0,3000),author:user.name.slice(0,24)});
 if(error)return "خطا در انتشار: "+error.message;
 await loadNews();return "";
}
async function delNews(id){
 if(!sb||!user||!user.admin)return;
 const {error}=await sb.from("news").delete().eq("id",id);
 if(error)toast("حذف نشد: "+error.message);else{toast("حذف شد");await loadNews()}
}
setInterval(()=>{if(!document.hidden&&user&&!(openKey==="admin"))loadNews()},60000);

/* ---------- login ---------- */
function setMode(m){mode=m;$("tU").setAttribute("aria-pressed",m==="user");$("tA").setAttribute("aria-pressed",m==="admin");$("pw").hidden=m!=="admin";$("err").textContent="";(m==="admin"?$("pw"):$("nm")).focus()}
$("tU").addEventListener("click",()=>setMode("user"));
$("tA").addEventListener("click",()=>setMode("admin"));
function enter(u){
 user=u;if(!u.admin)store.set("user",JSON.stringify({name:u.name}));
 $("login").hidden=true;$("app").hidden=false;
 $("hi").textContent=(u.admin?"👑 ":"")+u.name;$("adm").hidden=!u.admin;
 renderLatest();loadNews();route();
}
$("lf").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("nm").value.trim().replace(/[<>]/g,"").slice(0,24),err=$("err");
 if(!name){err.textContent="اسمت رو وارد کن";$("nm").focus();return}
 if(mode==="admin"){
  if(Date.now()<lockUntil){err.textContent="چند بار اشتباه زدی. یک دقیقه صبر کن ⏳";return}
  if(!sb){err.textContent="اتصال دیتابیس تنظیم نشده (config.js رو پر کن)";return}
  if(!$("pw").value){err.textContent="رمز رو وارد کن";$("pw").focus();return}
  $("go").disabled=true;err.textContent="";
  let res;try{res=await sb.auth.signInWithPassword({email:CFG.adminEmail,password:$("pw").value})}catch(x){res={error:x}}
  $("go").disabled=false;
  if(res.error||!res.data||!res.data.session){fails++;if(fails>=5){lockUntil=Date.now()+60000;fails=0}err.textContent="رمز اشتباهه ❌";return}
  store.set("adminname",name);$("pw").value="";fails=0;enter({name,admin:true});
 }else enter({name,admin:false});
});
$("out").addEventListener("click",async()=>{
 store.del("user");store.del("adminname");
 if(sb){try{await sb.auth.signOut()}catch(e){}}
 closePanel(true);user=null;$("app").hidden=true;$("login").hidden=false;$("nm").value="";setMode("user");
});

/* ---------- home ---------- */
$("tiles").innerHTML=Object.entries(PANELS).map(([k,p],i)=>`<button type="button" class="tile glass" style="animation-delay:${i*.08}s" data-k="${k}"><div class="ic">${p.i}</div><h4 class="fd">${p.t}</h4><p>${p.d}</p></button>`).join("");
$("tiles").addEventListener("click",e=>{const t=e.target.closest(".tile");if(t)go(t.dataset.k)});
$("adm").addEventListener("click",()=>go("admin"));
function renderLatest(){
 const box=$("latest");
 if(!loaded&&sb){box.innerHTML='<div class="skel"></div><div class="skel"></div>';return}
 const k={videos:"videosnews",minecraft:"minecraftnews"};
 box.innerHTML=list().slice(0,4).map((n,i)=>`<button type="button" class="item glass" style="animation-delay:${i*.07}s" data-k="${k[n.cat]}"><h5>${esc(n.title)}<span class="tag">${CATS[n.cat]}</span></h5><p>${esc(n.body.length>140?n.body.slice(0,140)+"…":n.body)}</p><div class="meta">${dateOf(n)}</div></button>`).join("");
}
$("latest").addEventListener("click",e=>{const t=e.target.closest(".item");if(t)go(t.dataset.k)});

/* ---------- routing ---------- */
function go(k){if(HASH)location.hash="/"+k;else{history.pushState(null,"","/"+k);route()}}
function keyNow(){return HASH?location.hash.replace(/^#\/?/,""):(location.pathname.split("/").filter(Boolean).pop()||"")}
function closePanel(silent){
 if(!openKey&&silent)return;
 openKey=null;$("panel").classList.remove("show");document.body.classList.remove("lock");$("pc").removeAttribute("data-k");
 if(!silent){if(HASH){if(location.hash)history.pushState(null,"",location.pathname+location.search)}else if(location.pathname!=="/")history.pushState(null,"","/")}
 if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}
}
function route(){
 const k=keyNow();
 if(!user||!k||(k!=="admin"&&!PANELS[k])||(k==="admin"&&!user.admin)){if(openKey)closePanel(true);return}
 if(!openKey)lastFocus=document.activeElement;
 openKey=k;renderPanel(k);$("panel").classList.add("show");document.body.classList.add("lock");
 const x=$("pc").querySelector(".x");if(x)x.focus();
}
window.addEventListener("popstate",route);window.addEventListener("hashchange",route);
$("panel").addEventListener("click",e=>{if(e.target.id==="panel")closePanel()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&openKey)closePanel()});

/* ---------- panels ---------- */
const head=(t,path)=>`<div class="ph"><h2 class="fd">${t}</h2><button type="button" class="x" aria-label="بستن">✕</button></div><div class="url">${esc(SITE)}${HASH?"/#/":"/"}${path}</div>`;
function renderPanel(k,refresh){
 const pc=$("pc");
 if(k==="admin"){
  if(pc.dataset.k!=="admin"){
   pc.dataset.k="admin";
   pc.innerHTML=head("⚙️ پنل ادمین","admin")+`
   <div class="seg" role="group" aria-label="دسته"><button type="button" data-cat="videos" aria-pressed="true">🎬 اخبار ویدیوها</button><button type="button" data-cat="minecraft" aria-pressed="false">⛏️ اخبار ماینکرافت</button></div>
   <input class="field" id="at" placeholder="عنوان خبر" maxlength="120" autocomplete="off">
   <textarea class="field" id="ab" rows="5" placeholder="متن خبر..." maxlength="3000"></textarea>
   <div class="cnt" id="cnt">0 / 3000</div>
   <div class="msg" id="aerr" role="status"></div>
   <button type="button" class="btn" id="asv" style="width:100%">انتشار خبر ✅</button>
   <h3 class="sec fd" style="margin:24px 0 8px;font-size:22px">اخبار منتشرشده</h3><div id="al"></div>`;
   adminCat="videos";
  }
  const al=$("al");
  al.innerHTML=news.length?news.map(n=>`<div class="glass arow"><div><h5>${esc(n.title)}</h5><div class="meta">${CATS[n.cat]} • ${dateOf(n)}</div></div><button type="button" class="btn danger sm" data-del="${esc(n.id)}">حذف</button></div>`).join(""):'<p class="meta">هنوز خبری منتشر نکردی.</p>';
  return;
 }
 pc.dataset.k=k;
 const p=PANELS[k];
 if(p.link){pc.innerHTML=head(p.t,k)+`<div class="linkcard"><div class="ic">${p.i}</div><h3 class="fd" style="font-size:28px;margin:0">${p.d}</h3><code>${p.txt}</code><a class="btn" href="${p.link}" target="_blank" rel="noopener noreferrer">باز کردن ↗</a></div>`;return}
 const items=list(p.cat);
 pc.innerHTML=head(p.t,k)+items.map((n,i)=>`<div class="glass item" style="animation-delay:${i*.06}s;margin:10px 0"><h5>${esc(n.title)}</h5><p>${esc(n.body)}</p><div class="meta">${dateOf(n)}${n.author?" • "+esc(n.author):""}</div></div>`).join("");
}
$("pc").addEventListener("click",async e=>{
 const t=e.target;
 if(t.closest(".x"))return closePanel();
 const seg=t.closest("[data-cat]");
 if(seg){adminCat=seg.dataset.cat;$("pc").querySelectorAll("[data-cat]").forEach(b=>b.setAttribute("aria-pressed",b===seg));return}
 const d=t.closest("[data-del]");
 if(d){
  if(d.dataset.sure){d.disabled=true;await delNews(d.dataset.del);return}
  d.dataset.sure="1";d.textContent="مطمئنی؟";setTimeout(()=>{if(d.isConnected){delete d.dataset.sure;d.textContent="حذف"}},3000);return;
 }
 if(t.id==="asv"){
  const ti=$("at").value.trim(),bo=$("ab").value.trim(),m=$("aerr");m.className="msg";
  if(!ti||!bo){m.textContent="عنوان و متن رو پر کن";return}
  t.disabled=true;m.textContent="";
  const r=await addNews(adminCat,ti,bo);t.disabled=false;
  if(r){m.textContent=r}else{$("at").value="";$("ab").value="";$("cnt").textContent="0 / 3000";m.className="msg ok";m.textContent="✅ خبر منتشر شد";toast("خبر منتشر شد")}
 }
});
$("pc").addEventListener("input",e=>{if(e.target.id==="ab")$("cnt").textContent=e.target.value.length+" / 3000"});

/* ---------- resume session ---------- */
(async()=>{
 renderLatest();
 try{
  if(sb){
   const {data}=await sb.auth.getSession();
   if(data&&data.session&&data.session.user&&data.session.user.email===CFG.adminEmail){enter({name:store.get("adminname")||"Admin",admin:true});return}
  }
  const u=JSON.parse(store.get("user")||"null");
  if(u&&u.name)enter({name:String(u.name).slice(0,24),admin:false});
 }catch(e){}
})();

/* ---------- animated background (floating cubes) ---------- */
(function(){
 const cv=$("bg"),cx=cv.getContext&&cv.getContext("2d");if(!cx)return;
 let W,H;const cubes=[];
 const rs=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight};rs();addEventListener("resize",rs);
 for(let i=0;i<34;i++)cubes.push({x:Math.random()*2000,y:Math.random()*1200,s:10+Math.random()*34,v:.15+Math.random()*.5,r:Math.random()*6,rv:(Math.random()-.5)*.01,b:Math.random()>.6});
 const still=matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 (function loop(){
  cx.clearRect(0,0,W,H);const g=cx.createRadialGradient(W*.5,H*.3,50,W*.5,H*.5,W);g.addColorStop(0,"#0d1a33");g.addColorStop(1,"#03050a");cx.fillStyle=g;cx.fillRect(0,0,W,H);
  for(const c of cubes){
   if(!still){c.y-=c.v;c.r+=c.rv;if(c.y<-60){c.y=H+60;c.x=Math.random()*W}}
   cx.save();cx.translate(c.x%W,c.y);cx.rotate(c.r);cx.globalAlpha=.4;
   const n=Math.max(3,Math.round(c.s/7));
   for(let a=0;a<n;a++){const q=c.s-a*(c.s/n);cx.fillStyle=(a%2)?(c.b?"#4aa8ff":"#fff"):"#000";cx.fillRect(-q/2,-q/2,q,q)}
   cx.restore();
  }
  if(!still&&!document.hidden)requestAnimationFrame(loop);else if(!still)setTimeout(loop,500);
 })();
})();
