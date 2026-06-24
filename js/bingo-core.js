'use strict';

const RANGES = [
    { letter: 'B', min: 1,  max: 15 },
    { letter: 'I', min: 16, max: 30 },
    { letter: 'N', min: 31, max: 45 },
    { letter: 'G', min: 46, max: 60 },
    { letter: 'O', min: 61, max: 75 },
];

function getBingoLetter(n) {
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
}

function pickRandomColumn(min, max) {
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    const picked = [];
    for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

function cardHash(card) {
    return ['B', 'I', 'N', 'G', 'O'].map(l => card[l].join(',')).join('|');
}

// Gera uma cartela aleatória única, garantida contra o set de hashes já existentes.
function generateRandomCard(existingHashes) {
    let card, hash;
    do {
        card = {};
        for (const { letter, min, max } of RANGES) {
            card[letter] = pickRandomColumn(min, max);
        }
        hash = cardHash(card);
    } while (existingHashes && existingHashes.has(hash));
    if (existingHashes) existingHashes.add(hash);
    return card;
}

// Retorna true se todos os 24 números da cartela (exceto espaço livre N[2]) estiverem em sorteados.
function checkFullCard(card, sorteados) {
    const s = new Set(sorteados);
    for (const { letter } of RANGES) {
        const nums = card[letter];
        for (let i = 0; i < nums.length; i++) {
            if (letter === 'N' && i === 2) continue;
            if (!s.has(nums[i])) return false;
        }
    }
    return true;
}

// Retorna true se todos os 5 números (ou 4 para r = [2]) de uma linha estiverem sorteados.
function checkRows(card, sorteados) {
    const s = new Set(sorteados);
    const letters = ['B', 'I', 'N', 'G', 'O'];
    for (let row = 0; row < 5; row++) {
        let complete = true;
        for (const letter of letters) {
            if (letter === 'N' && row === 2) continue;
            if (!s.has(card[letter][row])) {
                complete = false;
                break;
            }
        }
        if (complete) return true;
    }
    return false;
}

// Retorna true se todos os 5 números (ou 4 para N) de uma coluna estiverem sorteados.
function checkColumns(card, sorteados) {
    const s = new Set(sorteados);
    for (const { letter } of RANGES) {
        let complete = true;
        for (let i = 0; i < 5; i++) {
            if (letter === 'N' && i === 2) continue;
            if (!s.has(card[letter][i])) {
                complete = false;
                break;
            }
        }
        if (complete) return true;
    }
    return false;
}

// Retorna true se os 4 cantos da cartela (B[0], O[0], B[4], O[4]) estiverem sorteados.
function checkCorners(card, sorteados) {
    const s = new Set(sorteados);
    return s.has(card.B[0]) && s.has(card.O[0]) && s.has(card.B[4]) && s.has(card.O[4]);
}

// ── Despachante de verificação ─────────────────
const WIN_TYPES = {
    diagonal: 'Diagonal',
    linha:    'Linha',
    coluna:   'Coluna',
    completa: 'Cartela Completa',
    cantos:   '4 Cantos',
};

function checkWin(card, sorteados, tipos) {
    const lista = Array.isArray(tipos) ? tipos : [tipos];
    return lista.some(tipo => {
        switch (tipo) {
            case 'linha':    return checkRows(card, sorteados);
            case 'coluna':   return checkColumns(card, sorteados);
            case 'completa': return checkFullCard(card, sorteados);
            case 'diagonal': return checkDiagonal(card, sorteados);
            case 'cantos':   return checkCorners(card, sorteados);
            default:         return false;
        }
    });
}

// Retorna true se todos os 4 números de uma diagonal estiverem sorteados.
function checkDiagonal(card, sorteados) {
    const s = new Set(sorteados);
    const letters = ['B', 'I', 'N', 'G', 'O'];
    let diagonal1 = true;
    let diagonal2 = true;
    for (let i = 0; i < 5; i++) {
        const letter1 = letters[i];
        const letter2 = letters[4 - i];
        if (!(letter1 === 'N' && i === 2)) {
            if (!s.has(card[letter1][i])) {
                diagonal1 = false;
            }
        }
        if (!(letter2 === 'N' && i === 2)) {
            if (!s.has(card[letter2][i])) {
                diagonal2 = false;
            }
        }
    }
    return diagonal1 || diagonal2;
}

// Gera o grid 5x5 de uma cartela com números sorteados marcados (para exibição, não impressão).
// winningCells (opcional): Set de chaves "letter-row" das células que compõem o padrão vencedor, para destaque extra.
function renderCardGridHTML(card, sorteados, winningCells) {
    const drawn = new Set(sorteados);
    const letters = ['B', 'I', 'N', 'G', 'O'];
    let cellsHTML = '';
    for (let row = 0; row < 5; row++) {
        for (const letter of letters) {
            if (letter === 'N' && row === 2) {
                cellsHTML += `<div class="result-card-cell result-card-free"><img src="assets/logo_fundepar.png" alt="★" class="result-card-free-logo"></div>`;
            } else {
                const n = card[letter][row];
                const isDrawn = drawn.has(n);
                const isWinCell = winningCells && winningCells.has(`${letter}-${row}`);
                const cls = ['result-card-cell', isDrawn ? 'is-drawn' : '', isWinCell ? 'is-win-pattern' : ''].filter(Boolean).join(' ');
                cellsHTML += `<div class="${cls}" data-letter="${letter}">${n}</div>`;
            }
        }
    }
    return `<div class="result-card-letters">${letters.map(l => `<div class="result-card-letter" data-letter="${l}">${l}</div>`).join('')}</div>
        <div class="result-card-grid">${cellsHTML}</div>`;
}

// Retorna um Set de chaves "letter-row" com as células do padrão vencedor que já fechou,
// considerando todos os tipos configurados na rodada (pode haver mais de um padrão fechado).
function getWinningPatternCells(card, sorteados, tipos) {
    const s = new Set(sorteados);
    const letters = ['B', 'I', 'N', 'G', 'O'];
    const cells = new Set();
    const lista = Array.isArray(tipos) ? tipos : [tipos];

    const isFree = (letter, row) => letter === 'N' && row === 2;
    const isDrawnAt = (letter, row) => isFree(letter, row) || s.has(card[letter][row]);

    for (const tipo of lista) {
        if (tipo === 'cantos' && checkCorners(card, sorteados)) {
            cells.add('B-0').add('O-0').add('B-4').add('O-4');
        } else if (tipo === 'linha') {
            for (let row = 0; row < 5; row++) {
                if (letters.every(letter => isDrawnAt(letter, row))) {
                    letters.forEach(letter => cells.add(`${letter}-${row}`));
                }
            }
        } else if (tipo === 'coluna') {
            for (const letter of letters) {
                let complete = true;
                for (let row = 0; row < 5; row++) {
                    if (!isDrawnAt(letter, row)) { complete = false; break; }
                }
                if (complete) {
                    for (let row = 0; row < 5; row++) cells.add(`${letter}-${row}`);
                }
            }
        } else if (tipo === 'diagonal') {
            let diagonal1 = true, diagonal2 = true;
            for (let i = 0; i < 5; i++) {
                if (!isDrawnAt(letters[i], i)) diagonal1 = false;
                if (!isDrawnAt(letters[4 - i], i)) diagonal2 = false;
            }
            if (diagonal1) for (let i = 0; i < 5; i++) cells.add(`${letters[i]}-${i}`);
            if (diagonal2) for (let i = 0; i < 5; i++) cells.add(`${letters[4 - i]}-${i}`);
        } else if (tipo === 'completa' && checkFullCard(card, sorteados)) {
            for (let row = 0; row < 5; row++) {
                for (const letter of letters) cells.add(`${letter}-${row}`);
            }
        }
    }
    return cells;
}