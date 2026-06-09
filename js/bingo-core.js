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
