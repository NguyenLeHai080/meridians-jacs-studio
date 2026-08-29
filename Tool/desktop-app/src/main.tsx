import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return <main className="studio"><header><p>JACS STUDIO / DESKTOP</p><h1>Make every frame<br /><em>earn attention.</em></h1><button>Import video</button></header><section className="workspace"><div className="preview">Dual-view preview<br /><span>Original / Auto-reframe 9:16</span></div><div className="timeline"><div className="track"><b>VIDEO</b><i /></div><div className="track voice"><b>VOICE AI</b><i /></div><div className="track audio"><b>AUDIO</b><i /></div><div className="track subtitle"><b>SUBTITLE</b><i /></div></div></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
