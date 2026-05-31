from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class ClientCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        value = v.strip().lower()
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Email must be valid")
        return value


class ClientRead(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: Decimal

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class ProductRead(BaseModel):
    id: int
    name: str
    description: str | None
    price: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product: ProductRead

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    client_id: int
    items: list[OrderItemCreate]

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: list) -> list:
        if not v:
            raise ValueError("Order must contain at least one product")
        return v


class OrderRead(BaseModel):
    id: int
    client_id: int
    total_amount: Decimal
    status: str
    created_at: datetime
    client: ClientRead
    items: list[OrderItemRead]

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def status_allowed(cls, v: str) -> str:
        value = v.strip().lower()
        allowed = {"pending", "paid", "shipped", "cancelled"}
        if value not in allowed:
            raise ValueError("Status must be one of: pending, paid, shipped, cancelled")
        return value

