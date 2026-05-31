from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client
from app.schemas import ClientCreate, ClientRead

router = APIRouter()


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    if db.query(Client).filter_by(email=payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Client with email '{payload.email}' already exists",
        )
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/", response_model=list[ClientRead])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.id).all()


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client
