'use strict';

let rodadaSelecionada = 1;

// ── Botões de rodada ───────────────────────────

function initRodadaButtons() {
    const container = document.getElementById('rodadaButtons');
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'rodada-btn' + (i === 1 ? ' active' : '');
        btn.textContent = i;
        btn.dataset.rodada = i;
        btn.addEventListener('click', () => {
            rodadaSelecionada = i;
            document.querySelectorAll('.rodada-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('cardsContainer').innerHTML = '';
            document.getElementById('statusText').textContent = '';
            document.getElementById('statusText').style.color = '';
        });
        container.appendChild(btn);
    }
}

// ── HTML de uma cartela ────────────────────────

function cardHTML(rodada, serial, card) {
    const serialStr = String(serial).padStart(4, '0');
    const letters = ['B', 'I', 'N', 'G', 'O'];

    let cellsHTML = '';
    for (let row = 0; row < 5; row++) {
        for (const letter of letters) {
            if (letter === 'N' && row === 2) {
                cellsHTML += `<div class="card-cell free-space"><img src="assets/logo_fundepar.jpg" alt="★" class="free-logo"></div>`;
            } else {
                cellsHTML += `<div class="card-cell">${card[letter][row]}</div>`;
            }
        }
    }

    return `<div class="bingo-card">
        <div class="card-header">
            <div class="card-event">Bingo Junino Fundepar</div>
            <div class="card-id">Rodada ${rodada}&nbsp;&nbsp;|&nbsp;&nbsp;#${serialStr}</div>
        </div>
        <div class="card-bingo-letters">
            ${letters.map(l => `<div class="card-letter">${l}</div>`).join('')}
        </div>
        <div class="card-grid">${cellsHTML}</div>
    </div>`;
}

// ── Geração ────────────────────────────────────

function generateCards() {
    const qty = parseInt(document.getElementById('qtdInput').value);
    const status = document.getElementById('statusText');

    if (isNaN(qty) || qty < 1 || qty > 500) {
        status.textContent = 'Insira um número entre 1 e 500.';
        status.style.color = 'var(--vermelho)';
        return;
    }

    status.textContent = `Gerando ${qty} cartelas para a Rodada ${rodadaSelecionada}...`;
    status.style.color = 'var(--cinza)';

    // Defer para o status aparecer antes de bloquear a thread
    setTimeout(() => {
        const container = document.getElementById('cardsContainer');
        let html = '';
        let pageHTML = '<div class="print-page">';

        for (let i = 1; i <= qty; i++) {
            const card = generateCard(rodadaSelecionada, i);
            pageHTML += cardHTML(rodadaSelecionada, i, card);

            if (i % 4 === 0 || i === qty) {
                pageHTML += '</div>';
                html += pageHTML;
                if (i < qty) pageHTML = '<div class="print-page">';
            }
        }

        container.innerHTML = html;
        status.textContent = `${qty} cartelas geradas para a Rodada ${rodadaSelecionada}. Pronto para imprimir!`;
        status.style.color = 'var(--verde-escuro)';
    }, 50);
}

// ── Impressão ──────────────────────────────────

function printCards() {
    if (!document.getElementById('cardsContainer').children.length) {
        alert('Gere as cartelas antes de imprimir.');
        return;
    }
    window.print();
}

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initRodadaButtons();
    document.getElementById('generateBtn').addEventListener('click', generateCards);
    document.getElementById('printBtn').addEventListener('click', printCards);
});
