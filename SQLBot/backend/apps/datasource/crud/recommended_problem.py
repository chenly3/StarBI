import datetime

from sqlmodel import select

from apps.query_resource_learning.models import QueryResourceLearningResult
from common.core.deps import SessionDep, CurrentUser, Trans
from ..models.datasource import DsRecommendedProblem, RecommendedProblemBase, CoreDatasource, RecommendedProblemResponse
import orjson


def _build_learning_resource_ids(ds_id: int) -> list[str]:
    if ds_id is None:
        return []
    return [f"datasource:{ds_id}", str(ds_id)]


def _normalize_learning_questions(questions) -> list[str]:
    normalized_questions: list[str] = []
    for item in questions or []:
        if isinstance(item, dict):
            text = str(item.get("question") or item.get("title") or item.get("content") or "").strip()
        elif item is None:
            text = ""
        else:
            text = str(item).strip()
        if text and text not in normalized_questions:
            normalized_questions.append(text)
    return normalized_questions


def _get_learning_recommended_questions(session: SessionDep, ds_id: int) -> list[str]:
    learning_results: list[QueryResourceLearningResult] = []
    for resource_id in _build_learning_resource_ids(ds_id):
        statement = select(QueryResourceLearningResult).where(
            QueryResourceLearningResult.resource_id == resource_id
        ).order_by(QueryResourceLearningResult.id.desc())
        learning_results.extend(session.exec(statement).all())

    for learning_result in sorted(
        learning_results,
        key=lambda row: getattr(row, "id", 0) or 0,
        reverse=True,
    ):
        questions = _normalize_learning_questions(learning_result.recommended_questions)
        if questions:
            return questions
    return []


def get_datasource_recommended(session: SessionDep, ds_id: int):
    statement = select(DsRecommendedProblem).where(DsRecommendedProblem.datasource_id == ds_id)
    dsRecommendedProblem = session.exec(statement).all()
    if dsRecommendedProblem:
        return dsRecommendedProblem
    learning_questions = _get_learning_recommended_questions(session, ds_id)
    return [DsRecommendedProblem(datasource_id=ds_id, question=question) for question in learning_questions]

def get_datasource_recommended_chart(session: SessionDep, ds_id: int):
    statement = select(DsRecommendedProblem.question).where(DsRecommendedProblem.datasource_id == ds_id)
    dsRecommendedProblems = session.exec(statement).all()
    if dsRecommendedProblems:
        return dsRecommendedProblems
    return _get_learning_recommended_questions(session, ds_id)


def get_datasource_recommended_base(session: SessionDep, ds_id: int):
    statement = select(CoreDatasource.id,CoreDatasource.recommended_config).where(CoreDatasource.id == ds_id)
    datasourceBase = session.exec(statement).first()
    if datasourceBase is None:
        return RecommendedProblemResponse(ds_id,0,None)
    elif datasourceBase.recommended_config == 1:
        return RecommendedProblemResponse(ds_id,1,None)
    else:
        dsRecommendedProblems = session.exec(select(DsRecommendedProblem.question).where(DsRecommendedProblem.datasource_id == ds_id)).all()
        if not dsRecommendedProblems:
            dsRecommendedProblems = _get_learning_recommended_questions(session, ds_id)
        return RecommendedProblemResponse(ds_id,datasourceBase.recommended_config, orjson.dumps(dsRecommendedProblems).decode())

def save_recommended_problem(session: SessionDep,user: CurrentUser, data_info: RecommendedProblemBase):
    session.query(DsRecommendedProblem).filter(DsRecommendedProblem.datasource_id == data_info.datasource_id).delete(synchronize_session=False)
    problemInfo = data_info.problemInfo
    if problemInfo is not None:
        for problemItem in problemInfo:
            problemItem.id = None
            problemItem.create_time = datetime.datetime.now()
            problemItem.create_by = user.id
            record = DsRecommendedProblem(**problemItem.model_dump())
            session.add(record)
            session.flush()
            session.refresh(record)
    session.commit()
