/* PHP2Shell live dashboard: data from data/*.json, refetch every 60 s */
(function(){
const FILES=['status','events','hosting-ru','vendors','tweets','metrics','feed'];
const OPTIONAL={feed:{items:[]}};
const AG={'Карпати':{i:'К',c:'#b6ff3b'},'Мика':{i:'М',c:'#ff1493'},'Cyber Security':{i:'CS',c:'#3bd6ff'},'ris':{i:'R',c:'#ffd400'}};
const CAT={ai:{l:'ИИ',c:'#b6ff3b'},defense:{l:'Патчи и защита',c:'#3bd6ff'},attack:{l:'Атаки',c:'#ff3b3b'},gov:{l:'Государства',c:'#ffd400'},company:{l:'Компании',c:'#c58bff'},ru:{l:'Россия',c:'#ff1493'},memes:{l:'Мемы',c:'#ff9d3b'},poc:{l:'PoC и мусор',c:'#a49db3'}};
const VST={fixed:{l:'исправлено',c:'lime'},partial:{l:'частично',c:'yellow'},mitigated:{l:'есть защита',c:'cyan'},workaround:{l:'обходные меры',c:'yellow'},pending:{l:'ждём патч',c:'red'},nopatch:{l:'нет патча',c:'red'},nodata:{l:'нет данных',c:'mute'}};
const HST={patched:{l:'PHP исправлен',c:'lime'},in_progress:{l:'обновляет',c:'cyan'},restricted:{l:'ограничения',c:'yellow'},silent:{l:'молчит',c:'mute'}};
const CH={};
const fmt=(d,o)=>new Intl.DateTimeFormat('ru-RU',Object.assign({timeZone:'Europe/Moscow'},o)).format(d);
const two=n=>String(n).padStart(2,'0');
function dur(ms){if(ms<0)return '—';const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;return (d?d+'д ':'')+two(h)+':'+two(m)+':'+two(x)}
function views(n){if(n>=1e6)return (n/1e6).toFixed(1).replace('.',',')+' млн';if(n>=1e3)return Math.round(n/1e3)+' тыс.';return String(n)}
function cmpVer(a,b){for(let i=0;i<3;i++){const d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
function sorter(k,d){return (a,b)=>{const x=a[k]??'',y=b[k]??'';return (x>y?1:x<y?-1:0)*d}}
if(window.Chart){Chart.defaults.color='#8b8d98';Chart.defaults.borderColor='#24262b';Chart.defaults.font.family="Inter,system-ui,sans-serif";Chart.defaults.font.size=13}
const RED='#f2555a',GREEN='#3ecf8e',GREY='#5c5f68',T0=Date.parse('2026-10-20T22:00:00+03:00');
const VAL={id:'val',afterDatasetsDraw(c,a,o){if(!o||!o.on)return;const x=c.ctx;x.save();x.font='600 '+(o.size||13)+'px Inter,system-ui,sans-serif';c.data.datasets.forEach((d,di)=>{c.getDatasetMeta(di).data.forEach((b,i)=>{const v=d.data[i];if(v==null)return;const t=(v).toLocaleString('ru-RU')+(o.suffix&&o.suffix[i]?o.suffix[i]:'');x.fillStyle=(o.colors&&o.colors[i])||'#c9cbd1';if(c.options.indexAxis==='y'){x.textAlign='left';x.textBaseline='middle';x.fillText(t,b.x+8,b.y)}else{x.textAlign='center';x.textBaseline='bottom';x.fillText(t,b.x,b.y-4)}})});x.restore()}};
window.dash=function(){return{
 now:Date.now(),loaded:false,err:'',lastFetch:0,
 S:null,H:null,feedItems:[],AG,events:[],vendors:[],reactions:[],hosting:[],tweets:[],metrics:null,
 CAT,VST,HST,cat:'all',sel:null,ver:'',tTopic:'all',
 vSort:{k:'name',d:1},vQ:'',vSt:'all',hSort:{k:'status',d:1},hQ:'',hSt:'all',rSort:{k:'time',d:1},rQ:'',
 checks:JSON.parse(localStorage.getItem('php2shell-checks')||'{}'),
 async init(){await this.load();setInterval(()=>{this.now=Date.now()},1000);setInterval(()=>this.load(),60000)},
 async load(){try{const t=Date.now();const r=await Promise.all(FILES.map(f=>fetch('data/'+f+'.json?t='+t,{cache:'no-store'}).then(x=>{if(!x.ok){if(OPTIONAL[f])return OPTIONAL[f];throw new Error(f+'.json: '+x.status)}return x.json()})));
   const [s,e,h,v,tw,m,fd]=r;this.feedItems=(fd.items||[]).slice().sort((a,b)=>a.time_msk<b.time_msk?1:-1);this.S=s;this.events=e.events.slice().sort((a,b)=>a.time<b.time?-1:1);this.hosting=h.items;this.H=h;this.vendors=v.vendors;this.reactions=v.reactions||[];this.tweets=tw.tweets.slice().sort((a,b)=>b.views-a.views);this.metrics=m;
   if(this.sel){this.sel=this.events.find(x=>x.id===this.sel.id)||null}
   this.lastFetch=Date.now();this.loaded=true;this.err='';this.$nextTick(()=>this.charts())}catch(e){this.err='Данные не обновились: '+e.message;console.warn(e)}},
 // header
 clockHM(){return fmt(this.now,{hour:'2-digit',minute:'2-digit'})},
 clock(){return fmt(this.now,{hour:'2-digit',minute:'2-digit',second:'2-digit'})},
 today(){return fmt(this.now,{day:'numeric',month:'long'})},
 ago(){if(!this.S)return '';const m=Math.max(0,Math.round((this.now-Date.parse(this.S.updated_at))/60000));return m<1?'только что':m<60?m+' мин назад':Math.floor(m/60)+' ч '+(m%60)+' мин назад'},
 updatedMSK(){return this.S?fmt(Date.parse(this.S.updated_at),{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' МСК':''},
 fetchedAgo(){if(!this.lastFetch)return '';const s=Math.round((this.now-this.lastFetch)/1000);return s+' с назад'},
 since(c){return dur(this.now-Date.parse(c.since))},
 sinceAt(c){return fmt(Date.parse(c.since),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' МСК'},
 tm(iso,full){if(!iso)return '—';return fmt(Date.parse(iso),full?{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}:{hour:'2-digit',minute:'2-digit'})},
 dm(iso){return iso?fmt(Date.parse(iso),{day:'2-digit',month:'2-digit'}):''},
 threatColor(){const l=this.S?.threat?.level;return l==='critical'||l==='high'?'red':l==='medium'?'yellow':'lime'},
 tone(t){return {red:'text-[#ff3b3b]',yellow:'text-[#ffd400]',lime:'text-acid',cyan:'text-[#3bd6ff]',mute:'text-mute'}[t]||'text-white'},
 chip(t){return {red:'bg-[#ff3b3b]/15 text-[#ff6b6b] border-[#ff3b3b]/50',yellow:'bg-[#ffd400]/15 text-[#ffd400] border-[#ffd400]/50',lime:'bg-acid/15 text-acid border-acid/50',cyan:'bg-[#3bd6ff]/15 text-[#3bd6ff] border-[#3bd6ff]/50',mute:'bg-white/5 text-mute border-line'}[t]},
 // hero
 toneCol(t){return {red:RED,lime:GREEN,green:GREEN}[t]||'#c9cbd1'},
 ruRows(){const rg=this.S?.hero?.regulators||[];return this.hosting.filter(x=>!rg.some(r=>x.name.includes(r)))},
 num(n){if(n.auto==='ru_patched'){const r=this.ruRows();return {v:String(r.filter(x=>x.status==='patched').length),u:'из '+r.length,l:n.label}}
   if(n.auto==='since_patch'){const ms=Math.max(0,this.now-Date.parse(this.S.patch.time));return {v:String(Math.floor(ms/36e5)),u:'ч '+Math.floor(ms%36e5/6e4)+' мин',l:n.label}}
   const p=String(n.value).split(' ');return {v:p[0],u:[p.slice(1).join(' '),n.unit].filter(Boolean).join(' '),l:n.label}},
 seg(){const T=x=>Date.parse(x+':00+03:00');return [[T0,0],[T('2026-10-21T06:00'),12],[T('2026-10-21T12:00'),30],[T('2026-10-21T16:00'),48],[this.t1(),100]]},
 nowX(){return this.pos(new Date(this.now).toISOString())},
 t1(){const m=(this.S?.hero?.milestones||[]).map(x=>(this.events.find(e=>e.id===x.id)||{}).time).filter(Boolean).map(Date.parse);return Math.max(this.now+20*6e4,(m.length?Math.max(...m):this.now)+40*6e4)},
 pos(iso){const t=Date.parse(iso),g=this.seg();if(t<=g[0][0])return 0;for(let i=1;i<g.length;i++){if(t<=g[i][0]){const[a,pa]=g[i-1],[b,pb]=g[i];return pa+(t-a)/(b-a)*(pb-pa)}}return 100},
 axisTicks(){const out=[],b=this.t1();const hs=[0,4,8,10,12,14,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];for(const k of hs){const t=T0+k*36e5;if(t>b-15*6e4)break;const h=fmt(t,{hour:'2-digit',minute:'2-digit'});out.push({x:this.pos(new Date(t).toISOString()),l:h==='00:00'?'21.10':h})}return out},
 miles(){return (this.S?.hero?.milestones||[]).map(m=>{const e=this.events.find(x=>x.id===m.id);if(!e)return null;const c=e.category==='attack'?RED:e.category==='defense'?GREEN:'#8b8d98';const d=this.dm(e.time);return Object.assign({},m,{x:this.pos(e.time),col:c,when:(d==='21.10'?'':d+' ')+this.tm(e.time),source_url:e.source_url,verified:e.verified})}).filter(Boolean)},
 stem(m){const k=Math.abs(m.lane);if(m.lane>0){const h=(k-1)*2.15+0.7;return `left:${m.x}%;top:calc(50% - ${h}em);height:${h}em`}const h=(k-1)*2.15+1.5;return `left:${m.x}%;top:50%;height:${h}em`},
 lab(m){const k=Math.abs(m.lane);const top=m.lane>0?`calc(50% - ${(k-1)*2.15+0.7+1.85}em)`:`calc(50% + ${(k-1)*2.15+1.5}em)`;const tr=m.anchor==='end'?'translateX(calc(-100% + 0.1em));text-align:right':'translateX(-0.1em)';return `left:${m.x}%;top:${top};transform:${tr}`},
 matrix(){const W=this.vendors.filter(x=>!x.name.startsWith('PHP'));const wg=s=>s==='fixed'?0:['partial','mitigated','workaround','pending'].includes(s)?1:s==='nopatch'?-1:2;const rg=s=>s==='patched'?0:['in_progress','restricted'].includes(s)?1:2;
   const mk=(title,rows,g)=>{const cols=[{l:'исправлено',col:GREEN,items:[]},{l:'обновляют или защищают',col:GREY,items:[]},{l:'молчат',col:RED,items:[]}];rows.forEach(r=>{const i=g(r.status);if(i>=0)cols[i].items.push(r)});return {title,cols,n:cols.reduce((a,c)=>a+c.items.length,0)}};
   return [mk('Мир: дистрибутивы, облака, хостинги, панели',W,wg),mk('Россия: хостинги и платформы',this.ruRows(),rg)]},
 mxTitle(){const m=this.matrix();return 'Патч поставили '+m[0].cols[0].items.length+' из '+m[0].n+' зарубежных компаний и '+m[1].cols[0].items.length+' из '+m[1].n+' российских'},
 xPeak(){const q=this.metrics?.x_hourly?.queries?.find(q=>q.id==='php2shell');if(!q)return null;return q.points.reduce((a,b)=>b.v>a.v?b:a)},
 xTitle(){const p=this.xPeak();if(!p)return 'Обсуждение в X';const ph=+fmt(Date.parse(this.S.patch.time),{hour:'2-digit'});return 'Пик: '+p.v.toLocaleString('ru-RU')+' постов за час в '+two(p.h)+'–'+two(p.h+1)+' МСК'+(p.h>=ph&&p.h<=ph+1?', вскоре после патча':'')},
 // version checker
 check(){const raw=(this.ver||'').trim();if(!raw)return null;const m=raw.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);if(!m)return {tone:'mute',title:'Не похоже на версию',text:'Введи версию в виде 8.3.12. Её показывает команда php -v или панель хостинга.'};
   const v=[+m[1],+m[2],m[3]===undefined?null:+m[3]];const br=v[0]+'.'+v[1];const fx=this.S?.fixed||{};const min=(this.S?.min_branch||'8.2').split('.').map(Number);
   if(cmpVer([v[0],v[1]],min)<0)return {tone:'red',title:'PHP '+raw+': патча нет',text:'Для 8.1 и старше официальных исправлений нет. Переезжай на 8.2+ и бери исправленную версию: '+Object.values(fx).join(' / ')+'.'};
   if(!fx[br])return {tone:'yellow',title:'Ветки '+br+' нет в бюллетене',text:'Сверь свою версию с новостью на php.net. Исправленные версии: '+Object.values(fx).join(' / ')+'.'};
   if(v[2]===null)return {tone:'yellow',title:'Нужна полная версия',text:'Для ветки '+br+' исправлена '+fx[br]+'. Введи все три числа, например '+br+'.10.'};
   const f=fx[br].split('.').map(Number);
   if(cmpVer(v,f)>=0)return {tone:'lime',title:'PHP '+raw+': исправлена',text:'Эта версия уже с патчем. Проверь, что на сервере стоит именно она: php -v или панель хостинга.'};
   return {tone:'red',title:'PHP '+raw+': уязвима',text:'Обнови до '+fx[br]+' или новее. На хостинге переключи версию в панели или напиши в поддержку с номерами CVE-2026-109618 и CVE-2026-109619.'}},
 // timeline
 cats(){const s=new Set(this.events.map(e=>e.category));return Object.keys(CAT).filter(k=>s.has(k))},
 cnt(c){return this.events.filter(e=>e.category===c).length},
 tl(){return this.cat==='all'?this.events:this.events.filter(e=>e.category===this.cat)},
 pick(e){this.sel=this.sel&&this.sel.id===e.id?null:e},
 // tables
 sortBy(o,k){if(o.k===k)o.d*=-1;else{o.k=k;o.d=1}},
 arrow(o,k){return o.k===k?(o.d>0?'▲':'▼'):''},
 q(x,s){s=(s||'').toLowerCase();return !s||JSON.stringify(x).toLowerCase().includes(s)},
 vRows(){return this.vendors.filter(x=>this.q(x,this.vQ)&&(this.vSt==='all'||x.status===this.vSt)).slice().sort(sorter(this.vSort.k,this.vSort.d))},
 vCnt(st){return this.vendors.filter(x=>x.status===st).length},
 hCnt(st){return this.hosting.filter(x=>x.status===st).length},
 hRows(){const ord={patched:0,in_progress:1,restricted:2,silent:3};return this.hosting.filter(x=>this.q(x,this.hQ)&&(this.hSt==='all'||x.status===this.hSt)).map(x=>Object.assign({},x,{_o:ord[x.status]??9})).sort(sorter(this.hSort.k==='status'?'_o':this.hSort.k,this.hSort.d))},
 rRows(){return this.reactions.filter(x=>this.q(x,this.rQ)).slice().sort(sorter(this.rSort.k,this.rSort.d))},
 // feed
 topics(){const s=new Set(this.tweets.map(t=>t.topic));return Object.keys(CAT).filter(k=>s.has(k))},
 feed(){return this.tTopic==='all'?this.tweets:this.tweets.filter(t=>t.topic===this.tTopic)},
 views,
 av(a){return AG[a]||{i:(a||'?').slice(0,2).toUpperCase(),c:'#a49db3'}},
 fresh(x){return this.now-Date.parse(x.time_msk)<15*60000},
 feedAgo(){if(!this.feedItems.length)return 'реплик пока нет';const m=Math.max(0,Math.round((this.now-Date.parse(this.feedItems[0].time_msk))/60000));return 'обновлено '+(m<1?'только что':m+' мин назад')},
 // checklist
 toggle(id){this.checks[id]=!this.checks[id];localStorage.setItem('php2shell-checks',JSON.stringify(this.checks))},
 done(){return (this.S?.checklist||[]).filter(c=>this.checks[c.id]).length},
 // charts
 charts(){if(!window.Chart)return;
   const mk=(id,cfg)=>{const el=document.getElementById(id);if(!el)return;if(CH[id]){CH[id].data=cfg.data;CH[id].update('none');return}CH[id]=new Chart(el,cfg)};
   // events per hour, stacked by category
   const ev=this.events;if(ev.length){const t0=Date.parse(ev[0].time),t1=Date.parse(ev[ev.length-1].time);const h0=Math.floor(t0/36e5),h1=Math.floor(t1/36e5);const hrs=[];for(let h=h0;h<=h1;h++)hrs.push(h);
     const ds=this.cats().map(c=>({label:CAT[c].l,backgroundColor:CAT[c].c,borderRadius:4,data:hrs.map(h=>ev.filter(e=>e.category===c&&Math.floor(Date.parse(e.time)/36e5)===h).length)}));
     mk('chHours',{type:'bar',data:{labels:hrs.map(h=>fmt(h*36e5,{hour:'2-digit'})+':00'),datasets:ds},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{precision:0}}},plugins:{legend:{position:'bottom',labels:{boxWidth:12}}}}})}
   const xh=this.metrics?.x_hourly;if(xh){const hrs=[];xh.queries.forEach(q=>q.points.forEach(p=>{if(!hrs.includes(p.h))hrs.push(p.h)}));hrs.sort((a,b)=>a-b);const col=['#ff1493','#b6ff3b','#3bd6ff'];
     mk('chX',{type:'bar',data:{labels:hrs.map(h=>two(h)+'–'+two(h+1)),datasets:xh.queries.map((q,i)=>({label:q.label,data:hrs.map(h=>{const p=q.points.find(p=>p.h===h);return p?p.v:null}),backgroundColor:col[i%3],borderRadius:4,yAxisID:q.id==='jp'?'y2':'y'}))},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{ticks:{callback:v=>views(v)},title:{display:true,text:'PHP2Shell, CVE'}},y2:{position:'right',grid:{display:false},ticks:{callback:v=>views(v)},title:{display:true,text:'японский запрос'}},x:{grid:{display:false}}},plugins:{legend:{position:'bottom',labels:{boxWidth:12}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.raw==null?'нет данных':c.raw.toLocaleString('ru-RU'))}}}}})}
   if(xh){const q=xh.queries.find(q=>q.id==='php2shell');if(q){const pk=this.xPeak();const cols=q.points.map(p=>p.h===pk.h?RED:GREY);
     mk('chXh',{type:'bar',plugins:[VAL],data:{labels:q.points.map(p=>two(p.h)+'–'+two(p.h+1)),datasets:[{data:q.points.map(p=>p.v),backgroundColor:cols,borderRadius:2,maxBarThickness:70}]},options:{responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{top:22}},scales:{x:{grid:{display:false},border:{display:false}},y:{display:false,beginAtZero:true}},plugins:{legend:{display:false},tooltip:{enabled:false},val:{on:true,colors:cols.map(c=>c===RED?RED:'#c9cbd1'),suffix:q.points.map(p=>p.h===pk.h?' · пик':'')}}}})}
     const jp=xh.queries.find(q=>q.id==='jp'),ru=this.metrics.x_ru;if(jp&&ru){mk('chJR',{type:'bar',plugins:[VAL],data:{labels:['Япония','Рунет'],datasets:[{data:[jp.total,ru.total],backgroundColor:['#c9cbd1',RED],borderRadius:2,barThickness:16}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{right:90}},scales:{x:{display:false,beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{color:'#e8e9ec',font:{size:14}}}},plugins:{legend:{display:false},tooltip:{enabled:false},val:{on:true,colors:['#c9cbd1',RED],suffix:[' постов',' постов за сутки']}}}})}}
   const top=this.tweets.slice(0,10);
   mk('chViews',{type:'bar',data:{labels:top.map(t=>'@'+t.user),datasets:[{label:'просмотры',data:top.map(t=>t.views),backgroundColor:top.map(t=>(CAT[t.topic]||{}).c||'#ff1493'),borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:false,scales:{x:{type:'logarithmic',ticks:{callback:v=>views(v)}},y:{grid:{display:false}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>views(c.raw)+' просмотров'}}}}});
   const ps=this.metrics?.php_share||[];
   ps.forEach((p,i)=>mk('chShare'+i,{type:'doughnut',data:{labels:['PHP','другие'],datasets:[{data:[p.value,100-p.value],backgroundColor:[i?'#ff1493':'#b6ff3b','#2a2635'],borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}}));
   (this.metrics?.series||[]).forEach(s=>mk('chS_'+s.id,{type:'line',data:{labels:s.points.map(p=>this.tm(p.t,true)),datasets:[{label:s.label,data:s.points.map(p=>p.v),borderColor:'#ff1493',backgroundColor:'rgba(255,20,147,.25)',fill:true,pointRadius:6,pointBackgroundColor:'#b6ff3b',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>views(v)}}}}}));
 },
 last(s){return s.points[s.points.length-1]},
}};
})();
