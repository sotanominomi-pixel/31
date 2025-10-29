// script.js - N Clock full
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const display = document.getElementById('display');
  const sliderBox = document.getElementById('sliderBox');
  const slider = document.getElementById('sliderHours');
  const labelHours = document.getElementById('labelHours');

  const tabClock = document.getElementById('tabClock');
  const tabStopwatch = document.getElementById('tabStopwatch');
  const tabAlarm = document.getElementById('tabAlarm');

  const stopwatchArea = document.getElementById('stopwatchArea');
  const swStart = document.getElementById('swStart');
  const swLap = document.getElementById('swLap');
  const swReset = document.getElementById('swReset');
  const lapList = document.getElementById('lapList');

  const alarmArea = document.getElementById('alarmArea');
  const alarmTimeInput = document.getElementById('alarmTime');
  const alarmSetBtn = document.getElementById('alarmSetBtn');
  const alarmsContainer = document.getElementById('alarmsContainer');

  // State
  let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
  slider.value = customHours;
  labelHours.textContent = `${customHours} 時間`;

  let mode = localStorage.getItem('nclock_mode') || 'clock';
  let lastFrame = performance.now();
  let running = false;
  let elapsedMs = Number(localStorage.getItem('nclock_sw_elapsed')) || 0;
  let laps = JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]');

  let alarms = JSON.parse(localStorage.getItem('nclock_alarms') || '[]'); // {id,hour,min,enabled}

  // Helpers
  function saveAll(){
    localStorage.setItem('nclock_hours', String(customHours));
    localStorage.setItem('nclock_mode', mode);
    localStorage.setItem('nclock_sw_elapsed', String(elapsedMs));
    localStorage.setItem('nclock_sw_laps', JSON.stringify(laps));
    localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
  }

  // Mode switching UI
  function setMode(m){
    mode = m;
    // tabs active
    [tabClock, tabStopwatch, tabAlarm].forEach(t => t.classList.remove('active'));
    if(m === 'clock') tabClock.classList.add('active');
    if(m === 'stopwatch') tabStopwatch.classList.add('active');
    if(m === 'alarm') tabAlarm.classList.add('active');
    // panels
    stopwatchArea.style.display = (m === 'stopwatch') ? 'flex' : 'none';
    alarmArea.style.display = (m === 'alarm') ? 'block' : 'none';
    sliderBox.style.display = (m === 'clock') ? 'block' : 'none';
    saveAll();
  }

  // Initialize mode
  setMode(mode);

  // Slider change
  slider.addEventListener('input', (e) => {
    customHours = Number(e.target.value);
    labelHours.textContent = `${customHours} 時間`;
    saveAll();
  });

  // Tab listeners
  tabClock.addEventListener('click', () => setMode('clock'));
  tabStopwatch.addEventListener('click', () => setMode('stopwatch'));
  tabAlarm.addEventListener('click', () => setMode('alarm'));

  // Stopwatch controls
  function renderLaps(){
    lapList.innerHTML = '';
    if(laps.length === 0){
      lapList.innerHTML = `<div style="color:var(--muted);padding:8px">ラップなし</div>`;
      return;
    }
    laps.forEach((t, i) => {
      const node = document.createElement('div');
      node.className = 'lap-item';
      node.innerHTML = `<div>Lap ${laps.length - i}</div><div>${t}</div>`;
      lapList.appendChild(node);
    });
  }
  renderLaps();

  swStart.addEventListener('click', () => {
    running = !running;
    if(running){
      lastFrame = performance.now();
      swStart.textContent = 'Stop';
      swStart.classList.remove('btn-start'); swStart.classList.add('btn-stop');
      swLap.disabled = false;
      swReset.disabled = true;
    } else {
      swStart.textContent = 'Start';
      swStart.classList.remove('btn-stop'); swStart.classList.add('btn-start');
      swLap.disabled = true;
      swReset.disabled = false;
      saveAll();
    }
  });

  swLap.addEventListener('click', () => {
    // record current display time (no ms)
    laps.unshift(display.textContent);
    if(laps.length > 2000) laps.pop(); // safety cap (practically unlimited)
    renderLaps();
    saveAll();
  });

  swReset.addEventListener('click', () => {
    elapsedMs = 0;
    laps = [];
    renderLaps();
    swReset.disabled = true;
    saveAll();
  });

  // Alarm functions
  function generateId(){ return Math.floor(Math.random()*1e9).toString(36) }

  function renderAlarms(){
    alarmsContainer.innerHTML = '';
    if(alarms.length === 0){
      alarmsContainer.innerHTML = `<div style="color:var(--muted);padding:8px">アラームなし</div>`;
      return;
    }
    alarms.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'alarm-card';
      const timeDiv = document.createElement('div');
      timeDiv.className = 'alarm-time';
      timeDiv.textContent = `${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`;
      const actions = document.createElement('div');
      actions.className = 'alarm-actions';

      // toggle
      const toggle = document.createElement('div');
      toggle.className = 'toggle' + (a.enabled ? ' on' : '');
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      toggle.appendChild(thumb);
      toggle.addEventListener('click', () => {
        a.enabled = !a.enabled;
        saveAll();
        renderAlarms();
      });

      // delete
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '削除';
      del.addEventListener('click', () => {
        alarms.splice(idx, 1);
        saveAll();
        renderAlarms();
      });

      actions.appendChild(toggle);
      actions.appendChild(del);

      card.appendChild(timeDiv);
      card.appendChild(actions);
      alarmsContainer.appendChild(card);
    });
  }
  renderAlarms();

  alarmSetBtn.addEventListener('click', () => {
    const val = alarmTimeInput.value;
    if(!val){
      alert('時刻を選択してください');
      return;
    }
    const [hh, mm] = val.split(':').map(n => Number(n));
    if(isNaN(hh) || isNaN(mm)) { alert('不正な時刻です'); return; }
    alarms.push({ id: generateId(), hour: hh, min: mm, enabled: true });
    saveAll();
    renderAlarms();
    alarmTimeInput.value = '';
  });

  // play beep
  function beep(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.value = 0.0001;
      o.start();
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3); o.stop(ctx.currentTime + 0.35); }, 500);
    }catch(e){}
  }

  // try Notification permission (optional)
  if('Notification' in window && Notification.permission === 'default'){
    Notification.requestPermission().catch(()=>{});
  }

  // Main animation / tick loop (smooth & correct init)
  function tick(now){
    // compute dt
    let dt = now - lastFrame;
    if(!isFinite(dt) || dt <= 0) dt = 16;
    lastFrame = now;

    // speed factor
    const speed = 24 / customHours;

    // stopwatch update (scaled)
    if(running){
      elapsedMs += dt * speed;
    }

    // display update
    if(mode === 'clock'){
      const d = new Date();
      const secOfDay = d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds() + d.getMilliseconds()/1000;
      const virtual = secOfDay * speed;
      const h = Math.floor(virtual / 3600) % 24;
      const m = Math.floor(virtual / 60) % 60;
      const s = Math.floor(virtual) % 60;
      display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    } else if(mode === 'stopwatch'){
      const totalSec = Math.floor(elapsedMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor(totalSec / 60) % 60;
      const s = totalSec % 60;
      // show hh:mm:ss if over an hour else mm:ss
      if(h > 0) display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      else display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    // alarm check (compare virtual clock to real-time hour/minute)
    if(mode === 'clock' || true){
      const nowReal = new Date();
      // check each alarm; trigger when real hour/min matches and second === 0
      alarms.forEach(a => {
        if(!a.enabled) return;
        if(a.hour === nowReal.getHours() && a.min === nowReal.getMinutes() && nowReal.getSeconds() === 0){
          // trigger
          try{
            if(Notification.permission === 'granted'){
              new Notification('N Clock', { body: `アラーム ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}` });
            }
          }catch(e){}
          beep();
          alert(`アラーム ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')} が鳴りました`);
        }
      });
    }

    requestAnimationFrame(tick);
  }

  // initialize lastFrame properly then start
  lastFrame = performance.now();
  requestAnimationFrame(tick);

  // On load restore states
  function restore(){
    // if saved stopwatch elapsed, keep
    if(localStorage.getItem('nclock_sw_elapsed')){
      elapsedMs = Number(localStorage.getItem('nclock_sw_elapsed'));
    }
    if(localStorage.getItem('nclock_sw_laps')){
      laps = JSON.parse(localStorage.getItem('nclock_sw_laps'));
      renderLaps();
    }
    if(localStorage.getItem('nclock_alarms')){
      alarms = JSON.parse(localStorage.getItem('nclock_alarms'));
      renderAlarms();
    }
  }
  restore();

  // save periodically
  setInterval(saveAll, 2000);

  // Expose delete for inline use
  window.deleteAlarm = function(id){
    const idx = alarms.findIndex(a => a.id === id);
    if(idx >= 0){
      alarms.splice(idx,1); saveAll(); renderAlarms();
    }
  };

  // Ensure controls accessibility
  swStart.setAttribute('aria-pressed', 'false');

  // Safety: reflect initial UI for stopwatch buttons
  swLap.disabled = true;
  swReset.disabled = true;

  // ensure tab focus behavior
  [tabClock, tabStopwatch, tabAlarm].forEach(t => t.setAttribute('role','tab'));
});
