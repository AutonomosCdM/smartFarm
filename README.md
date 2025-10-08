# 🌾 SmartFarm - AI-Powered Agricultural Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Open WebUI](https://img.shields.io/badge/Open%20WebUI-v0.6.33-green.svg)](https://github.com/open-webui/open-webui)
[![Groq API](https://img.shields.io/badge/Groq-Powered-orange.svg)](https://groq.com/)

SmartFarm is an intelligent agricultural management system powered by advanced AI models through Groq's ultra-fast inference API and Open WebUI's user-friendly interface.

## 🚀 Features

- **⚡ Ultra-Fast AI Responses**: Powered by Groq API (500-800 tokens/second)
- **🤖 Multiple AI Models**: Access to 20+ models including Llama 3.3, DeepSeek R1, Gemma, and more
- **💾 Data Persistence**: All conversations and configurations saved permanently
- **🌐 Web Interface**: Modern, responsive UI through Open WebUI
- **🔒 Secure**: API keys protected, environment variables isolated
- **📊 Context Management**: Support for up to 262K token contexts
- **🎯 Agricultural Focus**: Optimized for farming and agricultural applications

## 📋 Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0 (optional, but recommended)
- **Groq API Key** (free tier available at [console.groq.com](https://console.groq.com))

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AutonomosCdM/smartFarm.git
cd smartFarm
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your Groq API key
nano .env  # or use your preferred editor
```

### 3. Start the Application

**Option A: Using Docker Compose (Recommended)**

```bash
docker-compose up -d
```

**Option B: Using Docker CLI**

```bash
# Pull the image
docker pull ghcr.io/open-webui/open-webui:main

# Create volume
docker volume create open-webui

# Run container
docker run -d \
  -p 3001:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:3001
```

### 5. Configure Groq API

1. **Create your account** (first user becomes admin automatically)
2. Click on your **avatar** in the bottom left corner
3. Go to **Admin Panel → Settings → Connections**
4. Click **"+ Add Connection"**
5. Fill in the details:
   - **Type**: OpenAI Compatible
   - **Name**: Groq
   - **API Base URL**: `https://api.groq.com/openai/v1`
   - **API Key**: Your Groq API key from `.env`
6. Click **Save** and verify the connection

## 📚 Documentation

- [Installation Guide](docs/INSTALLATION.md) - Detailed installation instructions
- [Groq Configuration](docs/GROQ_CONFIGURATION.md) - Complete Groq API setup guide
- [Available Models](docs/MODELS.md) - List of all available AI models
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

## 🤖 Available AI Models

### Recommended for SmartFarm

| Model | Context | Best For |
|-------|---------|----------|
| **llama-3.3-70b-versatile** | 131K | General agricultural queries, best balance |
| **groq/compound** | 131K | Groq-optimized, fast responses |
| **deepseek-r1-distill-llama-70b** | 131K | Complex reasoning, planning |
| **llama-3.1-8b-instant** | 131K | Quick answers, simple tasks |

### Specialized Models

- **whisper-large-v3-turbo**: Voice input for farmers in the field
- **moonshotai/kimi-k2-instruct**: Ultra-long context (262K tokens)
- **qwen/qwen3-32b**: Multilingual support

[View complete model list →](docs/MODELS.md)

## 🔧 Management Commands

### Check Status

```bash
docker ps --filter "name=open-webui"
```

### View Logs

```bash
# Real-time logs
docker logs -f open-webui

# Last 50 lines
docker logs open-webui --tail 50
```

### Start/Stop/Restart

```bash
docker start open-webui
docker stop open-webui
docker restart open-webui
```

### Backup Data

```bash
# Using the provided script
./scripts/backup.sh

# Manual backup
docker run --rm \
  -v open-webui:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/openwebui-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Update to Latest Version

```bash
docker pull ghcr.io/open-webui/open-webui:main
docker stop open-webui
docker rm open-webui
docker run -d \
  -p 3001:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

## 🏗️ Project Structure

```
smartFarm/
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # MIT License
├── docker-compose.yml   # Docker Compose configuration
├── docs/                # Documentation
│   ├── INSTALLATION.md
│   ├── GROQ_CONFIGURATION.md
│   ├── MODELS.md
│   └── TROUBLESHOOTING.md
├── scripts/             # Utility scripts
│   ├── backup.sh
│   ├── restore.sh
│   └── update.sh
└── .github/             # GitHub configuration
    └── workflows/       # CI/CD workflows
```

## 🔒 Security

- **Never commit `.env`** files to the repository
- **API keys** are stored securely in environment variables
- **GitHub Secret Scanning** is enabled
- **Regular updates** recommended for security patches

To regenerate your Groq API key if compromised:
1. Visit [console.groq.com/keys](https://console.groq.com/keys)
2. Revoke the old key
3. Generate a new one
4. Update your `.env` file

## 🌟 Use Cases

- **Crop Planning**: AI-assisted crop rotation and scheduling
- **Pest Management**: Identify and manage pest problems
- **Weather Analysis**: Interpret weather data for farming decisions
- **Market Intelligence**: Analyze agricultural market trends
- **Documentation**: Generate reports and documentation
- **Knowledge Base**: Ask questions about farming best practices

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/smartFarm.git
cd smartFarm

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "Add: your feature description"

# Push and create a Pull Request
git push origin feature/your-feature-name
```

## 📊 Performance

- **Response Time**: 500-800 tokens/second with Groq
- **Context Window**: Up to 262K tokens (model dependent)
- **Uptime**: Docker auto-restart ensures 24/7 availability
- **Data Persistence**: Automatic backup of all conversations

## 🐛 Troubleshooting

### Container Won't Start

```bash
docker logs open-webui
docker restart open-webui
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3001

# Change port in .env file
OPENWEBUI_PORT=3002
```

### API Connection Issues

1. Verify API key is correct in `.env`
2. Check Groq API status at [status.groq.com](https://status.groq.com)
3. Ensure URL is `https://api.groq.com/openai/v1` (no trailing slash)

[More troubleshooting →](docs/TROUBLESHOOTING.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Open WebUI](https://github.com/open-webui/open-webui) - Excellent LLM interface
- [Groq](https://groq.com/) - Ultra-fast inference API
- [Meta](https://llama.meta.com/) - Llama models
- [DeepSeek](https://www.deepseek.com/) - Advanced reasoning models

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AutonomosCdM/smartFarm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AutonomosCdM/smartFarm/discussions)
- **Groq Support**: [Groq Discord](https://groq.com/discord)
- **Open WebUI Docs**: [docs.openwebui.com](https://docs.openwebui.com)

## 🗺️ Roadmap

- [ ] Voice input support for field use
- [ ] Mobile app integration
- [ ] Custom agricultural knowledge base
- [ ] Multi-language support
- [ ] Integration with IoT sensors
- [ ] Automated reporting system
- [ ] Weather API integration
- [ ] Market data integration

---

**Made with ❤️ for farmers and agricultural professionals**

🌾 *Growing smarter, farming better*
