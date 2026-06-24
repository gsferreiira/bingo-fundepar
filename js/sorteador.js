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

function saveWinner(rodada, serial, nome) {
    const winners = loadWinners(rodada);
    winners.push({ serial, nome: nome.trim() || `Cartela #${String(serial).padStart(4, '0')}` });
    localStorage.setItem(winnersKey(rodada), JSON.stringify(winners));
    return winners;
}

function winnersRankItemsHTML(winners) {
    const medals = ['🥇', '🥈', '🥉'];
    return winners.map((w, i) => `
        <div class="winners-rank-item">
            <span class="winners-rank-pos">${medals[i] || (i + 1) + 'º'}</span>
            <span class="winners-rank-name">${escapeHTML(w.nome)}</span>
            <span class="winners-rank-serial">#${String(w.serial).padStart(4, '0')}</span>
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

const STORAGE_RANK_FLOAT_COLLAPSED = 'bingo-rank-float-collapsed';

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

let rodadaAtual = 1;
let sorteados = [];
let available = [];
let rodadaVisualizando = null;
let tieBreakSorteados = [];
let tieBreakAvailable = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
let tieBreakCameraStream = null;

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

function getRodadaPremio(r) {
    const d = localStorage.getItem(storageKey(r));
    if (!d) return '';
    return JSON.parse(d).premio || '';
}

function setRodadaPremio(r, premio) {
    const data = JSON.parse(localStorage.getItem(storageKey(r))) || {};
    data.premio = premio.trim();
    localStorage.setItem(storageKey(r), JSON.stringify(data));
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
        sorteados: [], tipo, encerrada: false, premio: '',
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
        premio: '',
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
    renderTieBreak(null);
    openModal('tieBreakModal');
    startTieBreakWebcam();
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

    if (tieBreakSorteados.length === 0) {
        summary.textContent = 'Nenhuma pedra sorteada ainda.';
        return;
    }

    const maior = Math.max(...tieBreakSorteados);
    const pos = tieBreakSorteados.indexOf(maior) + 1;
    summary.textContent = `Maior até agora: ${getBingoLetter(maior)}-${maior} (finalista ${pos}).`;
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
    renderTieBreak(null);
}

async function startTieBreakWebcam() {
    const video = document.getElementById('tieBreakWebcam');
    const placeholder = document.getElementById('tieBreakCameraPlaceholder');
    const status = document.getElementById('tieBreakCameraStatus');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'Webcam não disponível neste navegador.';
        placeholder.style.display = 'flex';
        return;
    }

    if (tieBreakCameraStream && tieBreakCameraStream.active) {
        video.srcObject = tieBreakCameraStream;
        placeholder.style.display = 'none';
        status.textContent = 'Webcam ativa para conferir as pedras.';
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
}

function stopTieBreakWebcam() {
    if (tieBreakCameraStream) {
        tieBreakCameraStream.getTracks().forEach(track => track.stop());
        tieBreakCameraStream = null;
    }

    const video = document.getElementById('tieBreakWebcam');
    if (video) video.srcObject = null;
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
    histList.innerHTML = '';
    if (list.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'history-empty';
        empty.textContent = 'Nenhuma pedra sorteada ainda';
        histList.appendChild(empty);
        return;
    }
    list.forEach(n => {
        const letter = getBingoLetter(n);
        const chip = document.createElement('span');
        chip.className = 'history-chip';
        chip.dataset.letter = letter;
        chip.textContent = `${letter}-${n}`;
        histList.appendChild(chip);
    });
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
    const labels = tipos.map(t => WIN_TYPES[t] || t);
    const badgeText = labels.length <= 2 ? labels.join(' + ') : `${labels.length} tipos de vitória`;
    document.getElementById('roundTipoBadge').textContent = `🏆 ${badgeText}`;
    document.getElementById('roundTipoBadge').title = labels.join(', ');

    const premio = getRodadaPremio(rodada);
    const premioTicket = document.getElementById('roundPremioTicket');
    if (premio) {
        document.getElementById('roundPremioText').textContent = premio;
        premioTicket.style.display = 'flex';
    } else {
        premioTicket.style.display = 'none';
    }
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
        const rodadaRef = rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual;
        document.getElementById('premioRodadaLabel').textContent = rodadaRef;
        document.getElementById('premioInput').value = getRodadaPremio(rodadaRef);
        document.getElementById('importBackupError').style.display = 'none';
        openModal('settingsModal');
    });
    document.getElementById('settingsClose').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('hideSortearToggle').addEventListener('change', e => {
        localStorage.setItem(STORAGE_HIDE_SORTEAR, e.target.checked);
        document.body.classList.toggle('hide-sortear', e.target.checked);
    });

    document.getElementById('premioSave').addEventListener('click', () => {
        const rodadaRef = rodadaVisualizando !== null ? rodadaVisualizando : rodadaAtual;
        setRodadaPremio(rodadaRef, document.getElementById('premioInput').value);
        updateRoundBadges(rodadaRef);
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

    const winnersFloat = document.getElementById('winnersFloat');
    winnersFloat.classList.toggle('collapsed', localStorage.getItem(STORAGE_RANK_FLOAT_COLLAPSED) === 'true');
    document.getElementById('winnersFloatToggle').addEventListener('click', () => {
        const collapsed = winnersFloat.classList.toggle('collapsed');
        localStorage.setItem(STORAGE_RANK_FLOAT_COLLAPSED, collapsed);
    });
    document.getElementById('winnersFloatSeeAll').addEventListener('click', () => {
        renderAllWinnersModal();
        openModal('allWinnersModal');
    });
    document.getElementById('allWinnersClose').addEventListener('click', () => closeModal('allWinnersModal'));

    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('drawBtn').addEventListener('click', drawNumber);
    document.getElementById('undoBtn').addEventListener('click', undoLast);
    document.getElementById('endRoundBtn').addEventListener('click', endRound);
    document.getElementById('tieBreakBtn').addEventListener('click', openTieBreakModal);
    document.getElementById('tieBreakDrawBtn').addEventListener('click', drawTieBreakNumber);
    document.getElementById('tieBreakResetBtn').addEventListener('click', resetTieBreak);
    document.getElementById('tieBreakCloseBtn').addEventListener('click', () => closeModal('tieBreakModal'));
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

    document.getElementById('winnerNameSave').addEventListener('click', () => {
        const box = document.getElementById('winnerNameBox');
        const rodada = parseInt(box.dataset.rodada);
        const serial = parseInt(box.dataset.serial);
        const nome = document.getElementById('winnerNameInput').value;
        saveWinner(rodada, serial, nome);
        document.getElementById('winnerNameInput').value = '';
        renderWinnersRank(rodada);
        renderWinnersMini();
    });
    document.getElementById('winnerNameInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('winnerNameSave').click();
    });

    document.getElementById('createRoundConfirm').addEventListener('click', confirmCreateRound);
    document.getElementById('createRoundCancel').addEventListener('click', () => closeModal('createRoundModal'));

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
