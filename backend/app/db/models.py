from sqlalchemy import Column, String, Integer, DateTime, Text, Float, Boolean, JSON, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    status = Column(String, nullable=False, default="pending", index=True)
    status_detail = Column(String(200), nullable=True)
    error_msg = Column(Text, nullable=True)
    preferences = Column(JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user_id = Column(UUID(as_uuid=True), nullable=True)
    
    datasets = relationship("Dataset", back_populates="session", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="session", cascade="all, delete-orphan")
    visualizations = relationship("Visualization", back_populates="session", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="session", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="session", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="session", cascade="all, delete-orphan")
    label = relationship("AnalysisLabel", back_populates="session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Session(id={self.id}, status={self.status})>"

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    row_count = Column(Integer, nullable=False)
    col_count = Column(Integer, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    columns_info = Column(JSON, nullable=False)
    cleaned_path = Column(String, nullable=True)
    cleaned_filename = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="datasets")

    def __repr__(self):
        return f"<Dataset(id={self.id}, filename={self.filename})>"

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String, nullable=False)
    results = Column(JSON, nullable=False)
    suggested_questions = Column(JSON, server_default='[]', nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="analyses")

    def __repr__(self):
        return f"<Analysis(id={self.id}, type={self.analysis_type})>"

class Visualization(Base):
    __tablename__ = "visualizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    chart_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    chart_type = Column(String, nullable=False)
    data = Column(JSON, nullable=True)
    config = Column(JSON, nullable=False)
    image_url = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="visualizations")

    def __repr__(self):
        return f"<Visualization(id={self.id}, type={self.chart_type})>"

class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    importance = Column(String, nullable=False)
    rank = Column(Integer, nullable=True)
    category = Column(String, nullable=True)
    supporting_columns = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="insights")

    def __repr__(self):
        return f"<Insight(id={self.id}, rank={self.rank})>"

class Forecast(Base):
    __tablename__ = "forecasts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    target_column = Column(String, nullable=False)
    forecast_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="forecasts")

    def __repr__(self):
        return f"<Forecast(id={self.id}, target={self.target_column})>"

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="conversations")

    def __repr__(self):
        return f"<Conversation(id={self.id}, role={self.role})>"

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    report_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("Session", back_populates="reports")

    def __repr__(self):
        return f"<Report(id={self.id})>"

class AnalysisLabel(Base):
    __tablename__ = "analysis_labels"

    id           = Column(UUID(as_uuid=True), primary_key=True,
                          server_default=text("gen_random_uuid()"))
    session_id   = Column(UUID(as_uuid=True),
                          ForeignKey("sessions.id", ondelete="CASCADE"),
                          unique=True, nullable=False)
    user_id      = Column(UUID(as_uuid=True), nullable=False)
    display_name = Column(String(200), nullable=True)
    is_starred   = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="label")

    def __repr__(self):
        return f"<AnalysisLabel session={self.session_id} name={self.display_name}>"
