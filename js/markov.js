/* =========================================
   js/markov.js - Lógica de Cadenas de Markov
   ========================================= */

/**
 * Calcula la distribución estacionaria de una Matriz de Transición
 * @param {Matrix} A - Matriz de transición (NxN)
 * @param {number} N - Número de estados
 */
function calculateMarkov(A, N) {
    const error = validateStochasticMatrix(A);
    if (error) return `ERROR: ${error}`;
    
    try {
        const I = m.identity(N);
        const At = m.transpose(A);
        const M_array = m.subtract(At, I).toArray();
        M_array[N - 1] = Array(N).fill(1.0);
        
        const b = Array(N).fill(0.0);
        b[N - 1] = 1.0;

        const pi = m.squeeze(m.lusolve(m.matrix(M_array), b)).toArray();
        return `--- CADENA DE MARKOV ---\nDistribución Estacionaria (π):\n[${pi.map(p => p.toFixed(4)).join(', ')}]`;
    } catch (e) { return `Error: ${e.message}`; }
}