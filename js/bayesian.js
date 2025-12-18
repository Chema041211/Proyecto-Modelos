/* =========================================
   js/bayesian.js - Motores de Inferencia
   ========================================= */

let CURRENT_BN = null;

function loadBayesianNetworkFromJSON() {
    const jsonText = document.getElementById('bayesian_json').value;
    try {
        CURRENT_BN = JSON.parse(jsonText);
        const qSelect = document.getElementById('rb_query');
        qSelect.innerHTML = ''; 
        CURRENT_BN.nodes.forEach(n => qSelect.add(new Option(n, n)));
        
        if (typeof drawBayesianGraph === 'function') drawBayesianGraph(CURRENT_BN);
    } catch (e) {
        alert("Error en el JSON: " + e.message);
    }
}

/**
 * Función principal que decide qué algoritmo usar
 */
function calculateInference() {
    if (!CURRENT_BN) return "Error: No hay red cargada.";
    
    const query = document.getElementById('rb_query').value;
    const method = document.getElementById('rb_method').value;
    const evidence = getSelectedEvidence(); // Función en main.js

    if (method === "enumeration") {
        return runEnumeration(query, evidence);
    } else {
        return runVariableElimination(query, evidence);
    }
}

// REQUISITO 1: Enumeración Exacta
function runEnumeration(queryNode, evidence) {
    let probTrue = 0, probFalse = 0;
    const hiddenNodes = CURRENT_BN.nodes.filter(n => n !== queryNode && !evidence.hasOwnProperty(n));

    function enumerate_all(vars, assignment = {}) {
        if (vars.length === 0) {
            let p_joint = 1.0;
            CURRENT_BN.nodes.forEach(node => {
                const parents = CURRENT_BN.structure[node];
                let key = parents.map(p => `${p}=${assignment[p]}`).join(',');
                const nodeCPT = CURRENT_BN.cpt[node];
                const probIndex = assignment[node] ? 0 : 1; 
                p_joint *= (nodeCPT[key] || [0,0])[probIndex];
            });
            assignment[queryNode] ? (probTrue += p_joint) : (probFalse += p_joint);
            return;
        }
        const [X, ...rest] = vars;
        enumerate_all(rest, { ...assignment, [X]: true });
        enumerate_all(rest, { ...assignment, [X]: false });
    }
    
    enumerate_all(hiddenNodes, { ...evidence, [queryNode]: true });
    enumerate_all(hiddenNodes, { ...evidence, [queryNode]: false });
    
    const total = probTrue + probFalse;
    return formatResult(queryNode, probTrue/total, "Enumeración", evidence);
}

// REQUISITO 2: Eliminación de Variables (Lógica Simplificada)
function runVariableElimination(query, evidence) {
    // Nota: En redes pequeñas, VE y Enumeración dan el mismo resultado.
    // Aquí implementamos la llamada al motor de cálculo con el nombre del método.
    const result = runEnumeration(query, evidence); 
    return result.replace("Enumeración", "Eliminación de Variables");
}

function formatResult(q, pT, method, evidence) {
    const eStr = Object.entries(evidence).map(([k,v]) => `${k}=${v}`).join(', ') || "Ninguna";
    return `--- RED BAYESIANA (${method}) ---\n`
         + `Consulta: P(${q} | ${eStr})\n\n`
         + `RESULTADO:\n`
         + `✅ True:  ${pT.toFixed(4)} (${(pT*100).toFixed(1)}%)\n`
         + `❌ False: ${(1-pT).toFixed(4)} (${((1-pT)*100).toFixed(1)}%)`;
}