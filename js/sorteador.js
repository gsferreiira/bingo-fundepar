'use strict';

const TOTAL_NUMBERS = 75;
const STORAGE_RODADA_ATUAL = 'bingo-rodada-atual';
const STORAGE_HIDE_SORTEAR = 'bingo-hide-sortear-btn';

function winnersKey(rodada) { return `bingo-vencedores-rodada-${rodada}`; }

function loadWinners(rodada) {
    try {
        return JSON.parse(localStorage.getItem(winnersKey(rodada))) || [];
    } catch {
        return [];
    }
}

function saveWinner(rodada, serial, nome, premio = '') {
    const winners = loadWinners(rodada);

    winners.push({
        serial,
        nome: nome.trim() ||
            `Cartela #${String(serial).padStart(4, '0')}`,
        premio: String(premio || '').trim()
    });

    localStorage.setItem(
        winnersKey(rodada),
        JSON.stringify(winners)
    );

    const nomeFinal = nome.trim() || (serial != null ? `Cartela #${String(serial).padStart(4, '0')}` : 'Vencedor do desempate');
    winners.push({ serial: serial != null ? serial : null, nome: nomeFinal });
    localStorage.setItem(winnersKey(rodada), JSON.stringify(winners));
    return winners;
}

function updateWinner(rodada, index, { serial, nome }) {
    const winners = loadWinners(rodada);
    if (!winners[index]) return winners;
    winners[index] = {
        serial: serial != null && serial !== '' ? parseInt(serial) : null,
        nome: (nome || '').trim() || winners[index].nome,
    };
    localStorage.setItem(winnersKey(rodada), JSON.stringify(winners));
    return winners;
}

function removeWinner(rodada, index) {
    const winners = loadWinners(rodada);
    winners.splice(index, 1);
    localStorage.setItem(winnersKey(rodada), JSON.stringify(winners));
    return winners;
}

