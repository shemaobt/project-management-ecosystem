import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

function ScaffoldPlaceholder() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
        Ecossistema Shemá
      </p>
      <h1 className="text-3xl font-semibold">Console</h1>
      <p className="max-w-md text-sm">
        Scaffold FE-01. O shell, as rotas e as telas chegam a partir de FE-06.
      </p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<ScaffoldPlaceholder />} />
      </Routes>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}
