// storage.js — Persistence (save/load): uses window.storage inside Claude.ai artifacts,
// falls back to localStorage on standalone deployments (phone, ngrok, real hosting)

  function showToast(msg){
    const t = document.getElementById('csimToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(()=>t.classList.remove('show'), 1500);
  }

  function hasClaudeStorage(){
    return typeof window.storage !== 'undefined' && window.storage && typeof window.storage.set === 'function';
  }

  async function saveCircuit(){
    const data = JSON.stringify({comps, wires, compCounter, wireCounter});
    try{
      if(hasClaudeStorage()){
        await window.storage.set('circuit', data, false);
      } else {
        localStorage.setItem('circuit-sim-data', data);
      }
      showToast('Хадгалагдлаа ✓');
    }catch(err){
      try{
        localStorage.setItem('circuit-sim-data', data);
        showToast('Хадгалагдлаа ✓');
      }catch(err2){
        showToast('Алдаа: хадгалж чадсангүй');
      }
    }
  }

  function applyLoadedData(data){
    comps = data.comps || [];
    wires = data.wires || [];
    compCounter = data.compCounter || comps.length+1;
    wireCounter = data.wireCounter || wires.length+1;
    if(comps.length===0) defaultScene();
  }

  async function loadCircuit(){
    try{
      if(hasClaudeStorage()){
        const res = await window.storage.get('circuit', false);
        if(res && res.value){ applyLoadedData(JSON.parse(res.value)); render(); return; }
      } else {
        const raw = localStorage.getItem('circuit-sim-data');
        if(raw){ applyLoadedData(JSON.parse(raw)); render(); return; }
      }
    }catch(err){ /* fall through to default scene below */ }
    defaultScene();
    render();
  }

