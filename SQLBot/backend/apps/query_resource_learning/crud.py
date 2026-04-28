from sqlmodel import Session

from apps.query_resource_learning.models import QueryResourceLearningScore


def save_learning_score(
    session: Session,
    score: QueryResourceLearningScore,
) -> QueryResourceLearningScore:
    session.add(score)
    session.commit()
    session.refresh(score)
    return score
