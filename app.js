"use strict";
const $=id=>document.getElementById(id);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SITE=location.host||"drnestedyt";
const PANELS={
 videosnews:{t:"اخبار ویدیوها",i:"🎬",d:"آخرین خبرهای ویدیو",cat:"videos"},
 minecraftnews:{t:"اخبار ماینکرافت",i:"⛏️",d:"آپدیت‌ها و اتفاقات جدید",cat:"minecraft"},
 telegram:{t:"تلگرام",i:"✈️",d:"عضو کانال شو",link:"https://t.me/D_rNeste_D",txt:"t.me/D_rNeste_D"},
 youtube:{t:"یوتیوب",i:"▶️",d:"کانال رسمی",link:"https://youtube.com/@DrNesteD",txt:"youtube.com/@DrNesteD"}
};
const DEFAULTS=[
 {id:"d1",cat:"videos",title:"به سایت خوش اومدی!",body:"ویدیوهای جدید به‌زودی اینجا اطلاع‌رسانی می‌شن. یوتیوب رو دنبال کن 🔔",ts:0},
 {id:"d2",cat:"minecraft",title:"اخبار ماینکرافت از اینجا",body:"هر آپدیت و اتفاق جدید ماینکرافت همین‌جا منتشر می‌شه ⛏️",ts:0}
];
let sb=null,user=null,news=[],mode="user",PANEL_OPEN=null,fails=0,lockUntil=0;
try{ if(window.supabase&&CFG&&CFG.url.startsWith("https://")&&!CFG.url.includes("YOUR-")) sb=supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true}}); }catch(e){}

/* ---------- data ---------- */
async function loadNews(){
 if(!sb){news=[];return refresh()}
 const {data,error}=await sb.from("news").select("id,cat,title,body,author,created_at").order("created_at",{ascending:false}).limit(100);
 if(!error&&data) news=data.map(n=>({...n,ts:Date.parse(n.created_at)}));
 refresh();
}
function refresh(){if(PANEL_OPEN)renderPanel(PANEL_OPEN)}
async function addNews(n){
 if(!sb||!user.admin)return "no";
 const {error}=await sb.from("news").insert({cat:n.cat,title:n.title.slice(0,120),body:n.body.slice(0,3000),author:user.name.slice(0,24)});
 if(error)return error.message; await loadNews(); return "";
}
async function delNews(id){ if(!sb||!user.admin)return; await sb.from("news").delete().eq("id",id); await loadNews(); }
setInterval(()=>{if(!document.hidden)loadNews()},60000);

/* ---------- login ---------- */
function setMode(m){mode=m;$("tU").classList.toggle("on",m==="user");$("tA").classList.toggle("on",m==="admin");$("pw").style.display=m==="admin"?"block":"none";$("err").textContent=""}
$("tU").onclick=()=>setMode("user");$("tA").onclick=()=>setMode("admin");
function enter(u){user=u;if(!u.admin)store.set("user",JSON.stringify({name:u.name}));
 $("login").style.display="none";$("app").style.display="block";
 $("hi").textContent=(u.admin?"👑 ادمین: ":"سلام ")+u.name;$("adm").style.display=u.admin?"inline-block":"none";
 loadNews();route();}
$("go").onclick=async()=>{
 const name=$("nm").value.trim().replace(/[<>]/g,"").slice(0,24);
 if(!name){$("err").textContent="اسمت رو وارد کن";return}
 if(mode==="admin"){
  if(Date.now()<lockUntil){$("err").textContent="چند بار اشتباه زدی. کمی صبر کن ⏳";return}
  if(!sb){$("err").textContent="اتصال دیتابیس تنظیم نشده";return}
  $("go").disabled=true;
  const {data,error}=await sb.auth.signInWithPassword({email:CFG.adminEmail,password:$("pw").value});
  $("go").disabled=false;
  if(error||!data.session){fails++;if(fails>=5){lockUntil=Date.now()+60000;fails=0}$("err").textContent="رمز اشتباهه ❌";return}
  store.set("adminname",name);$("pw").value="";fails=0;enter({name,admin:true});
 } else enter({name,admin:false});
};
["nm","pw"].forEach(i=>$(i).addEventListener("keydown",e=>{if(e.key==="Enter")$("go").click()}));
$("out").onclick=async()=>{store.del("user");store.del("adminname");if(sb)await sb.auth.signOut();user=null;closePanel(true);$("app").style.display="none";$("login").style.display="flex"};

/* ---------- tiles ---------- */
$("tiles").innerHTML=Object.entries(PANELS).map(([k,p],i)=>`<div class="tile" style="animation-delay:${i*.12}s;cursor:pointer" data-k="${k}"><span class="ic">${p.i}</span><h3>${p.t}</h3><p>${p.d}</p></div>`).join("");
$("tiles").onclick=e=>{const t=e.target.closest(".tile");if(t)go(t.dataset.k)};
$("adm").onclick=()=>go("admin");

