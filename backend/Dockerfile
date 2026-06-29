FROM python:3.12-slim

WORKDIR /app

# Install OS-level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (no TF in production image)
COPY requirements.txt .
RUN pip install --no-cache-dir flask==3.1.0 flask-cors==5.0.0 \
    flask-limiter==3.9.0 requests==2.32.3 gunicorn==23.0.0

COPY app.py gardening_app.py ./

# Create persistent volume mount point for SQLite
RUN mkdir -p /data
ENV DB_PATH=/data/alloti.db

EXPOSE 5000

ENV PLANTNET_API_KEY=2b10f9eTDgVF6DKZVwr2m73ZMe \
    FLASK_DEBUG=0

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", \
     "--timeout", "60", "--access-logfile", "-", "app:app"]
