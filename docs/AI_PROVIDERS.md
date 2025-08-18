# 🤖 AI Providers Guide

## Overview

IdSiberAi-CLI supports **6 major AI providers** with automatic fallback and seamless switching. Each provider has unique strengths for different tasks.

## 🎯 Provider Comparison

| Provider | Best For | Speed | Context | Cost |
|----------|----------|--------|---------|------|
| **DeepSeek** | Coding, Math, Logic | ⚡⚡⚡ | 32K | 💰 |
| **OpenAI GPT** | General Purpose | ⚡⚡ | 128K | 💰💰 |
| **Claude** | Analysis, Writing | ⚡⚡ | 200K | 💰💰💰 |
| **Grok** | Real-time, Creative | ⚡⚡⚡ | 128K | 💰💰 |
| **ZhiPuAI** | Multilingual, Specialized | ⚡⚡ | 128K | 💰 |
| **QwenAI** | Multilingual, Coding, General | ⚡⚡⚡ | 128K | 💰 |

## 🔧 Configuration

### Environment Setup

```env
# Primary Provider (fallback order)
DEFAULT_AI_PROVIDER=DeepSeek
ENABLE_AI_FALLBACK=true

# API Keys (add at least one)
DEEPSEEK_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
CLAUDE_API_KEY=sk-ant-your-key-here
GROK_API_KEY=xai-your-key-here
ZHIPUAI_API_KEY=your-key-here
QWEN_API_KEY=your-key-here
```

## 🚀 Provider Details

### 1. DeepSeek
**Best for:** Coding, mathematical reasoning, logical tasks

#### Setup
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create account and verify email
3. Generate API key in dashboard
4. Add to `.env`: `DEEPSEEK_API_KEY=sk-...`

#### Features
- ✅ Excellent code generation
- ✅ Fast response times
- ✅ Competitive pricing
- ✅ Good for file operations
- ❌ Limited general knowledge

### 2. OpenAI GPT
**Best for:** General purpose, reasoning, creative writing

#### Setup
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create account and add payment method
3. Generate API key
4. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`

#### Features
- ✅ Excellent general intelligence
- ✅ Great reasoning capabilities
- ✅ Large context window
- ✅ Reliable performance
- ❌ Higher cost

### 3. Claude (Anthropic)
**Best for:** Analysis, long documents, safety-critical tasks

#### Setup
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create account and verify
3. Generate API key
4. Add to `.env`: `CLAUDE_API_KEY=sk-ant-...`

#### Features
- ✅ Excellent for analysis
- ✅ Very large context (200K)
- ✅ Strong safety measures
- ✅ Great for documentation
- ❌ Most expensive

### 4. Grok (xAI)
**Best for:** Creative tasks, real-time information, fun interactions

#### Setup
1. Visit [xAI Console](https://console.x.ai/)
2. Create account
3. Generate API key
4. Add to `.env`: `GROK_API_KEY=xai-...`

#### Features
- ✅ Very fast responses
- ✅ Creative and engaging
- ✅ Real-time knowledge
- ✅ Good for brainstorming
- ❌ Sometimes inconsistent

### 5. ZhiPuAI
**Best for:** Multilingual tasks, Chinese language, specialized domains

#### Setup
1. Visit [ZhiPuAI Platform](https://open.bigmodel.cn/)
2. Create account
3. Generate API key
4. Add to `.env`: `ZHIPUAI_API_KEY=...`

#### Features
- ✅ Excellent Chinese support
- ✅ Multilingual capabilities
- ✅ Cost-effective
- ✅ Good for specialized tasks
- ❌ Less familiar with Western context

### 6. QwenAI
**Best for:** Multilingual tasks, coding, general purpose

#### Setup
1. Visit [Qwen Dashboard](https://dashscope.aliyun.com/)
2. Create account
3. Generate API key
4. Add to `.env`: `QWEN_API_KEY=sk-...`

#### Features
- ✅ Fast and efficient
- ✅ Strong multilingual support
- ✅ Good for coding and general tasks
- ✅ Competitive pricing
- ❌ May require specific model selection

## 🔄 Provider Management

### Switching Providers

```bash
# Check current provider
You: /providers

