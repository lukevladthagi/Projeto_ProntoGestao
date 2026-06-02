import './global.css';
import { Providers } from './providers';
import { ErrorLogger } from '@/components/ErrorLogger';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';

export const metadata = {
  title: 'Gestão de Indicadores',
  description: 'Sistema de gestão de indicadores e planos de ação setorial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ChunkErrorBoundary>
          <Providers>
            <ErrorLogger />
            {children}
          </Providers>
        </ChunkErrorBoundary>
      </body>
    </html>
  );
}
