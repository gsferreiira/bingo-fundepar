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
