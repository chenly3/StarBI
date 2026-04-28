import json
import re
import urllib
from typing import Optional

import requests
from fastapi import FastAPI
from sqlmodel import Session, select
from starlette.middleware.cors import CORSMiddleware

from apps.datasource.models.datasource import CoreDatasource
from apps.datasource.utils.utils import aes_encrypt
from apps.system.models.system_model import AssistantModel
from apps.system.schemas.auth import CacheName, CacheNamespace
from apps.system.schemas.system_schema import AssistantHeader, AssistantOutDsSchema, UserInfoDTO
from common.core.config import settings
from common.core.db import engine
from common.core.sqlbot_cache import cache
from common.utils.aes_crypto import simple_aes_decrypt
from common.utils.utils import SQLBotLogUtil, get_domain_list, string_to_numeric_hash
from common.core.deps import Trans
from common.core.response_middleware import ResponseMiddleware


@cache(namespace=CacheNamespace.EMBEDDED_INFO, cacheName=CacheName.ASSISTANT_INFO, keyExpression="assistant_id")
async def get_assistant_info(*, session: Session, assistant_id: int) -> AssistantModel | None:
    db_model = session.get(AssistantModel, assistant_id)
    return db_model


def get_assistant_user(*, id: int):
    return UserInfoDTO(id=id, account="sqlbot-inner-assistant", oid=1, name="sqlbot-inner-assistant",
                       email="sqlbot-inner-assistant@sqlbot.com")


def get_assistant_ds(session: Session, llm_service) -> list[dict]:
    assistant: AssistantHeader = llm_service.current_assistant
    type = assistant.type
    if type == 0 or type == 2:
        configuration = assistant.configuration
        if configuration:
            config: dict[any] = json.loads(configuration)
            oid: int = int(config['oid'])
            stmt = select(CoreDatasource.id, CoreDatasource.name, CoreDatasource.description).where(
                CoreDatasource.oid == oid)
            if not assistant.online:
                public_list: list[int] = config.get('public_list') or None
                if public_list:
                    stmt = stmt.where(CoreDatasource.id.in_(public_list))
                else:
                    return []
                """ private_list: list[int] = config.get('private_list') or None
                if private_list:
                    stmt = stmt.where(~CoreDatasource.id.in_(private_list)) """
        db_ds_list = session.exec(stmt)

        result_list = [
            {
                "id": ds.id,
                "name": ds.name,
                "description": ds.description
            }
            for ds in db_ds_list
        ]

        # filter private ds if offline
        return result_list
    out_ds_instance: AssistantOutDs = AssistantOutDsFactory.get_instance(assistant)
    llm_service.out_ds_instance = out_ds_instance
    dslist = out_ds_instance.get_simple_ds_list()
    # format?
    return dslist


def init_dynamic_cors(app: FastAPI):
    try:
        with Session(engine) as session:
            list_result = session.exec(select(AssistantModel).order_by(AssistantModel.create_time)).all()
            seen = set()
            unique_domains = []
            for item in list_result:
                if item.domain:
                    for domain in get_domain_list(item.domain):
                        domain = domain.strip()
                        if domain and domain not in seen:
                            seen.add(domain)
                            unique_domains.append(domain)
            cors_middleware = None
            response_middleware = None
            for middleware in app.user_middleware:
                if not cors_middleware and middleware.cls == CORSMiddleware:
                    cors_middleware = middleware
                if not response_middleware and middleware.cls == ResponseMiddleware:
                    response_middleware = middleware
                if cors_middleware and response_middleware:
                    break
                
            updated_origins = list(set(settings.all_cors_origins + unique_domains))
            if cors_middleware:
                cors_middleware.kwargs['allow_origins'] = updated_origins
            if response_middleware:
                for instance in ResponseMiddleware.instances:
                    instance.update_allow_origins(updated_origins)

    except Exception as e:
        return False, e


