FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app

# Install Node.js for Prettier
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN if [ -f package.json ]; then npm install; fi

RUN chmod +x bootstrap.sh

CMD ["/bin/bash", "./bootstrap.sh"]