/* ---------- panels with real URL paths (/videosnews) ---------- */
function go(k){history.pushState(null,"","/"+k);route()}
function closePanel(silent){PANEL_OPEN=null;$("panel").classList.remove("show");if(!silent&&location.pathname!=="/")history.pushState(null,"","/")}
$("panel").onclick=e=>{if(e.target.id==="panel")closePanel()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePanel()});
window.addEventListener("popstate",route);
$("pc").addEventListener("click",async e=>{
 if(e.target.closest(".x"))return closePanel();
 const d=e.target.closest(".del");if(d&&confirm("حذف بشه؟"))delNews(d.dataset.id);
 if(e.target.id==="asv"){
  const t=$("at").value.trim(),b=$("ab").value.trim();if(!t||!b)return;
  e.target.disabled=true;const r=await addNews({cat:$("ac").value,title:t,body:b});e.target.disabled=false;
  if(r)$("aerr").textContent="خطا: "+r;else{$("at").value="";$("ab").value="";$("aerr").textContent="✅ منتشر شد"}
 }
});
function route(){
 const k=location.pathname.split("/").filter(Boolean).pop()||"";
 if(!user||!k||(k!=="admin"&&!PANELS[k])||(k==="admin"&&!user.admin)){$("panel").classList.remove("show");PANEL_OPEN=null;return}
 PANEL_OPEN=k;renderPanel(k);$("panel").classList.add("show");
}
function head(t,path){return `<div class="phead"><h2>${t}</h2><button class="x">✕</button></div><div class="url">${esc(SITE)}/${path}</div>`}
function newsHTML(cat){
 let all=news.filter(n=>n.cat===cat); if(!all.length)all=DEFAULTS.filter(n=>n.cat===cat);
 return all.map((n,i)=>`<div class="news" style="animation-delay:${i*.08}s"><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p><small>${n.ts?new Date(n.ts).toLocaleDateString("fa-IR"):""} ${n.author?"• "+esc(n.author):""}</small></div>`).join("");
}
function renderPanel(k){
 const pc=$("pc");
 if(k==="admin"){
  if($("at")&&document.activeElement&&pc.contains(document.activeElement))return; // don't wipe what's being typed
  pc.innerHTML=head("⚙️ پنل ادمین","admin")+`
  <select id="ac"><option value="videos">اخبار ویدیوها</option><option value="minecraft">اخبار ماینکرافت</option></select>
  <input id="at" placeholder="عنوان خبر" maxlength="120">
  <textarea id="ab" rows="4" placeholder="متن خبر..." maxlength="3000"></textarea>
  <button class="btn" id="asv" style="width:100%">انتشار خبر ✅</button><div class="err" id="aerr"></div>
  <h3 class="fd" style="font-size:24px;margin:18px 0 0">اخبار منتشرشده</h3>
  <div>${news.length?news.map(n=>`<div class="news"><button class="del" data-id="${esc(n.id)}">حذف</button><h4>${esc(n.title)}</h4><small>${n.cat==="videos"?"ویدیوها":"ماینکرافت"}</small></div>`).join(""):'<p style="color:var(--mut)">هنوز خبری منتشر نکردی.</p>'}</div>`;
  return;
 }
 const p=PANELS[k];
 if(p.link) pc.innerHTML=head(p.t,k)+`<div class="linkcard"><span class="ic">${p.i}</span><h3 class="fd" style="font-size:28px;margin:6px 0">${p.d}</h3><code>${p.txt}</code><a class="btn" href="${p.link}" target="_blank" rel="noopener noreferrer">باز کردن ↗</a></div>`;
 else pc.innerHTML=head(p.t,k)+newsHTML(p.cat);
}

/* ---------- animated background ---------- */
const cv=$("bg"),cx=cv.getContext("2d");let W,H,cubes=[];
function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight}rs();addEventListener("resize",rs);
for(let i=0;i<34;i++)cubes.push({x:Math.random()*2000,y:Math.random()*1200,s:10+Math.random()*34,v:.15+Math.random()*.5,r:Math.random()*6,rv:(Math.random()-.5)*.01,b:Math.random()>.6});
(function loop(){
 cx.clearRect(0,0,W,H);const g=cx.createRadialGradient(W*.5,H*.3,50,W*.5,H*.5,W);g.addColorStop(0,"#0d1a33");g.addColorStop(1,"#03050a");cx.fillStyle=g;cx.fillRect(0,0,W,H);
 cubes.forEach(c=>{c.y-=c.v;c.r+=c.rv;if(c.y<-60){c.y=H+60;c.x=Math.random()*W}
  cx.save();cx.translate(c.x%W,c.y);cx.rotate(c.r);cx.globalAlpha=.45;
  const n=Math.max(3,Math.round(c.s/7));for(let a=0;a<n;a++){const q=c.s-a*(c.s/n);cx.fillStyle=(a%2)?(c.b?"#4aa8ff":"#fff"):"#000";cx.fillRect(-q/2,-q/2,q,q)}
  cx.restore()});
 requestAnimationFrame(loop);
})();

/* ---------- resume session ---------- */
(async()=>{
 if(sb){const {data}=await sb.auth.getSession();
  if(data&&data.session){enter({name:store.get("adminname")||"Admin",admin:true});return}}
 try{const u=JSON.parse(store.get("user")||"null");if(u&&u.name)enter({name:String(u.name).slice(0,24),admin:false})}catch(e){}
})();
