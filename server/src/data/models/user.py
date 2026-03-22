from sqlalchemy import Column, Integer, String

from infrastructure.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)

    google_access_token = Column(String, nullable=False)
    google_refresh_token = Column(String, nullable=True)
    google_token_uri = Column(String, nullable=False)
    google_client_id = Column(String, nullable=False)
    google_client_secret = Column(String, nullable=False)
    google_scopes = Column(String, nullable=False)
