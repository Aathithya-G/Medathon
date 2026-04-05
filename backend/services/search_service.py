import chromadb
from chromadb.config import Settings
from typing import List

from config import CHROMA_PERSIST_DIR, CHROMA_COLLECTION_NAME
from models.schemas import FrameAnalysis, SearchResult

# Initialize ChromaDB client (persistent — survives server restarts)
_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
_collection = _client.get_or_create_collection(
    name=CHROMA_COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)


def index_frames(video_id: str, frames: List[FrameAnalysis]) -> None:
    """
    Stores all frame descriptions in ChromaDB for semantic search.
    ChromaDB handles embedding generation automatically.
    """
    documents = []
    metadatas = []
    ids = []

    for frame in frames:
        doc_id = f"{video_id}_{int(frame.timestamp_seconds)}"
        documents.append(frame.description)
        metadatas.append({
            "video_id": video_id,
            "timestamp_seconds": frame.timestamp_seconds,
            "timestamp_label": frame.timestamp_label,
            "surgical_phase": frame.surgical_phase,
        })
        ids.append(doc_id)

    if documents:
        _collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
        print(f"[Search] Indexed {len(documents)} frames for video {video_id}")


def search(query: str, video_id: str = None, top_k: int = 5) -> List[SearchResult]:
    """
    Semantic search across indexed frame descriptions.
    If video_id is provided, search only within that video.
    """
    where_filter = {"video_id": video_id} if video_id else None

    results = _collection.query(
        query_texts=[query],
        n_results=min(top_k, _collection.count() or 1),
        where=where_filter,
    )

    search_results = []
    if results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]

        for doc, meta, dist in zip(docs, metas, distances):
            search_results.append(SearchResult(
                timestamp_label=meta["timestamp_label"],
                timestamp_seconds=meta["timestamp_seconds"],
                description=doc,
                video_id=meta["video_id"],
                relevance_score=round(1 - dist, 3),  # cosine: 1=identical, 0=unrelated
            ))

    return search_results
