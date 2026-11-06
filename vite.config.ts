import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" : le build fonctionne à la racine d'un sous-domaine comme dans un sous-dossier.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // pdf-lib/fontkit worden pas geladen bij een PDF-export (dynamic import). Vooraf bundelen voorkomt
  // dat de dev-server ze pas bij de eerste klik ontdekt en de module-aanvraag dan mislukt.
  optimizeDeps: { include: ["pdf-lib", "@pdf-lib/fontkit"] },
});
