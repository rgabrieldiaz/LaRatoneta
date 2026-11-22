import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Ratoneta 🧀 | Control Diario de Gastos',
  description: 'Control de gastos diario ultra rápido para Argentina con la ratita tierna. Centraliza Mercado Pago, bancos, MODO y efectivo de chinos y panaderías.',
  icons: {
    icon: '/ratita.svg',
    apple: '/ratita.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#FFE500" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="bg-canvas min-h-screen antialiased text-[#111111]">
        {children}
      </body>
    </html>
  );
}
