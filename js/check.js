// check.js — Circuit-wide validation report ("Шалгах" button): finds unwired parts,
// incomplete coils/motors, missing ground, overloaded terminals, and active shorts

  function compLabel(c){
    const names = {
      power: 'Тэжээлийн эх',
      button: c.color === '#EF4444' ? 'Улаан товч' : 'Ногоон товч',
      contactor: 'Контактор',
      motor: 'Мотор',
      lamp: 'Индикатор гэрэл',
      breaker: 'Автомат таслуур',
      relay: 'Термик реле',
      estop: 'Аварийн зогсоолт',
      timer: 'Цагийн реле',
      psu24: '24В удирдлагын эх'
    };
    return names[c.type] || c.type;
  }

  function termHasWire(compId, termId){
    return wires.some(w => (w.a.comp===compId && w.a.term===termId) || (w.b.comp===compId && w.b.term===termId));
  }

  function checkCircuit(){
    const issues = [];

    comps.forEach(c=>{
      if(c.type==='power' || c.type==='psu24') return;
      const defs = TERMINAL_DEFS[c.type];
      const anyWired = defs.some(t => termHasWire(c.id, t.id));
      if(!anyWired){
        issues.push({level:'warn', text:`${compLabel(c)} ямар ч утсаар холбогдоогүй байна`});
      }
    });

    comps.filter(c=>c.type==='contactor').forEach(c=>{
      const a1 = termHasWire(c.id,'A1'), a2 = termHasWire(c.id,'A2');
      if(a1 !== a2){
        issues.push({level:'warn', text:`${compLabel(c)}: ороомгийн (A1/A2) зөвхөн нэг тал холбогдсон байна`});
      }
    });

    comps.filter(c=>c.type==='motor').forEach(c=>{
      const count = ['U1','V1','W1'].filter(t=>termHasWire(c.id,t)).length;
      if(count>0 && count<3){
        issues.push({level:'warn', text:`${compLabel(c)}: зөвхөн ${count}/3 фаз холбогдсон байна`});
      }
      if(count===3){
        const starPairs = [['W2','U2'],['U2','V2'],['W2','V2']];
        const deltaPairs = [['U1','W2'],['V1','U2'],['W1','V2']];
        const hasJumper = [...starPairs, ...deltaPairs].some(([a,b]) => wires.some(w =>
          (w.a.comp===c.id && w.a.term===a && w.b.comp===c.id && w.b.term===b) ||
          (w.a.comp===c.id && w.a.term===b && w.b.comp===c.id && w.b.term===a)
        ));
        if(!hasJumper){
          issues.push({level:'warn', text:`${compLabel(c)}: Од (Y) эсвэл Гурвалжин (Δ) гүүр холбогдоогүй байна`});
        }
      }
    });

    const power = comps.find(c=>c.type==='power');
    if(power && !termHasWire(power.id,'PE')){
      issues.push({level:'warn', text:'Тэжээлийн газардуулга (PE) хаана ч холбогдоогүй байна'});
    }

    const termCounts = {};
    wires.forEach(w=>{
      const kA = `${w.a.comp}:${w.a.term}`, kB = `${w.b.comp}:${w.b.term}`;
      termCounts[kA] = (termCounts[kA]||0)+1;
      termCounts[kB] = (termCounts[kB]||0)+1;
    });
    Object.entries(termCounts).forEach(([key,count])=>{
      const [compId, termId] = key.split(':');
      const c = comps.find(x=>x.id===compId);
      if(!c || c.type==='power' || c.type==='psu24') return;
      if(count>3){
        issues.push({level:'warn', text:`${compLabel(c)}:${termId} дээр ${count} утас холбогдсон — илүү байж болзошгүй, шалгаарай`});
      }
    });

    const sim = simulate();
    const hasShort = wires.some(w=>{
      const nA = `${w.a.comp}:${w.a.term}`, nB = `${w.b.comp}:${w.b.term}`;
      return (sim.live.has(nA) && sim.neutral.has(nA)) || (sim.live.has(nB) && sim.neutral.has(nB));
    });
    if(hasShort){
      issues.push({level:'error', text:'Одоогийн байдлаар богино холболт илэрлээ! Улаанаар анивчиж буй утсыг олж засаарай'});
    }

    if(issues.length===0){
      issues.push({level:'ok', text:'Схем зөв бөгөөд бүрэн харагдаж байна ✓'});
    }
    return issues;
  }

  function showReport(){
    const issues = checkCircuit();
    const icons = {warn:'⚠️', error:'⛔', ok:'✅'};
    const body = document.getElementById('csimReportBody');
    body.innerHTML = issues.map(i =>
      `<div class="csim-report-item ${i.level}"><span class="csim-report-icon">${icons[i.level]}</span><span class="csim-report-text">${i.text}</span></div>`
    ).join('');
    document.getElementById('csimReportOverlay').classList.add('open');
  }

  function hideReport(){
    document.getElementById('csimReportOverlay').classList.remove('open');
  }

  document.getElementById('csimCheck').onclick = showReport;
  document.getElementById('csimReportClose').onclick = hideReport;
  document.getElementById('csimReportOverlay').addEventListener('click', e=>{
    if(e.target.id === 'csimReportOverlay') hideReport();
  });
