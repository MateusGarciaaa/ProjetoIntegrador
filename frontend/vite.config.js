import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Em desenvolvimento, o Vite encaminha /api para o backend (DEV_PROXY_TARGET).
 * Assim o navegador fala só com a própria origem e o CORS deixa de ser um problema
 * local. O cabeçalho Origin é removido para o Spring tratar a chamada como
 * mesma origem. Em produção, a mesma rota /api deve ser servida pelo proxy reverso.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.DEV_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: proxyTarget
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
              },
            },
          }
        : undefined,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  };
});