# Switch provider
You: /switch
? Select AI Provider: Claude
✅ Successfully switched to Claude

# Or request specific provider
You: "switch to OpenAI for this task"
```

### Testing Providers

```bash
# Test all configured providers
You: /test

🧪 Testing AI Providers
✅ PASS DeepSeek (1.2s)
✅ PASS OpenAI (2.1s)
❌ FAIL Claude (Invalid API key)
✅ PASS Grok (0.8s)
⏭️ SKIP ZhiPuAI (Not configured)
```

### Auto Fallback

When enabled (`ENABLE_AI_FALLBACK=true`), the system will automatically try the next provider if the current one fails.

```
You: "analyze this code"

⚠️ DeepSeek failed: Rate limit exceeded
🔄 Falling back to OpenAI...
✅ Request completed with OpenAI
```

## 🎯 Task-Specific Recommendations

### Coding Tasks
1. **DeepSeek** - Primary choice
2. **QwenAI** - Fast coding tasks
3. **OpenAI** - Fallback
4. **Claude** - Complex analysis

### File Operations
1. **DeepSeek** - Fast and accurate
2. **OpenAI** - Complex operations
3. **Grok** - Creative solutions

### Documentation
1. **Claude** - Comprehensive analysis
2. **OpenAI** - Well-structured output
3. **DeepSeek** - Technical docs

### Data Analysis
1. **Claude** - Large datasets
2. **OpenAI** - Complex reasoning
3. **DeepSeek** - Statistical analysis

### Creative Tasks
1. **Grok** - Fun and engaging
2. **OpenAI** - Balanced creativity
3. **Claude** - Thoughtful approach

### Multilingual
1. **ZhiPuAI** - Chinese/Asian languages
2. **QwenAI** - Multilingual support
3. **OpenAI** - Global languages
4. **Claude** - European languages

## 📊 Performance & Monitoring

### Usage Statistics

```bash
You: /stats

AI Provider Usage Stats:
  DeepSeek:
    Total Calls: 47
    Success Rate: 97.9%
    Avg Response: 1.2s
    
  OpenAI:
    Total Calls: 23
    Success Rate: 100%
    Avg Response: 2.1s
```

## 🔒 Security & Best Practices

### API Key Security
- Store keys in `.env` file only
- Never commit keys to version control
- Rotate keys regularly
- Monitor usage in provider dashboards

### Rate Limits

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| DeepSeek | 1M tokens/month | Pay-per-use |
| OpenAI | $5 credit | Pay-per-use |
| Claude | Limited | Pay-per-use |
| Grok | Beta access | TBD |
| ZhiPuAI | Limited | Pay-per-use |
| QwenAI | Limited | Pay-per-use |

## 🐛 Troubleshooting

### Common Issues

#### Invalid API Key
```
❌ AI API Error: Invalid API key
```
**Solution:** Verify key format and permissions in provider dashboard

#### Rate Limit Exceeded
```
❌ Rate limit exceeded for provider
```
**Solution:** Enable auto fallback or add more providers

#### Network Timeouts
```
❌ Request timeout after 30s
```
**Solution:** Check internet connection, increase timeout settings, or try different provider

#### Model Not Available
```
❌ Model 'gpt-5' not found
```
**Solution:** Check model name in provider docs and update model in `.env`

### Debug Mode

```env
DEBUG=true
NODE_ENV=development
```

## 📈 Cost Optimization

### Provider Selection Strategy
- **Primary**: Use DeepSeek or ZhiPuAI for cost-effective operations
- **Fallback**: Configure OpenAI for reliability
- **Specialized**: Use Claude for complex analysis tasks
- **Creative**: Use Grok for brainstorming and creative content

### Token Management
```env
# Optimize token usage
DEEPSEEK_MAX_TOKENS=2000  # Lower for simple tasks
OPENAI_MAX_TOKENS=4000    # Higher for complex tasks
CLAUDE_MAX_TOKENS=8000    # Highest for analysis
```

---

**Next:** [Tools Reference](./TOOLS.md) | [S3 Integration](./S3_GUIDE.md) | [Examples](./EXAMPLES.md)