function winnersRankItemsHTML(winners) {
    const medals = ['🥇', '🥈', '🥉'];

    return winners.map((winner, indice) => {
        const premioHTML = winner.premio
            ? `
                <span class="winners-rank-prize">
                    🎁 ${escapeHTML(winner.premio)}
                </span>
            `
            : `
                <span class="winners-rank-no-prize">
                    sem prêmio
                </span>
            `;

        return `
            <div class="winners-rank-item">
                <span class="winners-rank-pos">
                    ${medals[indice] || `${indice + 1}º`}
                </span>

                <span class="winners-rank-name">
                    ${escapeHTML(winner.nome)}
                </span>

                <span class="winners-rank-serial">
                    #${String(winner.serial).padStart(4, '0')}
                </span>

                ${premioHTML}
            </div>
        `;
    }).join('');
    return winners.map((w, i) => `
        <div class="winners-rank-item">
            <span class="winners-rank-pos">${medals[i] || (i + 1) + 'º'}</span>
            <span class="winners-rank-name">${escapeHTML(w.nome)}</span>
            ${w.serial != null
                ? `<span class="winners-rank-serial">#${String(w.serial).padStart(4, '0')}</span>`
                : `<span class="winners-rank-serial winners-rank-tiebreak">🔥 desempate</span>`}
        </div>
    `).join('');
}

function renderWinnersRank(rodada) {
    const winners = loadWinners(rodada);
    const box = document.getElementById('winnersRank');
    const list = document.getElementById('winnersRankList');
    if (winners.length === 0) {
        box.style.display = 'none';
        return;
    }
    list.innerHTML = winnersRankItemsHTML(winners);
    box.style.display = 'block';
}

const STORAGE_HISTORY_FLOAT_COLLAPSED = 'bingo-history-float-collapsed';

function renderWinnersPodium() {
    const list = document.getElementById('winnersPodiumList');

    if (!list) {
        return;
    }

    let html = '';

    for (let rodada = 1; rodada <= rodadaAtual; rodada++) {
        const winners = loadWinners(rodada);

        let winnersHTML;

        if (winners.length === 0) {
            winnersHTML = `
                <div class="podium-pending">
                    Aguardando vencedor
                </div>
            `;
        } else {
            winnersHTML = winners.map((winner, indice) => {
                const premioHTML = winner.premio
                    ? `
                        <span class="podium-prize">
                            🎁 ${escapeHTML(winner.premio)}
                        </span>
                    `
                    : `
                        <span class="podium-no-prize">
                            Sem prêmio associado
                        </span>
                    `;

                return `
                    <div class="podium-winner-row">
                        <span class="podium-position">
                            ${indice + 1}º
                        </span>

                        <span class="podium-winner-info">
                            <strong class="podium-winner-name">
                                ${escapeHTML(winner.nome)}
                            </strong>

                            <small class="podium-winner-serial">
                                Cartela #${String(winner.serial).padStart(4, '0')}
                            </small>
                        </span>

                        ${premioHTML}
                    </div>
                `;
            }).join('');
        }

        html += `
            <div class="podium-item">
                <div class="podium-round">
                    Rodada ${rodada}
                </div>

                <div class="podium-winners-list">
                    ${winnersHTML}
                </div>
            </div>
        `;
const STORAGE_RANK_FLOAT_COLLAPSED = 'bingo-rank-float-collapsed';
const STORAGE_HISTORY_COLLAPSED = 'bingo-history-collapsed';

function podiumItemHTML(r, winners) {
    const winnerHTML = winners.length
        ? winners.map(w => escapeHTML(w.nome)).join(', ')
        : '<span class="podium-pending">aguardando vencedor</span>';
    return `
        <div class="podium-item">
            <span class="podium-round">Rodada ${r}</span>
            <span class="podium-winner">${winnerHTML}</span>
        </div>`;
}

// Mostra só as últimas 3 rodadas (mais recente primeiro) que já têm vencedor registrado.
function renderWinnersMini() {
    const list = document.getElementById('winnersFloatList');
    const items = [];
    for (let r = rodadaAtual; r >= 1 && items.length < 3; r--) {
        const winners = loadWinners(r);
        if (winners.length) items.push(podiumItemHTML(r, winners));
    }
    list.innerHTML = items.length
        ? items.join('')
        : '<div class="podium-item"><span class="podium-winner podium-pending">aguardando vencedores</span></div>';
}

function renderAllWinnersModal() {
    const list = document.getElementById('allWinnersList');
    let html = '';
    for (let r = 1; r <= rodadaAtual; r++) {
        html += podiumItemHTML(r, loadWinners(r));
    }

    list.innerHTML = html;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Gestão de vencedores (editar/adicionar/remover de rodadas passadas) ─────

function renderManageWinnersRoundOptions() {
    const select = document.getElementById('manageWinnersRodada');
    const previous = select.value;
    select.innerHTML = '';
    for (let r = 1; r <= rodadaAtual; r++) {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = `Rodada ${r}`;
        select.appendChild(opt);
    }
    select.value = previous && parseInt(previous) <= rodadaAtual ? previous : rodadaAtual;
}

function renderManageWinnersList(rodada) {
    const container = document.getElementById('manageWinnersList');
    const winners = loadWinners(rodada);
    if (winners.length === 0) {
        container.innerHTML = '<p class="manage-winners-empty">Nenhum vencedor registrado nesta rodada ainda.</p>';
        return;
    }
    container.innerHTML = winners.map((w, i) => `
        <div class="manage-winners-row" data-index="${i}">
            <input type="text" class="modal-input manage-winners-input manage-winners-name" data-field="nome" value="${escapeHTML(w.nome)}" maxlength="40">
            <input type="number" class="modal-input manage-winners-input manage-winners-serial" data-field="serial" value="${w.serial != null ? w.serial : ''}" min="1" max="500" placeholder="Nº cartela">
            <button class="manage-winners-remove" data-index="${i}" title="Remover vencedor" aria-label="Remover vencedor">🗑</button>
        </div>
    `).join('');
}

function currentManageWinnersRodada() {
    return parseInt(document.getElementById('manageWinnersRodada').value) || rodadaAtual;
}

let rodadaAtual = 1;
let sorteados = [];
let available = [];
let rodadaVisualizando = null;
let tieBreakSorteados = [];
let tieBreakAvailable = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
let tieBreakCameraStream = null;
let tieBreakWebcamEnabled = true;

// ── LocalStorage ───────────────────────────────

function storageKey(r) { return `bingo-rodada-${r}`; }

function loadState() {
    rodadaAtual = parseInt(localStorage.getItem(STORAGE_RODADA_ATUAL)) || 1;
    const saved = localStorage.getItem(storageKey(rodadaAtual));
    sorteados = saved ? (JSON.parse(saved).sorteados || []) : [];
    available = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
        .filter(n => !sorteados.includes(n));
}

function saveState() {
    const existing = JSON.parse(localStorage.getItem(storageKey(rodadaAtual))) || {};
    existing.sorteados = sorteados;
    localStorage.setItem(storageKey(rodadaAtual), JSON.stringify(existing));
    localStorage.setItem(STORAGE_RODADA_ATUAL, rodadaAtual);
}

function loadRodadaSorteados(r) {
    const saved = localStorage.getItem(storageKey(r));
    return saved ? (JSON.parse(saved).sorteados || []) : [];
}

function getRodadaTipo(r) {
    const d = localStorage.getItem(storageKey(r));
    if (!d) return ['diagonal'];
    const tipo = JSON.parse(d).tipo;
    if (!tipo) return ['diagonal'];
    return Array.isArray(tipo) ? tipo : [tipo];
}

function getRodadaPremios(rodada) {
    const saved = localStorage.getItem(storageKey(rodada));

    if (!saved) {
        return [];
    }

    try {
        const data = JSON.parse(saved);

        if (Array.isArray(data.premios)) {
            return data.premios
                .map(premio => String(premio).trim())
                .filter(Boolean);
        }

        /*
         * Compatibilidade com dados antigos, quando existia somente
         * a propriedade "premio".
         */
        if (typeof data.premio === 'string' && data.premio.trim()) {
            return [data.premio.trim()];
        }

        return [];
    } catch {
        return [];
    }
}

function setRodadaPremios(rodada, premios) {
    const saved = localStorage.getItem(storageKey(rodada));

    let data = {};

    try {
        data = saved ? JSON.parse(saved) : {};
    } catch {
        data = {};
    }

    data.premios = premios
        .map(premio => String(premio).trim())
        .filter(Boolean);

    // Remove o formato antigo.
    delete data.premio;

    localStorage.setItem(
        storageKey(rodada),
        JSON.stringify(data)
    );
}

function addRodadaPremio(rodada, premio) {
    const texto = String(premio || '').trim();

    if (!texto) {
        return false;
    }

    const premios = getRodadaPremios(rodada);

    premios.push(texto);
    setRodadaPremios(rodada, premios);

    return true;
}

function removeRodadaPremio(rodada, indice) {
    const premios = getRodadaPremios(rodada);

    if (indice < 0 || indice >= premios.length) {
        return;
    }

    premios.splice(indice, 1);
    setRodadaPremios(rodada, premios);
}

function getRodadaPremiosDisponiveis(rodada) {
    const disponiveis = [...getRodadaPremios(rodada)];
    const winners = loadWinners(rodada);

    /*
     * Remove da lista um prêmio para cada vencedor que já recebeu
     * aquele prêmio. Funciona inclusive quando há prêmios repetidos.
     */
    winners.forEach(winner => {
        if (!winner.premio) {
            return;
        }

        const indice = disponiveis.indexOf(winner.premio);

        if (indice !== -1) {
            disponiveis.splice(indice, 1);
        }
    });

    return disponiveis;
}

function populateWinnerPrizeSelect(rodada) {
    const select = document.getElementById('winnerPrizeSelect');

    if (!select) {
        return;
    }

    const premios = getRodadaPremiosDisponiveis(rodada);

    select.innerHTML = `
        <option value="">Sem prêmio associado</option>
    `;

    premios.forEach((premio, indice) => {
        const option = document.createElement('option');

        option.value = premio;
        option.textContent = `🎁 ${premio}`;

        /*
         * Facilita a identificação visual quando existem dois
         * prêmios com o mesmo nome.
         */
        const repetidosAntes = premios
            .slice(0, indice)
            .filter(item => item === premio)
            .length;

        if (repetidosAntes > 0) {
            option.textContent += ` (${repetidosAntes + 1})`;
        }

        select.appendChild(option);
    });
}

function renderPremiosSettings(rodada) {
    const container = document.getElementById('premiosList');

    if (!container) {
        return;
    }

    const premios = getRodadaPremios(rodada);

    if (premios.length === 0) {
        container.innerHTML = `
            <p class="premios-empty">
                Nenhum prêmio cadastrado para esta rodada.
            </p>
        `;

        return;
    }

    container.innerHTML = premios.map((premio, indice) => `
        <div class="premio-settings-item">
            <span class="premio-settings-number">
                ${indice + 1}º
            </span>

            <span class="premio-settings-name">
                🎁 ${escapeHTML(premio)}
            </span>

            <button
                type="button"
                class="premio-row-remove"
                data-premio-index="${indice}"
                aria-label="Remover prêmio ${escapeHTML(premio)}"
                title="Remover prêmio"
            >
                ✕
            </button>
        </div>
    `).join('');

    container
        .querySelectorAll('[data-premio-index]')
        .forEach(button => {
            button.addEventListener('click', () => {
                const indice = Number(button.dataset.premioIndex);

                removeRodadaPremio(rodada, indice);
                renderPremiosSettings(rodada);
                renderWinnersPodium();
            });
        });
const STORAGE_PREMIOS_MAPA = 'bingo-premios-mapa';

function loadPremiosMapa() {
    const saved = localStorage.getItem(STORAGE_PREMIOS_MAPA);
    return saved ? JSON.parse(saved) : {};
}

function savePremiosMapa(mapa) {
    localStorage.setItem(STORAGE_PREMIOS_MAPA, JSON.stringify(mapa));
}

function getRodadaPremios(r) {
    const mapa = loadPremiosMapa();
    const v = mapa[r];
    if (Array.isArray(v)) return v.map(p => (p || '').trim()).filter(Boolean);
    if (typeof v === 'string' && v.trim()) return [v.trim()];
    const d = localStorage.getItem(storageKey(r));
    if (!d) return [];
    const legacy = JSON.parse(d).premio;
    return legacy ? [legacy] : [];
}

function setRodadaPremios(r, premios) {
    const mapa = loadPremiosMapa();
    const clean = premios.map(p => (p || '').trim()).filter(Boolean);
    mapa[r] = clean;
    savePremiosMapa(mapa);
}

function getTotalRodadasConfig() {
    return parseInt(localStorage.getItem('bingo-total-rodadas')) || 10;
}

function collectRoundPremiosFromDOM(r) {
    const inputs = document.querySelectorAll(`.premio-items[data-rodada="${r}"] .premio-input`);
    return Array.from(inputs).map(inp => inp.value);
}

function premioRowHTML(r, valor) {
    return `
        <div class="premio-row" data-rodada="${r}">
            <input type="text" class="modal-input premio-input" data-rodada="${r}" value="${escapeHTML(valor)}" placeholder="Ex: Caixa de paçoca" maxlength="60">
            <button class="btn-icon premio-row-remove" data-rodada="${r}" title="Remover prêmio" aria-label="Remover prêmio">🗑</button>
        </div>
    `;
}

function renderPremiosSettingsList() {
    const container = document.getElementById('premiosList');
    const mapa = loadPremiosMapa();
    const total = getTotalRodadasConfig();
    const rounds = [];
    for (let r = 1; r <= total; r++) rounds.push(r);
    Object.keys(mapa)
        .map(Number)
        .filter(r => r > total)
        .sort((a, b) => a - b)
        .forEach(r => rounds.push(r));

    container.innerHTML = rounds.map(r => {
        const premios = getRodadaPremios(r);
        const items = premios.length ? premios : [''];
        return `
            <div class="premio-round-group" data-rodada="${r}">
                <div class="premio-round-header">
                    <span class="premio-row-label">Rodada ${r}</span>
                    <button class="btn-icon premio-row-add" data-rodada="${r}" title="Adicionar outro prêmio" aria-label="Adicionar outro prêmio">➕</button>
                </div>
                <div class="premio-items" data-rodada="${r}">${items.map(p => premioRowHTML(r, p)).join('')}</div>
            </div>
        `;
    }).join('');
}

// ── Tela inicial ───────────────────────────────

function startGame() {
    const selected = document.querySelectorAll('#startScreen .win-type-card.selected');
    const tipo = Array.from(selected).map(c => c.dataset.tipo);
    if (tipo.length === 0) {
        flashWinTypeGridError('#startScreen');
        return;
    }

    localStorage.setItem(storageKey(1), JSON.stringify({
        sorteados: [], tipo, encerrada: false, premios: [],
    }));

    const screen = document.getElementById('startScreen');
    screen.classList.add('hiding');
    setTimeout(() => {
        screen.classList.remove('visible', 'hiding');
        loadState();
        render(null);
    }, 520);
}

// ── Lógica de sorteio ──────────────────────────

function drawNumber() {
    if (available.length === 0) {
        showResult('🎪', 'Todos sorteados!', `Todos os ${TOTAL_NUMBERS} números já foram sorteados nesta rodada.`);
        return;
    }
    const idx = Math.floor(Math.random() * available.length);
    const n = available.splice(idx, 1)[0];
    sorteados.push(n);
    saveState();
    animateDraw(n, () => render(n));
}

function animateDraw(finalNumber, onComplete) {
    const ballEl   = document.getElementById('currentBall');
    const letterEl = document.getElementById('ballLetter');
    const numberEl = document.getElementById('ballNumber');
    const caption  = document.getElementById('ballCaption');

    // Bloqueia controles durante animação
    document.getElementById('drawBtn').disabled = true;
    document.getElementById('undoBtn').disabled = true;

    ballEl.className = 'current-ball spinning';
    delete ballEl.dataset.letter;
    caption.textContent = 'Sorteando...';

    const TOTAL_MS = 3500;
    let elapsed = 0;
    let delay = 45;

    function tick() {
        // Exibe número aleatório enquanto rola
        const rand = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        const letter = getBingoLetter(rand);
        letterEl.textContent = letter;
        numberEl.textContent = rand;
        ballEl.dataset.letter = letter;

        elapsed += delay;
        if (elapsed >= TOTAL_MS) {
            ballEl.className = 'current-ball';
            onComplete();
            return;
        }

        // Desacelera progressivamente (começa em 45ms, termina em ~420ms)
        delay = Math.round(45 + (elapsed / TOTAL_MS) * 375);
        setTimeout(tick, delay);
    }

    setTimeout(tick, delay);
}

function undoLast() {
    if (sorteados.length === 0) return;
    const last = sorteados[sorteados.length - 1];
    showConfirm(
        'Desfazer último sorteio?',
        `O número ${getBingoLetter(last)}-${last} será removido.`,
        () => {
            sorteados.pop();
            available.push(last);
            available.sort((a, b) => a - b);
            saveState();
            render(null);
        }
    );
}

function endRound() {
    showConfirm(
        `Encerrar Rodada ${rodadaAtual}?`,
        'A rodada atual será encerrada. Você poderá criar a próxima em seguida.',
        () => {
            const data = JSON.parse(localStorage.getItem(storageKey(rodadaAtual))) || {};
            data.encerrada = true;
            localStorage.setItem(storageKey(rodadaAtual), JSON.stringify(data));
            openCreateRoundModal();
        }
    );
}

function openCreateRoundModal() {
    const proxima = rodadaAtual + 1;
    document.getElementById('createRoundNumber').textContent = proxima;
    document.querySelectorAll('#createRoundModal .win-type-card').forEach(c => c.classList.remove('selected'));
    openModal('createRoundModal');
}

function confirmCreateRound() {
    const selected = document.querySelectorAll('#createRoundModal .win-type-card.selected');
    const tipo = Array.from(selected).map(c => c.dataset.tipo);
    if (tipo.length === 0) {
        flashWinTypeGridError('#createRoundModal');
        return;
    }

    const proxima = rodadaAtual + 1;

    localStorage.setItem(storageKey(proxima), JSON.stringify({
        sorteados: [],
        tipo,
        encerrada: false,
        premios: [],
    }));

    rodadaAtual = proxima;
    sorteados   = [];
    available   = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    rodadaVisualizando = null;

    saveState();
    closeModal('createRoundModal');
    render(null);
    renderWinnersMini();
}

function restartAll() {
    showConfirm(
        '⚠️ Reiniciar todo o evento?',
        'Todos os sorteios de todas as rodadas serão apagados permanentemente.',
        () => {
            let i = 1;
            while (localStorage.getItem(storageKey(i))) {
                localStorage.removeItem(storageKey(i));
                localStorage.removeItem(`bingo-cartelas-rodada-${i}`);
                localStorage.removeItem(winnersKey(i));
                i++;
            }
            localStorage.removeItem(STORAGE_RODADA_ATUAL);
            rodadaAtual = 1;
            sorteados   = [];
            available   = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
            rodadaVisualizando = null;

            const screen = document.getElementById('startScreen');
            screen.classList.remove('hiding');
            screen.classList.add('visible');
            document.querySelectorAll('#startScreen .win-type-card').forEach((c, i) => {
                c.classList.toggle('selected', i === 0);
            });
            renderWinnersMini();
        }
    );
}

// ── Navegação por rodadas (somente leitura) ────

function viewRound(r) {
    if (r < 1) return;
    rodadaVisualizando = r;
    renderViewMode();
}

function returnToCurrentRound() {
    rodadaVisualizando = null;
    render(sorteados.length > 0 ? sorteados[sorteados.length - 1] : null);
}

function renderViewMode() {
    const r = rodadaVisualizando;
    const viewSorteados = loadRodadaSorteados(r);
    const isEncerrada = (() => {
        const d = localStorage.getItem(storageKey(r));
        return d ? (JSON.parse(d).encerrada || false) : false;
    })();

    // Banner de leitura
    const banner = document.getElementById('viewModeBanner');
    banner.style.display = 'block';
    banner.textContent = `Visualizando Rodada ${r} — ${isEncerrada ? 'ENCERRADA' : 'em andamento'} (somente leitura)`;

    document.getElementById('returnBtn').style.display = 'inline-block';

    // Round label
    document.getElementById('roundLabel').textContent = `Rodada ${r}`;

    // Bola
    const lastDrawn = viewSorteados[viewSorteados.length - 1];
    if (lastDrawn !== undefined) {
        document.getElementById('ballLetter').textContent = getBingoLetter(lastDrawn);
        document.getElementById('ballNumber').textContent = lastDrawn;
        document.getElementById('ballCaption').textContent = `${viewSorteados.length} de ${TOTAL_NUMBERS} sorteados`;
        document.getElementById('currentBall').classList.remove('idle', 'animate');
    } else {
        resetBall();
    }

    // Tabuleiro (somente leitura)
    renderBoardData(viewSorteados, true);

    // Histórico
    renderHistoryData(viewSorteados);

    // Navegação
    const prevBtn = document.getElementById('prevRoundBtn');
    const nextBtn = document.getElementById('nextRoundBtn');
    prevBtn.disabled = r <= 1;
    nextBtn.disabled = r >= rodadaAtual;

    // Controles desabilitados
    setControlsDisabled(true);

    updateRoundBadges(r);
    renderWinnersMini();
}

// ── Toggle manual de pedra ─────────────────────

function toggleManual(n) {
    if (rodadaVisualizando !== null) return;
    if (sorteados.includes(n)) {
        showConfirm(
            `Remover ${getBingoLetter(n)}-${n}?`,
            'Esse número será desmarcado como sorteado.',
            () => {
                sorteados = sorteados.filter(x => x !== n);
                available.push(n);
                available.sort((a, b) => a - b);
                saveState();
                render(null);
            }
        );
    } else {
        sorteados.push(n);
        available = available.filter(x => x !== n);
        saveState();
        render(n);
    }
}

// ── Desempate por pedra maior ───────────────────────────────────────────────

function openTieBreakModal() {
    document.getElementById('tieBreakWinnerStatus').style.display = 'none';
    document.getElementById('tieBreakWinnerName').value = '';
    renderTieBreak(null);
    openModal('tieBreakModal');
    if (tieBreakWebcamEnabled) {
        startTieBreakWebcam();
    } else {
        const placeholder = document.getElementById('tieBreakCameraPlaceholder');
        const status = document.getElementById('tieBreakCameraStatus');
        if (placeholder) placeholder.style.display = 'flex';
        if (status) status.textContent = 'Webcam desligada manualmente.';
        updateTieBreakCameraToggle();
    }
}

function drawTieBreakNumber() {
    if (tieBreakAvailable.length === 0) {
        document.getElementById('tieBreakSummary').textContent =
            `Todas as ${TOTAL_NUMBERS} pedras já foram sorteadas no desempate.`;
        return;
    }

    const idx = Math.floor(Math.random() * tieBreakAvailable.length);
    const n = tieBreakAvailable.splice(idx, 1)[0];
    tieBreakSorteados.push(n);
    animateTieBreakDraw(n, () => renderTieBreak(n));
}

function animateTieBreakDraw(finalNumber, onComplete) {
    const ballEl   = document.getElementById('tieBreakBall');
    const letterEl = document.getElementById('tieBreakBallLetter');
    const numberEl = document.getElementById('tieBreakBallNumber');
    const caption  = document.getElementById('tieBreakCaption');
    const drawBtn  = document.getElementById('tieBreakDrawBtn');
    const resetBtn = document.getElementById('tieBreakResetBtn');

    drawBtn.disabled = true;
    resetBtn.disabled = true;

    delete ballEl.dataset.letter;
    letterEl.textContent = '';

    const countdown = [3, 2, 1];
    let countdownIndex = 0;

    function countdownTick() {
        const value = countdown[countdownIndex];
        ballEl.className = 'current-ball tie-break-countdown';
        numberEl.textContent = value;
        caption.textContent = `Sorteando em ${value}...`;
        countdownIndex++;

        if (countdownIndex < countdown.length) {
            setTimeout(countdownTick, 820);
            return;
        }

        setTimeout(startRolling, 820);
    }

    function startRolling() {
        ballEl.className = 'current-ball spinning';
        caption.textContent = 'Valendo!';
        tick();
    }

    const TOTAL_MS = 1600;
    let elapsed = 0;
    let delay = 45;

    function tick() {
        const rand = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
        const letter = getBingoLetter(rand);
        letterEl.textContent = letter;
        numberEl.textContent = rand;
        ballEl.dataset.letter = letter;

        elapsed += delay;
        if (elapsed >= TOTAL_MS) {
            ballEl.className = 'current-ball';
            onComplete();
            resetBtn.disabled = false;
            return;
        }

        delay = Math.round(45 + (elapsed / TOTAL_MS) * 340);
        setTimeout(tick, delay);
    }

    countdownTick();
}

function renderTieBreak(lastDrawn) {
    const drawBtn = document.getElementById('tieBreakDrawBtn');
    const resetBtn = document.getElementById('tieBreakResetBtn');
    const ballEl = document.getElementById('tieBreakBall');
    const letterEl = document.getElementById('tieBreakBallLetter');
    const numberEl = document.getElementById('tieBreakBallNumber');
    const caption = document.getElementById('tieBreakCaption');
    const summary = document.getElementById('tieBreakSummary');

    drawBtn.disabled = tieBreakAvailable.length === 0;
    resetBtn.disabled = tieBreakSorteados.length === 0;

    const last = lastDrawn !== null ? lastDrawn : tieBreakSorteados[tieBreakSorteados.length - 1];
    if (last !== undefined) {
        const letter = getBingoLetter(last);
        letterEl.textContent = letter;
        numberEl.textContent = last;
        caption.textContent = `${tieBreakSorteados.length} pedra${tieBreakSorteados.length === 1 ? '' : 's'} sorteada${tieBreakSorteados.length === 1 ? '' : 's'} no desempate`;
        ballEl.className = 'current-ball active';
        ballEl.dataset.letter = letter;
        if (lastDrawn !== null) {
            void ballEl.offsetWidth;
            ballEl.classList.add('animate');
        }
    } else {
        letterEl.textContent = '';
        numberEl.textContent = '?';
        caption.textContent = 'Aguardando desempate';
        ballEl.className = 'current-ball idle';
        delete ballEl.dataset.letter;
    }

    renderTieBreakHistory();

    const winnerBox = document.getElementById('tieBreakWinnerBox');

    if (tieBreakSorteados.length === 0) {
        summary.textContent = 'Nenhuma pedra sorteada ainda.';
        winnerBox.style.display = 'none';
        return;
    }

    const maior = Math.max(...tieBreakSorteados);
    const pos = tieBreakSorteados.indexOf(maior) + 1;
    summary.textContent = `Maior até agora: ${getBingoLetter(maior)}-${maior} (finalista ${pos}).`;

    document.getElementById('tieBreakWinnerBall').textContent = `${getBingoLetter(maior)}-${maior}`;
    winnerBox.style.display = 'flex';
}

function renderTieBreakHistory() {
    const histList = document.getElementById('tieBreakHistory');
    histList.innerHTML = '';
    if (tieBreakSorteados.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'history-empty';
        empty.textContent = 'Nenhuma pedra sorteada ainda';
        histList.appendChild(empty);
        return;
    }

    const maior = Math.max(...tieBreakSorteados);
    tieBreakSorteados.forEach((n, i) => {
        const letter = getBingoLetter(n);
        const chip = document.createElement('span');
        chip.className = 'history-chip tie-break-chip' + (n === maior ? ' tie-break-highest' : '');
        chip.dataset.letter = letter;
        chip.textContent = `${i + 1}º: ${letter}-${n}`;
        histList.appendChild(chip);
    });
}

function resetTieBreak() {
    tieBreakSorteados = [];
    tieBreakAvailable = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    document.getElementById('tieBreakWinnerStatus').style.display = 'none';
    document.getElementById('tieBreakWinnerName').value = '';
    renderTieBreak(null);
}

function updateTieBreakCameraToggle() {
    const btn = document.getElementById('tieBreakCameraToggleBtn');
    if (!btn) return;
    const isOn = tieBreakWebcamEnabled && !!(tieBreakCameraStream && tieBreakCameraStream.active);
    const label = btn.querySelector('.tie-break-toggle-label');
    if (label) label.textContent = isOn ? 'Ligada' : 'Desligada';
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    btn.classList.toggle('is-on', isOn);
    btn.classList.toggle('is-off', !isOn);
}

function toggleTieBreakWebcam() {
    if (tieBreakCameraStream && tieBreakCameraStream.active) {
        tieBreakWebcamEnabled = false;
        stopTieBreakWebcam();
        const placeholder = document.getElementById('tieBreakCameraPlaceholder');
        const status = document.getElementById('tieBreakCameraStatus');
        if (placeholder) placeholder.style.display = 'flex';
        if (status) status.textContent = 'Webcam desligada manualmente.';
        return;
    }

    tieBreakWebcamEnabled = true;
    startTieBreakWebcam();
}

async function startTieBreakWebcam() {
    const video = document.getElementById('tieBreakWebcam');
    const placeholder = document.getElementById('tieBreakCameraPlaceholder');
    const status = document.getElementById('tieBreakCameraStatus');

    if (!tieBreakWebcamEnabled) {
        if (placeholder) placeholder.style.display = 'flex';
        if (status) status.textContent = 'Webcam desligada manualmente.';
        updateTieBreakCameraToggle();
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'Webcam não disponível neste navegador.';
        placeholder.style.display = 'flex';
        updateTieBreakCameraToggle();
        return;
    }

    if (tieBreakCameraStream && tieBreakCameraStream.active) {
        video.srcObject = tieBreakCameraStream;
        placeholder.style.display = 'none';
        status.textContent = 'Webcam ativa para conferir as pedras.';
        updateTieBreakCameraToggle();
        return;
    }
    status.textContent = 'Solicitando acesso à webcam...';
    placeholder.style.display = 'flex';

    try {
        tieBreakCameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = tieBreakCameraStream;
        placeholder.style.display = 'none';
        status.textContent = 'Webcam ativa para conferir as pedras.';
    } catch (err) {
        status.textContent = 'Não foi possível ativar a webcam. Verifique a permissão do navegador.';
        placeholder.style.display = 'flex';
    }
    updateTieBreakCameraToggle();
}

function stopTieBreakWebcam() {
    if (tieBreakCameraStream) {
        tieBreakCameraStream.getTracks().forEach(track => track.stop());
        tieBreakCameraStream = null;
    }

    const video = document.getElementById('tieBreakWebcam');
    if (video) video.srcObject = null;
    updateTieBreakCameraToggle();
}

// ── Verificar vencedor ─────────────────────────

function verifyWinner() {
    const input = document.getElementById('verifySerial');
    const serial = parseInt(input.value);
    if (isNaN(serial) || serial < 1 || serial > 500) {
        input.style.borderColor = 'var(--vermelho)';
        return;
    }
    closeModal('verifyModal');

    const rodadaRef = rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual;
    const sorteadosRef = rodadaVisualizando !== null ? loadRodadaSorteados(rodadaVisualizando) : sorteados;

    const cartelasData = localStorage.getItem(`bingo-cartelas-rodada-${rodadaRef}`);
    if (!cartelasData) {
        showResult('⚠️', 'Cartelas não encontradas', `As cartelas da Rodada ${rodadaRef} não foram geradas neste dispositivo ou foram apagadas.`);
        return;
    }

    const { cards } = JSON.parse(cartelasData);
    const card = cards[serial - 1];
    if (!card) {
        showResult('❌', 'Cartela não encontrada', `A cartela #${String(serial).padStart(4, '0')} não existe nesta rodada.`);
        return;
    }

    const tipoRodada = getRodadaTipo(rodadaRef);
    const won = checkWin(card, sorteadosRef, tipoRodada);
    const serialStr = String(serial).padStart(4, '0');
    const winningCells = won ? getWinningPatternCells(card, sorteadosRef, tipoRodada) : null;
    const thumbHTML = renderCardGridHTML(card, sorteadosRef, winningCells);
    if (won) {
        showResult('🏆', 'BINGO!', `A cartela #${serialStr} da Rodada ${rodadaRef} é vencedora!`, thumbHTML, rodadaRef, serial);
    } else {
        showResult('❌', 'Ainda não!', `A cartela #${serialStr} ainda não completou todos os números.`, thumbHTML);
    }
}

