import { mapNames, cupNames, buttonPositions } from './mapdata.js';
import { pointsDistributions } from './points.js';

let currentLang = 'en';
const ROWS = 4;
let currentTrackIndex = null;
let playerCount = 12;
let viewingTrackIndex = null;
let team1Color = 'blue';
let team2Color = 'red';
let repickNext = false;
let showTrackContainer = true;

let historyOrder = JSON.parse(localStorage.getItem('mk_track_history') || '[]');
function saveHistory() { localStorage.setItem('mk_track_history', JSON.stringify(historyOrder)); }

const trackPlacements = JSON.parse(localStorage.getItem('mk_track_placements') || '[]');
function ensurePlacementArray(idx) {
    if (!trackPlacements[idx]) trackPlacements[idx] = Array(playerCount).fill(null);
    if (trackPlacements[idx].length !== playerCount) {
        const old = trackPlacements[idx];
        const resized = Array(playerCount).fill(null);
        for (let i=0;i<Math.min(old.length, resized.length);i++) resized[i]=old[i];
        trackPlacements[idx]=resized;
    }
}
function savePlacements(){ localStorage.setItem('mk_track_placements', JSON.stringify(trackPlacements)); }

function getMapNames(){ return mapNames[currentLang] || mapNames.en; }
function getCupNames(){ return cupNames[currentLang] || cupNames.en; }
const BUTTON_POSITIONS = buttonPositions;
const englishNames = mapNames.en;
const englishShortNames = mapNames.enShort;

// Forward refs to rendering functions defined later in DOMContentLoaded scope
let _renderHistory=null, _renderButtons=null, _renderPlayerSlots=null, _renderTableSelectionOnly=null;

function updateTrackContainer(){
    const container=document.getElementById('track-container');
    if(!container) return;
    const img=document.getElementById('current-track-image');
    const nameEnEl=document.getElementById('current-track-name-en');
    const nameLocalEl=document.getElementById('current-track-name-local');
    const displayIndex = viewingTrackIndex !== null ? viewingTrackIndex : currentTrackIndex;
    if (displayIndex === null){
        container.classList.add('empty');
        if(img){ img.src='assets/placeholder.png'; img.alt='No current track'; }
        if(nameEnEl) nameEnEl.textContent='No current track';
        if(nameLocalEl) nameLocalEl.textContent='';
        updateScoreBoard(); updateCompleteScore();
        return;
    }
    container.classList.remove('empty');
    if(img){ img.src=`assets/tracks/${englishShortNames[displayIndex]}.png`; img.alt=englishNames[displayIndex]; }
    if(nameEnEl) nameEnEl.textContent=englishNames[displayIndex];
    if(nameLocalEl) nameLocalEl.textContent=mapNames[currentLang][displayIndex];
    if(_renderPlayerSlots) _renderPlayerSlots();
    updateScoreBoard(); updateCompleteScore();
}

