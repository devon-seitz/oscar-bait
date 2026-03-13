# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production
FROM python:3.12-slim
WORKDIR /app

# Install backend deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/build /app/frontend/build

# Create non-root user
RUN groupadd --system appuser && useradd --system --gid appuser appuser \
    && mkdir -p /app/data && chown -R appuser:appuser /app

EXPOSE 8000

# Fix ownership of mounted volume data dir, then drop to non-root
CMD chown -R appuser:appuser /app/data && exec su -s /bin/sh appuser -c "uvicorn main:app --host 0.0.0.0 --port 8000"
