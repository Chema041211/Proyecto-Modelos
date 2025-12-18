/* Reemplaza todo el contenido de hmm.js con este código */

function calculateForwardBackwardScaled(A, B, Pi, Observations) {
    const N = A.size()[0];
    const T = Observations.length;
    const A_arr = A.toArray();
    const B_arr = B.toArray();
    const Pi_arr = Pi.toArray();

    let alpha = Array.from({ length: T }, () => new Array(N).fill(0));
    let c = new Array(T).fill(0);

    // Forward con Escalamiento
    alpha[0] = Pi_arr.map((p, i) => p * B_arr[i][Observations[0]]);
    c[0] = 1.0 / (alpha[0].reduce((a, b) => a + b, 0) || 1e-100);
    alpha[0] = alpha[0].map(val => val * c[0]);

    for (let t = 1; t < T; t++) {
        for (let j = 0; j < N; j++) {
            let sum = 0;
            for (let i = 0; i < N; i++) sum += alpha[t - 1][i] * A_arr[i][j];
            alpha[t][j] = B_arr[j][Observations[t]] * sum;
        }
        c[t] = 1.0 / (alpha[t].reduce((a, b) => a + b, 0) || 1e-100);
        alpha[t] = alpha[t].map(val => val * c[t]);
    }

    // Backward con el mismo factor c
    let beta = Array.from({ length: T }, () => new Array(N).fill(0));
    beta[T - 1] = new Array(N).fill(1.0 * c[T - 1]);

    for (let t = T - 2; t >= 0; t--) {
        for (let i = 0; i < N; i++) {
            let sum = 0;
            for (let j = 0; j < N; j++) {
                sum += A_arr[i][j] * B_arr[j][Observations[t + 1]] * beta[t + 1][j];
            }
            beta[t][i] = sum * c[t];
        }
    }

    // Gamma (Probabilidades suavizadas)
    let gamma = alpha.map((row, t) => {
        let prob_t = row.map((val, i) => val * beta[t][i]);
        let sum_t = prob_t.reduce((a, b) => a + b, 0);
        return prob_t.map(p => p / (sum_t || 1));
    });

    return { gamma };
}

function calculateViterbiManual(A, B, Pi, Observations) {
    const N = A.size()[0];
    const T = Observations.length;
    const A_arr = A.toArray();
    const B_arr = B.toArray();
    const Pi_arr = Pi.toArray();

    let delta = Array.from({ length: T }, () => new Array(N).fill(0));
    let psi = Array.from({ length: T }, () => new Array(N).fill(0));

    delta[0] = Pi_arr.map((p, i) => p * B_arr[i][Observations[0]]);

    for (let t = 1; t < T; t++) {
        for (let j = 0; j < N; j++) {
            let probs = delta[t - 1].map((d, i) => d * A_arr[i][j]);
            delta[t][j] = Math.max(...probs) * B_arr[j][Observations[t]];
            psi[t][j] = probs.indexOf(Math.max(...probs));
        }
    }

    let path = new Array(T);
    path[T - 1] = delta[T - 1].indexOf(Math.max(...delta[T - 1]));
    for (let t = T - 2; t >= 0; t--) path[t] = psi[t + 1][path[t + 1]];

    return path;
}