from datetime import UTC, datetime, timedelta

import jwt
from googleapiclient.discovery import build

from data.models.user import User as UserModel
from data.repositories.user_repository import UserRepository
from domain.entities.user import UserEntity
from domain.third_party.google_service import get_google_flow
from infrastructure.config import settings


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def get_user_by_id(self, user_id: int) -> UserEntity | None:
        user_model = self.user_repository.get_by_id(user_id)
        if user_model is None:
            return None
        return UserEntity.model_validate(user_model)

    def get_user_by_email(self, email: str) -> UserEntity | None:
        user_model = self.user_repository.get_by_email(email)
        if user_model is None:
            return None
        return UserEntity.model_validate(user_model)

    def create_or_update_user(self, user_entity: UserEntity) -> UserEntity:
        existing_user = self.get_user_by_email(user_entity.email)
        if existing_user is not None:
            existing_user.name = user_entity.name
            existing_user.google_access_token = user_entity.google_access_token
            existing_user.google_refresh_token = user_entity.google_refresh_token
            existing_user.google_token_uri = user_entity.google_token_uri
            existing_user.google_client_id = user_entity.google_client_id
            existing_user.google_client_secret = user_entity.google_client_secret
            existing_user.google_scopes = user_entity.google_scopes
            updated_model = self.user_repository.update(
                self.entity_to_model(existing_user)
            )
            return UserEntity.model_validate(updated_model)

        created_model = self.user_repository.create(self.entity_to_model(user_entity))
        return UserEntity.model_validate(created_model)

    def entity_to_model(self, user_entity: UserEntity) -> UserModel:
        data = user_entity.model_dump(exclude_none=True)
        return UserModel(**data)

    def authenticate_google_user(self, code: str, code_verifier: str) -> str:
        flow = get_google_flow()
        flow.code_verifier = code_verifier
        flow.fetch_token(code=code)
        credentials = flow.credentials

        oauth2_service = build("oauth2", "v2", credentials=credentials)
        user_info = oauth2_service.userinfo().get().execute()

        email = user_info.get("email")
        name = user_info.get("name")
        if not email:
            raise ValueError("Email is required to register.")

        token_uri_str = getattr(
            credentials, "token_uri", "https://oauth2.googleapis.com/token"
        )
        client_id_str = getattr(credentials, "client_id", "")
        client_secret_str = getattr(credentials, "client_secret", "")
        scopes_str = ",".join(credentials.scopes) if credentials.scopes else ""

        user_entity = UserEntity(
            email=email,
            name=name,
            google_access_token=credentials.token or "",
            google_refresh_token=credentials.refresh_token,
            google_token_uri=token_uri_str,
            google_client_id=client_id_str,
            google_client_secret=client_secret_str,
            google_scopes=scopes_str,
        )

        user = self.create_or_update_user(user_entity)

        payload = {
            "sub": str(user.id),
            "exp": datetime.now(UTC) + timedelta(days=7),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
