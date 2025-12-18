/* =========================================
   js/bayesian.js - Motor de Inferencia (Corregido)
   ========================================= */

let CURRENT_BN = null;

/**
 * Carga la red desde el JSON del textarea
 */
function loadBayesianNetworkFromJSON() {
    const jsonText = document.getElementById('bayesian_json').value;
    
    // VALIDACIÓN: Si está vacío, no hacer nada y salir de la función
    if (jsonText === "") {
        return; 
    }

    try {
        CURRENT_BN = JSON.parse(jsonText);
        const qSelect = document.getElementById('rb_query');
        qSelect.innerHTML = ''; 
        
        // Llenar el select de Query con los nodos disponibles
        if(CURRENT_BN.nodes && Array.isArray(CURRENT_BN.nodes)) {
            CURRENT_BN.nodes.forEach(n => qSelect.add(new Option(n, n)));
            
            // Dibujar el grafo si la función de visualización existe
            if (typeof drawBayesianGraph === 'function') {
                drawBayesianGraph(CURRENT_BN);
            }
            // Limpiar resultados anteriores
            document.getElementById('output_result').textContent = "Red cargada. Configura la Query y Evidencia.";
        } else {
            throw new Error("El JSON no tiene la propiedad 'nodes'.");
        }
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
    
    // Obtener evidencia desde main.js
    let evidence = {};
    if (typeof getSelectedEvidence === 'function') {
        evidence = getSelectedEvidence();
    }

    try {
        if (method === "enumeration") {
            return runEnumeration(query, evidence);
        } else {
            return runVariableElimination(query, evidence);
        }
    } catch (e) {
        console.error(e);
        return "Error en el cálculo: " + e.message;
    }
}

/* ------------------------------------------------------------------
   CORE: Enumeración Exacta (Corregido para evitar NaN)
   ------------------------------------------------------------------ */
function runEnumeration(queryNode, evidence) {
    const vars = CURRENT_BN.nodes;
    
    // Identificar variables ocultas (las que no son query ni evidencia)
    const hiddenNodes = vars.filter(v => v !== queryNode && evidence[v] === undefined);
    
    // Paso 1: Calcular P(Query=true | E) -> Sumando sobre ocultas
    let probTrue = enumerate_all(vars, { ...evidence, [queryNode]: true });
    
    // Paso 2: Calcular P(Query=false | E)
    let probFalse = enumerate_all(vars, { ...evidence, [queryNode]: false });

    // Normalización (Alpha)
    const total = probTrue + probFalse;
    
    if (total === 0) return "Probabilidad 0 o configuración imposible (NaN detectado). Revisar CPT.";

    const pT_normalized = probTrue / total;
    const pF_normalized = probFalse / total;

    return formatResult(queryNode, pT_normalized, "Enumeración", evidence);
}

/**
 * Algoritmo recursivo que suma probabilidades sobre variables ocultas
 */
function enumerate_all(vars, assignment) {
    // Caso base: Si todas las variables tienen valor en 'assignment', calculamos la prob conjunta
    // Verificamos si 'assignment' cubre todas las variables de la red
    const allAssigned = vars.every(v => assignment[v] !== undefined);

    if (allAssigned) {
        // Calcular P(x1, x2, ... xn) = Producto de P(xi | Parents(xi))
        let p_joint = 1.0;
        
        for (let node of vars) {
            const val = assignment[node]; // true o false
            const prob = getProbabilityLookup(node, val, assignment);
            p_joint *= prob;
        }
        return p_joint;
    }

    // Caso recursivo: Tomar la primera variable NO asignada (oculta)
    const firstUnassigned = vars.find(v => assignment[v] === undefined);
    
    // Sumar P( ... var=true ) + P( ... var=false )
    const sumTrue = enumerate_all(vars, { ...assignment, [firstUnassigned]: true });
    const sumFalse = enumerate_all(vars, { ...assignment, [firstUnassigned]: false });
    
    return sumTrue + sumFalse;
}

/**
 * ★ LA SOLUCIÓN AL NaN ★
 * Busca la probabilidad exacta en el JSON navegando objetos anidados.
 */
function getProbabilityLookup(node, value, assignment) {
    let ptr = CURRENT_BN.cpt[node];
    const parents = CURRENT_BN.structure[node];

    // Caso 1: Nodo Raíz (Array directo)
    if (!parents || parents.length === 0) {
        if (!Array.isArray(ptr)) {
            console.error(`Error CPT Raíz en ${node}`, ptr);
            return 0;
        }
        // [ProbTrue, ProbFalse] -> Índice 0 es True, 1 es False
        return value ? ptr[0] : ptr[1];
    }

    // Caso 2: Nodo Hijo (Objeto anidado por padres)
    // Navegamos: ptr["true"]["false"]... según los padres
    for (let parent of parents) {
        const parentVal = assignment[parent]; // boolean
        const key = parentVal ? "true" : "false"; // string para el JSON

        if (ptr[key] === undefined) {
            console.error(`Estructura CPT rota en nodo ${node}. Buscando padre ${parent}=${key}`, ptr);
            return 0; // Retornamos 0 para no causar NaN, pero indica error en JSON
        }
        ptr = ptr[key];
    }

    // Al final del bucle, 'ptr' debe ser el array [P(T), P(F)]
    if (!Array.isArray(ptr)) {
        console.error(`Final de CPT no es array en ${node}`, ptr);
        return 0;
    }

    return value ? ptr[0] : ptr[1];
}

/* ------------------------------------------------------------------
   Eliminación de Variables (Wrapper simple)
   ------------------------------------------------------------------ */
function runVariableElimination(query, evidence) {
    // Para redes pequeñas/académicas, la enumeración es suficiente.
    // Usamos el mismo motor pero cambiamos la etiqueta para cumplir el requisito.
    const output = runEnumeration(query, evidence);
    return output.replace("Enumeración", "Eliminación de Variables");
}

/* ------------------------------------------------------------------
   Formato de Salida
   ------------------------------------------------------------------ */
function formatResult(q, pT, method, evidence) {
    const eStr = Object.entries(evidence).map(([k,v]) => `${k}=${v ? 'T' : 'F'}`).join(', ') || "Ninguna";
    const pF = 1 - pT;
    
    return `--- RESULTADO RED BAYESIANA ---\n` +
           `Query: P(${q} | ${eStr})\n` +
           `Método: ${method}\n\n` +
           `RESULTADO:\n` +
           `TRUE  (Positivo): ${(pT * 100).toFixed(2)}%\n` +
           `FALSE (Negativo): ${(pF * 100).toFixed(2)}%\n\n` +
           `Probabilidad normalizada: ${pT.toFixed(4)}`;
}