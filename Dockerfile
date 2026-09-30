FROM node:22-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home campus
COPY app.py schema.sql ./
COPY templates ./templates
COPY --from=frontend /static/dist ./static/dist
RUN mkdir /app/data /app/uploads && chown -R campus:campus /app
USER campus
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--access-logfile", "-", "app:create_app()"]
