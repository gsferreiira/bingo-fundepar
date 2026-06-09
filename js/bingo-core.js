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

// Mulberry32 — PRNG determinístico por semente
function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickColumn(min, max, rng) {
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    const picked = [];
    for (let i = 0; i < 5; i++) {
        const idx = Math.floor(rng() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

// Gera a cartela de forma determinística: mesma rodada + mesmo serial = mesma cartela sempre.
// Retorna { B: [n1..n5], I: [..], N: [..], G: [..], O: [..] }
// N[2] é tratado como espaço livre na UI (não exibido/exigido).
function generateCard(rodada, serial) {
    const rng = mulberry32(rodada * 1000003 + serial);
    const result = {};
    for (const { letter, min, max } of RANGES) {
        result[letter] = pickColumn(min, max, rng);
    }
    return result;
}

// Retorna true se todos os 24 números da cartela (exceto espaço livre) estiverem em sorteados.
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