// ── Renderização ───────────────────────────────

function render(lastDrawn) {
    const banner = document.getElementById('viewModeBanner');
    banner.style.display = 'none';
    document.getElementById('returnBtn').style.display = 'none';

    document.getElementById('roundLabel').textContent = `Rodada ${rodadaAtual}`;

    if (lastDrawn === null) {
        const last = sorteados[sorteados.length - 1];
        if (last !== undefined) {
            const ballEl = document.getElementById('currentBall');
            const letter = getBingoLetter(last);
            document.getElementById('ballLetter').textContent = letter;
            document.getElementById('ballNumber').textContent = last;
            document.getElementById('ballCaption').textContent = `${sorteados.length} de ${TOTAL_NUMBERS} sorteados`;
            ballEl.className = 'current-ball active';
            ballEl.dataset.letter = letter;
        } else {
            resetBall();
        }
    } else {
        const ballEl = document.getElementById('currentBall');
        const letter = getBingoLetter(lastDrawn);
        document.getElementById('ballLetter').textContent = letter;
        document.getElementById('ballNumber').textContent = lastDrawn;
        document.getElementById('ballCaption').textContent = `${sorteados.length} de ${TOTAL_NUMBERS} sorteados`;
        ballEl.className = 'current-ball active';
        ballEl.dataset.letter = letter;
        void ballEl.offsetWidth;
        ballEl.classList.add('animate');
    }

    renderBoardData(sorteados, false);
    renderHistoryData(sorteados);
    renderControls();
    renderWinnersMini();

    const prevBtn = document.getElementById('prevRoundBtn');
    const nextBtn = document.getElementById('nextRoundBtn');
    prevBtn.disabled = rodadaAtual <= 1;
    nextBtn.disabled = true;
    setControlsDisabled(false);
}

