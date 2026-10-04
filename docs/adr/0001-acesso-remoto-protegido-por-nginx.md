# Acesso remoto protegido por Nginx

O Monitor Eleitoral será servido localmente e alcançado pelo domínio via túnel SSH reverso, seguindo os monitores existentes. O Nginx na VPS aplicará autenticação Basic; usuário e senha serão definidos no `.env` local e jamais versionados, pois o painel contém controles administrativos e histórico privado.
