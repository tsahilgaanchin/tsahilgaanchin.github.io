// events.js — Pointer interaction: tap-to-wire, long-press move/delete, pinch-zoom, toolbar bindings

  function startDrag(compId, e){
    const pt = toWorld(e.clientX, e.clientY);
    const comp = comps.find(c=>c.id===compId);
    dragging = {id:compId, dx:pt.x-comp.x, dy:pt.y-comp.y, startX:comp.x, startY:comp.y, startClientX:e.clientX, startClientY:e.clientY};
  }

  function startPan(e){ panDrag = {sx:e.clientX, sy:e.clientY, ox:panX, oy:panY}; }

  function handleTerminalTap(compId, termId){
    if(!pendingTerm){ pendingTerm = {comp:compId, term:termId}; render(); return; }
    if(pendingTerm.comp===compId && pendingTerm.term===termId){ pendingTerm=null; render(); return; }
    addWire(pendingTerm, {comp:compId, term:termId});
    pendingTerm = null;
    render();
  }

  function clearLongPress(){
    clearTimeout(longPressTimer); longPressTimer=null; pendingCompStart=null;
  }

  function pinchDist(){
    const pts=[...activePointers.values()];
    return Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
  }

  function pinchMid(){
    const pts=[...activePointers.values()];
    return {x:(pts[0].x+pts[1].x)/2, y:(pts[0].y+pts[1].y)/2};
  }

  svg.addEventListener('pointerdown', e=>{
    try{ svg.setPointerCapture(e.pointerId); }catch(err){}
    activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(activePointers.size===2){
      dragging=null; panDrag=null; clearLongPress();
      const dist = pinchDist(), mid = pinchMid();
      const svgMid = toSvgSpace(mid.x, mid.y);
      pinch = { startDist:dist, startZoom:zoom, worldMid:{x:(svgMid.x-panX)/zoom, y:(svgMid.y-panY)/zoom} };
      return;
    }
    if(activePointers.size>2) return;

    const breakerEl = e.target.closest('[data-breakertoggle]');
    if(breakerEl){
      e.stopPropagation();
      const c = comps.find(x=>x.id===breakerEl.getAttribute('data-breakertoggle'));
      if(c){ c.on = !(c.on !== false); render(); }
      return;
    }
    const relayEl = e.target.closest('[data-relaytrip]');
    if(relayEl){
      e.stopPropagation();
      const c = comps.find(x=>x.id===relayEl.getAttribute('data-relaytrip'));
      if(c){ c.tripped = !c.tripped; render(); }
      return;
    }
    const estopEl = e.target.closest('[data-estoptrip]');
    if(estopEl){
      e.stopPropagation();
      const c = comps.find(x=>x.id===estopEl.getAttribute('data-estoptrip'));
      if(c){ c.tripped = !c.tripped; render(); }
      return;
    }
    const badgeEl = e.target.closest('[data-delete]');
    if(badgeEl){
      e.stopPropagation();
      const id = badgeEl.getAttribute('data-delete');
      wires = wires.filter(w=>w.a.comp!==id && w.b.comp!==id);
      comps = comps.filter(c=>c.id!==id);
      deleteBadge = null;
      render();
      return;
    }
    const wireBadgeEl = e.target.closest('[data-deletewire]');
    if(wireBadgeEl){
      e.stopPropagation();
      const wid = wireBadgeEl.getAttribute('data-deletewire');
      wires = wires.filter(w=>w.id!==wid);
      selectedWire = null;
      render();
      return;
    }
    const wireEl = e.target.closest('[data-wire]');
    if(wireEl){
      e.stopPropagation();
      const wid = wireEl.getAttribute('data-wire');
      pendingTerm = null;
      deleteBadge = null;
      selectedWire = (selectedWire === wid) ? null : wid;
      render();
      return;
    }
    const capEl = e.target.closest('[data-btncap]');
    if(capEl && running){
      e.stopPropagation();
      pressed[capEl.getAttribute('data-btncap')] = true;
      render();
      return;
    }
    const termEl = e.target.closest('[data-term]');
    if(termEl && !locked){
      e.stopPropagation();
      deleteBadge = null;
      selectedWire = null;
      const compId = termEl.getAttribute('data-comp'), termId = termEl.getAttribute('data-term');
      handleTerminalTap(compId, termId);
      return;
    }
    const compEl = e.target.closest('[data-comp]');
    if(compEl){
      if(locked) return;
      pendingTerm = null;
      deleteBadge = null;
      selectedWire = null;
      const compId = compEl.getAttribute('data-comp');
      pendingCompStart = {compId, x:e.clientX, y:e.clientY};
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(()=>{
        if(!pendingCompStart) return;
        startDrag(compId, e);
        deleteBadge = {comp:compId};
        pendingCompStart = null;
        render();
      }, 420);
      return;
    }
    if(pendingTerm) showToast('Холболт цуцлагдлаа — терминал дээр яг тааруулж товшино уу');
    pendingTerm = null;
    deleteBadge = null;
    selectedWire = null;
    startPan(e);
    render();
  });

  window.addEventListener('pointermove', e=>{
    if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(activePointers.size===2 && pinch){
      const dist = pinchDist();
      const scale = dist / pinch.startDist;
      zoom = Math.min(3, Math.max(0.4, pinch.startZoom*scale));
      const mid = pinchMid();
      const svgMid = toSvgSpace(mid.x, mid.y);
      panX = svgMid.x - pinch.worldMid.x*zoom;
      panY = svgMid.y - pinch.worldMid.y*zoom;
      render();
      return;
    }
    if(pendingCompStart){
      const dx = e.clientX-pendingCompStart.x, dy = e.clientY-pendingCompStart.y;
      if(Math.hypot(dx,dy) > 24) clearLongPress();
    }
    if(dragging){
      const pt = toWorld(e.clientX, e.clientY);
      const comp = comps.find(c=>c.id===dragging.id);
      if(comp){ comp.x = pt.x-dragging.dx; comp.y = pt.y-dragging.dy; render(); }
    } else if(panDrag){
      panX = panDrag.ox + (e.clientX-panDrag.sx);
      panY = panDrag.oy + (e.clientY-panDrag.sy);
      render();
    }
  });

  window.addEventListener('pointerup', e=>{
    activePointers.delete(e.pointerId);
    if(activePointers.size<2) pinch=null;
    clearLongPress();
    if(dragging){
      const moved = Math.hypot(e.clientX-dragging.startClientX, e.clientY-dragging.startClientY) > 18;
      if(moved){ deleteBadge=null; render(); }
      dragging = null;
    }
    panDrag = null;
    if(running){
      let any=false;
      Object.keys(pressed).forEach(k=>{ if(pressed[k]){ pressed[k]=false; any=true; } });
      if(any) render();
    }
  });

  window.addEventListener('pointercancel', e=>{
    activePointers.delete(e.pointerId);
    if(activePointers.size<2) pinch=null;
    clearLongPress();
    dragging=null; panDrag=null;
  });

  document.getElementById('csimUndo').onclick = undo;

  document.getElementById('csimRedo').onclick = redo;

  document.getElementById('csimParts').onclick = (e)=>{ e.stopPropagation(); document.getElementById('csimPartsMenu').classList.toggle('open'); };

  document.querySelectorAll('#csimPartsMenu [data-add]').forEach(btn=>{
    btn.onclick = ()=>{
      addComp(btn.getAttribute('data-add'), btn.getAttribute('data-color'));
      document.getElementById('csimPartsMenu').classList.remove('open');
    };
  });

  root.addEventListener('click', (e)=>{
    if(!e.target.closest('.csim-wrap-rel')){
      document.getElementById('csimPartsMenu').classList.remove('open');
      document.getElementById('csimTemplatesMenu').classList.remove('open');
    }
  });

  document.getElementById('csimSave').onclick = saveCircuit;

  document.getElementById('csimZoomIn').onclick = ()=>{ zoom=Math.min(zoom*1.2,3); render(); };

  document.getElementById('csimZoomOut').onclick = ()=>{ zoom=Math.max(zoom/1.2,0.4); render(); };

  document.getElementById('csimFit').onclick = ()=>{ zoom=1; panX=0; panY=0; render(); };

  document.getElementById('csimLock').onclick = ()=>{ locked=!locked; render(); };

  document.getElementById('csimClear').onclick = ()=>{ defaultScene(); render(); };
