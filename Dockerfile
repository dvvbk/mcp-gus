# Dockerfile dla BDL MCP Server
# Umożliwia uruchomienie serwera w kontenerze Docker

FROM python:3.11-slim

WORKDIR /app

# Kopiuj pliki zależności
COPY requirements.txt .
COPY pyproject.toml .

# Instaluj zależności
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj kod serwera
COPY server.py .

# Eksponuj port
EXPOSE 8000

# Domyślnie uruchom w trybie SSE
CMD ["python", "server.py", "--transport", "sse", "--host", "0.0.0.0", "--port", "8000"]
