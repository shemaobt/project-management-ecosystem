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
├── contexts/  stores/  services/  hooks/  fixtures/
├── types/  constants/  utils/  styles/  i18n/
```

A estrutura é a do `CLAUDE.md` §4 e as pastas existem mesmo vazias — cada issue da wave 1 deposita arquivos numa árvore que já existe.

## Proxy `/api`

`vite.config.ts` encaminha `/api` para `VITE_API_PROXY_TARGET` (padrão `http://localhost:8000`, onde o `tripod-api` roda localmente).

**Não é usado na wave 1**: nenhuma tela faz chamada HTTP — todas leem a camada de fixtures (`src/fixtures/`, FE-05). O proxy está configurado desde já para que a wave 2 (integração tela a tela) não precise mexer em configuração.

## Container

A imagem é a mesma de todo frontend da org (`shemaobt/meaning-map-ui`): `node:20-alpine` constrói, `nginx:stable-alpine` serve o `dist/` na porta **8080** — o contrato do Cloud Run — com fallback de SPA para qualquer rota, healthcheck e o bloco `/api` que encaminha para `$BACKEND_URL`.

```bash
docker build -t project-management-ecosystem .
docker run --rm -p 8080:8080 -e BACKEND_URL=http://host.docker.internal:8000 project-management-ecosystem
```

**`BACKEND_URL` é obrigatória.** O entrypoint lê `/run/secrets/.env` (montado do Secret Manager no Cloud Run, FE-42), depois substitui a variável no template do nginx — e **recusa subir** se ela estiver ausente ou sem `http://`/`https://`. Um container que sobe com o proxy apontando para lugar nenhum é muito mais difícil de diagnosticar do que um que não sobe. Na wave 1 não há backend atrás: qualquer URL válida serve como placeholder.

**O bloco `/api` é `location ^~` e não declara CORS.** O `^~` dispensa a regex de cache dos estáticos, que sem ele venceria o prefixo e faria todo `/api/*.png|jpg|svg` cair no `root` e 404 em vez de ir ao proxy — verificado na imagem construída, com `/api/health.png`. E CORS não faz sentido aqui: o mesmo nginx serve a SPA e encaminha a API, então é tudo mesma origem e o browser nem pergunta. O bloco que veio do RRF refletia de volta o `Origin` de quem perguntasse com `Allow-Credentials: true` — qualquer site poderia chamar credenciado e ler a resposta — e, quando o `tripod-api` chegar com os seus próprios cabeçalhos, dois `Access-Control-Allow-Origin` fazem o browser recusar os dois. Quem responde preflight é o backend. Uma barra final em `BACKEND_URL` é tolerada: o entrypoint a corta antes de substituir, senão o `proxy_pass` sairia com duas barras.

**Nenhum segredo entra na imagem.** O Vite inlina no bundle tudo o que vê em build (`VITE_*`), então qualquer valor `VITE_*` é público por definição. A imagem final não carrega `node_modules` nem fonte — só o `dist/`, o `nginx.conf` e o entrypoint. Segredos de verdade chegam em runtime, pelo `.env` montado, e nunca por `ARG`/`ENV` no `Dockerfile`.

## Convenções

Leia o [`CLAUDE.md`](CLAUDE.md) antes de escrever código: ele é normativo para stack, estrutura, design system, regras de domínio, privacidade e fluxo de PRs.
