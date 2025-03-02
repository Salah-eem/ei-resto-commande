// store/providers.tsx
'use client'; // Ce composant utilise des hooks React, donc il doit être un Client Component

import { store } from './store';
import { Provider } from 'react-redux';

export function Providers({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}