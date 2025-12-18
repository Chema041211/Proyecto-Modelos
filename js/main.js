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

        if (model === 'bayesian') {
            const method = document.getElementById('rb_method').value;
            const query = document.getElementById('rb_query').value;
            const evidence = getSelectedEvidence();
            
            output.textContent = (method === 've') 
                ? runVariableElimination(query, evidence) 
                : runEnumeration(query, evidence);
            return;
        }

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
            
            const obsText = document.getElementById('observations').value.trim();
            if(!obsText) throw new Error("Debes ingresar observaciones.");
            const rawObs = obsText.split(',').map(s => s.trim());
            
            // Mapeo de observaciones a índices
            const obsIdx = rawObs.map(obs => {
                if(!isNaN(obs) && obs !== "") return parseInt(obs);
                const normalized = obs.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (SYMPTOM_MAP[normalized] !== undefined) return SYMPTOM_MAP[normalized];
                throw new Error(`Observación '${obs}' no reconocida.`);
            });

            // EJECUCIÓN
            const { gamma } = calculateForwardBackwardScaled(A, B, Pi, obsIdx);
            const pathViterbi = calculateViterbiManual(A, B, Pi, obsIdx);

            // FORMATO DE SALIDA (ESTILO PYTHON)
            const labels = customLabels.length > 0 ? customLabels : Array.from({length: A.size()[0]}, (_,i)=>`E${i}`);
            
            let res = "ALGORITMO FORWARD-BACKWARD - PROBABILIDADES SUAVIZADAS\n";
            res += "=".repeat(60) + "\n";
            res += "Día | " + labels.map(l => l.padEnd(10)).join(" | ") + "\n";
            res += "-".repeat(60) + "\n";

            gamma.forEach((row, t) => {
                res += `${(t+1).toString().padStart(3)} | ` + row.map(n => n.toFixed(4).padEnd(10)).join(" | ") + "\n";
            });

            res += "\n" + "=".repeat(60) + "\n";
            res += "ALGORITMO DE VITERBI - SECUENCIA MÁS PROBABLE\n";
            res += "=".repeat(60) + "\n";
            res += `Estados decodificados (índices): ${JSON.stringify(pathViterbi)}\n\n`;
            res += "Día | Estado Viterbi\n" + "-".repeat(25) + "\n";
            pathViterbi.forEach((st, i) => {
                res += `${(i+1).toString().padStart(3)} | ${labels[st] || 'E'+st}\n`;
            });

            output.textContent = res;
            await drawStateGraph(A, 'markov-graph', customLabels);
        } 
        else if (model === 'bayesian') {
            // La función calculateInference está en bayesian.js
            const result = calculateInference(); 
            output.textContent = result;
        }

    } catch (e) {
        output.textContent = `ERROR: ${e.message}`;
        output.classList.add("text-danger");
        console.error(e);
    }
}

// Funciones Auxiliares para Bayes (Interfaz)
function addEvidenceRow() {
    if (!CURRENT_BN) return alert("Carga la red primero");
    const container = document.getElementById('evidence-container');
    const id = 'row-' + Date.now();
    
    let options = CURRENT_BN.nodes.map(n => `<option value="${n}">${n}</option>`).join('');

    const html = `
        <div class="row g-2 mb-2 align-items-center" id="${id}">
            <div class="col-5"><select class="form-select ev-node shadow-sm">${options}</select></div>
            <div class="col-5"><select class="form-select ev-val shadow-sm"><option value="true">True</option><option value="false">False</option></select></div>
            <div class="col-2"><button class="btn btn-danger btn-sm w-100" onclick="document.getElementById('${id}').remove()">✖</button></div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

function getSelectedEvidence() {
    const evidence = {};
    document.querySelectorAll('#evidence-container .row').forEach(row => {
        const node = row.querySelector('.ev-node').value;
        const val = row.querySelector('.ev-val').value === 'true';
        evidence[node] = val;
    });
    return evidence;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    toggleInputs();
});