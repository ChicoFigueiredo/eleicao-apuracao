# SQLite como histórico eleitoral local

O Monitor Eleitoral usará SQLite em WAL como fonte local única de estado, incluindo cada Leitura Histórica de 2026. O painel e os coletores compartilham esse banco para manter a operação local simples, permitir evolução temporal e evitar uma infraestrutura de servidor de dados para um único operador.
