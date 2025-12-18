const m = math;

const SYMPTOM_LABELS = ['Normal', 'Frio', 'Mareado', 'Tos', 'Fiebre', 'Dolor', 'Fatiga']; 
const SYMPTOM_MAP = SYMPTOM_LABELS.reduce((map, label, index) => {
    const normalizedLabel = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    map[normalizedLabel] = index;
    return map;
}, {});

function parseMatrixFromText(elementId, applyConstraints = false) {
    const el = document.getElementById(elementId);
    if (!el || !el.value.trim()) throw new Error(`El campo ${elementId} está vacío.`);
    const lines = el.value.trim().split(/\n+/);
    const data = lines.map(line => line.trim().split(/[\s,\t]+/).map(v => parseFloat(v)));
    
    if (data.some(row => row.length !== data[0].length)) throw new Error("Matriz no rectangular.");
    if (applyConstraints) {
        if (data.length < 5 || data.length > 15) throw new Error("Matriz A debe ser de 5x5 a 15x15.");
    }
    return m.matrix(data);
}

function validateStochasticMatrix(matrix) {
    const rows = matrix.toArray();
    for (let i = 0; i < rows.length; i++) {
        const sum = rows[i].reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.05) return `Fila ${i+1} suma ${sum.toFixed(2)}, debe ser 1.0.`;
    }
    return null;
}

const safeLog = (val) => (val > 0 ? Math.log(val) : -1e99);