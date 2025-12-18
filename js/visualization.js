/* =========================================
   js/visualization.js - Generación de Grafos
   ========================================= */

/**
 * Visualización de Grafos de Estado (Markov/HMM)
 * Soporta nombres personalizados para los nodos.
 */
async function drawStateGraph(A_matrix, containerId, customLabels = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = 'Cargando grafo...';

    try {
        const A = A_matrix.toArray();
        const N = A.length;
        
        // Definición inicial de Mermaid
        let graphDefinition = 'graph LR\n'; 
        graphDefinition += 'classDef estado fill:#2b7ce3,stroke:#1a5cb8,color:white,stroke-width:2px;\n';

        for (let i = 0; i < N; i++) {
            // Lógica para el nombre: ¿Usamos el personalizado o el default "Ei"?
            let label = `E${i}`;
            if (customLabels.length > i && customLabels[i].trim() !== "") {
                label = customLabels[i].trim();
            } else if (typeof SYMPTOM_LABELS !== 'undefined' && SYMPTOM_LABELS[i]) {
                // Fallback para HMM si no hay customLabels pero existen los de síntomas
                label = SYMPTOM_LABELS[i]; 
            }

            // Sanitizar label para Mermaid (quitar comillas o caracteres raros)
            const safeLabel = label.replace(/["()]/g, '');

            graphDefinition += `${i}(("${safeLabel}")):::estado\n`;
            
            for (let j = 0; j < N; j++) {
                const prob = A[i][j];
                // Solo dibujar flechas relevantes (> 1%)
                if (prob > 0.01) {
                    graphDefinition += `${i} -- "${prob}" --> ${j}\n`;
                }
            }
        }

        const { svg } = await mermaid.render('graphDiv' + Date.now(), graphDefinition);
        container.innerHTML = svg;
    } catch (e) {
        console.error("Error Mermaid:", e);
        container.innerHTML = `<div class="text-danger">Error al dibujar grafo: ${e.message}</div>`;
    }
}

/**
 * Visualización de Redes Bayesianas (DAG)
 */
async function drawBayesianGraph(networkData) {
    const container = document.getElementById('network-visualization');
    if (!container || !networkData || !networkData.nodes) return;

    try {
        let graphDef = 'graph TD\n'; 
        graphDef += 'classDef variable fill:#ffc107,stroke:#333,color:black;\n';

        networkData.nodes.forEach(node => {
            graphDef += `${node}[${node}]:::variable\n`;
        });

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
    }
}