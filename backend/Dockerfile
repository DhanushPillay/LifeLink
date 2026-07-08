FROM node:24-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

RUN npm install

# Copy application code
COPY . .

# Create logs directory and set ownership
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 5000

CMD ["npm", "start"]
