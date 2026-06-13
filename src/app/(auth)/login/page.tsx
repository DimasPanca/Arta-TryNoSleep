import type { Metadata } from 'next';
import type React from 'react';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Masuk · Arta',
  description: 'Masuk ke akun koperasi Anda dengan nomor WhatsApp.',
};

export default function LoginPage(): React.JSX.Element {
  return <LoginForm />;
}
