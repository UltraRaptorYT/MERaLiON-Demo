FROM pytorch/pytorch:2.5.1-cuda12.1-cudnn9-devel

# Install system dependencies (librosa needs ffmpeg)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install specific versions and flash-attn correctly
RUN pip install --no-cache-dir -r requirements.txt && \
  pip install transformers==4.50.3 && \
  pip install flash-attn --no-build-isolation && \
  pip install librosa && \
  pip install python-multipart

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
