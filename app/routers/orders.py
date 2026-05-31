from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Client, Order, OrderItem, Product
from app.schemas import OrderCreate, OrderRead, OrderStatusUpdate

router = APIRouter()


def _get_order_query(db: Session):
    return db.query(Order).options(
        joinedload(Order.client),
        joinedload(Order.items).joinedload(OrderItem.product),
    )


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    if not db.get(Client, payload.client_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id={payload.client_id} not found",
        )

    order = Order(client_id=payload.client_id, total_amount=0)
    db.add(order)
    db.flush()

    total = 0
    for item_data in payload.items:
        product = db.get(Product, item_data.product_id)
        if not product:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id={item_data.product_id} not found",
            )

        total += product.price * item_data.quantity
        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item_data.quantity,
            unit_price=product.price,
        ))

    order.total_amount = total
    db.commit()

    return _get_order_query(db).filter(Order.id == order.id).first()


@router.get("/", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    return _get_order_query(db).order_by(Order.id.desc()).all()


@router.get("/client/{client_id}", response_model=list[OrderRead])
def list_orders_by_client(client_id: int, db: Session = Depends(get_db)):
    if not db.get(Client, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    return (
        _get_order_query(db)
        .filter(Order.client_id == client_id)
        .order_by(Order.id.desc())
        .all()
    )


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _get_order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    db.commit()

    return _get_order_query(db).filter(Order.id == order_id).first()