function resetBall() {
    document.getElementById('ballLetter').textContent = '';
    document.getElementById('ballNumber').textContent = '?';
    document.getElementById('ballCaption').textContent = 'Nenhuma pedra sorteada';
    const ballEl = document.getElementById('currentBall');
    ballEl.classList.add('idle');
    ballEl.classList.remove('animate');
}

function renderBoardData(drawnList, readOnly) {
    const board = document.getElementById('bingoBoard');
    board.innerHTML = '';
    const drawn = new Set(drawnList);

    for (const { letter, min, max } of RANGES) {
        const label = document.createElement('div');
        label.className = 'board-letter';
        label.dataset.letter = letter;
        label.textContent = letter;
        board.appendChild(label);

        for (let n = min; n <= max; n++) {
            const ball = document.createElement('div');
            ball.className = 'board-ball' + (drawn.has(n) ? ' drawn' : '');
            ball.dataset.letter = letter;
            ball.textContent = n;
            if (!readOnly) {
                ball.title = `${letter}-${n} — clique para marcar/desmarcar`;
                ball.addEventListener('click', () => toggleManual(n));
            } else {
                ball.style.cursor = 'default';
            }
            board.appendChild(ball);
        }
    }
}

function renderHistoryData(list) {
    const histList = document.getElementById('historyList');
    const count = document.getElementById('historyFloatCount');

    if (count) {
        count.textContent = `(${list.length})`;
    }

    histList.innerHTML = '';

    if (list.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'history-empty';
        empty.textContent = 'Nenhuma pedra sorteada ainda';
        histList.appendChild(empty);
    } else {
        list.forEach(n => {
            const letter = getBingoLetter(n);
            const chip = document.createElement('span');
            chip.className = 'history-chip';
            chip.dataset.letter = letter;
            chip.textContent = `${letter}-${n}`;
            histList.appendChild(chip);
        });
    }

    list.forEach(n => {
        const letter = getBingoLetter(n);
        const chip = document.createElement('span');

        chip.className = 'history-chip';
        chip.dataset.letter = letter;
        chip.textContent = `${letter}-${n}`;

        histList.appendChild(chip);
    });
    document.getElementById('historyToggle').textContent = `👁 Ver pedras sorteadas (${list.length})`;
}

