import json

from apps.system.crud.assistant import AssistantOutDs
from apps.system.schemas.system_schema import AssistantHeader


class DummyResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)


def build_assistant(
    *,
    domain: str = 'http://localhost:8100',
    request_origin: str | None = 'http://localhost:8100',
) -> AssistantHeader:
    return AssistantHeader(
        id=1,
        name='embedded',
        domain=domain,
        type=4,
        configuration=json.dumps({}),
        description='',
        oid=1,
        certificate=json.dumps(
            [
                {
                    'target': 'header',
                    'key': 'X-DE-TOKEN',
                    'value': 'token',
                }
            ]
        ),
        request_origin=request_origin,
    )


def test_empty_primary_datasource_list_falls_back_to_de2api(monkeypatch):
    called_urls: list[str] = []

    def fake_get(url, params=None, headers=None, cookies=None, timeout=None):
        called_urls.append(url)
        if url.endswith('/api/sqlbot/datasource'):
            return DummyResponse(200, {'code': 0, 'data': []})
        if url.endswith('/de2api/sqlbot/datasource'):
            return DummyResponse(
                200,
                {
                    'code': 0,
                    'data': [
                        {
                            'id': 123,
                            'name': 'sales-mysql',
                            'type': 'mysql',
                            'host': '127.0.0.1',
                            'port': 3306,
                            'user': 'root',
                            'password': '123456',
                            'dataBase': 'demo',
                            'schema': '',
                            'tables': [],
                        }
                    ],
                },
            )
        raise AssertionError(f'unexpected url: {url}')

    monkeypatch.setattr('apps.system.crud.assistant.requests.get', fake_get)

    out_ds = AssistantOutDs(build_assistant())

    assert called_urls == [
        'http://localhost:8100/api/sqlbot/datasource',
        'http://localhost:8100/de2api/sqlbot/datasource',
    ]
    assert out_ds.ds_list is not None
    assert len(out_ds.ds_list) == 1
    assert out_ds.ds_list[0].name == 'sales-mysql'


def test_missing_origin_falls_back_to_local_dataease_8100(monkeypatch):
    called_urls: list[str] = []

    def fake_get(url, params=None, headers=None, cookies=None, timeout=None):
        called_urls.append(url)
        if '127.0.0.1:8100/de2api/sqlbot/datasource' in url:
            return DummyResponse(
                200,
                {
                    'code': 0,
                    'data': [
                        {
                            'id': 456,
                            'name': 'fallback-sales',
                            'type': 'mysql',
                            'host': '127.0.0.1',
                            'port': 3306,
                            'user': 'root',
                            'password': '123456',
                            'dataBase': 'demo',
                            'schema': '',
                            'tables': [],
                        }
                    ],
                },
            )
        raise ConnectionError(f'connect failed: {url}')

    monkeypatch.setattr('apps.system.crud.assistant.requests.get', fake_get)

    out_ds = AssistantOutDs(
        build_assistant(domain='http://127.0.0.1:8080', request_origin=None)
    )

    assert called_urls[0] == 'http://127.0.0.1:8080/api/sqlbot/datasource'
    assert any(url == 'http://127.0.0.1:8100/de2api/sqlbot/datasource' for url in called_urls)
    assert out_ds.ds_list is not None
    assert len(out_ds.ds_list) == 1
    assert out_ds.ds_list[0].name == 'fallback-sales'
