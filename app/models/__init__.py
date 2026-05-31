from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now():
    return datetime.now(UTC)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    orders = relationship("Order", back_populates="client")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=utc_now)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, default=utc_now)

    client = relationship("Client", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
