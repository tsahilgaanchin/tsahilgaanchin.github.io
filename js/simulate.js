// simulate.js — Circuit simulation engine: builds the live connectivity graph and solves contactor states

  function buildGraph(){
    const adj = {};
    function addEdge(a,b){ (adj[a]=adj[a]||[]).push(b); (adj[b]=adj[b]||[]).push(a); }
    wires.forEach(w => addEdge(`${w.a.comp}:${w.a.term}`, `${w.b.comp}:${w.b.term}`));
    comps.forEach(c=>{
      if(c.type==='button'){
        const isPressed = running && pressed[c.id];
        if(!isPressed) addEdge(`${c.id}:11`, `${c.id}:12`);
        if(isPressed) addEdge(`${c.id}:23`, `${c.id}:24`);
      }
      if(c.type==='contactor'){
        const en = running && energized[c.id];
        if(en){
          addEdge(`${c.id}:L1`, `${c.id}:T1`);
          addEdge(`${c.id}:L2`, `${c.id}:T2`);
          addEdge(`${c.id}:L3`, `${c.id}:T3`);
          addEdge(`${c.id}:13NO`, `${c.id}:14NO`);
        }
      }
      if(c.type==='breaker'){
        if(c.on !== false){
          addEdge(`${c.id}:L1`, `${c.id}:T1`);
          addEdge(`${c.id}:L2`, `${c.id}:T2`);
          addEdge(`${c.id}:L3`, `${c.id}:T3`);
        }
      }
      if(c.type==='relay'){
        addEdge(`${c.id}:L1`, `${c.id}:T1`);
        addEdge(`${c.id}:L2`, `${c.id}:T2`);
        addEdge(`${c.id}:L3`, `${c.id}:T3`);
        if(!c.tripped) addEdge(`${c.id}:95`, `${c.id}:96`);
      }
      if(c.type==='estop'){
        if(!c.tripped) addEdge(`${c.id}:11`, `${c.id}:12`);
      }
      if(c.type==='timer'){
        if(timerDone[c.id]) addEdge(`${c.id}:15`, `${c.id}:16`);
        else addEdge(`${c.id}:15`, `${c.id}:18`);
      }
    });
    return adj;
  }

  function bfs(adj, sources){
    const visited = new Set(sources);
    const queue = [...sources];
    while(queue.length){
      const n = queue.shift();
      (adj[n]||[]).forEach(m=>{ if(!visited.has(m)){ visited.add(m); queue.push(m); } });
    }
    return visited;
  }

  function simulate(){
    let live=new Set(), neutral=new Set();
    for(let iter=0; iter<6; iter++){
      const adj = buildGraph();
      const src = [];
      const nsrc = [];
      comps.forEach(c=>{
        if(c.type==='power'){
          src.push(`${c.id}:L1`, `${c.id}:L2`, `${c.id}:L3`);
          nsrc.push(`${c.id}:N`);
        }
        if(c.type==='psu24'){
          src.push(`${c.id}:+24V`);
          nsrc.push(`${c.id}:0V`);
        }
      });
      live = bfs(adj, src);
      neutral = bfs(adj, nsrc);
      let changed=false;
      comps.filter(c=>c.type==='contactor').forEach(c=>{
        const en = live.has(`${c.id}:A1`) && neutral.has(`${c.id}:A2`);
        if(energized[c.id]!==en){ energized[c.id]=en; changed=true; }
      });
      if(!changed) break;
    }
    return {live, neutral};
  }

  function motorSpin(c){ return ['U1','V1','W1'].every(t=>simLive.has(`${c.id}:${t}`)); }

  function computePhaseSets(){
    const power = comps.find(x=>x.type==='power');
    if(!power) return {L1:new Set(), L2:new Set(), L3:new Set()};
    const adj = buildGraph();
    return {
      L1: bfs(adj, [`${power.id}:L1`]),
      L2: bfs(adj, [`${power.id}:L2`]),
      L3: bfs(adj, [`${power.id}:L3`])
    };
  }

  function motorDirection(c){
    const power = comps.find(x=>x.type==='power');
    if(!power) return null;
    const {L1:liveL1, L2:liveL2, L3:liveL3} = simPhase;
    const which = (t) => {
      if(liveL1.has(`${c.id}:${t}`)) return 'L1';
      if(liveL2.has(`${c.id}:${t}`)) return 'L2';
      if(liveL3.has(`${c.id}:${t}`)) return 'L3';
      return null;
    };
    const u = which('U1'), v = which('V1'), w = which('W1');
    if(!u || !v || !w || u===v || v===w || u===w) return null;
    const order = [u,v,w].join(',');
    const forwardOrders = ['L1,L2,L3', 'L2,L3,L1', 'L3,L1,L2'];
    return forwardOrders.includes(order) ? 'fwd' : 'rev';
  }
