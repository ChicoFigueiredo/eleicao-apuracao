"""Verificador auxiliar para inspeção manual de JWS oficiais do TSE.

O coletor de produção valida em Bun; este módulo mantém uma porta Python para
auditar arquivos recebidos ou experimentar formatos divulgados pelo Tribunal.
"""

from __future__ import annotations

import base64
import json


def decode_unverified_payload(compact_jws: str) -> dict[str, object]:
    """Decodifica somente para inspeção; não substitui a validação em Bun."""
    pieces = compact_jws.strip().split(".")
    if len(pieces) != 3:
        raise ValueError("esperado JWS compacto com três partes")
    payload = pieces[1] + "=" * (-len(pieces[1]) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))
