/* =========================================
   js/main.js - El Jefe
   ========================================= */

function toggleInputs() {
    const model = document.getElementById('model_select').value;
    const sections = ['matrix-setup-container', 'hmm-inputs', 'bayesian-inputs', 'cm-visualization'];
    sections.forEach(id => document.getElementById(id).style.display = 'none');

    if (model === 'markov' || model === 'hmm') {
        document.getElementById('matrix-setup-container').style.display = 'block';
        document.getElementById('cm-visualization').style.display = 'block';
        if (model === 'hmm') document.getElementById('hmm-inputs').style.display = 'block';
    } else if (model === 'bayesian') {
        document.getElementById('bayesian-inputs').style.display = 'block';
        loadBayesianNetworkFromJSON();
    }
}

// FUNCIONES PARA MULTIEVIDENCIA
function addEvidenceRow() {
    if (!CURRENT_BN) return alert("Carga la red primero");
    const container = document.getElementById('evidence-container');
    const rowId = 'row-' + Date.now();
    const div = document.createElement('div');
    div.className = 'row g-2 mb-2 align-items-center';
    div.id = rowId;

    let options = CURRENT_BN.nodes.map(n => `<option value="${n}">${n}</option>`).join('');

    div.innerHTML = `
        <div class="col-5"><select class="form-select ev-node">${options}</select></div>
        <div class="col-5"><select class="form-select ev-val"><option value="true">True</option><option value="false">False</option></select></div>
        <div class="col-2"><button class="btn btn-danger btn-sm w-100" onclick="document.getElementById('${rowId}').remove()">✖</button></div>
    `;
    container.appendChild(div);
}

function getSelectedEvidence() {
    const evidence = {};
    const nodes = document.querySelectorAll('.ev-node');
    const values = document.querySelectorAll('.ev-val');
    nodes.forEach((n, i) => {
        evidence[n.value] = (values[i].value === 'true');
    });
    return evidence;
}

async function performCalculation() {
    const output = document.getElementById('output_result');
    const model = document.getElementById('model_select').value;
    
    try {
        if (model === 'bayesian') {
            output.textContent = calculateInference();
            return;
        }

        const A = parseMatrixFromText('text_matrix_a', true);
        const N = A.size()[0];

        if (model === 'markov') {
            output.textContent = calculateMarkov(A, N);
            await drawStateGraph(A, 'markov-graph');
        } 
        else if (model === 'hmm') {
            const B = parseMatrixFromText('text_matrix_b', false);
            const Pi = m.squeeze(parseMatrixFromText('text_vector_pi', false));
            const rawObs = document.getElementById('observations').value.split(',').map(s => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            const obsIdx = rawObs.map(s => SYMPTOM_MAP[s]);
            
            if (obsIdx.includes(undefined)) throw new Error("Síntoma no reconocido.");

            const { P_O, alpha } = calculateForward(A, B, Pi, obsIdx);
            const beta = calculateBackward(A, B, obsIdx);
            const gamma = calculateForwardBackward(alpha, beta);
            const viterbi = calculateViterbi(A, B, Pi, obsIdx);

            let res = `--- HMM ---\nProb. Observación: ${P_O.toExponential(4)}\n${viterbi}\n\nSuavizado:\n`;
            gamma.forEach((row, t) => res += `t=${t}: [${row.map(n=>n.toFixed(3)).join(' | ')}]\n`);
            output.textContent = res;
            await drawStateGraph(A, 'markov-graph');
        }
    } catch (e) {
        output.textContent = `❌ ERROR: ${e.message}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('model_select').addEventListener('change', toggleInputs);
    document.getElementById('calculate_btn').addEventListener('click', performCalculation);
    document.getElementById('btn_load_bn').addEventListener('click', loadBayesianNetworkFromJSON);
    toggleInputs();
});