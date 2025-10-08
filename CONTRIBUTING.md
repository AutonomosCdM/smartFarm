# Contributing to SmartFarm

First off, thank you for considering contributing to SmartFarm! It's people like you that make SmartFarm such a great tool for the agricultural community.

## 🌟 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🤔 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Ubuntu 22.04]
 - Docker Version: [e.g. 24.0.7]
 - Open WebUI Version: [e.g. 0.6.33]
 - Browser: [e.g. Chrome, Firefox]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Clear and descriptive title**
- **Detailed description** of the proposed functionality
- **Use cases** explaining why this enhancement would be useful
- **Possible implementation** if you have ideas

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding standards** outlined below
3. **Test your changes** thoroughly
4. **Update documentation** as needed
5. **Write clear commit messages**
6. **Submit a pull request**

## 🔧 Development Process

### Setting Up Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/smartFarm.git
cd smartFarm

# Create environment file
cp .env.example .env
# Add your API keys to .env

# Start the development environment
docker-compose up -d

# View logs
docker-compose logs -f
```

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/voice-input`)
- `fix/` - Bug fixes (e.g., `fix/api-connection`)
- `docs/` - Documentation updates (e.g., `docs/installation-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/env-config`)
- `test/` - Adding tests (e.g., `test/api-integration`)

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(api): add support for Claude API integration

- Implement Claude API client
- Add configuration options
- Update documentation

Closes #123
```

```bash
fix(docker): resolve volume permission issues

The volume mounting was failing due to incorrect permissions.
This commit fixes the issue by adjusting the user permissions.

Fixes #456
```

### Code Style

#### Shell Scripts
- Use shellcheck for validation
- Include proper error handling
- Add comments for complex logic
- Follow the existing script patterns

#### Documentation
- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep line length under 100 characters

#### Docker
- Optimize layer caching
- Use specific version tags
- Document all environment variables
- Include health checks

## 📝 Documentation

### What Needs Documentation?

- New features or functionality
- Configuration changes
- API changes
- Breaking changes
- Migration guides

### Documentation Style

- Use clear headings (H1 for title, H2 for sections)
- Include code examples with syntax highlighting
- Add screenshots for UI changes
- Link to related documentation
- Keep examples up-to-date

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] Docker container starts successfully
- [ ] Environment variables load correctly
- [ ] API connections work as expected
- [ ] Data persists after container restart
- [ ] Documentation is updated
- [ ] No secrets in committed files
- [ ] `.gitignore` is properly configured

### Testing Commands

```bash
# Test container startup
docker-compose up -d
docker-compose ps

# Check logs for errors
docker-compose logs

# Test API connection
curl http://localhost:3001/health

# Verify data persistence
docker-compose restart
# Verify data still exists after restart
```

## 📦 Project Structure

When adding new features, follow the existing structure:

```
smartFarm/
├── docs/              # All documentation
├── scripts/           # Utility scripts
├── .github/           # GitHub configuration
│   └── workflows/     # CI/CD workflows
├── backups/           # Backup location (gitignored)
└── ...
```

## 🔒 Security

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead:
1. Email the maintainers directly
2. Include detailed information about the vulnerability
3. Allow time for the issue to be fixed before public disclosure

### Security Best Practices

- Never commit API keys or secrets
- Use `.env` files for sensitive configuration
- Keep dependencies updated
- Validate all user inputs
- Follow the principle of least privilege

## 📋 Pull Request Process

1. **Update Documentation**: Ensure all documentation is updated
2. **Test Thoroughly**: Test all changes in a clean environment
3. **Clean Commits**: Squash commits if needed for clean history
4. **Link Issues**: Reference related issues in PR description
5. **Wait for Review**: Maintainers will review your PR
6. **Address Feedback**: Make requested changes promptly
7. **Merge**: Once approved, maintainers will merge

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] Documentation updated

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Fixes #(issue number)

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] No secrets committed
```

## 🎯 Priority Areas

We especially welcome contributions in these areas:

- **Agricultural Knowledge Base**: Curated farming information
- **IoT Integration**: Sensor data integration
- **Mobile Support**: Responsive design improvements
- **Multi-language**: Translation support
- **Testing**: Automated tests
- **Performance**: Optimization improvements

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussions
- **Pull Requests**: Code contributions

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

## 📚 Resources

- [Open WebUI Documentation](https://docs.openwebui.com)
- [Groq API Documentation](https://console.groq.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ❓ Questions?

Don't hesitate to ask questions in GitHub Discussions. We're here to help!

---

Thank you for contributing to SmartFarm! 🌾
