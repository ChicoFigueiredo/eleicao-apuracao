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
