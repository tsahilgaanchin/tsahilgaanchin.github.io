// state.js — App state, data model (TERMINAL_DEFS), scene setup, component/wire CRUD, undo/redo, short-circuit rule

  const TERMINAL_DEFS = {
    power:  [ {id:'L1',x:20,y:20},{id:'L2',x:75,y:20},{id:'L3',x:130,y:20},{id:'N',x:185,y:20},{id:'PE',x:240,y:20} ],
    button: [ {id:'11',x:20,y:55},{id:'12',x:65,y:55},{id:'23',x:20,y:120},{id:'24',x:65,y:120} ],
    contactor: [ {id:'A1',x:20,y:15},{id:'A2',x:150,y:15},{id:'13NO',x:205,y:15},
                 {id:'L1',x:25,y:80},{id:'L2',x:95,y:80},{id:'L3',x:165,y:80},
                 {id:'T1',x:25,y:195},{id:'T2',x:95,y:195},{id:'T3',x:165,y:195},{id:'14NO',x:205,y:195} ],
    motor:  [ {id:'U1',x:30,y:25},{id:'V1',x:70,y:25},{id:'W1',x:110,y:25},
              {id:'W2',x:30,y:65},{id:'U2',x:70,y:65},{id:'V2',x:110,y:65},
              {id:'PE',x:150,y:45} ],
    lamp:   [ {id:'A',x:20,y:10},{id:'B',x:20,y:70} ],
    breaker: [ {id:'L1',x:20,y:15},{id:'L2',x:70,y:15},{id:'L3',x:120,y:15},
               {id:'T1',x:20,y:150},{id:'T2',x:70,y:150},{id:'T3',x:120,y:150} ],
    relay:  [ {id:'L1',x:20,y:15},{id:'L2',x:70,y:15},{id:'L3',x:120,y:15},
              {id:'T1',x:20,y:170},{id:'T2',x:70,y:170},{id:'T3',x:120,y:170},
              {id:'95',x:165,y:75},{id:'96',x:165,y:130} ],
    estop:  [ {id:'11',x:22,y:75},{id:'12',x:68,y:75} ],
    timer:  [ {id:'A1',x:20,y:15},{id:'A2',x:130,y:15},
              {id:'15',x:20,y:110},{id:'16',x:75,y:110},{id:'18',x:130,y:110} ],
    psu24:  [ {id:'+24V',x:20,y:55},{id:'0V',x:70,y:55} ]
  };

  let comps = [], wires = [], compCounter=1, wireCounter=1;

  let pendingTerm=null, locked=false;

  const running = true;

  let pressed={}, energized={};

  let history=[], redoStack=[];

  let zoom=1, panX=0, panY=0;

  let dragging=null, panDrag=null;

  let simLive=new Set(), simNeutral=new Set();
  let simPhase={L1:new Set(), L2:new Set(), L3:new Set()};

  let longPressTimer=null, pendingCompStart=null, deleteBadge=null;
  let selectedWire=null;

  let rejectedFlash=null;
  let timerCoilOn={}, timerDone={}, timerHandles={};

  let activePointers=new Map(), pinch=null;

  function defaultScene(){
    comps = [
      {id:'power1', type:'power', x:60, y:30},
      {id:'btnStop', type:'button', x:560, y:120, color:'#EF4444'},
      {id:'btnStart', type:'button', x:560, y:330, color:'#22C55E'},
      {id:'contactor1', type:'contactor', x:230, y:330},
      {id:'motor1', type:'motor', x:170, y:760},
    ];
    wires = []; compCounter=1; wireCounter=1; history=[]; redoStack=[]; pressed={}; energized={};
    Object.values(timerHandles).forEach(h=>clearTimeout(h));
    timerCoilOn={}; timerDone={}; timerHandles={};
  }

  function nextPos(idx){
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {x: 20 + col*250, y: 1080 + row*220};
  }

  function addComp(type, color){
    const idx = compCounter - 1;
    const id = 'c'+(compCounter++);
    const pos = nextPos(idx);
    const comp = {id, type, x:pos.x, y:pos.y};
    if(color) comp.color = color;
    if(type==='breaker') comp.on = true;
    if(type==='relay') comp.tripped = false;
    if(type==='estop') comp.tripped = false;
    if(type==='timer') comp.delaySec = 3;
    comps.push(comp);
    pushHistory({type:'addComp', id});
    panToComp(comp);
    render();
  }

  function terminalCategory(type, id){
    if(id === 'PE') return 'ground';
    if(type==='power'){
      if(id==='N') return 'neutral';
      return 'phase';
    }
    if(type==='button') return 'control';
    if(type==='contactor'){
      if(id==='A1'||id==='A2'||id==='13NO'||id==='14NO') return 'control';
      return 'phase';
    }
    if(type==='motor') return 'phase';
    if(type==='lamp') return id==='A' ? 'control' : 'neutral';
    if(type==='breaker') return 'phase';
    if(type==='relay') return (id==='95'||id==='96') ? 'control' : 'phase';
    if(type==='estop') return 'control';
    if(type==='timer') return 'control';
    if(type==='psu24') return 'control';
    return 'other';
  }

  function isBadConnection(a, b){
    const ca = comps.find(c=>c.id===a.comp), cb = comps.find(c=>c.id===b.comp);
    if(!ca || !cb) return null;
    if(ca.type==='power' && cb.type==='power'){
      const sourceIds = ['L1','L2','L3','N'];
      if(sourceIds.includes(a.term) && sourceIds.includes(b.term) && a.term!==b.term){
        return 'Тэжээлийн 2 өөр фазыг шууд холбож болохгүй (богино холболт)';
      }
    }
    const catA = terminalCategory(ca.type, a.term), catB = terminalCategory(cb.type, b.term);
    if(catA==='ground' || catB==='ground'){
      if(catA!==catB) return 'Газардуулга (PE) зөвхөн өөр PE-тэй холбогдоно';
    } else if((catA==='phase'&&catB==='neutral') || (catA==='neutral'&&catB==='phase')){
      return 'Тэжээл ба нейтралыг шууд холбож болохгүй (богино холболт үүснэ)';
    }
    return null;
  }

  function addWire(a,b){
    if(a.comp===b.comp && a.term===b.term) return;
    const exists = wires.some(w => (w.a.comp===a.comp&&w.a.term===a.term&&w.b.comp===b.comp&&w.b.term===b.term) ||
                                    (w.a.comp===b.comp&&w.a.term===b.term&&w.b.comp===a.comp&&w.b.term===a.term));
    if(exists) return;
    const badReason = isBadConnection(a,b);
    if(badReason){
      rejectedFlash = {a, b};
      showToast('⛔ Буруу холболт! ' + badReason);
      render();
      clearTimeout(rejectedFlash._tm);
      setTimeout(()=>{ rejectedFlash=null; render(); }, 650);
      return;
    }
    const id = 'w'+(wireCounter++);
    wires.push({id, a, b});
    pushHistory({type:'addWire', id});
  }

  function pushHistory(entry){ history.push(entry); redoStack=[]; }

  function undo(){
    const last = history.pop();
    if(!last) return;
    if(last.type==='addComp'){
      const comp = comps.find(c=>c.id===last.id);
      const removedWires = wires.filter(w=>w.a.comp===last.id||w.b.comp===last.id);
      wires = wires.filter(w=>!(w.a.comp===last.id||w.b.comp===last.id));
      comps = comps.filter(c=>c.id!==last.id);
      redoStack.push({type:'addComp', comp, wires:removedWires});
    } else if(last.type==='addWire'){
      const wire = wires.find(w=>w.id===last.id);
      wires = wires.filter(w=>w.id!==last.id);
      redoStack.push({type:'addWire', wire});
    }
    render();
  }

  function redo(){
    const last = redoStack.pop();
    if(!last) return;
    if(last.type==='addComp'){
      comps.push(last.comp); wires.push(...last.wires);
      history.push({type:'addComp', id:last.comp.id});
    } else if(last.type==='addWire'){
      wires.push(last.wire);
      history.push({type:'addWire', id:last.wire.id});
    }
    render();
  }
