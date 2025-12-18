/* =========================================
   js/visualization.js - Generación de Grafos
   ========================================= */

/**
 * REQUISITO 7 y 11: Visualización de Grafos de Estado (Markov/HMM)
 * @param {Matrix} A_matrix - Matriz de transición
 * @param {string} containerId - ID del div donde se dibujará
 */
async function drawStateGraph(A_matrix, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Limpiar previo

    try {
        const A = A_matrix.toArray();
        const N = A.length;
        
        let graphDefinition = 'graph LR\n'; 
        graphDefinition += 'classDef estado fill:#2b7ce3,stroke:#1a5cb8,color:white;\n';

        for (let i = 0; i < N; i++) {
            // Usar etiquetas de síntomas si existen, si no, usar E0, E1...
            const label = (SYMPTOM_LABELS && SYMPTOM_LABELS[i]) ? SYMPTOM_LABELS[i] : `E${i}`;
            graphDefinition += `${i}((${label})):::estado\n`;
            
            for (let j = 0; j < N; j++) {
                const prob = A[i][j];
                // Solo dibujar flechas con probabilidad significativa
                if (prob > 0.01) {
                    graphDefinition += `${i} -- "${prob.toFixed(2)}" --> ${j}\n`;
                }
            }
        }

        const { svg } = await mermaid.render('graph-' + containerId, graphDefinition);
        container.innerHTML = svg;
    } catch (e) {
        console.error("Error Mermaid (Estado):", e);
    }
}

/**
 * REQUISITO 3: Visualización de la Red Bayesiana (DAG)
 * @param {Object} networkData - Objeto con nodes y structure
 */
async function drawBayesianGraph(networkData) {
    const container = document.getElementById('network-visualization');
    if (!container || !networkData || !networkData.nodes) return;

    try {
        let graphDef = 'graph TD\n'; 
        graphDef += 'classDef variable fill:#ffc107,stroke:#333,color:black;\n';

        // Definir Nodos
        networkData.nodes.forEach(node => {
            graphDef += `${node}[${node}]:::variable\n`;
        });

        // Definir Enlaces (Padres -> Hijos)
        Object.keys(networkData.structure).forEach(child => {
            const parents = networkData.structure[child];
            parents.forEach(parent => {
                graphDef += `${parent} --> ${child}\n`;
            });
        });

        const { svg } = await mermaid.render('bayes-svg-' + Date.now(), graphDef);
        container.innerHTML = svg;
    } catch (e) {
        console.error("Error Mermaid (RB):", e);
        container.innerHTML = `<div class="alert alert-danger">Error en JSON de la red.</div>`;
    }
}

/**
 * Inicializador de la UI Bayesiana
 */
function setupBayesianNetworkUI() {
    if (typeof loadBayesianNetworkFromJSON === 'function') {
        loadBayesianNetworkFromJSON();
    }
}