function renderControls() {
    document.getElementById('undoBtn').disabled = sorteados.length === 0;
    document.getElementById('drawBtn').disabled = available.length === 0;
    document.getElementById('endRoundBtn').textContent =
        `Encerrar Rodada ${rodadaAtual} e Criar Próxima ▶`;
    updateRoundBadges(rodadaAtual);
}

function updateRoundBadges(rodada) {
    const tipos = getRodadaTipo(rodada);
    const labels = tipos.map(tipo => WIN_TYPES[tipo] || tipo);

    const badgeText = labels.length <= 2
        ? labels.join(' + ')
        : `${labels.length} tipos de vitória`;

    const badge = document.getElementById('roundTipoBadge');

    badge.textContent = `🏆 ${badgeText}`;
    badge.title = labels.join(', ');
    const labels = tipos.map(t => WIN_TYPES[t] || t);
    const badgeText = labels.length <= 2 ? labels.join(' + ') : `${labels.length} tipos de vitória`;
    document.getElementById('roundTipoBadge').textContent = `🏆 ${badgeText}`;
    document.getElementById('roundTipoBadge').title = labels.join(', ');

    const premios = getRodadaPremios(rodada);
    const premioTicket = document.getElementById('roundPremioTicket');
    if (premios.length) {
        document.getElementById('roundPremioText').innerHTML = premios.map(p => escapeHTML(p)).join('<br>');
        premioTicket.style.display = 'flex';
    } else {
        premioTicket.style.display = 'none';
    }
}

