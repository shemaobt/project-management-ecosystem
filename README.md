# project-management-ecosystem

Console do **Ecossistema Shemá** — gestão de projetos de tradução bíblica multimodal das equipes de campo JOCUM/YWAM.

O backend é o serviço existente [`shemaobt/tripod-api`](https://github.com/shemaobt/tripod-api); o Shemá é um módulo dentro dele (`/api/shema`). Nenhum backend é criado neste repositório.

## Requisitos

- Node.js 20+ (desenvolvido em 24)
- npm 10+

## Começando

```bash
npm install
cp .env.example .env
npm run dev
```

O app sobe em `http://localhost:5173`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint em todo o repositório |
| `npm run preview` | Serve o build de produção localmente |

## Stack

React 19.2 · TypeScript 5.9 · Vite 7 · Tailwind CSS v4 (via `@tailwindcss/vite`) · react-router-dom v7 · Zustand + React Context · Axios · Radix UI (shadcn-style) · lucide-react · sonner · i18next (PT/EN) · react-leaflet.

## Estrutura

```
src/
├── App.tsx  main.tsx  index.css
├── components/{common,layout,pages,ui}/
├── contexts/  stores/  services/  hooks/
├── types/  constants/  utils/  styles/  i18n/
```

A estrutura é a do `CLAUDE.md` §4 e as pastas existem mesmo vazias — cada issue da wave 1 deposita arquivos numa árvore que já existe.

## Proxy `/api`

`vite.config.ts` encaminha `/api` para `VITE_API_PROXY_TARGET` (padrão `http://localhost:8000`, onde o `tripod-api` roda localmente).

**Não é usado na wave 1**: nenhuma tela faz chamada HTTP — todas leem a camada de fixtures (`src/fixtures/`, FE-05). O proxy está configurado desde já para que a wave 2 (integração tela a tela) não precise mexer em configuração.

## DS-PROJECT

`DS-PROJECT/` é o protótipo aprovado pelo cliente e a fonte da verdade de design. É **somente leitura** — não é modificado por trabalho de implementação e não é versionado neste repositório (veja `.gitignore`).

## Convenções

Leia o [`CLAUDE.md`](CLAUDE.md) antes de escrever código: ele é normativo para stack, estrutura, design system, regras de domínio, privacidade e fluxo de PRs.
