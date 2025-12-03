import { PresencaProvider } from './contexts/PresencaContext';

function MyApp({ Component, pageProps }: { Component: React.ComponentType; pageProps: any }) {
  // Configuração adicional se necessário
  return (
    <PresencaProvider>
      <Component {...pageProps} />
    </PresencaProvider>
  );
}

export default MyApp;