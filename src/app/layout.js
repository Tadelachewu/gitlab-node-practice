import './globals.css';

export const metadata = {
  title: 'Contacts',
  description: 'Browse contacts and send them an email',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