class AssistantOutDs:
    assistant: AssistantHeader
    ds_list: Optional[list[AssistantOutDsSchema]] = None
    certificate: Optional[str] = None
    request_origin: Optional[str] = None

    def __init__(self, assistant: AssistantHeader):
        self.assistant = assistant
        self.ds_list = None
        self.certificate = assistant.certificate
        self.request_origin = assistant.request_origin
        self.get_ds_from_api()

    # @cache(namespace=CacheNamespace.EMBEDDED_INFO, cacheName=CacheName.ASSISTANT_DS, keyExpression="current_user.id")
    def get_ds_from_api(self):
        config: dict[any] = json.loads(self.assistant.configuration)
        endpoint: str = config.get('endpoint') or ''
        if not endpoint and self.assistant.type == 4 and self.certificate:
            endpoint = '/api/sqlbot/datasource'
        endpoint_candidates = self.get_complete_endpoint_candidates(endpoint=endpoint)
        if not endpoint_candidates:
            raise Exception(
                f"Failed to get datasource list from {config.get('endpoint')}, error: [Assistant domain or endpoint miss]")
        certificateList = self.parse_certificate_list()
        header = {}
        cookies = {}
        param = {}
        for item in certificateList:
            target = item.get('target')
            key = item.get('key')
            value = item.get('value')
            if not target or not key:
                continue
            if target == 'header':
                header[key] = value
            if target == 'cookie':
                cookies[key] = value
            if target == 'param':
                param[key] = value
        timeout = int(config.get('timeout')) if config.get('timeout') else 10
        last_error = None
        last_status = None
        last_response_excerpt = None

        for endpoint in endpoint_candidates:
            request_summary = self.build_request_summary(
                endpoint=endpoint, header=header, cookies=cookies, param=param
            )
            SQLBotLogUtil.info(f"Embedded datasource request -> {request_summary}")
            try:
                res = requests.get(url=endpoint, params=param, headers=header, cookies=cookies, timeout=timeout)
            except Exception as e:
                SQLBotLogUtil.exception(
                    f"Embedded datasource request failed -> {request_summary}, error: {str(e)}"
                )
                last_error = str(e)
                continue

            if res.status_code == 200:
                response_excerpt = self.build_response_excerpt(res)
                try:
                    result_json: dict[any] = json.loads(res.text)
                except Exception as e:
                    raise Exception(
                        f"Failed to parse datasource list response from {endpoint}, request: {request_summary}, "
                        f"error: {str(e)}, response: {response_excerpt}"
                    )
                if result_json.get('code') == 0 or result_json.get('code') == 200:
                    temp_list = result_json.get('data', [])
                    if not temp_list:
                        last_error = (
                            f"Datasource list is empty from {endpoint}, request: {request_summary}, "
                            f"response: {response_excerpt}"
                        )
                        continue
                    temp_ds_list = [
                        self.convert2schema(item, config)
                        for item in temp_list
                    ]
                    self.ds_list = temp_ds_list
                    return self.ds_list
                error_message = result_json.get('message') or result_json.get('msg') or result_json.get('detail')
                last_error = (
                    f"Failed to get datasource list from {endpoint}, request: {request_summary}, "
                    f"error: {error_message}, response: {response_excerpt}"
                )
                continue

            last_status = res.status_code
            last_response_excerpt = self.build_response_excerpt(res)
            SQLBotLogUtil.error(
                f"Failed to get datasource list from {endpoint}, request: {request_summary}, "
                f"status: {last_status}, response: {last_response_excerpt}"
            )

        if last_error:
            raise Exception(last_error)

        raise Exception(
            f"Failed to get datasource list from {endpoint_candidates[-1]}, "
            f"status: {last_status}, response: {last_response_excerpt}"
        )

    def parse_certificate_list(self) -> list[dict]:
        if not self.certificate:
            raise Exception("Assistant certificate is empty.")
        try:
            certificate_list = json.loads(self.certificate)
        except Exception as e:
            raise Exception(f"Assistant certificate json decode failed: {str(e)}")
        if not isinstance(certificate_list, list):
            raise Exception("Assistant certificate payload is not a list.")
        return certificate_list

    def build_request_summary(self, endpoint: str, header: dict, cookies: dict, param: dict) -> str:
        de_token = str(header.get('X-DE-TOKEN') or '')
        return (
            f"endpoint={endpoint}, "
            f"request_origin={self.request_origin or ''}, "
            f"header_keys={sorted(header.keys())}, "
            f"cookie_keys={sorted(cookies.keys())}, "
            f"param={param}, "
            f"has_x_de_token={bool(de_token)}, "
            f"x_de_token_length={len(de_token)}"
        )

    def build_response_excerpt(self, response: requests.Response) -> str:
        try:
            text = response.text or ''
        except Exception:
            text = ''
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) > 500:
            text = text[:500] + '...'
        return text or str(response)

    def get_first_element(self, text: str):
        parts = re.split(r'[,;]', text.strip())
        first_domain = parts[0].strip()
        return first_domain

    def normalize_origin(self, origin: Optional[str]) -> Optional[str]:
        if not origin:
            return None
        normalized = origin.strip().rstrip('/')
        if not normalized:
            return None
        if normalized.startswith('http://') or normalized.startswith('https://'):
            return normalized
        return f"http://{normalized}"

    def collect_datasource_origin_candidates(self) -> list[str]:
        candidates: list[str] = []

        def add_origin(origin: Optional[str]) -> None:
            normalized = self.normalize_origin(origin)
            if normalized:
                candidates.append(normalized)

        add_origin(self.request_origin)

        domain_text = self.assistant.domain or ''
        if domain_text:
            for item in re.split(r'[,;]', domain_text):
                add_origin(item)

        for origin in settings.all_cors_origins:
            parsed = urllib.parse.urlsplit(origin)
            if parsed.hostname in {'localhost', '127.0.0.1'} and parsed.port in {8100, 8080}:
                add_origin(origin)

        # Fallback for local split deployment (DataEase backend on 8100, SQLBot on 8000).
        add_origin('http://127.0.0.1:8100')
        add_origin('http://localhost:8100')

        deduped: list[str] = []
        seen: set[str] = set()
        for origin in candidates:
            if origin in seen:
                continue
            seen.add(origin)
            deduped.append(origin)
        return deduped

    def get_complete_endpoint(self, endpoint: str) -> str | None:
        if not endpoint:
            return None
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            return endpoint
        if self.request_origin:
            normalized_origin = self.request_origin.strip('/')
            if endpoint.startswith('/'):
                return f"{normalized_origin}{endpoint}"
            return f"{normalized_origin}/{endpoint}"
        domain_text = self.assistant.domain
        if not domain_text:
            return None
        if ',' in domain_text or ';' in domain_text:
            return (
                self.request_origin.strip('/') if self.request_origin else self.get_first_element(domain_text).strip(
                    '/')) + endpoint
        else:
            return f"{domain_text}{endpoint}"

    def get_complete_endpoint_candidates(self, endpoint: str) -> list[str]:
        primary_endpoint = self.get_complete_endpoint(endpoint)
        if not primary_endpoint:
            return []

        candidates = [primary_endpoint]
        if endpoint == '/api/sqlbot/datasource':
            for origin in self.collect_datasource_origin_candidates():
                candidates.append(f"{origin}/de2api/sqlbot/datasource")
                candidates.append(f"{origin}/api/sqlbot/datasource")

        deduped_candidates: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            if candidate in seen:
                continue
            seen.add(candidate)
            deduped_candidates.append(candidate)
        return deduped_candidates

    def get_simple_ds_list(self):
        if self.ds_list:
            return [{'id': ds.id, 'name': ds.name, 'description': ds.comment} for ds in self.ds_list]
        else:
            raise Exception("Datasource list is not found.")

    def get_db_schema(self, ds_id: int, question: str = '', embedding: bool = True,
                      table_list: list[str] = None) -> str:
        ds = self.get_ds(ds_id)
        schema_str = ""
        db_name = ds.db_schema if ds.db_schema is not None and ds.db_schema != "" else ds.dataBase
        schema_str += f"【DB_ID】 {db_name}\n【Schema】\n"
        tables = []
        i = 0
        for table in ds.tables:
            # 如果传入了 table_list，则只处理在列表中的表
            if table_list is not None and table.name not in table_list:
                continue

            i += 1
            schema_table = ''
            schema_table += f"# Table: {db_name}.{table.name}" if ds.type != "mysql" and ds.type != "es" else f"# Table: {table.name}"
            table_comment = table.comment
            if table_comment == '':
                schema_table += '\n[\n'
            else:
                schema_table += f", {table_comment}\n[\n"

            field_list = []
            for field in table.fields:
                field_comment = field.comment
                if field_comment == '':
                    field_list.append(f"({field.name}:{field.type})")
                else:
                    field_list.append(f"({field.name}:{field.type}, {field_comment})")
            schema_table += ",\n".join(field_list)
            schema_table += '\n]\n'
            t_obj = {"id": i, "schema_table": schema_table}
            tables.append(t_obj)

        # do table embedding
        # if embedding and tables and settings.TABLE_EMBEDDING_ENABLED:
        #     tables = get_table_embedding(tables, question)

        if tables:
            for s in tables:
                schema_str += s.get('schema_table')

        return schema_str

    def get_ds(self, ds_id: int, trans: Trans = None):
        if self.ds_list:
            for ds in self.ds_list:
                if ds.id == ds_id:
                    return ds
        else:
            raise Exception("Datasource list is not found.")
        raise Exception(f"Datasource id {ds_id} is not found." if trans is None else trans(
            'i18n_data_training.datasource_id_not_found', key=ds_id))

    def convert2schema(self, ds_dict: dict, config: dict[any]) -> AssistantOutDsSchema:
        id_marker: str = ''
        attr_list = ['name', 'type', 'host', 'port', 'user', 'dataBase', 'schema', 'mode']
        if config.get('encrypt', False):
            key = config.get('aes_key', None)
            iv = config.get('aes_iv', None)
            aes_attrs = ['host', 'user', 'password', 'dataBase', 'db_schema', 'schema', 'mode']
            for attr in aes_attrs:
                if attr in ds_dict and ds_dict[attr]:
                    try:
                        ds_dict[attr] = simple_aes_decrypt(ds_dict[attr], key, iv)
                    except Exception as e:
                        raise Exception(
                            f"Failed to encrypt {attr} for datasource {ds_dict.get('name')}, error: {str(e)}")
        
        id = ds_dict.get('id', None)
        if not id:
            for attr in attr_list:
                if attr in ds_dict:
                    id_marker += str(ds_dict.get(attr, '')) + '--sqlbot--'
            id = string_to_numeric_hash(id_marker)
        db_schema = ds_dict.get('schema', ds_dict.get('db_schema', ''))
        ds_dict.pop("schema", None)
        return AssistantOutDsSchema(**{**ds_dict, "id": id, "db_schema": db_schema})


class AssistantOutDsFactory:
    @staticmethod
    def get_instance(assistant: AssistantHeader) -> AssistantOutDs:
        return AssistantOutDs(assistant)


def get_out_ds_conf(ds: AssistantOutDsSchema, timeout: int = 30) -> str:
    conf = {
        "host": ds.host or '',
        "port": ds.port or 0,
        "username": ds.user or '',
        "password": ds.password or '',
        "database": ds.dataBase or '',
        "driver": '',
        "extraJdbc": ds.extraParams or '',
        "dbSchema": ds.db_schema or '',
        "timeout": timeout or 30,
        "mode": ds.mode or ''
    }
    conf["extraJdbc"] = ''
    return aes_encrypt(json.dumps(conf))
