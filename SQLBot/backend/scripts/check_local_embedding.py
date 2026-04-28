import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.ai_model.embedding import EmbeddingModelCache, local_embedding_model
from common.core.config import settings


def main() -> int:
    print("EMBEDDING_PROVIDER =", settings.EMBEDDING_PROVIDER)
    print("DEFAULT_EMBEDDING_MODEL =", settings.DEFAULT_EMBEDDING_MODEL)
    print("LOCAL_MODEL_PATH =", settings.LOCAL_MODEL_PATH)
    print("RESOLVED_MODEL_DIR =", local_embedding_model.name)

    model_dir = Path(local_embedding_model.name)
    if not model_dir.exists():
        print("MODEL_DIR_EXISTS = False")
        return 1

    print("MODEL_DIR_EXISTS = True")
    model = EmbeddingModelCache.get_model()
    vector = model.embed_query("本地向量模型自检")
    print("VECTOR_TYPE =", type(vector).__name__)
    print("VECTOR_DIM =", len(vector))
    print("VECTOR_SAMPLE =", round(float(vector[0]), 6))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
