# Monitor Eleitoral 2026

Monitor local da apuração eleitoral brasileira de 2026, com histórico em SQLite, dados oficiais verificáveis do TSE e acesso remoto protegido em `eleicoes.chicofigueiredo.com.br`.

## O que já funciona

- SQLite em WAL para Leituras Históricas e dados envelhecidos em falhas da fonte.
- API local e painel com panorama por cargo/UF, cards de votos válidos e percentual.
- Inclusão e desativação auditável de Candidaturas Monitoradas.
- Comparativo de cadeiras antes/depois, agrupado por espectro político.
- Verificação de JWS compacto `RS256` antes de aceitar payloads oficiais.

## Rodar localmente

```bash
bun install
cp .env.example .env
bun run dev
```

O painel abre em `http://localhost:7786`. A porta e o caminho do banco podem ser
alterados por `PORT` e `DATABASE_PATH`. O banco fica em `state/` e é ignorado pelo Git.

## Fonte eleitoral

O adaptador de formato deve consumir os arquivos de divulgação assinados pelo TSE;
`src/tse.ts` valida o envelope JWS antes que uma Leitura Histórica seja persistida.
As URLs e a chave pública do arquivo divulgado são configuração local no `.env`, nunca
conteúdo versionado. O formato definitivo do arquivo 2026 será ligado ao adaptador ao
ser publicado pelo TSE.

O desenho do domínio está em [CONTEXT.md](CONTEXT.md) e as decisões duráveis em [docs/adr](docs/adr/).

## Acesso remoto (Borda)

O painel roda em casa e chega à VPS por túnel SSH reverso (`infra/systemd/eleicao-apuracao-tunnel.service`, porta 27985). Quem expõe `eleicoes.chicofigueiredo.com.br` com TLS e senha é o Caddy da Borda da VPS; o Site está em `infra/caddy/eleicoes.chicofigueiredo.com.br.caddy`.

Para publicar ou atualizar o Site, na VPS (checkout deste repo):

```bash
sudo infra/caddy/publicar.sh
```

O script copia o `.caddy` para `/etc/caddy/sites/`, roda `caddy validate` e `systemctl reload caddy`. O TLS é emitido pelo Caddy sozinho (HTTP-01), sem certbot. Antes da primeira vez, crie `/etc/caddy/segredos/eleicoes-apuracao.auth` (uma linha `usuario hash-bcrypt`, dono `caddy:caddy`, modo 600); o script mostra o comando se faltar. Ver [ADR 0004](docs/adr/0004-acesso-remoto-protegido-pelo-caddy-da-borda.md).
