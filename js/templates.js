// templates.js — Pre-built, fully-wired example circuits loadable from the toolbar

  function loadForwardReverse(){
    comps = [
      {id:'power1', type:'power', x:60, y:20},
      {id:'kmF', type:'contactor', x:60, y:150},
      {id:'kmR', type:'contactor', x:60, y:420},
      {id:'motor1', type:'motor', x:60, y:700},
      {id:'btnStop', type:'button', x:520, y:20, color:'#EF4444'},
      {id:'btnFwd', type:'button', x:520, y:220, color:'#22C55E'},
      {id:'btnRev', type:'button', x:520, y:420, color:'#22C55E'},
    ];
    wires = [];
    compCounter = 1; wireCounter = 1;
    history = []; redoStack = [];
    pressed = {}; energized = {};
    Object.values(timerHandles).forEach(h=>clearTimeout(h));
    timerCoilOn = {}; timerDone = {}; timerHandles = {};

    const pairs = [
      // main power - forward (normal phase order)
      [{comp:'power1',term:'L1'}, {comp:'kmF',term:'L1'}],
      [{comp:'power1',term:'L2'}, {comp:'kmF',term:'L2'}],
      [{comp:'power1',term:'L3'}, {comp:'kmF',term:'L3'}],
      // main power - reverse (L1/L3 swapped to reverse rotation)
      [{comp:'power1',term:'L1'}, {comp:'kmR',term:'L3'}],
      [{comp:'power1',term:'L2'}, {comp:'kmR',term:'L2'}],
      [{comp:'power1',term:'L3'}, {comp:'kmR',term:'L1'}],
      // both contactors feed the same motor winding terminals
      [{comp:'kmF',term:'T1'}, {comp:'motor1',term:'U1'}],
      [{comp:'kmF',term:'T2'}, {comp:'motor1',term:'V1'}],
      [{comp:'kmF',term:'T3'}, {comp:'motor1',term:'W1'}],
      [{comp:'kmR',term:'T1'}, {comp:'motor1',term:'U1'}],
      [{comp:'kmR',term:'T2'}, {comp:'motor1',term:'V1'}],
      [{comp:'kmR',term:'T3'}, {comp:'motor1',term:'W1'}],
      [{comp:'power1',term:'PE'}, {comp:'motor1',term:'PE'}],
      // delta winding jumpers (U1-W2, V1-U2, W1-V2)
      [{comp:'motor1',term:'U1'}, {comp:'motor1',term:'W2'}],
      [{comp:'motor1',term:'V1'}, {comp:'motor1',term:'U2'}],
      [{comp:'motor1',term:'W1'}, {comp:'motor1',term:'V2'}],
      // forward coil circuit: L1 -> Stop(NC) -> Rev-NC(interlock) -> [Fwd-NO || kmF-aux] -> A1 -> A2 -> N
      [{comp:'power1',term:'L1'}, {comp:'btnStop',term:'11'}],
      [{comp:'btnStop',term:'12'}, {comp:'btnRev',term:'11'}],
      [{comp:'btnRev',term:'12'}, {comp:'btnFwd',term:'23'}],
      [{comp:'btnFwd',term:'24'}, {comp:'kmF',term:'A1'}],
      [{comp:'kmF',term:'13NO'}, {comp:'btnRev',term:'12'}],
      [{comp:'kmF',term:'14NO'}, {comp:'kmF',term:'A1'}],
      [{comp:'power1',term:'N'}, {comp:'kmF',term:'A2'}],
      // reverse coil circuit: L1 -> Stop(NC) -> Fwd-NC(interlock) -> [Rev-NO || kmR-aux] -> A1 -> A2 -> N
      [{comp:'btnStop',term:'12'}, {comp:'btnFwd',term:'11'}],
      [{comp:'btnFwd',term:'12'}, {comp:'btnRev',term:'23'}],
      [{comp:'btnRev',term:'24'}, {comp:'kmR',term:'A1'}],
      [{comp:'kmR',term:'13NO'}, {comp:'btnFwd',term:'12'}],
      [{comp:'kmR',term:'14NO'}, {comp:'kmR',term:'A1'}],
      [{comp:'power1',term:'N'}, {comp:'kmR',term:'A2'}],
    ];
    pairs.forEach(([a,b])=>{
      wires.push({id:'w'+(wireCounter++), a, b});
    });
    compCounter = 8;
  }

  function confirmLoadTemplate(name, fn){
    if(!confirm('Одоогийн схемийг арилгаад, бэлэн загвар ачаалах уу?')) return;
    fn();
    zoom = 1; panX = 0; panY = 0;
    render();
    showToast('Загвар ачааллаа ✓');
  }

  document.getElementById('csimTemplates').onclick = (e)=>{
    e.stopPropagation();
    document.getElementById('csimTemplatesMenu').classList.toggle('open');
  };
  document.querySelectorAll('#csimTemplatesMenu [data-template]').forEach(btn=>{
    btn.onclick = ()=>{
      document.getElementById('csimTemplatesMenu').classList.remove('open');
      const t = btn.getAttribute('data-template');
      if(t === 'forward-reverse') confirmLoadTemplate('forward-reverse', loadForwardReverse);
    };
  });
