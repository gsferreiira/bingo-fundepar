'use strict';

const MAX_RODADAS = 10;
const TOTAL_NUMBERS = 75;
const STORAGE_RODADA_ATUAL = 'bingo-rodada-atual';

let rodadaAtual = 1;
let sorteados = [];
let available = [];

// ── LocalStorage ───────────────────────────────

function storageKey(r) {
    return `bingo-rodada-${r}`;
}

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
    render(n);
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
    const isLast = rodadaAtual >= MAX_RODADAS;
    showConfirm(
        isLast ? 'Encerrar o evento?' : `Encerrar Rodada ${rodadaAtual}?`,
        isLast
            ? 'Esta é a última rodada. O evento será encerrado.'
            : `A Rodada ${rodadaAtual} será encerrada e a Rodada ${rodadaAtual + 1} começará.`,
        () => {
            const data = JSON.parse(localStorage.getItem(storageKey(rodadaAtual))) || {};
            data.encerrada = true;
            localStorage.setItem(storageKey(rodadaAtual), JSON.stringify(data));

            if (isLast) {
                showResult('🎉', 'Evento encerrado!', 'Todas as 10 rodadas foram concluídas. Parabéns!');
                return;
            }

            rodadaAtual++;
            const next = localStorage.getItem(storageKey(rodadaAtual));
            sorteados = next ? (JSON.parse(next).sorteados || []) : [];
            available = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
                .filter(n => !sorteados.includes(n));
            saveState();
            render(null);
        }
    );
}

function verifyWinner() {
    const input = document.getElementById('verifySerial');
    const serial = parseInt(input.value);
    if (isNaN(serial) || serial < 1 || serial > 500) {
        input.style.borderColor = 'var(--vermelho)';
        return;
    }
    closeModal('verifyModal');

    const card = generateCard(rodadaAtual, serial);
    const won = checkFullCard(card, sorteados);
    const serialStr = String(serial).padStart(4, '0');

    if (won) {
        showResult('🏆', 'BINGO!', `A cartela #${serialStr} da Rodada ${rodadaAtual} é vencedora!`);
    } else {
        showResult('❌', 'Ainda não!', `A cartela #${serialStr} ainda não completou todos os números.`);
    }
}

// ── Toggle manual de pedra ─────────────────────

function toggleManual(n) {
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

// ── Renderização ───────────────────────────────

function render(lastDrawn) {
    renderRoundLabel();
    renderCurrentBall(lastDrawn);
    renderBoard();
    renderHistory();
    renderControls();
}

function renderRoundLabel() {
    document.getElementById('roundLabel').textContent = `Rodada ${rodadaAtual} de ${MAX_RODADAS}`;
}

function renderCurrentBall(n) {
    const ballEl   = document.getElementById('currentBall');
    const letterEl = document.getElementById('ballLetter');
    const numberEl = document.getElementById('ballNumber');
    const captionEl = document.getElementById('ballCaption');

    // Ao desfazer, mostrar o novo último número se existir
    if (n === null) {
        const last = sorteados[sorteados.length - 1];
        if (last !== undefined) {
            letterEl.textContent = getBingoLetter(last);
            numberEl.textContent = last;
            captionEl.textContent = `${sorteados.length} de ${TOTAL_NUMBERS} sorteados`;
            ballEl.classList.remove('idle');
        } else {
            resetBall();
        }
        return;
    }

    letterEl.textContent = getBingoLetter(n);
    numberEl.textContent = n;
    captionEl.textContent = `${sorteados.length} de ${TOTAL_NUMBERS} sorteados`;
    ballEl.classList.remove('idle', 'animate');
    void ballEl.offsetWidth;
    ballEl.classList.add('animate');
}

function resetBall() {
    document.getElementById('ballLetter').textContent = '';
    document.getElementById('ballNumber').textContent = '?';
    document.getElementById('ballCaption').textContent = 'Nenhuma pedra sorteada';
    document.getElementById('currentBall').classList.add('idle');
    document.getElementById('currentBall').classList.remove('animate');
}

function renderBoard() {
    const board = document.getElementById('bingoBoard');
    board.innerHTML = '';
    const drawn = new Set(sorteados);

    for (const { letter, min, max } of RANGES) {
        const label = document.createElement('div');
        label.className = 'board-letter';
        label.textContent = letter;
        board.appendChild(label);

        for (let n = min; n <= max; n++) {
            const ball = document.createElement('div');
            ball.className = 'board-ball' + (drawn.has(n) ? ' drawn' : '');
            ball.textContent = n;
            ball.title = `${letter}-${n} — clique para marcar/desmarcar`;
            ball.addEventListener('click', () => toggleManual(n));
            board.appendChild(ball);
        }
    }
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (sorteados.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'history-empty';
        empty.textContent = 'Nenhuma pedra sorteada ainda';
        list.appendChild(empty);
        return;
    }

    sorteados.forEach(n => {
        const chip = document.createElement('span');
        chip.className = 'history-chip';
        chip.textContent = `${getBingoLetter(n)}-${n}`;
        list.appendChild(chip);
    });
}

function renderControls() {
    document.getElementById('undoBtn').disabled = sorteados.length === 0;
    document.getElementById('drawBtn').disabled = available.length === 0;

    const endBtn = document.getElementById('endRoundBtn');
    endBtn.textContent = rodadaAtual >= MAX_RODADAS
        ? '🎊 Encerrar Evento'
        : `Encerrar Rodada ${rodadaAtual} e Iniciar a Próxima ▶`;
}

// ── Modais ─────────────────────────────────────

let _confirmCallback = null;

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    _confirmCallback = onConfirm;
    openModal('confirmModal');
}

function showResult(icon, title, message) {
    document.getElementById('resultIcon').textContent = icon;
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = message;
    openModal('resultModal');
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadState();

    const lastDrawn = sorteados.length > 0 ? sorteados[sorteados.length - 1] : null;
    if (lastDrawn === null) resetBall();
    render(lastDrawn);

    document.getElementById('drawBtn').addEventListener('click', drawNumber);
    document.getElementById('undoBtn').addEventListener('click', undoLast);
    document.getElementById('endRoundBtn').addEventListener('click', endRound);

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

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('open');
        });
    });
});
