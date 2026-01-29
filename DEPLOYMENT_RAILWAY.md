# Railway Deployment Instructions

## Para desplegar el backend en Railway:

1. Ve a https://railway.app/
2. Conecta tu GitHub
3. Crea un nuevo proyecto
4. Selecciona "Deploy from GitHub repo"
5. Elige el repo `icarsolutions`
6. En la configuración:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm run start`

7. Agrega Variables de Entorno en Railway:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NODE_ENV=production

8. Una vez deployeado, Railway te dará una URL como:
   `https://icarsolutions-production-xxxx.railway.app`

9. En tu `.env.production` del frontend, configura:
   ```
   BACKEND_URL=https://icarsolutions-production-xxxx.railway.app
   ```

## Para desplegar en Render (alternativa):

1. Ve a https://render.com
2. Conecta GitHub
3. New → Web Service
4. Elige el repo
5. Configuración:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm run start`
6. Agrega las variables de entorno
7. URL será similar a: `https://icarsolutions-api.onrender.com`