function updateScoreBoard(){
    const diffEl=document.getElementById('track-score-diff');
    const valuesEl=document.getElementById('track-score-values');
    if(!diffEl || !valuesEl) return;
    const displayIndex = viewingTrackIndex !== null ? viewingTrackIndex : currentTrackIndex;
    if(displayIndex===null){ diffEl.textContent=''; valuesEl.textContent=''; return; }
    if(trackPlacements[displayIndex]) ensurePlacementArray(displayIndex);
    const placements=trackPlacements[displayIndex] || [];
    let own=0, enemy=0; const dist=pointsDistributions[playerCount];
    placements.forEach((state,i)=>{ const pts=dist?dist[i]:0; if(state==='own') own+=pts; else if(state==='enemy') enemy+=pts; });
    const diff=own-enemy; diffEl.className='score-diff '+(diff>0?'positive':diff<0?'negative':'neutral');
    diffEl.textContent=(diff>0?'+':'')+diff;
    valuesEl.innerHTML=`<span class="own-points">${own}</span>:<span class="enemy-points">${enemy}</span>`;
}
function updateCompleteScore(){
    const diffEl=document.getElementById('complete-score-diff');
    const valuesEl=document.getElementById('complete-score-values');
    if(!diffEl || !valuesEl) return;
    let own=0, enemy=0; const dist=pointsDistributions[playerCount];
    trackPlacements.forEach(arr=>{ if(!arr) return; arr.forEach((state,i)=>{ const pts=dist?dist[i]:0; if(state==='own') own+=pts; else if(state==='enemy') enemy+=pts; }); });
    if(own===0 && enemy===0){ diffEl.textContent=''; valuesEl.textContent=''; return; }
    const diff=own-enemy; diffEl.className='score-diff '+(diff>0?'positive':diff<0?'negative':'neutral');
    diffEl.textContent=(diff>0?'+':'')+diff;
    valuesEl.innerHTML=`<span class="own-points">${own}</span>:<span class="enemy-points">${enemy}</span>`;
}
function saveSelection(disabled, lang, showButtons){ localStorage.setItem('mk_tracker_state', JSON.stringify({ disabled, lang, showButtons, currentTrackIndex, playerCount, team1Color, team2Color })); }

function applyTeamColorsToCSS(){
    const root = document.documentElement;
    const palette = {
        red:   { bg:'#4f1010', fg:'#e25d5d', border:'#b91e1e', chipBg:'#7a1d1d', chipFg:'#ffd1d1', chipBorder:'#d13d3d' },
        blue:  { bg:'#10304f', fg:'#5dade2', border:'#1e6fb9', chipBg:'#1d4f7a', chipFg:'#bfe3ff', chipBorder:'#3d92d1' },
        yellow:{ bg:'#4f4f10', fg:'#e2d95d', border:'#b9b41e', chipBg:'#7a7a1d', chipFg:'#fff8bf', chipBorder:'#d1ca3d' },
        green: { bg:'#104f10', fg:'#5de25d', border:'#1eb91e', chipBg:'#1d7a1d', chipFg:'#bfffbf', chipBorder:'#3dd13d' },
    };
    const own = palette[team1Color] || palette.blue;
    const enemy = palette[team2Color] || palette.red;
    root.style.setProperty('--own-bg', own.bg);
    root.style.setProperty('--own-fg', own.fg);
    root.style.setProperty('--own-border', own.border);
    root.style.setProperty('--own-chip-bg', own.chipBg);
    root.style.setProperty('--own-chip-fg', own.chipFg);
    root.style.setProperty('--own-chip-border', own.chipBorder);
    root.style.setProperty('--enemy-bg', enemy.bg);
    root.style.setProperty('--enemy-fg', enemy.fg);
    root.style.setProperty('--enemy-border', enemy.border);
    root.style.setProperty('--enemy-chip-bg', enemy.chipBg);
    root.style.setProperty('--enemy-chip-fg', enemy.chipFg);
    root.style.setProperty('--enemy-chip-border', enemy.chipBorder);
}

