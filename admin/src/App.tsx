import { PromptHost } from './prompt-dialog';
import { AppRoutes } from './router';
import './studio/studio.css';

export default function App() {
  return (
    <>
      <AppRoutes />
      <PromptHost />
    </>
  );
}
