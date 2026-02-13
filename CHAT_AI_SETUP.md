# OpenFarm Chat AI Setup

## Configuración de Proveedores AI

El Agent Chat ahora soporta proveedores AI reales. Por defecto usa mock si no hay API key configurada.

---

## Variables de Entorno

```bash
# Opción 1: Provider genérico + API key
export AI_PROVIDER=openai  # openai | anthropic | openrouter | local
export AI_API_KEY=sk-...

# Opción 2: API keys específicas por provider
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Opcional: Modelo y URL custom
export AI_MODEL=gpt-4o-mini
export AI_API_URL=https://api.openai.com  # para proxies o local
```

---

## Proveedores Soportados

### OpenAI (default)
```bash
export AI_PROVIDER=openai
export AI_API_KEY=sk-...
export AI_MODEL=gpt-4o-mini  # opcional
```

**Modelos recomendados:**
- `gpt-4o-mini` - Rápido y económico
- `gpt-4o` - Mejor calidad
- `gpt-3.5-turbo` - Más barato

### Anthropic (Claude)
```bash
export AI_PROVIDER=anthropic
export AI_API_KEY=sk-ant-...
export AI_MODEL=claude-3-sonnet-20240229
```

**Modelos:**
- `claude-3-5-sonnet-20241022` - Mejor calidad/precio
- `claude-3-opus-20240229` - Máxima calidad
- `claude-3-haiku-20240307` - Más rápido

### OpenRouter (acceso a múltiples modelos)
```bash
export AI_PROVIDER=openrouter
export AI_API_KEY=sk-or-...
export AI_MODEL=anthropic/claude-3.5-sonnet
```

**Ventaja:** Un API key para acceder a Claude, GPT-4, Llama, etc.

### Local (Ollama, LM Studio, etc.)
```bash
export AI_PROVIDER=local
export AI_API_URL=http://localhost:11434
export AI_MODEL=llama2
```

---

## Uso

1. **Setear variables** en tu `.bashrc`, `.zshrc`, o archivo `.env`:

```bash
# ~/.bashrc o ~/.zshrc
export OPENAI_API_KEY=sk-...
```

2. **Correr la TUI**:

```bash
bun run tui
```

3. **Abrir Agent Chat**:
   - Desde Dashboard: presionar `c`
   - Escribir mensaje y Enter

---

## Smart Context

El sistema automáticamente incluye en el contexto:

- **Archivos modificados recientemente** (git)
- **Estado de git** (branch, archivos staged)
- **Errores recientes** (TypeScript)

Para mencionar archivos específicos:
```
Revisa @src/index.ts y dime qué hace
```

---

## Troubleshooting

### "No API key found"
```bash
# Verificar que esté seteada
echo $OPENAI_API_KEY

# O setear AI_API_KEY genérico
export AI_API_KEY=sk-...
```

### Errores de conexión
```bash
# Verificar conectividad
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Mock mode
Si no hay API key configurada, el sistema usa mock:
```
This is a mock response. Set AI_API_KEY environment variable to use real AI.
```

---

## Costos

| Provider | Modelo | Input | Output |
|----------|--------|-------|--------|
| OpenAI | gpt-4o-mini | $0.15/M | $0.60/M |
| OpenAI | gpt-4o | $2.50/M | $10.00/M |
| Anthropic | claude-3-sonnet | $3.00/M | $15.00/M |
| Anthropic | claude-3-haiku | $0.25/M | $1.25/M |

*Precios por millón de tokens (aprox 750k palabras).*

---

## Seguridad

- **Nunca commitees** API keys al repo
- **Usa `.env`** files en `.gitignore`
- **Rota keys** regularmente
- **Monitorea uso** en dashboards de providers
