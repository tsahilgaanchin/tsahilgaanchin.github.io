// render.js — SVG rendering: components, wires, terminals, badges, coordinate transforms

  function termColor(type, termId){
    if(type==='power') return '#EF4444';
    if(type==='button') return (termId==='11'||termId==='12') ? '#F5A623' : '#22C55E';
    if(type==='contactor') return (termId==='13NO'||termId==='14NO') ? '#22C55E' : '#F5A623';
    if(type==='motor') return termId==='PE' ? '#22C55E' : '#F5A623';
    if(type==='lamp') return termId==='B' ? '#22C55E' : '#F5A623';
    if(type==='breaker') return '#F5A623';
    if(type==='relay') return (termId==='95'||termId==='96') ? '#22C55E' : '#F5A623';
    if(type==='estop') return '#F5A623';
    if(type==='timer') return '#F5A623';
    if(type==='psu24') return termId==='+24V' ? '#EF4444' : '#3B82F6';
    return '#999';
  }

  function termAbs(compId, termId){
    const c = comps.find(x=>x.id===compId);
    if(!c) return {x:0,y:0};
    const def = TERMINAL_DEFS[c.type].find(t=>t.id===termId);
    return {x:c.x+def.x, y:c.y+def.y};
  }

  function isWireEndpoint(c, t){
    if(!selectedWire) return false;
    const w = wires.find(x=>x.id===selectedWire);
    if(!w) return false;
    return (w.a.comp===c.id && w.a.term===t.id) || (w.b.comp===c.id && w.b.term===t.id);
  }

  function terminalSVG(c, t){
    const color = termColor(c.type, t.id);
    const nodeId = `${c.id}:${t.id}`;
    const short = simLive.has(nodeId) && simNeutral.has(nodeId);
    const live = !short && simLive.has(nodeId);
    const neutral = !short && !live && simNeutral.has(nodeId);
    const isSelected = pendingTerm && pendingTerm.comp===c.id && pendingTerm.term===t.id;
    const isEndpoint = isWireEndpoint(c, t);
    let cls = short ? 'term short' : live ? 'term live' : neutral ? 'term neutral' : 'term';
    if(isSelected) cls += ' selected';
    if(isEndpoint) cls += ' wire-endpoint';
    return `<g class="${cls}" data-comp="${c.id}" data-term="${t.id}">
      ${isSelected ? `<circle cx="${t.x}" cy="${t.y}" r="15" fill="none" stroke="#B4680B" stroke-width="2.5" class="snap-ring"/>` : ''}
      ${isEndpoint ? `<circle cx="${t.x}" cy="${t.y}" r="17" fill="none" stroke="#B4680B" stroke-width="3" class="endpoint-ring"/>` : ''}
      <circle cx="${t.x}" cy="${t.y}" r="19" fill="transparent" data-comp="${c.id}" data-term="${t.id}"/>
      <circle cx="${t.x}" cy="${t.y}" r="9.5" fill="url(#gradTerm)" stroke="${color}" stroke-width="3"/>
      <circle cx="${t.x}" cy="${t.y}" r="3" fill="${color}"/>
      <text x="${t.x}" y="${t.y-14}" class="term-label">${t.id}</text>
    </g>`;
  }

  function renderPower(c){
    const terms = TERMINAL_DEFS.power.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="-12" y="-2" width="272" height="42" fill="transparent" data-comp="${c.id}"/>
      ${terms}
    </g>`;
  }

  function renderPsu24(c){
    const terms = TERMINAL_DEFS.psu24.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="0" width="90" height="80" rx="8" fill="url(#gradBody)" stroke="#0a0b0d" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="45" y="17" text-anchor="middle" font-size="9" font-weight="700" fill="#E5E7EB">24V DC</text>
      <text x="45" y="30" text-anchor="middle" font-size="7" fill="#9CA3AF">Удирдлагын эх</text>
      ${terms}
    </g>`;
  }

  function renderButton(c){
    const pressedNow = running && pressed[c.id];
    const capY = pressedNow ? 19 : 15;
    const isRed = c.color === '#EF4444';
    const capFill = isRed ? 'url(#gradCapRed)' : 'url(#gradCapGreen)';
    const terms = TERMINAL_DEFS.button.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="35" width="85" height="105" rx="12" fill="url(#gradBody)" stroke="#0a0b0d" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="42" y="128" class="chip-label" font-size="9">Momentary</text>
      <circle cx="42" cy="31" r="19" fill="none" stroke="#00000045" stroke-width="6"/>
      <circle cx="42" cy="${capY}" r="26" fill="transparent" data-btncap="${c.id}"/>
      <circle cx="42" cy="${capY}" r="16" fill="${capFill}" stroke="#00000060" stroke-width="1.5" class="btncap ${pressedNow?'pressed':''}" data-btncap="${c.id}"/>
      <ellipse cx="37" cy="${capY-6}" rx="6" ry="3.5" fill="#ffffff70" style="pointer-events:none"/>
      ${terms}
    </g>`;
  }

  function renderContactor(c){
    const en = running && energized[c.id];
    const terms = TERMINAL_DEFS.contactor.map(t=>terminalSVG(c,t)).join('');
    const bodyFill = en ? 'url(#gradBodyOn)' : 'url(#gradBody)';
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="45" width="230" height="165" rx="10" fill="${bodyFill}" stroke="${en?'#22C55E':'#0a0b0d'}" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <circle cx="10" cy="55" r="2.6" fill="#00000060"/>
      <circle cx="220" cy="55" r="2.6" fill="#00000060"/>
      <circle cx="10" cy="200" r="2.6" fill="#00000060"/>
      <circle cx="220" cy="200" r="2.6" fill="#00000060"/>
      <text x="115" y="63" class="chip-label" font-size="10.5">Контактор${en?'  ● ON':''}</text>
      <rect x="70" y="100" width="90" height="26" rx="4" fill="${en?'url(#gradSelector)':'#1E293B'}"/>
      ${terms}
    </g>`;
  }

  function motorJumperStatus(c){
    const hasWire = (a,b) => wires.some(w =>
      (w.a.comp===c.id && w.a.term===a && w.b.comp===c.id && w.b.term===b) ||
      (w.a.comp===c.id && w.a.term===b && w.b.comp===c.id && w.b.term===a)
    );
    const starCount = [['W2','U2'],['U2','V2'],['W2','V2']].filter(([a,b])=>hasWire(a,b)).length;
    const deltaCount = [['U1','W2'],['V1','U2'],['W1','V2']].filter(([a,b])=>hasWire(a,b)).length;
    if(deltaCount>0) return deltaCount>=3 ? 'delta' : 'delta-partial';
    if(starCount>0) return starCount>=2 ? 'star' : 'star-partial';
    return null;
  }

  function renderMotor(c){
    const spinning = running && motorSpin(c);
    const dir = spinning ? motorDirection(c) : null;
    const spinClass = dir==='rev' ? 'fan spin-rev' : spinning ? 'fan spin' : 'fan';
    const dirLabel = dir==='rev' ? '⟲ ХОЙШ' : dir==='fwd' ? '⟳ УРАГШ' : '';
    const dirColor = dir==='rev' ? '#F5A623' : '#22C55E';
    const jumper = motorJumperStatus(c);
    const jumperLabel = jumper==='delta' ? 'Δ гүүр ✓' : jumper==='star' ? 'Y гүүр ✓'
      : jumper==='delta-partial' ? 'Δ дутуу ⚠' : jumper==='star-partial' ? 'Y дутуу ⚠'
      : 'Y/Δ гүүргүй ⚠';
    const jumperColor = (jumper==='delta' || jumper==='star') ? '#22C55E' : '#F5A623';
    const terms = TERMINAL_DEFS.motor.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="5" y="-8" width="150" height="88" rx="6" fill="url(#gradPanel)" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="80" y="6" class="chip-label" font-size="9">3-Phase Motor</text>
      <text x="145" y="18" text-anchor="end" font-size="8" font-weight="700" fill="${jumperColor}" style="pointer-events:none">${jumperLabel}</text>
      <line x1="15" y1="45" x2="145" y2="45" stroke="#00000040" stroke-width="1"/>
      <circle cx="75" cy="175" r="55" fill="url(#gradMotor)" stroke="#0a0b0d" stroke-width="3" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <circle cx="75" cy="175" r="55" fill="none" stroke="#00000030" stroke-width="1"/>
      <g class="${spinClass}" style="transform-origin:75px 175px;">
        <path d="M75 175 L75 130 Q98 137 75 175" fill="#F5A623"/>
        <path d="M75 175 L120 175 Q113 198 75 175" fill="#D97F0C"/>
        <path d="M75 175 L75 220 Q52 213 75 175" fill="#F5A623"/>
        <path d="M75 175 L30 175 Q37 152 75 175" fill="#D97F0C"/>
      </g>
      <circle cx="75" cy="175" r="10" fill="#111318"/>
      <circle cx="72" cy="172" r="3" fill="#4b5057"/>
      ${dirLabel ? `<text x="75" y="245" text-anchor="middle" font-size="12" font-weight="700" fill="${dirColor}" style="pointer-events:none">${dirLabel}</text>` : ''}
      ${terms}
    </g>`;
  }

  function renderBreaker(c){
    const on = c.on !== false;
    const terms = TERMINAL_DEFS.breaker.map(t=>terminalSVG(c,t)).join('');
    const toggles = [20,70,120].map(x => `
      <rect x="${x-10}" y="52" width="20" height="58" rx="4" fill="#1E293B" stroke="#0a0b0d" stroke-width="1"/>
      <rect x="${x-7}" y="${on?55:85}" width="14" height="24" rx="3" fill="${on?'url(#gradToggleOn)':'#94A3B8'}" stroke="#00000050" stroke-width="1" class="breaker-handle" data-breakertoggle="${c.id}"/>
    `).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="28" width="140" height="118" rx="6" fill="url(#gradBreakerBody)" stroke="#9CA3AF" stroke-width="1.5" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="70" y="42" text-anchor="middle" font-size="8" fill="#4B5563" font-weight="700">Автомат таслуур</text>
      ${toggles}
      <rect x="10" y="116" width="120" height="7" rx="2" fill="#2563EB"/>
      <circle cx="70" cy="130" r="55" fill="transparent" data-breakertoggle="${c.id}"/>
      <text x="70" y="140" text-anchor="middle" font-size="8" font-weight="700" fill="${on?'#16A34A':'#DC2626'}">${on?'I  ON':'O  OFF'}</text>
      ${terms}
    </g>`;
  }

  function renderRelay(c){
    const tripped = !!c.tripped;
    const terms = TERMINAL_DEFS.relay.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="40" width="140" height="150" rx="8" fill="url(#gradBody)" stroke="${tripped?'#EF4444':'#0a0b0d'}" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="70" y="57" class="chip-label" font-size="8.5">Термик реле${tripped?' ⚠':''}</text>
      <circle cx="45" cy="98" r="21" fill="url(#gradSelector)" stroke="#0a0b0d" stroke-width="2"/>
      <circle cx="45" cy="98" r="7" fill="#0a0b0d"/>
      <circle cx="97" cy="98" r="24" fill="transparent" data-relaytrip="${c.id}"/>
      <circle cx="97" cy="98" r="15" fill="${tripped?'url(#gradCapRed)':'url(#gradCapGreen)'}" stroke="#0a0b0d" stroke-width="1.5" class="relay-trip" data-relaytrip="${c.id}"/>
      <text x="70" y="150" class="chip-label" font-size="7.5">${tripped?'RESET':'TEST/TRIP'}</text>
      ${terms}
    </g>`;
  }

  function renderEstop(c){
    const tripped = !!c.tripped;
    const terms = TERMINAL_DEFS.estop.map(t=>terminalSVG(c,t)).join('');
    const mushY = tripped ? 30 : 26;
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="58" width="90" height="72" rx="10" fill="url(#gradBody)" stroke="${tripped?'#EF4444':'#0a0b0d'}" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="45" y="140" class="chip-label" font-size="8">${tripped?'ТҮГЖЭЭТЭЙ':'E-STOP'}</text>
      <circle cx="45" cy="30" r="26" fill="#F5C518" stroke="#7a5c00" stroke-width="2"/>
      <circle cx="45" cy="${mushY}" r="34" fill="transparent" data-estoptrip="${c.id}"/>
      <ellipse cx="45" cy="${mushY}" rx="24" ry="19" fill="url(#gradCapRed)" stroke="#5b0f0f" stroke-width="2" class="estop-cap ${tripped?'tripped':''}" data-estoptrip="${c.id}"/>
      <ellipse cx="38" cy="${mushY-6}" rx="7" ry="4" fill="#ffffff80" style="pointer-events:none"/>
      ${tripped ? `<circle cx="45" cy="${mushY}" r="30" fill="none" stroke="#EF4444" stroke-width="2.5" class="estop-alert-ring"/>` : ''}
      ${terms}
    </g>`;
  }

  function renderTimer(c){
    const on = !!timerCoilOn[c.id];
    const done = !!timerDone[c.id];
    const status = done ? 'ДУУССАН ✓' : on ? 'ХУГАЦАА ТООЛЖ БАЙНА...' : 'OFF';
    const ringColor = done ? '#22C55E' : on ? '#F5A623' : '#4B5563';
    const terms = TERMINAL_DEFS.timer.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <rect x="0" y="40" width="150" height="95" rx="8" fill="url(#gradBody)" stroke="${done?'#22C55E':on?'#F5A623':'#0a0b0d'}" stroke-width="2" filter="url(#csimShadow)" data-comp="${c.id}"/>
      <text x="75" y="57" class="chip-label" font-size="9">Цагийн реле (${c.delaySec||3}с)</text>
      <circle cx="75" cy="88" r="24" fill="#1E293B" stroke="${ringColor}" stroke-width="3" class="${on&&!done?'timer-ring-spin':''}"/>
      <line x1="75" y1="88" x2="75" y2="70" stroke="${ringColor}" stroke-width="2.5" stroke-linecap="round" class="${on&&!done?'timer-hand':''}"/>
      <circle cx="75" cy="88" r="3" fill="${ringColor}"/>
      <text x="75" y="128" class="chip-label" font-size="7" fill="${ringColor}">${status}</text>
      ${terms}
    </g>`;
  }

  function renderLamp(c){
    const lit = running && simLive.has(`${c.id}:A`) && simNeutral.has(`${c.id}:B`);
    const terms = TERMINAL_DEFS.lamp.map(t=>terminalSVG(c,t)).join('');
    return `<g class="comp" data-comp="${c.id}" transform="translate(${c.x},${c.y})">
      <circle cx="20" cy="40" r="20" fill="${lit?'#FFF3C4':'url(#gradBody)'}" stroke="${lit?'#F5A623':'#0a0b0d'}" stroke-width="3" filter="${lit?'url(#csimGlow)':'url(#csimShadow)'}" data-comp="${c.id}"/>
      ${lit ? `<ellipse cx="14" cy="32" rx="5" ry="3" fill="#ffffffaa"/>` : ''}
      ${terms}
    </g>`;
  }

  function renderCompEl(c){
    if(c.type==='power') return renderPower(c);
    if(c.type==='button') return renderButton(c);
    if(c.type==='contactor') return renderContactor(c);
    if(c.type==='motor') return renderMotor(c);
    if(c.type==='lamp') return renderLamp(c);
    if(c.type==='breaker') return renderBreaker(c);
    if(c.type==='relay') return renderRelay(c);
    if(c.type==='estop') return renderEstop(c);
    if(c.type==='timer') return renderTimer(c);
    if(c.type==='psu24') return renderPsu24(c);
    return '';
  }

  function compRect(comp){
    const widths = {power:260, button:90, contactor:235, motor:165, lamp:45, breaker:145, relay:195, estop:95, timer:155, psu24:100};
    const heights = {power:45, button:150, contactor:180, motor:260, lamp:65, breaker:130, relay:200, estop:140, timer:140, psu24:90};
    const w = widths[comp.type]||110, h = heights[comp.type]||110;
    const yTop = comp.type==='power' ? -8 : -12;
    return {x1:comp.x-12, y1:comp.y+yTop, x2:comp.x+w, y2:comp.y+h};
  }

  function lineHitsRect(x1,y1,x2,y2,r){
    const steps = 24;
    for(let i=0;i<=steps;i++){
      const t = i/steps, x = x1+(x2-x1)*t, y = y1+(y2-y1)*t;
      if(x>r.x1 && x<r.x2 && y>r.y1 && y<r.y2) return true;
    }
    return false;
  }

  function cubicPoint(p0,c1,c2,p3,t){
    const mt = 1-t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*c1.x + 3*mt*t*t*c2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*c1.y + 3*mt*t*t*c2.y + t*t*t*p3.y
    };
  }

  function curveHitsRect(p0,c1,c2,p3,r){
    const steps = 30;
    for(let i=0;i<=steps;i++){
      const pt = cubicPoint(p0,c1,c2,p3,i/steps);
      if(pt.x>r.x1 && pt.x<r.x2 && pt.y>r.y1 && pt.y<r.y2) return true;
    }
    return false;
  }

  function wirePath(p1, p2, excludeIds){
    const obstacles = comps.filter(c=>!excludeIds.includes(c.id)).map(compRect);
    const dx = (p2.x-p1.x)*0.5;
    const c1 = {x:p1.x+dx, y:p1.y}, c2 = {x:p2.x-dx, y:p2.y};
    const straightHit = obstacles.find(r=>curveHitsRect(p1,c1,c2,p2,r));
    if(!straightHit){
      return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
    }
    const hit = straightHit;
    const leftX = hit.x1 - 26, rightX = hit.x2 + 26;
    const costLeft = Math.abs(p1.x-leftX)+Math.abs(p2.x-leftX);
    const costRight = Math.abs(p1.x-rightX)+Math.abs(p2.x-rightX);
    const detourX = costLeft < costRight ? leftX : rightX;
    const goingDown = p1.y <= p2.y;
    const yNear = goingDown ? hit.y1 - 20 : hit.y2 + 20;
    const yFar  = goingDown ? hit.y2 + 20 : hit.y1 - 20;
    const m1y = (p1.y+yNear)/2, m2y = (yFar+p2.y)/2;
    return `M ${p1.x} ${p1.y} C ${p1.x} ${m1y}, ${detourX} ${m1y}, ${detourX} ${yNear} L ${detourX} ${yFar} C ${detourX} ${m2y}, ${p2.x} ${m2y}, ${p2.x} ${p2.y}`;
  }

  function categoryColorFor(a, b){
    const ca = comps.find(c=>c.id===a.comp), cb = comps.find(c=>c.id===b.comp);
    if(!ca || !cb) return '#9AA0A8';
    const catA = terminalCategory(ca.type, a.term), catB = terminalCategory(cb.type, b.term);
    if(catA==='ground' || catB==='ground') return '#16A34A';
    if(catA==='neutral' || catB==='neutral') return '#3B82F6';
    if(catA==='control' || catB==='control') return '#4B5563';
    return '#B45309';
  }

  function phaseColorFor(a, b){
    const nA = `${a.comp}:${a.term}`, nB = `${b.comp}:${b.term}`;
    if(simPhase.L1.has(nA) || simPhase.L1.has(nB)) return '#FBBF24';
    if(simPhase.L2.has(nA) || simPhase.L2.has(nB)) return '#22C55E';
    if(simPhase.L3.has(nA) || simPhase.L3.has(nB)) return '#EF4444';
    return null;
  }

  function renderWireEl(w){
    const p1 = termAbs(w.a.comp, w.a.term), p2 = termAbs(w.b.comp, w.b.term);
    const nA = `${w.a.comp}:${w.a.term}`, nB = `${w.b.comp}:${w.b.term}`;
    const short = (simLive.has(nA)&&simNeutral.has(nA)) || (simLive.has(nB)&&simNeutral.has(nB));
    const live = !short && (simLive.has(nA) || simLive.has(nB));
    const neutral = !short && !live && (simNeutral.has(nA) || simNeutral.has(nB));
    const ca = comps.find(c=>c.id===w.a.comp), cb = comps.find(c=>c.id===w.b.comp);
    const catA = ca ? terminalCategory(ca.type, w.a.term) : null;
    const catB = cb ? terminalCategory(cb.type, w.b.term) : null;
    const isPhaseCat = catA==='phase' || catB==='phase';

    let cls, style = '';
    if(short){
      cls = 'wire short';
    } else if(isPhaseCat){
      const phColor = phaseColorFor(w.a, w.b);
      if(phColor){
        cls = live ? 'wire phase-live' : 'wire phase-static';
        style = ` style="stroke:${phColor}"`;
      } else if(live){
        cls = 'wire live';
      } else {
        cls = 'wire static';
        style = ` style="stroke:${categoryColorFor(w.a,w.b)}"`;
      }
    } else if(live){
      cls = 'wire live';
    } else if(neutral){
      cls = 'wire neutral';
    } else {
      cls = 'wire static';
      style = ` style="stroke:${categoryColorFor(w.a,w.b)}"`;
    }
    if(selectedWire === w.id) cls += ' selected-wire';
    else if(selectedWire) cls += ' dimmed-wire';
    const d = wirePath(p1, p2, [w.a.comp, w.b.comp]);
    return `<path class="${cls}" data-wire="${w.id}" d="${d}"${style}/>`;
  }

  function renderWireBadge(){
    if(!selectedWire) return '';
    const w = wires.find(x=>x.id===selectedWire);
    if(!w) return '';
    const p1 = termAbs(w.a.comp, w.a.term), p2 = termAbs(w.b.comp, w.b.term);
    const bx = (p1.x+p2.x)/2, by = (p1.y+p2.y)/2;
    return `<g class="del-badge" data-deletewire="${w.id}">
      <circle cx="${bx}" cy="${by}" r="26" fill="transparent" data-deletewire="${w.id}"/>
      <circle cx="${bx}" cy="${by}" r="17" fill="#EF4444" stroke="#fff" stroke-width="3"/>
      <line x1="${bx-6}" y1="${by-6}" x2="${bx+6}" y2="${by+6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <line x1="${bx-6}" y1="${by+6}" x2="${bx+6}" y2="${by-6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  }

  function renderBadge(){
    if(!deleteBadge) return '';
    const c = comps.find(x=>x.id===deleteBadge.comp);
    if(!c) return '';
    const widths = {power:255, button:85, contactor:230, motor:160, lamp:40, breaker:140, relay:190, estop:90, timer:150, psu24:90};
    const w = widths[c.type]||100;
    const bx = c.x + w + 6, by = c.y - 4;
    return `<g class="del-badge" data-delete="${c.id}">
      <circle cx="${bx}" cy="${by}" r="26" fill="transparent" data-delete="${c.id}"/>
      <circle cx="${bx}" cy="${by}" r="17" fill="#EF4444" stroke="#fff" stroke-width="3"/>
      <line x1="${bx-6}" y1="${by-6}" x2="${bx+6}" y2="${by+6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <line x1="${bx-6}" y1="${by+6}" x2="${bx+6}" y2="${by-6}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  }

  function renderRejectedFlash(){
    if(!rejectedFlash) return '';
    const p1 = termAbs(rejectedFlash.a.comp, rejectedFlash.a.term);
    const p2 = termAbs(rejectedFlash.b.comp, rejectedFlash.b.term);
    return `<g class="reject-flash">
      <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#DC2626" stroke-width="3.5" stroke-dasharray="6 5"/>
      <circle cx="${p1.x}" cy="${p1.y}" r="18" fill="none" stroke="#DC2626" stroke-width="3"/>
      <circle cx="${p2.x}" cy="${p2.y}" r="18" fill="none" stroke="#DC2626" stroke-width="3"/>
    </g>`;
  }

  function updateTimers(sim){
    comps.filter(c=>c.type==='timer').forEach(c=>{
      const on = sim.live.has(`${c.id}:A1`) && sim.neutral.has(`${c.id}:A2`);
      const wasOn = !!timerCoilOn[c.id];
      if(on && !wasOn){
        clearTimeout(timerHandles[c.id]);
        timerHandles[c.id] = setTimeout(()=>{
          timerDone[c.id] = true;
          render();
        }, (c.delaySec||3)*1000);
      } else if(!on && wasOn){
        clearTimeout(timerHandles[c.id]);
        timerDone[c.id] = false;
      }
      timerCoilOn[c.id] = on;
    });
  }

  function render(){
    const sim = running ? simulate() : {live:new Set(), neutral:new Set()};
    simLive = sim.live; simNeutral = sim.neutral;
    simPhase = running ? computePhaseSets() : {L1:new Set(), L2:new Set(), L3:new Set()};
    if(running) updateTimers(sim);
    document.getElementById('csimWiresLayer').innerHTML = wires.map(renderWireEl).join('');
    document.getElementById('csimCompsLayer').innerHTML = comps.map(renderCompEl).join('');
    document.getElementById('csimTempLayer').innerHTML = renderBadge() + renderWireBadge() + renderRejectedFlash();
    document.getElementById('csimWorld').setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
    updateToolbarStates();
  }

  function updateToolbarStates(){
    document.getElementById('csimLock').classList.toggle('active', locked);
  }

  function panToComp(comp){
    const vb = svg.viewBox.baseVal;
    panX = vb.width/2 - (comp.x+50)*zoom;
    panY = vb.height/2 - (comp.y+50)*zoom;
  }

  function toSvgSpace(clientX, clientY){
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return { x:(clientX-rect.left)/rect.width*vb.width + vb.x, y:(clientY-rect.top)/rect.height*vb.height + vb.y };
  }

  function toWorld(clientX, clientY){
    const s = toSvgSpace(clientX, clientY);
    return {x:(s.x-panX)/zoom, y:(s.y-panY)/zoom};
  }
