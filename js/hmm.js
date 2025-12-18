function calculateForward(A, B, Pi, Observations) {
    const N = A.size()[0]; 
    const T = Observations.length;
    const alpha = m.zeros(T, N).toArray();
    const A_arr = A.toArray();
    const B_arr = B.toArray();
    const Pi_arr = Pi.toArray();
    
    for (let i = 0; i < N; i++) alpha[0][i] = Pi_arr[i] * B_arr[i][Observations[0]];

    for (let t = 1; t < T; t++) {
        const o_t = Observations[t];
        for (let j = 0; j < N; j++) {
            let sum = 0;
            for (let i = 0; i < N; i++) sum += alpha[t-1][i] * A_arr[i][j];
            alpha[t][j] = sum * B_arr[j][o_t];
        }
    }
    const P_O = alpha[T-1].reduce((a, b) => a + b, 0);
    return { alpha, P_O };
}

function calculateBackward(A, B, Observations) {
    const N = A.size()[0]; 
    const T = Observations.length;
    const beta = m.zeros(T, N).toArray();
    const A_arr = A.toArray();
    const B_arr = B.toArray();

    for (let i = 0; i < N; i++) beta[T-1][i] = 1.0;

    for (let t = T - 2; t >= 0; t--) {
        const o_t_plus_1 = Observations[t+1];
        for (let i = 0; i < N; i++) {
            let sum = 0;
            for (let j = 0; j < N; j++) sum += A_arr[i][j] * B_arr[j][o_t_plus_1] * beta[t+1][j];
            beta[t][i] = sum;
        }
    }
    return beta;
}

function calculateForwardBackward(alpha, beta) {
    const T = alpha.length;
    const N = alpha[0].length;
    const gamma = m.zeros(T, N).toArray(); 
    
    for (let t = 0; t < T; t++) {
        let sum_alpha_beta = 0;
        for (let i = 0; i < N; i++) sum_alpha_beta += alpha[t][i] * beta[t][i];
        for (let i = 0; i < N; i++) {
            gamma[t][i] = (sum_alpha_beta !== 0) ? (alpha[t][i] * beta[t][i]) / sum_alpha_beta : 0;
        }
    }
    return gamma;
}

function calculateViterbi(A, B, Pi, Observations) {
    const N = A.size()[0]; 
    const T = Observations.length;
    const A_arr = A.toArray();
    const B_arr = B.toArray();
    const Pi_arr = Pi.toArray();
    const delta = m.zeros(T, N).toArray();
    const psi = m.zeros(T, N).toArray();

    for (let i = 0; i < N; i++) {
        const log_pi = Pi_arr[i] > 0 ? Math.log(Pi_arr[i]) : -Infinity;
        const log_b = B_arr[i][Observations[0]] > 0 ? Math.log(B_arr[i][Observations[0]]) : -Infinity;
        delta[0][i] = log_pi + log_b;
    }

    for (let t = 1; t < T; t++) {
        const o_t = Observations[t];
        for (let j = 0; j < N; j++) {
            let max_prob = -Infinity;
            let max_state = 0;
            for (let i = 0; i < N; i++) {
                const log_a = A_arr[i][j] > 0 ? Math.log(A_arr[i][j]) : -Infinity;
                const prob = delta[t-1][i] + log_a;
                if (prob > max_prob) { max_prob = prob; max_state = i; }
            }
            const log_b = B_arr[j][o_t] > 0 ? Math.log(B_arr[j][o_t]) : -Infinity;
            delta[t][j] = max_prob + log_b;
            psi[t][j] = max_state;
        }
    }
    
    let log_P_star = -Infinity;
    let Q_last = 0;
    for (let i = 0; i < N; i++) {
        if (delta[T-1][i] > log_P_star) { log_P_star = delta[T-1][i]; Q_last = i; }
    }
    
    const Q_star = new Array(T);
    Q_star[T-1] = Q_last;
    for (let t = T - 2; t >= 0; t--) Q_star[t] = psi[t + 1][Q_star[t + 1]];

    return `Secuencia Oculta Más Probable (Viterbi):\n[${Q_star.join(', ')}]\n(Log Prob: ${log_P_star.toFixed(4)})`;
}