function renderHistory(){
    const ul=document.getElementById('track-history'); if(!ul) return; ul.innerHTML='';
    historyOrder.forEach((idx, i)=>{
        const li=document.createElement('li'); li.className='track-history-item'; li.dataset.trackIndex=idx;
        const countSpan=document.createElement('span'); countSpan.className='history-count'; countSpan.textContent=String(i+1);
        const img=document.createElement('img'); img.src=`assets/tracks/${englishShortNames[idx]}.png`; img.alt=englishNames[idx];
        const shortSpan=document.createElement('span'); shortSpan.className='short-name'; shortSpan.textContent=englishShortNames[idx];
            let own=0, enemy=0; const dist=pointsDistributions[playerCount];
            if(trackPlacements[idx]) trackPlacements[idx].forEach((state,i)=>{ const pts=dist?dist[i]:0; if(state==='own') own+=pts; else if(state==='enemy') enemy+=pts; });
            const scoreSpan=document.createElement('span'); scoreSpan.className='history-score';
            scoreSpan.innerHTML = `<span style="color: var(--own-fg); font-weight: 700;">${own}</span>:<span style="color: var(--enemy-fg); font-weight: 700;">${enemy}</span>`;
            // Apply leading team color to the short name
            if(own>enemy){ shortSpan.style.color = getComputedStyle(document.documentElement).getPropertyValue('--own-fg') || '#5dade2'; }
            else if(enemy>own){ shortSpan.style.color = getComputedStyle(document.documentElement).getPropertyValue('--enemy-fg') || '#e25d5d'; }
            else { shortSpan.style.color = '#ccc'; }
        li.appendChild(countSpan); li.appendChild(img); li.appendChild(shortSpan); li.appendChild(scoreSpan);
        li.addEventListener('click',()=>{ viewingTrackIndex = (viewingTrackIndex===idx? null: idx); updateTrackContainer(); renderHistory(); if(_renderButtons) _renderButtons(); });
        if(viewingTrackIndex===idx) li.classList.add('viewing');
        ul.appendChild(li);
    });
}

// Expose for updateTrackContainer
_renderHistory = renderHistory;

