/* =========================================
   js/main.js - Controlador Principal
   ========================================= */

// Control de Visibilidad de Inputs
function toggleInputs() {
    const model = document.getElementById('model_select').value;
    
    // Ocultar todo primero
    document.getElementById('matrix-setup-container').style.display = 'none';
    document.getElementById('hmm-inputs').style.display = 'none';
    document.getElementById('bayesian-inputs').style.display = 'none';
    document.getElementById('cm-visualization').style.display = 'none';
    document.getElementById('bayesian-visualization').style.display = 'none';

    // Mostrar según selección
    if (model === 'markov' || model === 'hmm') {
        document.getElementById('matrix-setup-container').style.display = 'block';
        document.getElementById('cm-visualization').style.display = 'block';
        if (model === 'hmm') document.getElementById('hmm-inputs').style.display = 'block';
    } else if (model === 'bayesian') {
        document.getElementById('bayesian-inputs').style.display = 'block';
        document.getElementById('bayesian-visualization').style.display = 'block';
        loadBayesianNetworkFromJSON();
    }
}

// Función Principal de Cálculo
async function performCalculation() {
    const output = document.getElementById('output_result');
    const model = document.getElementById('model_select').value;
    output.textContent = "Calculando...";
    output.classList.remove("text-danger");

    try {
        // 1. LEER NOMBRES PERSONALIZADOS (Nuevo)
        const labelsInput = document.getElementById('state_names').value;
        // Divide por comas y quita espacios
        const customLabels = labelsInput ? labelsInput.split(',').map(s => s.trim()) : [];

        if (model === 'markov') {
            const A = parseMatrixFromText('text_matrix_a', true); // true = validación 5x5 a 15x15
            const N = A.size()[0];
            
            // Calculamos Markov (función en markov.js)
            const result = calculateMarkov(A, N);
            output.textContent = result;
            
            // Dibujamos con los nombres personalizados
            await drawStateGraph(A, 'markov-graph', customLabels);
        
        } else if (model === 'hmm') {
            const A = parseMatrixFromText('text_matrix_a', true);
            const B = parseMatrixFromText('text_matrix_b', false);
            const Pi = m.squeeze(parseMatrixFromText('text_vector_pi', false));
            
            // 2. PROCESAR OBSERVACIONES INTELIGENTE
            const obsText = document.getElementById('observations').value.trim();
            if(!obsText) throw new Error("Debes ingresar observaciones.");
            
            const rawObs = obsText.split(',').map(s => s.trim().toLowerCase());
            
            // Mapeo: Intentamos buscar en SYMPTOM_MAP (utils.js) o usar índices directos
            const obsIdx = rawObs.map(obs => {
                // Opción A: Es un número (índice de columna)
                if(!isNaN(obs) && obs !== "") return parseInt(obs);
                
                // Opción B: Es texto, buscamos en el mapa por defecto (compatible con ejemplos médicos)
                // Normalizamos (quitar acentos) para buscar en el mapa
                const normalized = obs.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (typeof SYMPTOM_MAP !== 'undefined' && SYMPTOM_MAP[normalized] !== undefined) {
                    return SYMPTOM_MAP[normalized];
                }
                
                throw new Error(`Observación '${obs}' no reconocida. Usa los números de columna (0, 1...) si usas síntomas propios.`);
            });

            // Cálculos HMM (funciones en hmm.js)
            const { P_O, alpha } = calculateForward(A, B, Pi, obsIdx);
            const beta = calculateBackward(A, B, obsIdx);
            const gamma = calculateForwardBackward(alpha, beta);
            const viterbi = calculateViterbi(A, B, Pi, obsIdx);

            let res = `--- RESULTADOS HMM ---\nProbabilidad de la Observación: ${P_O.toExponential(4)}\n\n${viterbi}\n\nProbabilidades Suavizadas (Forward-Backward):\n`;
            gamma.forEach((row, t) => res += `t=${t}: [${row.map(n=>n.toFixed(3)).join(' | ')}]\n`);
            output.textContent = res;
            
            await drawStateGraph(A, 'markov-graph', customLabels);
        } 
        else if (model === 'bayesian') {
            // La función calculateInference está en bayesian.js
            const result = calculateInference(); 
            output.textContent = result;
        }

    } catch (e) {
        output.textContent = `❌ ERROR: ${e.message}`;
        output.classList.add("text-danger");
        console.error(e);
    }
}

// Funciones Auxiliares para Bayes (Interfaz)
function addEvidenceRow() {
    if (!CURRENT_BN) return alert("Primero carga una Red Bayesiana válida.");
    const container = document.getElementById('evidence-container');
    const rowId = 'row-' + Date.now();
    
    // Crear select de Nodos
    let options = CURRENT_BN.nodes.map(n => `<option value="${n}">${n}</option>`).join('');
    
    const html = `
    <div class="row g-2 mb-2 align-items-center" id="${rowId}">
        <div class="col-5">
            <select class="form-select form-select-sm evidence-node">${options}</select>
        </div>
        <div class="col-5">
            <select class="form-select form-select-sm evidence-val">
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        </div>
        <div class="col-2">
            <button class="btn btn-danger btn-sm" onclick="document.getElementById('${rowId}').remove()">X</button>
        </div>
    </div>`;
    
    container.insertAdjacentHTML('beforeend', html);
}

function getSelectedEvidence() {
    const evidence = {};
    document.querySelectorAll('#evidence-container .row').forEach(row => {
        const node = row.querySelector('.evidence-node').value;
        const val = row.querySelector('.evidence-val').value === 'true';
        evidence[node] = val;
    });
    return evidence;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    toggleInputs();
});