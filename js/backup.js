'use strict';

function exportBackup() {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bingo-')) {
            keys[key] = localStorage.getItem(key);
        }
    }

    const payload = { exportedAt: new Date().toISOString(), keys };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = payload.exportedAt.slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportConfig() {
    const total = parseInt(localStorage.getItem('bingo-total-rodadas')) || 10;
    const premiosMapa = JSON.parse(localStorage.getItem('bingo-premios-mapa') || '{}');

    const tiposMapa = {};
    for (let r = 1; r <= total; r++) {
        const d = localStorage.getItem(`bingo-rodada-${r}`);
        if (d) {
            const parsed = JSON.parse(d);
            const tipo = parsed.tipo;
            tiposMapa[r] = Array.isArray(tipo) ? tipo : (tipo ? [tipo] : ['diagonal']);
        } else {
            tiposMapa[r] = ['diagonal'];
        }
    }

    const payload = {
        exportedAt: new Date().toISOString(),
        type: 'bingo-config',
        totalRodadas: total,
        premiosMapa,
        tiposMapa,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = payload.exportedAt.slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo-config-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importConfig(file, onError) {
    const reader = new FileReader();
    reader.onload = () => {
        let payload;
        try {
            payload = JSON.parse(reader.result);
        } catch {
            if (onError) onError('Arquivo inválido: não é um JSON válido.');
            return;
        }
        if (!payload || payload.type !== 'bingo-config') {
            if (onError) onError('Arquivo inválido: não é um arquivo de configuração do bingo.');
            return;
        }

        if (payload.premiosMapa && typeof payload.premiosMapa === 'object') {
            localStorage.setItem('bingo-premios-mapa', JSON.stringify(payload.premiosMapa));
        }

        if (payload.tiposMapa && typeof payload.tiposMapa === 'object') {
            for (const [r, tipos] of Object.entries(payload.tiposMapa)) {
                const key = `bingo-rodada-${r}`;
                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                existing.tipo = Array.isArray(tipos) ? tipos : [tipos];
                localStorage.setItem(key, JSON.stringify(existing));
            }
        }

        if (payload.totalRodadas) {
            const currentTotal = parseInt(localStorage.getItem('bingo-total-rodadas')) || 10;
            if (payload.totalRodadas > currentTotal) {
                localStorage.setItem('bingo-total-rodadas', payload.totalRodadas);
            }
        }

        localStorage.setItem('bingo-config-importado', JSON.stringify({ arquivo: file.name, em: new Date().toISOString() }));
        location.reload();
    };
    reader.onerror = () => {
        if (onError) onError('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file);
}

function importBackup(file, onError) {
    const reader = new FileReader();
    reader.onload = () => {
        let payload;
        try {
            payload = JSON.parse(reader.result);
        } catch {
            if (onError) onError('Arquivo inválido: não é um JSON válido.');
            return;
        }
        if (!payload || typeof payload.keys !== 'object') {
            if (onError) onError('Arquivo inválido: formato de backup não reconhecido.');
            return;
        }

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('bingo-')) localStorage.removeItem(key);
        }
        for (const [key, value] of Object.entries(payload.keys)) {
            localStorage.setItem(key, value);
        }

        localStorage.setItem('bingo-backup-importado', JSON.stringify({ arquivo: file.name, em: new Date().toISOString() }));
        location.reload();
    };
    reader.onerror = () => {
        if (onError) onError('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file);
}
