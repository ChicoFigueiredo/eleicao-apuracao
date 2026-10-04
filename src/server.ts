import type { Monitor } from "./monitor";

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

const page = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monitor Eleitoral 2026</title><style>
:root{font-family:system-ui,sans-serif;color:#e9eef6;background:#0d1624}body{margin:0;max-width:1200px;padding:24px;margin:auto}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2d3d53;padding-bottom:16px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}button,input,select{font:inherit;padding:8px;border-radius:6px;border:1px solid #40516a;background:#142238;color:inherit}button{cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.card{background:#142238;padding:16px;border-radius:10px}.muted{color:#a9b9cd}.votes{font-size:1.4rem;font-weight:700}.bar{height:8px;background:#29394e;border-radius:6px;overflow:hidden}.bar i{display:block;height:100%;background:#3aa675}form{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}</style></head>
<body><header><div><h1>Monitor Eleitoral 2026</h1><span class="muted">Dados oficiais do TSE · leituras verificadas</span></div><span id="when" class="muted"></span></header>
<nav class="tabs"><button data-office="presidente" data-uf="BR">Presidência</button><button data-office="senador" data-uf="DF">Senado</button><button data-office="deputado_federal" data-uf="DF">Câmara</button><button data-office="deputado_distrital" data-uf="DF">DF</button><button data-composition="senado">Senado: antes e depois</button><button data-composition="camara">Câmara: antes e depois</button></nav>
<form id="watch"><input name="uf" value="DF" maxlength="2" aria-label="UF"><select name="office"><option value="senador">Senado</option><option value="deputado_federal">Deputado federal</option><option value="deputado_distrital">Deputado distrital</option></select><input name="tseId" placeholder="ID oficial TSE" required><input name="name" placeholder="Nome oficial" required><input name="number" placeholder="Número" required><button>Incluir candidatura</button></form>
<main id="content" class="grid"><p class="muted">Selecione uma visão após a primeira coleta.</p></main>
<script>
let current={office:'presidente',uf:'BR'},tab=0,pausedUntil=0;const content=document.querySelector('#content');const buttons=[...document.querySelectorAll('[data-office]')];const esc=value=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function load(){const q=new URLSearchParams({electionCode:'6257',turn:'1',...current});const r=await fetch('/api/panorama?'+q);if(!r.ok){content.innerHTML='<p class="muted">Ainda não há leitura para esta visão.</p>';return}const p=await r.json();document.querySelector('#when').textContent=(p.stale?'DADO ENVELHECIDO: '+esc(p.sourceError)+' · ':'')+'coleta '+new Date(p.collectedAt).toLocaleString('pt-BR');content.innerHTML=p.candidates.map(c=>'<article class="card"><h2>'+esc(c.name)+' · '+esc(c.party)+'</h2><p class="votes">'+c.percentage.toFixed(2)+'%</p><div class="bar"><i style="width:'+c.percentage+'%"></i></div><p>'+c.votes.toLocaleString('pt-BR')+' votos válidos · '+esc(c.status.replace('_',' '))+'</p></article>').join('')}
document.querySelectorAll('[data-office]').forEach(b=>b.onclick=()=>{current={office:b.dataset.office,uf:b.dataset.uf};pausedUntil=Date.now()+60000;load()});
document.querySelectorAll('[data-composition]').forEach(b=>b.onclick=async()=>{const r=await fetch('/api/composicao?chamber='+b.dataset.composition);const c=await r.json();content.innerHTML=['before','after'].map(m=>'<article class="card"><h2>'+({before:'Antes',after:'Depois'})[m]+'</h2>'+c[m].map(x=>'<p>'+x.spectrum.replace('_',' ')+' <strong>'+x.seats+' cadeiras</strong></p>').join('')+'</article>').join('')});
document.querySelector('#watch').onsubmit=async e=>{e.preventDefault();pausedUntil=Date.now()+60000;const body=Object.fromEntries(new FormData(e.target));const r=await fetch('/api/monitorados',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok)alert('Não foi possível incluir a candidatura.');else e.target.reset()};load();setInterval(load,120000);setInterval(()=>{if(Date.now()<pausedUntil)return;tab=(tab+1)%buttons.length;buttons[tab].click()},20000);
</script></body></html>`;

export const serveMonitor = (monitor: Monitor, port = Number(process.env.PORT ?? 7786)) => Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (request.method === "GET" && url.pathname === "/api/panorama") {
      const electionCode = url.searchParams.get("electionCode");
      const turn = Number(url.searchParams.get("turn"));
      const office = url.searchParams.get("office");
      const uf = url.searchParams.get("uf");
      if (!electionCode || !turn || !office || !uf) return json({ error: "Parâmetros electionCode, turn, office e uf são obrigatórios." }, 400);
      const panorama = monitor.latestPanorama(electionCode, turn, office, uf);
      return panorama ? json(panorama) : json({ error: "Nenhuma leitura encontrada." }, 404);
    }
    if (request.method === "GET" && url.pathname === "/api/monitorados") return json(monitor.monitoredCandidacies());
    if (request.method === "GET" && url.pathname === "/api/composicao") {
      const chamber = url.searchParams.get("chamber");
      if (chamber !== "senado" && chamber !== "camara") return json({ error: "chamber deve ser senado ou camara." }, 400);
      return json(monitor.beforeAfter(chamber));
    }
    if (request.method === "POST" && url.pathname === "/api/monitorados") {
      return request.json().then((body: Record<string, unknown>) => {
        if (![body.tseId, body.uf, body.office, body.name, body.number].every((value) => typeof value === "string" && value.trim())) {
          return json({ error: "UF, cargo, ID TSE, nome e número são obrigatórios." }, 400);
        }
        monitor.includeCandidacy({ tseId: body.tseId as string, uf: (body.uf as string).toUpperCase(), office: body.office as string, name: body.name as string, number: body.number as string });
        return json({ ok: true }, 201);
      }).catch(() => json({ error: "JSON inválido." }, 400));
    }
    return json({ error: "Não encontrado." }, 404);
  }
});
