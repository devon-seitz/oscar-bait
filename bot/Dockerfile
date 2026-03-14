FROM python:3.12-slim

WORKDIR /app

# Install bot dependencies
COPY bot/requirements.txt /app/bot/requirements.txt
RUN pip install --no-cache-dir -r /app/bot/requirements.txt

# Copy backend (needed for CATEGORIES import) and bot code
COPY backend/database.py /app/backend/database.py
COPY bot/ /app/bot/

CMD ["python", "-m", "bot"]
