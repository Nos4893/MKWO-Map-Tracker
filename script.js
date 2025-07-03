
import { mapNames, cupNames, buttonPositions } from './mapdata.js';

let currentLang = 'en';
const ROWS = 4;

function getMapNames() {
    return mapNames[currentLang] || mapNames['en'];
}
function getCupNames() {
    return cupNames[currentLang] || cupNames['en'];
}
const BUTTON_POSITIONS = buttonPositions;

// Map each map to a cup and row
function getCupAndRow(mapIndex) {
    // 4 maps per cup, 8 cups
    const cup = Math.floor(mapIndex / ROWS);
    const row = mapIndex % ROWS;
    return { cup, row };
}


document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---

    function loadState() {
        const state = JSON.parse(localStorage.getItem('mk_tracker_state') || '{}');
        return {
            disabled: Array.isArray(state.disabled) ? state.disabled : Array(BUTTON_POSITIONS.length).fill(false),
            lang: typeof state.lang === 'string' ? state.lang : 'en',
            showButtons: typeof state.showButtons === 'boolean' ? state.showButtons : false,
        };
    }
    function saveState(disabled, lang, showButtons) {
        localStorage.setItem('mk_tracker_state', JSON.stringify({ disabled, lang, showButtons }));
    }

    let { disabled, lang, showButtons } = loadState();
    currentLang = lang;
    let mapNamesArr = getMapNames();
    let cupNamesArr = getCupNames();
    const NUM_MAPS = mapNamesArr.length;
    const NUM_CUPS = cupNamesArr.length;

    // Generate buttons on the map
    const buttonsLayer = document.getElementById('buttons-layer');
    function renderButtons() {
        buttonsLayer.innerHTML = '';
        BUTTON_POSITIONS.forEach((pos, i) => {
            // Button wrapper for stacking button and icon
            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = `calc(${pos.x}% - 25px)`;
            wrapper.style.top = `calc(${pos.y}% - 25px)`;
            wrapper.style.width = '50px';
            wrapper.style.height = '50px';
            wrapper.style.pointerEvents = 'none';

            // Button
            const btn = document.createElement('button');
            btn.className = 'map-btn';
            btn.title = mapNamesArr[i];
            btn.dataset.mapIndex = i;
            btn.innerText = i + 1;
            btn.tabIndex = 0;
            btn.style.zIndex = 2;
            btn.style.position = 'absolute';
            btn.style.left = '0';
            btn.style.top = '0';
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = showButtons ? '1' : '0';
            btn.style.background = showButtons ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0)';
            btn.style.borderColor = showButtons ? '#333' : 'rgba(0,0,0,0)';
            btn.style.color = showButtons ? '#222' : 'rgba(0,0,0,0)';
            btn.style.transition = 'opacity 0.2s';

            // Add the no.png icon
            const noIcon = document.createElement('img');
            noIcon.src = 'assets/no.png';
            noIcon.className = 'no-icon';
            noIcon.alt = 'Disabled';
            noIcon.style.width = '50px';
            noIcon.style.height = '50px';
            noIcon.style.position = 'absolute';
            noIcon.style.left = '0';
            noIcon.style.top = '0';
            noIcon.style.pointerEvents = 'none';
            noIcon.style.zIndex = '3';
            noIcon.style.display = disabled[i] ? 'block' : 'none';

            btn.addEventListener('click', (e) => {
                // Find all wrappers at this point
                const rect = btn.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                // Find all buttons under this point
                const allWrappers = Array.from(buttonsLayer.children);
                allWrappers.forEach((w, j) => {
                    const b = w.querySelector('button');
                    if (!b) return;
                    const r = b.getBoundingClientRect();
                    if (
                        x >= r.left && x <= r.right &&
                        y >= r.top && y <= r.bottom
                    ) {
                        toggleMap(j);
                    }
                });
            });
            wrapper.appendChild(btn);
            wrapper.appendChild(noIcon);
            buttonsLayer.appendChild(wrapper);
        });
        // Update toggle button label
        document.getElementById('toggle-btns').innerText = showButtons ? 'Hide Buttons' : 'Show Buttons';
    }
    // Toggle button visibility
    document.getElementById('toggle-btns').addEventListener('click', () => {
        showButtons = !showButtons;
        renderButtons();
        saveState(disabled, lang, showButtons);
    });

    // Generate table
    const tbody = document.querySelector('#tracker-table tbody');
    const thead = document.querySelector('#tracker-table thead tr');
    function renderTable() {
        // Update header
        while (thead.children.length > 1) thead.removeChild(thead.lastChild);
        cupNamesArr.forEach((cup, i) => {
            const th = document.createElement('th');
            th.innerText = cup;
            thead.appendChild(th);
        });
        // Update body
        tbody.innerHTML = '';
        for (let row = 0; row < ROWS; row++) {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.innerText = row + 1;
            tr.appendChild(th);
            for (let cup = 0; cup < NUM_CUPS; cup++) {
                const mapIdx = cup * ROWS + row;
                const td = document.createElement('td');
                td.innerText = mapNamesArr[mapIdx];
                td.id = `cell-${mapIdx}`;
                td.style.cursor = 'pointer';
                if (disabled[mapIdx]) td.classList.add('crossed');
                td.addEventListener('click', () => toggleMap(mapIdx));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
    }

    renderButtons();
    renderTable();

    // Language select logic
    const langSelect = document.getElementById('language-select');
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        lang = currentLang;
        mapNamesArr = getMapNames();
        cupNamesArr = getCupNames();
        renderButtons();
        renderTable();
        saveState(disabled, lang, showButtons);
    });

    // Zoom and pan logic (mouse and touch)
    let scale = 1;
    let origin = { x: 0, y: 0 };
    let isDragging = false;
    let last = { x: 0, y: 0 };
    const mapWrapper = document.getElementById('map-wrapper');
    const mapImage = document.getElementById('map-image');
    const buttonsLayerDiv = document.getElementById('buttons-layer');

    function updateTransform() {
        mapImage.style.transform = `scale(${scale}) translate(${origin.x}px, ${origin.y}px)`;
        buttonsLayerDiv.style.transform = `scale(${scale}) translate(${origin.x}px, ${origin.y}px)`;
    }

    document.getElementById('zoom-in').onclick = () => {
        scale = Math.min(scale * 1.2, 5);
        updateTransform();
    };
    document.getElementById('zoom-out').onclick = () => {
        scale = Math.max(scale / 1.2, 0.2);
        updateTransform();
    };
    document.getElementById('center-btn').onclick = () => {
        scale = 1;
        origin = { x: 0, y: 0 };
        updateTransform();
    };

    // Mouse drag
    mapWrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        last = { x: e.clientX, y: e.clientY };
        mapWrapper.style.cursor = 'grabbing';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        mapWrapper.style.cursor = 'grab';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        origin.x += (e.clientX - last.x) / scale;
        origin.y += (e.clientY - last.y) / scale;
        last = { x: e.clientX, y: e.clientY };
        updateTransform();
    });

    // Touch drag
    let lastTouch = null;
    mapWrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    mapWrapper.addEventListener('touchend', () => {
        isDragging = false;
        lastTouch = null;
    });
    mapWrapper.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        origin.x += (touch.clientX - lastTouch.x) / scale;
        origin.y += (touch.clientY - lastTouch.y) / scale;
        lastTouch = { x: touch.clientX, y: touch.clientY };
        updateTransform();
    });

    // Pinch zoom (touch)
    let lastDist = null;
    mapWrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastDist) {
                const delta = dist - lastDist;
                scale = Math.max(0.2, Math.min(5, scale + delta * 0.005));
                updateTransform();
            }
            lastDist = dist;
            isDragging = false;
        } else {
            lastDist = null;
        }
    });

    // Main feature: toggle map disabled
    function toggleMap(idx) {
        const btn = buttonsLayer.children[idx];
        const noIcon = btn.querySelector('.no-icon');
        const { cup, row } = getCupAndRow(idx);
        const cell = document.getElementById(`cell-${idx}`);
        if (noIcon.style.display === 'block') {
            noIcon.style.display = 'none';
            cell.classList.remove('crossed');
            disabled[idx] = false;
        } else {
            noIcon.style.display = 'block';
            cell.classList.add('crossed');
            disabled[idx] = true;
        }
        saveState(disabled, lang, showButtons);
    }

    // Reset button logic
    document.getElementById('reset-btn').addEventListener('click', () => {
        disabled = Array(BUTTON_POSITIONS.length).fill(false);
        renderButtons();
        renderTable();
        saveState(disabled, lang, showButtons);
    });

    // Allow zoom with mouse wheel
    mapWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        scale = Math.max(0.2, Math.min(5, scale * delta));
        updateTransform();
    }, { passive: false });
});
