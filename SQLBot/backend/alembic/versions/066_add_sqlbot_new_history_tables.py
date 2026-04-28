"""066_add_sqlbot_new_history_tables

Revision ID: 5ec3cb0b612a
Revises: 8ff90df7871d
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5ec3cb0b612a'
down_revision = '8ff90df7871d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'chat_session_snapshot',
        sa.Column('chat_id', sa.BigInteger(), sa.ForeignKey('chat.id'), nullable=False),
        sa.Column('client_type', sa.String(length=32), nullable=False, server_default='sqlbot_new'),
        sa.Column('active_source_kind', sa.String(length=16), nullable=False),
        sa.Column('active_source_id', sa.String(length=255), nullable=True),
        sa.Column('active_datasource_id', sa.String(length=255), nullable=True),
        sa.Column('active_model_id', sa.String(length=255), nullable=True),
        sa.Column('active_theme_id', sa.String(length=255), nullable=True),
        sa.Column('active_theme_name', sa.String(length=255), nullable=True),
        sa.Column('selection_title', sa.String(length=255), nullable=True),
        sa.Column('selection_meta', sa.String(length=255), nullable=True),
        sa.Column('datasource_pending', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('latest_record_id', sa.BigInteger(), nullable=True),
        sa.Column('latest_question', sa.Text(), nullable=True),
        sa.Column('snapshot_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('create_by', sa.BigInteger(), nullable=False),
        sa.Column('create_time', sa.DateTime(timezone=False), nullable=False),
        sa.Column('update_time', sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint('chat_id')
    )
    op.create_table(
        'chat_session_event',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('chat_id', sa.BigInteger(), sa.ForeignKey('chat.id'), nullable=False),
        sa.Column('client_type', sa.String(length=32), nullable=False, server_default='sqlbot_new'),
        sa.Column('event_type', sa.String(length=32), nullable=False),
        sa.Column('record_id', sa.BigInteger(), nullable=True),
        sa.Column('source_kind', sa.String(length=16), nullable=True),
        sa.Column('source_id', sa.String(length=255), nullable=True),
        sa.Column('datasource_id', sa.String(length=255), nullable=True),
        sa.Column('model_id', sa.String(length=255), nullable=True),
        sa.Column('theme_id', sa.String(length=255), nullable=True),
        sa.Column('theme_name', sa.String(length=255), nullable=True),
        sa.Column('selection_title', sa.String(length=255), nullable=True),
        sa.Column('selection_meta', sa.String(length=255), nullable=True),
        sa.Column('datasource_pending', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('event_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('create_by', sa.BigInteger(), nullable=False),
        sa.Column('create_time', sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_chat_session_event_chat_id_create_time',
        'chat_session_event',
        ['chat_id', 'create_time'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_chat_session_event_chat_id_create_time', table_name='chat_session_event')
    op.drop_table('chat_session_event')
    op.drop_table('chat_session_snapshot')