function openChangeTipoModal() {
    const tiposAtuais = getRodadaTipo(rodadaAtual);
    document.querySelectorAll('#changeTipoModal .win-type-card').forEach(c => {
        c.classList.toggle('selected', tiposAtuais.includes(c.dataset.tipo));
    });
    openModal('changeTipoModal');
}

function confirmChangeTipo() {
    const selected = document.querySelectorAll('#changeTipoModal .win-type-card.selected');
    const tipo = Array.from(selected).map(c => c.dataset.tipo);
    if (tipo.length === 0) {
        flashWinTypeGridError('#changeTipoModal');
        return;
    }
    const data = JSON.parse(localStorage.getItem(storageKey(rodadaAtual))) || {};
    data.tipo = tipo;
    localStorage.setItem(storageKey(rodadaAtual), JSON.stringify(data));
    closeModal('changeTipoModal');
    renderControls();
}

function flashWinTypeGridError(scopeSelector) {
    const grid = document.querySelector(`${scopeSelector} .win-type-grid`);
    if (!grid) return;
    grid.classList.add('win-type-grid-error');
    setTimeout(() => grid.classList.remove('win-type-grid-error'), 600);
}

function setControlsDisabled(disabled) {
    ['drawBtn', 'undoBtn', 'verifyBtn', 'endRoundBtn', 'tieBreakBtn'].forEach(id => {
        document.getElementById(id).disabled = disabled;
    });
}