document.addEventListener('DOMContentLoaded', () => {
    function loadState(){ const state=JSON.parse(localStorage.getItem('mk_tracker_state')||'{}'); return { disabled:Array.isArray(state.disabled)?state.disabled:Array(BUTTON_POSITIONS.length).fill(false), lang:state.lang||'en', showButtons:!!state.showButtons, showTrack: (state.showTrack ?? true), currentTrackIndex:Number.isInteger(state.currentTrackIndex)?state.currentTrackIndex:null, playerCount:Number.isInteger(state.playerCount)?state.playerCount:12, team1Color: state.team1Color || 'blue', team2Color: state.team2Color || 'red' }; }
    let { disabled, lang, showButtons, showTrack, currentTrackIndex: storedTrack, playerCount: storedPlayerCount, team1Color: storedTeam1, team2Color: storedTeam2 } = loadState();
    currentLang=lang; currentTrackIndex=storedTrack; playerCount=storedPlayerCount; showTrackContainer = !!showTrack;
    team1Color=storedTeam1; team2Color=storedTeam2; applyTeamColorsToCSS();
    let mapNamesArr=getMapNames(); let cupNamesArr=getCupNames();

    const buttonsLayer=document.getElementById('buttons-layer');
    function renderButtons(){
        buttonsLayer.innerHTML='';
        const historySet=new Set(historyOrder);
        BUTTON_POSITIONS.forEach((pos,i)=>{
            const wrapper=document.createElement('div'); Object.assign(wrapper.style,{ position:'absolute', left:`calc(${pos.x}% - 25px)`, top:`calc(${pos.y}% - 25px)`, width:'50px', height:'50px', pointerEvents:'none'});
            const btn=document.createElement('button'); btn.className='map-btn'; if(currentTrackIndex===i) btn.classList.add('selected'); btn.title=mapNamesArr[i]; btn.dataset.mapIndex=i; btn.innerText=''; btn.tabIndex=0;
            const visible = showButtons || currentTrackIndex===i || (historySet.has(i) && i!==currentTrackIndex);
            Object.assign(btn.style,{ zIndex:2, position:'absolute', left:'0', top:'0', pointerEvents:'auto', opacity:visible?'1':'0', background:visible?'rgba(255,255,255,0.7)':'rgba(255,255,255,0)', borderColor:visible?'#333':'rgba(0,0,0,0)', color:(showButtons||currentTrackIndex===i)?'#222':'rgba(0,0,0,0)', transition:'opacity 0.2s'});
            const noIcon=document.createElement('img'); noIcon.src='assets/no.png'; noIcon.className='no-icon'; noIcon.alt='Used'; Object.assign(noIcon.style,{ width:'50px', height:'50px', position:'absolute', left:'0', top:'0', pointerEvents:'none', zIndex:'3', display:(historySet.has(i) && i!==currentTrackIndex)?'block':'none' });
            btn.addEventListener('click',()=>handleTrackClick(i));
            wrapper.appendChild(btn); wrapper.appendChild(noIcon); buttonsLayer.appendChild(wrapper);
        });
        const toggle=document.getElementById('toggle-btns'); if(toggle) toggle.innerText=showButtons?'Hide Buttons':'Show Buttons';
    }
    _renderButtons = renderButtons;

    function renderTableSelectionOnly(){ for(let i=0;i<BUTTON_POSITIONS.length;i++){ const cell=document.getElementById(`cell-${i}`); if(!cell) continue; cell.style.outline = (currentTrackIndex===i)?'2px solid gold':''; } }
    _renderTableSelectionOnly = renderTableSelectionOnly;

    function handleTrackClick(idx){
        // One-shot repick: always append selected track to history, even if already used
        if (repickNext) {
            viewingTrackIndex = null;
            currentTrackIndex = idx;
            historyOrder.push(idx);
            saveHistory();
            if(!trackPlacements[idx]) ensurePlacementArray(idx);
            renderHistory(); renderButtons(); renderTableSelectionOnly(); updateTrackContainer(); saveState();
            // reset repick mode and button label
            repickNext = false;
            const repickBtn = document.getElementById('repick-btn'); if (repickBtn) repickBtn.innerText = 'Repick';
            return;
        }

        viewingTrackIndex=null;
        if(currentTrackIndex===idx){
            // Default behavior: clicking current track removes it from history
            historyOrder = historyOrder.filter(t=>t!==idx);
            trackPlacements[idx]=null;
            currentTrackIndex=null;
            saveHistory(); savePlacements();
            renderHistory(); renderButtons(); renderTableSelectionOnly(); updateTrackContainer(); saveState(); return;
        } else {
            currentTrackIndex=idx;
            if(!historyOrder.includes(idx)){ historyOrder.push(idx); saveHistory(); renderHistory(); }
            if(!trackPlacements[idx]) ensurePlacementArray(idx);
        }
        renderButtons(); renderTableSelectionOnly(); updateTrackContainer(); saveState();
    }

    // Persist core UI state (language, player count, current track, showButtons) so they restore on reload
    function saveState(){
        const state = {
            lang: currentLang,
            playerCount,
            currentTrackIndex,
            showButtons,
            showTrack: showTrackContainer,
            // keep placeholders for legacy keys
            disabled: [],
        };
        localStorage.setItem('mk_tracker_state', JSON.stringify(state));
    }

    const tbody=document.querySelector('#tracker-table tbody'); const thead=document.querySelector('#tracker-table thead tr');
    function renderTable(){ while(thead.children.length>1) thead.removeChild(thead.lastChild); cupNamesArr.forEach(c=>{ const th=document.createElement('th'); th.innerText=c; thead.appendChild(th); }); tbody.innerHTML=''; for(let row=0;row<ROWS;row++){ const tr=document.createElement('tr'); const th=document.createElement('th'); th.innerText=row+1; tr.appendChild(th); for(let cup=0;cup<cupNamesArr.length;cup++){ const mapIdx=cup*ROWS+row; const td=document.createElement('td'); td.id=`cell-${mapIdx}`; td.style.cursor='pointer'; td.innerText=mapNamesArr[mapIdx]; if(currentTrackIndex===mapIdx) td.style.outline='2px solid gold'; td.addEventListener('click',()=>handleTrackClick(mapIdx)); tr.appendChild(td);} tbody.appendChild(tr);} }

    function renderPlayerSlots(){ const ul=document.getElementById('player-placements'); if(!ul) return; ul.innerHTML=''; const displayIndex=viewingTrackIndex!==null?viewingTrackIndex:currentTrackIndex; const dist=pointsDistributions[playerCount]||[]; for(let place=1; place<=playerCount; place++){ const li=document.createElement('li'); li.className='player-slot'; li.dataset.place=place; const img=document.createElement('img'); img.src='assets/player.svg'; img.alt=`Player ${place}`; img.style.width='20px'; img.style.height='20px'; const span=document.createElement('span'); span.textContent=place; span.style.fontWeight='bold'; span.style.minWidth='20px'; span.style.textAlign='center'; const ptsSpan=document.createElement('span'); ptsSpan.className='slot-points'; ptsSpan.textContent=dist[place-1] ?? 0; li.appendChild(span); li.appendChild(img); li.appendChild(ptsSpan); if(displayIndex!==null && trackPlacements[displayIndex]){ ensurePlacementArray(displayIndex); const state=trackPlacements[displayIndex][place-1]; if(state==='own') li.classList.add('own'); else if(state==='enemy') li.classList.add('enemy'); } li.addEventListener('click',()=>{ const target=viewingTrackIndex!==null?viewingTrackIndex:currentTrackIndex; if(target===null) return; ensurePlacementArray(target); const cur=trackPlacements[target][place-1]; let next=null; if(cur===null) next='own'; else if(cur==='own') next='enemy'; else if(cur==='enemy') next=null; trackPlacements[target][place-1]=next; savePlacements(); renderPlayerSlots(); updateScoreBoard(); updateCompleteScore(); renderHistory(); renderButtons(); }); ul.appendChild(li);} }
    _renderPlayerSlots = renderPlayerSlots;

    // Initial rendering sequence
    const trackContainerEl = document.getElementById('track-container');
    if (trackContainerEl) trackContainerEl.classList.toggle('hidden', !showTrackContainer);
    const toggleTrackBtnInit = document.getElementById('toggle-track'); if (toggleTrackBtnInit) toggleTrackBtnInit.innerText = showTrackContainer ? 'Hide Track' : 'Show Track';
    renderButtons(); renderTable(); renderHistory(); updateTrackContainer(); renderPlayerSlots(); renderTableSelectionOnly();

    // Language change
    const langSelect=document.getElementById('language-select'); if(langSelect){ langSelect.value=currentLang; langSelect.addEventListener('change', e=>{ currentLang=e.target.value; mapNamesArr=getMapNames(); cupNamesArr=getCupNames(); renderButtons(); renderTable(); renderHistory(); updateTrackContainer(); saveState(); }); }

    // Player count change
    const pcSelect=document.getElementById('player-count-select'); if(pcSelect){ pcSelect.value=String(playerCount); pcSelect.addEventListener('change', e=>{ const val=parseInt(e.target.value,10); if(!Number.isNaN(val)){ playerCount=val; for(let i=0;i<trackPlacements.length;i++){ if(trackPlacements[i]) ensurePlacementArray(i); } renderPlayerSlots(); updateScoreBoard(); updateCompleteScore(); renderHistory(); renderButtons(); saveState(); } }); }

    // Team color selects
    const t1Select=document.getElementById('team1-color-select'); if(t1Select){ t1Select.value=team1Color; t1Select.addEventListener('change', e=>{ team1Color=e.target.value; applyTeamColorsToCSS(); renderPlayerSlots(); updateScoreBoard(); renderHistory(); saveState(); }); }
    const t2Select=document.getElementById('team2-color-select'); if(t2Select){ t2Select.value=team2Color; t2Select.addEventListener('change', e=>{ team2Color=e.target.value; applyTeamColorsToCSS(); renderPlayerSlots(); updateScoreBoard(); renderHistory(); saveState(); }); }

    // Zoom / Pan controls
    let scale=1, origin={x:0,y:0}, isDragging=false, last={x:0,y:0};
    const mapWrapper=document.getElementById('map-wrapper'); const mapImage=document.getElementById('map-image'); const buttonsLayerDiv=document.getElementById('buttons-layer');
    function updateTransform(){ mapImage.style.transform=`scale(${scale}) translate(${origin.x}px, ${origin.y}px)`; buttonsLayerDiv.style.transform=`scale(${scale}) translate(${origin.x}px, ${origin.y}px)`; }
    document.getElementById('zoom-in').onclick=()=>{ scale=Math.min(scale*1.2,5); updateTransform(); };
    document.getElementById('zoom-out').onclick=()=>{ scale=Math.max(scale/1.2,0.2); updateTransform(); };
    document.getElementById('center-btn').onclick=()=>{ scale=1; origin={x:0,y:0}; updateTransform(); };
    mapWrapper.addEventListener('mousedown',e=>{ isDragging=true; last={x:e.clientX,y:e.clientY}; mapWrapper.style.cursor='grabbing'; });
    document.addEventListener('mouseup',()=>{ isDragging=false; mapWrapper.style.cursor='grab'; });
    document.addEventListener('mousemove',e=>{ if(!isDragging) return; origin.x += (e.clientX-last.x)/scale; origin.y += (e.clientY-last.y)/scale; last={x:e.clientX,y:e.clientY}; updateTransform(); });
    let lastTouch=null, lastDist=null; mapWrapper.addEventListener('touchstart',e=>{ if(e.touches.length===1){ isDragging=true; lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}; } });
    mapWrapper.addEventListener('touchend',()=>{ isDragging=false; lastTouch=null; lastDist=null; });
    mapWrapper.addEventListener('touchmove',e=>{ if(e.touches.length===1 && isDragging){ const t=e.touches[0]; origin.x += (t.clientX-lastTouch.x)/scale; origin.y += (t.clientY-lastTouch.y)/scale; lastTouch={x:t.clientX,y:t.clientY}; updateTransform(); } else if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; const dist=Math.sqrt(dx*dx+dy*dy); if(lastDist){ const delta=dist-lastDist; scale=Math.max(0.2,Math.min(5, scale + delta*0.005)); updateTransform(); } lastDist=dist; isDragging=false; } });
    mapWrapper.addEventListener('wheel',e=>{ e.preventDefault(); const delta=e.deltaY<0?1.1:0.9; scale=Math.max(0.2,Math.min(5, scale*delta)); updateTransform(); }, { passive:false });

    document.getElementById('toggle-btns').addEventListener('click',()=>{ showButtons=!showButtons; renderButtons(); renderTableSelectionOnly(); saveState(); });
    // Toggle track container visibility
    const toggleTrackBtn = document.getElementById('toggle-track');
    if (toggleTrackBtn) {
        toggleTrackBtn.addEventListener('click', ()=>{
            showTrackContainer = !showTrackContainer;
            const el = document.getElementById('track-container');
            if (el) el.classList.toggle('hidden', !showTrackContainer);
            toggleTrackBtn.innerText = showTrackContainer ? 'Hide Track' : 'Show Track';
            saveState();
        });
    }
    // Repick control: enable one-shot append of any track to history
    const repickBtn = document.getElementById('repick-btn');
    if (repickBtn) {
        repickBtn.addEventListener('click', ()=>{
            // Toggle one-shot repick mode on/off
            repickNext = !repickNext;
            repickBtn.innerText = repickNext ? 'Repick: pick a track' : 'Repick';
        });
    }
    document.getElementById('reset-btn').addEventListener('click',()=>{
        if(!confirm('Reset all war data? This will clear track history, placements, and current selection.')) return;
        viewingTrackIndex=null; currentTrackIndex=null; historyOrder=[]; saveHistory();
        for(let i=0;i<trackPlacements.length;i++) trackPlacements[i]=null;
        playerCount=12; currentLang='en'; team1Color='blue'; team2Color='red'; applyTeamColorsToCSS();
        renderButtons(); renderTable(); renderHistory(); updateTrackContainer(); renderPlayerSlots(); renderTableSelectionOnly(); saveState();
    });
});
