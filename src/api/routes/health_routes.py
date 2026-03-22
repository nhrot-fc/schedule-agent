from fastapi import APIRouter, status

router = APIRouter()


@router.get(
    path="/",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> dict[str, str]:
    """Check the operational health of the application."""
    return {"status": "healthy"}