// ── Modais ─────────────────────────────────────

let _confirmCallback = null;

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    _confirmCallback = onConfirm;
    openModal('confirmModal');
}

function showResult(icon, title, message, cardThumbHTML, rodadaRef, serial) {
    document.getElementById('resultIcon').textContent = icon;
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = message;
    const thumb = document.getElementById('resultCardThumb');
    if (cardThumbHTML) {
        thumb.innerHTML = cardThumbHTML;
        thumb.style.display = 'block';
    } else {
        thumb.innerHTML = '';
        thumb.style.display = 'none';
    }

    const nameBox = document.getElementById('winnerNameBox');
    const nameInput = document.getElementById('winnerNameInput');
    if (rodadaRef !== undefined && serial !== undefined) {
        nameInput.value = '';

        nameBox.style.display = 'flex';
        nameBox.dataset.rodada = rodadaRef;
        nameBox.dataset.serial = serial;

        populateWinnerPrizeSelect(rodadaRef);
        renderWinnersRank(rodadaRef);
        renderWinnersMini();
    } else {
        nameBox.style.display = 'none';
        document.getElementById('winnersRank').style.display = 'none';
    }

    openModal('resultModal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'tieBreakModal') {
        const placeholder = document.getElementById('tieBreakCameraPlaceholder');
        const status = document.getElementById('tieBreakCameraStatus');
        if (placeholder) placeholder.style.display = 'flex';
        if (status) status.textContent = 'A webcam será ativada ao abrir o desempate.';
    }
}

function addPremioPelasConfiguracoes() {
    const rodadaRef = rodadaVisualizando !== null
        ? rodadaVisualizando
        : rodadaAtual;

    const input = document.getElementById('premioInput');

    if (!addRodadaPremio(rodadaRef, input.value)) {
        input.focus();
        return;
    }

    input.value = '';

    renderPremiosSettings(rodadaRef);
    renderWinnersPodium();

    input.focus();
}

document
    .getElementById('premioAdd')
    .addEventListener('click', addPremioPelasConfiguracoes);

