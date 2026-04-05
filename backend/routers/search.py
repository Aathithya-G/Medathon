from fastapi import APIRouter, HTTPException
from models.schemas import SearchQuery
from services.search_service import search

router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/")
async def search_reports(body: SearchQuery):
    """
    Semantic search across all indexed frame descriptions.
    Returns the most relevant moments in the video with timestamps.
    """
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    results = search(
        query=body.query,
        video_id=body.video_id,
        top_k=body.top_k,
    )

    return {
        "query": body.query,
        "results": [r.model_dump() for r in results],
        "count": len(results),
    }
