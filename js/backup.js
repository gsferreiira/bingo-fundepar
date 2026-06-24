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

        location.reload();
    };
    reader.onerror = () => {
        if (onError) onError('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file);
}
