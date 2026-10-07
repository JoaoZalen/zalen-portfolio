/* Telas independentes com navegação pelo histórico do navegador. */
const catalogo = { modo:'cards', visiveis:[] };
const normalizarBusca = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function montarCatalogo() {
  const select = document.getElementById('editionCollection');
  estado.clientes.forEach(c => select.add(new Option(c.nome,c.id)));
  document.getElementById('editionSearch').addEventListener('input',renderCatalogo);
  select.addEventListener('change',renderCatalogo);
  document.getElementById('editionSort').addEventListener('change',renderCatalogo);
  for(const [id,modo] of [['tableMode','tabela'],['cardMode','cards']]) document.getElementById(id).addEventListener('click',()=>{catalogo.modo=modo;renderCatalogo();});
  document.getElementById('clearCatalog').addEventListener('click',()=>{document.getElementById('editionSearch').value='';select.value='todos';renderCatalogo();});
  document.getElementById('randomEdition').addEventListener('click',()=>{const a=catalogo.visiveis;if(a.length)abrirPlayer(a[Math.floor(Math.random()*a.length)]);});
  document.getElementById('catalogResults').addEventListener('click',event=>{const b=event.target.closest('[data-preview]');if(b)abrirPlayer(Number(b.dataset.preview));});
  document.getElementById('collectionCards').innerHTML=estado.clientes.map(c=>`<button class="collection-card" data-collection="${esc(c.id)}"><span>${esc(c.nome)}</span><strong>${c.edicoes.length}</strong><small>Explorar coleção ↗</small></button>`).join('');
  document.getElementById('collectionCards').addEventListener('click',event=>{const b=event.target.closest('[data-collection]');if(b)selecionarColecao(b.dataset.collection);});
  const colecoes=[{id:'todos',nome:'Todos'},...estado.clientes];
  document.getElementById('catalogChips').innerHTML=colecoes.map(c=>`<button data-chip="${esc(c.id)}" aria-pressed="${c.id==='todos'}">${esc(c.nome)}</button>`).join('');
  document.getElementById('catalogChips').addEventListener('click',e=>{const b=e.target.closest('[data-chip]');if(b){select.value=b.dataset.chip;renderCatalogo();}});
  document.getElementById('catalogSidebarCollections').innerHTML=estado.clientes.map(c=>`<button data-side-collection="${esc(c.id)}">${esc(c.nome)} <small>${c.edicoes.length}</small></button>`).join('');
  document.getElementById('catalogSidebarCollections').addEventListener('click',e=>{const b=e.target.closest('[data-side-collection]');if(b)selecionarColecao(b.dataset.sideCollection);});
  renderCatalogo();
}
function renderCatalogo() {
  const query=normalizarBusca(document.getElementById('editionSearch').value.trim());
  const collection=document.getElementById('editionCollection').value;
  const sort=document.getElementById('editionSort').value;
  const list=estado.edicoes.map((ed,i)=>({ed,i})).filter(({ed})=>(collection==='todos'||ed.cliente.id===collection)&&normalizarBusca([ed.titulo,ed.tipo,ed.cliente.nome,...(ed.tags||[])].join(' ')).includes(query));
  if(sort!=='original')list.sort((a,b)=>a.ed.titulo.localeCompare(b.ed.titulo,'pt-BR')*(sort==='az'?1:-1));
  catalogo.visiveis=list.map(x=>x.i);
  document.querySelectorAll("[data-chip]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.chip===collection));
  document.getElementById('catalogCount').textContent=`${list.length} de ${estado.edicoes.length} edições`;
  document.getElementById('catalogEmpty').hidden=!!list.length;
  document.getElementById('randomEdition').disabled=!list.length;
  document.getElementById('tableMode').setAttribute('aria-pressed',catalogo.modo==='tabela');
  document.getElementById('cardMode').setAttribute('aria-pressed',catalogo.modo==='cards');
  const picture=ed=>`<img src="${esc(ed.capa)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  const label=ed=>esc('Prévia de '+ed.titulo);
  const result=document.getElementById('catalogResults');
  if(!list.length){result.innerHTML='';return;}
  if(catalogo.modo==='tabela')result.innerHTML=`<div class="edition-table-wrap"><table class="edition-table"><caption class="sr-only">Edições do portfólio com miniaturas e acesso à prévia</caption><thead><tr><th scope="col">Preview</th><th scope="col">Edição</th><th scope="col">Coleção</th><th scope="col">Formato</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead><tbody>${list.map(({ed,i})=>`<tr><td><button class="thumb-button" data-preview="${i}" aria-label="${label(ed)}">${picture(ed)}<span aria-hidden="true">▶</span></button></td><td><button class="title-button" data-preview="${i}">${esc(ed.titulo)}</button></td><td>${esc(ed.cliente.nome)}</td><td><span class="format-pill">${esc(ed.tipo||'Edição')}</span></td><td><button class="preview-button" data-preview="${i}" aria-label="${label(ed)}">Assistir ↗</button></td></tr>`).join('')}</tbody></table></div>`;
  else result.innerHTML=`<div class="edition-cards">${list.map(({ed,i})=>`<button class="edition-card" data-preview="${i}" aria-label="${label(ed)}"><div class="card-cover">${picture(ed)}<span aria-hidden="true">▶</span></div><div class="card-copy"><small>${esc(ed.cliente.nome)} · ${esc(ed.tipo||'Edição')}</small><h2>${esc(ed.titulo)}</h2><span>Assistir ↗</span></div></button>`).join('')}</div>`;
}
function selecionarColecao(id){document.getElementById('editionCollection').value=id;document.getElementById('editionSearch').value='';renderCatalogo();location.hash='catalogo';}
function inicializarTelas(){
  const homeIds=['topo','trabalhos','clientes','contato'];
  let estavaCatalogo=null;
  function mostrar(){
    const catalogoAberto=location.hash==='#catalogo';
    homeIds.forEach(id=>document.getElementById(id).hidden=catalogoAberto);
    document.getElementById('catalogo').hidden=!catalogoAberto;
    document.body.classList.toggle('is-catalog',catalogoAberto);
    document.querySelector('.home-shortcut').hidden=catalogoAberto;
    document.querySelectorAll('.nav-links a').forEach(a=>{const active=a.hash===(location.hash||'#topo');a.classList.toggle('is-active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=`${catalogoAberto?'Catálogo · ':''}${estado.perfil.nome||'Zalen'} · Editor de vídeo`;
    if(catalogoAberto){window.scrollTo({top:0,behavior:'instant'});document.getElementById('heroVideo').pause();}
    else {
      requestAnimationFrame(()=>{
        calcularOrigem();renderLetreiro();
        const id=homeIds.includes(location.hash.slice(1))?location.hash.slice(1):'topo';
        if(estavaCatalogo || location.hash)document.getElementById(id).scrollIntoView({behavior:'instant'});
      });
    }
    estavaCatalogo=catalogoAberto;
  }
  window.addEventListener('hashchange',mostrar);mostrar();
}