document
    .getElementById('premioInput')
    .addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addPremioPelasConfiguracoes();
        }
    });

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const hasGame = !!localStorage.getItem(storageKey(1)) || !!localStorage.getItem(STORAGE_RODADA_ATUAL);
    if (hasGame) {
        loadState();
        if (sorteados.length > 0) {
            render(sorteados[sorteados.length - 1]);
        } else {
            render(null);
        }
    } else {
        document.getElementById('startScreen').classList.add('visible');
    }

    const hideSortear = localStorage.getItem(STORAGE_HIDE_SORTEAR) === 'true';
    document.getElementById('hideSortearToggle').checked = hideSortear;
    document.body.classList.toggle('hide-sortear', hideSortear);

    document.getElementById('settingsBtn').addEventListener('click', () => {
        const rodadaRef = rodadaVisualizando !== null
            ? rodadaVisualizando
            : rodadaAtual;
        document.getElementById('premioRodadaLabel').textContent =
            rodadaRef;
        document.getElementById('premioInput').value = '';
        renderPremiosSettings(rodadaRef);
        document.getElementById('importBackupError').style.display =
            'none';
        renderPremiosSettingsList();
        document.getElementById('importBackupError').style.display = 'none';
        openModal('settingsModal');
    });
    document.getElementById('settingsClose').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('hideSortearToggle').addEventListener('change', e => {
        localStorage.setItem(STORAGE_HIDE_SORTEAR, e.target.checked);
        document.body.classList.toggle('hide-sortear', e.target.checked);
    });

    document.getElementById('premiosList').addEventListener('change', e => {
        if (!e.target.matches('.premio-input')) return;
        const r = e.target.dataset.rodada;
        setRodadaPremios(r, collectRoundPremiosFromDOM(r));
        updateRoundBadges(rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual);
    });
    document.getElementById('premiosList').addEventListener('click', e => {
        const addBtn = e.target.closest('.premio-row-add');
        if (addBtn) {
            const r = addBtn.dataset.rodada;
            const itemsContainer = document.querySelector(`.premio-items[data-rodada="${r}"]`);
            itemsContainer.insertAdjacentHTML('beforeend', premioRowHTML(r, ''));
            itemsContainer.lastElementChild.querySelector('.premio-input').focus();
            return;
        }
        const removeBtn = e.target.closest('.premio-row-remove');
        if (removeBtn) {
            const r = removeBtn.dataset.rodada;
            removeBtn.closest('.premio-row').remove();
            setRodadaPremios(r, collectRoundPremiosFromDOM(r));
            renderPremiosSettingsList();
            updateRoundBadges(rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual);
        }
    });
    document.getElementById('premioAddRoundBtn').addEventListener('click', () => {
        const input = document.getElementById('premioAddRoundInput');
        const r = parseInt(input.value);
        if (!r || r < 1) return;
        const mapa = loadPremiosMapa();
        if (!(r in mapa)) mapa[r] = [];
        savePremiosMapa(mapa);
        input.value = '';
        renderPremiosSettingsList();
    });

    document.getElementById('exportBackupBtn').addEventListener('click', () => exportBackup());
    document.getElementById('importBackupBtn').addEventListener('click', () => {
        document.getElementById('importBackupFile').click();
    });
    document.getElementById('importBackupFile').addEventListener('change', e => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        showConfirm(
            'Importar backup?',
            'Todos os dados atuais do evento neste dispositivo serão substituídos pelos dados do arquivo importado.',
            () => importBackup(file, msg => {
                const err = document.getElementById('importBackupError');
                err.textContent = msg;
                err.style.display = 'block';
            })
        );
    });

    document.getElementById('startImportBtn').addEventListener('click', () => {
        document.getElementById('startImportFile').click();
    });
    document.getElementById('startImportFile').addEventListener('change', e => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        showConfirm(
            'Importar backup?',
            'Os dados do arquivo importado serão usados para este evento neste dispositivo.',
            () => importBackup(file, msg => alert(msg))
        );
    });

    const historyFloat = document.getElementById('historyFloat');
    const historyFloatToggle = document.getElementById('historyFloatToggle');

    const historyCollapsed =
        localStorage.getItem(STORAGE_HISTORY_FLOAT_COLLAPSED) === 'true';

    historyFloat.classList.toggle('collapsed', historyCollapsed);

    historyFloatToggle.setAttribute(
        'aria-expanded',
        String(!historyCollapsed)
    );

    historyFloatToggle.addEventListener('click', () => {
        const collapsed = historyFloat.classList.toggle('collapsed');

        historyFloatToggle.setAttribute(
            'aria-expanded',
            String(!collapsed)
        );

        localStorage.setItem(
            STORAGE_HISTORY_FLOAT_COLLAPSED,
            String(collapsed)
        );
    });
    document.getElementById('winnersFloatSeeAll').addEventListener('click', () => {
        renderAllWinnersModal();
        openModal('allWinnersModal');
    });
    document.getElementById('allWinnersClose').addEventListener('click', () => closeModal('allWinnersModal'));

    const historyList = document.getElementById('historyList');
    historyList.classList.toggle('collapsed', localStorage.getItem(STORAGE_HISTORY_COLLAPSED) !== 'false');
    document.getElementById('historyToggle').addEventListener('click', () => {
        const collapsed = historyList.classList.toggle('collapsed');
        localStorage.setItem(STORAGE_HISTORY_COLLAPSED, collapsed);
    });

    document.getElementById('winnersFloatManageBtn').addEventListener('click', () => {
        renderManageWinnersRoundOptions();
        renderManageWinnersList(currentManageWinnersRodada());
        openModal('manageWinnersModal');
    });
    document.getElementById('manageWinnersClose').addEventListener('click', () => closeModal('manageWinnersModal'));
    document.getElementById('manageWinnersRodada').addEventListener('change', () => {
        renderManageWinnersList(currentManageWinnersRodada());
    });
    document.getElementById('manageWinnersList').addEventListener('change', e => {
        const row = e.target.closest('.manage-winners-row');
        if (!row) return;
        const index = parseInt(row.dataset.index);
        const rodada = currentManageWinnersRodada();
        const nome = row.querySelector('.manage-winners-name').value;
        const serial = row.querySelector('.manage-winners-serial').value;
        updateWinner(rodada, index, { serial, nome });
        renderWinnersRank(rodada);
        renderWinnersMini();
    });
    document.getElementById('manageWinnersList').addEventListener('click', e => {
        const btn = e.target.closest('.manage-winners-remove');
        if (!btn) return;
        const rodada = currentManageWinnersRodada();
        removeWinner(rodada, parseInt(btn.dataset.index));
        renderManageWinnersList(rodada);
        renderWinnersRank(rodada);
        renderWinnersMini();
    });
    document.getElementById('manageWinnersAddBtn').addEventListener('click', () => {
        const rodada = currentManageWinnersRodada();
        const serialInput = document.getElementById('manageWinnersAddSerial');
        const nameInput = document.getElementById('manageWinnersAddName');
        const serial = serialInput.value ? parseInt(serialInput.value) : null;
        saveWinner(rodada, serial, nameInput.value);
        serialInput.value = '';
        nameInput.value = '';
        renderManageWinnersList(rodada);
        renderWinnersRank(rodada);
        renderWinnersMini();
    });

    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('drawBtn').addEventListener('click', drawNumber);
    document.getElementById('undoBtn').addEventListener('click', undoLast);
    document.getElementById('endRoundBtn').addEventListener('click', endRound);
    document.getElementById('tieBreakBtn').addEventListener('click', openTieBreakModal);
    document.getElementById('tieBreakDrawBtn').addEventListener('click', drawTieBreakNumber);
    document.getElementById('tieBreakCameraToggleBtn').addEventListener('click', toggleTieBreakWebcam);
    document.getElementById('tieBreakResetBtn').addEventListener('click', resetTieBreak);
    document.getElementById('tieBreakCloseBtn').addEventListener('click', () => closeModal('tieBreakModal'));
    document.getElementById('tieBreakWinnerSave').addEventListener('click', () => {
        const rodada = rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual;
        const nome = document.getElementById('tieBreakWinnerName').value;
        saveWinner(rodada, null, nome);
        document.getElementById('tieBreakWinnerName').value = '';
        renderWinnersRank(rodada);
        renderWinnersMini();
        const status = document.getElementById('tieBreakWinnerStatus');
        status.textContent = `🎉 ${nome.trim() || 'Vencedor'} registrado no pódio da Rodada ${rodada}!`;
        status.style.display = 'block';
    });
    document.getElementById('tieBreakWinnerName').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('tieBreakWinnerSave').click();
    });
    document.getElementById('restartBtn').addEventListener('click', restartAll);
    document.getElementById('returnBtn').addEventListener('click', returnToCurrentRound);

    document.getElementById('prevRoundBtn').addEventListener('click', () => {
        const target = rodadaVisualizando !== null ? rodadaVisualizando - 1 : rodadaAtual - 1;
        if (target >= 1) viewRound(target);
    });

    document.getElementById('nextRoundBtn').addEventListener('click', () => {
        if (rodadaVisualizando !== null && rodadaVisualizando < rodadaAtual) {
            const next = rodadaVisualizando + 1;
            if (next === rodadaAtual) {
                returnToCurrentRound();
            } else {
                viewRound(next);
            }
        }
    });

    document.getElementById('verifyBtn').addEventListener('click', () => {
        const input = document.getElementById('verifySerial');
        input.value = '';
        input.style.borderColor = '';
        openModal('verifyModal');
        setTimeout(() => input.focus(), 100);
    });

    document.getElementById('confirmOk').addEventListener('click', () => {
        closeModal('confirmModal');
        if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });
    document.getElementById('confirmCancel').addEventListener('click', () => closeModal('confirmModal'));

    document.getElementById('verifyOk').addEventListener('click', verifyWinner);
    document.getElementById('verifySerial').addEventListener('keydown', e => {
        if (e.key === 'Enter') verifyWinner();
    });
    document.getElementById('verifyCancel').addEventListener('click', () => closeModal('verifyModal'));
    document.getElementById('resultClose').addEventListener('click', () => closeModal('resultModal'));

   document
    .getElementById('winnerNameSave')
    .addEventListener('click', () => {
        const box = document.getElementById('winnerNameBox');

        const rodada = Number(box.dataset.rodada);
        const serial = Number(box.dataset.serial);

        const nome =
            document.getElementById('winnerNameInput').value;

        const premio =
            document.getElementById('winnerPrizeSelect').value;

        saveWinner(
            rodada,
            serial,
            nome,
            premio
        );

        document.getElementById('winnerNameInput').value = '';

        populateWinnerPrizeSelect(rodada);
        renderWinnersRank(rodada);
        renderWinnersMini();
    });
    document.getElementById('winnerNameInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('winnerNameSave').click();
    });

    document.getElementById('createRoundConfirm').addEventListener('click', confirmCreateRound);
    document.getElementById('createRoundCancel').addEventListener('click', () => closeModal('createRoundModal'));

    document.getElementById('roundTipoBadge').addEventListener('click', () => {
        if (rodadaVisualizando !== null) return;
        openChangeTipoModal();
    });
    document.getElementById('changeTipoConfirm').addEventListener('click', confirmChangeTipo);
    document.getElementById('changeTipoCancel').addEventListener('click', () => closeModal('changeTipoModal'));

    document.querySelectorAll('.win-type-card').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('selected'));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
});

window.addEventListener('beforeunload', stopTieBreakWebcam);
