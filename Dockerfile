# ---------- Backend ----------
FROM python:3.11 AS backend

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 5001

CMD ["python", "app.py"]

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Empty default = relative /api, /uploads, /socket.io paths, proxied by nginx.conf to the backend
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ---------- Frontend runtime (nginx) ----------
FROM nginx:alpine AS frontend

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]