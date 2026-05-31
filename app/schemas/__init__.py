from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator


#Client
class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class ClientRead(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


#Product
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
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
    description: Optional[str]
    price: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


#Order
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
    items: List[OrderItemCreate]

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
    items: List[OrderItemRead]

    model_config = {"from_attributes": True}
