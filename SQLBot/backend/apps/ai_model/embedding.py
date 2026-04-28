import os.path
import threading
from typing import Optional

from langchain_core.embeddings import Embeddings
from pydantic import BaseModel

from common.core.config import settings

os.environ["TOKENIZERS_PARALLELISM"] = "false"


class EmbeddingModelInfo(BaseModel):
    folder: str
    name: str
    device: str = 'cpu'


def resolve_local_embedding_model_name():
    normalized_model = settings.DEFAULT_EMBEDDING_MODEL.replace('/', os.sep)
    candidates = [
        os.path.join(settings.LOCAL_MODEL_PATH, 'embedding', normalized_model),
        os.path.join(settings.LOCAL_MODEL_PATH, 'embedding',
                     settings.DEFAULT_EMBEDDING_MODEL.replace('/', '_')),
        os.path.join(settings.LOCAL_MODEL_PATH, 'embedding', "shibing624_text2vec-base-chinese")
    ]

    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate

    return candidates[0]


local_embedding_model = EmbeddingModelInfo(
    folder=settings.LOCAL_MODEL_PATH,
    name=resolve_local_embedding_model_name()
)

_lock = threading.Lock()
locks = {}

_embedding_model: dict[str, Optional[Embeddings]] = {}


class EmbeddingModelCache:

    @staticmethod
    def _new_instance(config: EmbeddingModelInfo = local_embedding_model):
        if settings.EMBEDDING_PROVIDER == "vllm":
            from langchain_openai import OpenAIEmbeddings

            if not settings.VLLM_EMBEDDING_API_BASE:
                raise ValueError("VLLM_EMBEDDING_API_BASE is required when EMBEDDING_PROVIDER=vllm")

            return OpenAIEmbeddings(
                model=settings.DEFAULT_EMBEDDING_MODEL,
                openai_api_base=settings.VLLM_EMBEDDING_API_BASE,
                openai_api_key=settings.VLLM_EMBEDDING_API_KEY or "EMPTY",
                request_timeout=settings.VLLM_EMBEDDING_TIMEOUT,
                check_embedding_ctx_length=False
            )

        from langchain_huggingface import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(model_name=config.name, cache_folder=config.folder,
                                     model_kwargs={'device': config.device},
                                     encode_kwargs={'normalize_embeddings': True}
                                     )

    @staticmethod
    def _get_lock(key: str = settings.DEFAULT_EMBEDDING_MODEL):
        lock = locks.get(key)
        if lock is None:
            with _lock:
                lock = locks.get(key)
                if lock is None:
                    lock = threading.Lock()
                    locks[key] = lock

        return lock

    @staticmethod
    def get_model(key: str = settings.DEFAULT_EMBEDDING_MODEL,
                  config: EmbeddingModelInfo = local_embedding_model) -> Embeddings:
        cache_key = key
        if settings.EMBEDDING_PROVIDER == "vllm":
            cache_key = f"vllm::{settings.VLLM_EMBEDDING_API_BASE}::{settings.DEFAULT_EMBEDDING_MODEL}"

        model_instance = _embedding_model.get(cache_key)
        if model_instance is None:
            lock = EmbeddingModelCache._get_lock(cache_key)
            with lock:
                model_instance = _embedding_model.get(cache_key)
                if model_instance is None:
                    model_instance = EmbeddingModelCache._new_instance(config)
                    _embedding_model[cache_key] = model_instance

        return model_instance
