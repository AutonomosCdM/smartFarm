#!/bin/bash
# Install Python dependencies for Excel processing tool
# This script should be run after container deployment

set -e

CONTAINER_NAME="${1:-open-webui}"

echo "📦 Installing Excel processing dependencies in $CONTAINER_NAME..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container $CONTAINER_NAME is not running"
    exit 1
fi

# Install required packages
echo "  Installing llama-index-llms-groq..."
docker exec "$CONTAINER_NAME" pip install llama-index-llms-groq --quiet

echo "  Installing llama-index-embeddings-openai..."
docker exec "$CONTAINER_NAME" pip install llama-index-embeddings-openai --quiet

# Verify installation
echo "  Verifying installation..."
docker exec "$CONTAINER_NAME" python3 -c "
from llama_index.llms.groq import Groq
from llama_index.embeddings.openai import OpenAIEmbedding
print('✅ All Excel processing dependencies installed successfully!')
"

echo "✅ Excel processing dependencies ready!"
