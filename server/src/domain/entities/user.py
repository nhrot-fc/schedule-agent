from pydantic import BaseModel


class UserEntity(BaseModel):
    id: int | None = None
    email: str
    name: str | None = None
    google_access_token: str
    google_refresh_token: str | None = None
    google_token_uri: str
    google_client_id: str
    google_client_secret: str
    google_scopes: str

    class Config:
        from_attributes = True
