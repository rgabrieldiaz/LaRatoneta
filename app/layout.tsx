import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MisGastos 💸 | Control Diario Neo-Brutalism',
  description: 'Control de gastos diario ultra rápido para Argentina. Centraliza Mercado Pago, bancos, MODO y efectivo de chinos y panaderías.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💸</text></svg>',
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
