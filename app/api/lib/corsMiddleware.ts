// lib/cors.js
import Cors from 'cors';
import initMiddleware from './initMiddleware';

// Aquí está tu configuración de CORS
const cors = initMiddleware(
  Cors({
    methods: ["POST", "GET", "DELETE", "PUT","OPTIONS"],
    origin: (origin: any, callback: any) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://survey-next-git-main-intermaritime.vercel.app/",
        "https://surveys.intermaritime.org",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No autorizado por CORS"));
      }
    },
  })
);

export default cors;