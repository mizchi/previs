// generated
import '../index.css'
import { createRoot } from 'react-dom/client';
// @ts-ignore
import * as Target from "/__TARGET__";
const root = document.getElementById('root');

// select entry
const C = Target.__PREVIEW__ ?? Target['index'] ?? Target.default;
createRoot(root).render(<C />);
