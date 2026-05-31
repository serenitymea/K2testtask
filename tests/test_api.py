"""
Tests for the Order Management System.
Uses an in-memory SQLite database so no external DB is needed.
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite://"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.database import Base, get_db
from app.main import app

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


#Helpers
def create_client_fixture(name="Alice", email="alice@example.com"):
    r = client.post("/api/clients/", json={"name": name, "email": email})
    assert r.status_code == 201
    return r.json()


def create_product_fixture(name="Widget", price=9.99):
    r = client.post("/api/products/", json={"name": name, "price": price})
    assert r.status_code == 201
    return r.json()


#Client tests
def test_create_client():
    data = create_client_fixture()
    assert data["email"] == "alice@example.com"
    assert data["id"] is not None


def test_create_client_duplicate_email():
    create_client_fixture()
    r = client.post("/api/clients/", json={"name": "Alice2", "email": "alice@example.com"})
    assert r.status_code == 409


def test_list_clients():
    create_client_fixture("A", "a@a.com")
    create_client_fixture("B", "b@b.com")
    r = client.get("/api/clients/")
    assert r.status_code == 200
    assert len(r.json()) == 2


#Product tests
def test_create_product():
    data = create_product_fixture()
    assert data["price"] == "9.99"


def test_create_product_invalid_price():
    r = client.post("/api/products/", json={"name": "Bad", "price": -1})
    assert r.status_code == 422


#Order tests
def test_create_order():
    c = create_client_fixture()
    p = create_product_fixture()
    r = client.post("/api/orders/", json={
        "client_id": c["id"],
        "items": [{"product_id": p["id"], "quantity": 2}],
    })
    assert r.status_code == 201
    order = r.json()
    assert float(order["total_amount"]) == pytest.approx(19.98)
    assert len(order["items"]) == 1


def test_create_order_no_client():
    p = create_product_fixture()
    r = client.post("/api/orders/", json={
        "client_id": 9999,
        "items": [{"product_id": p["id"], "quantity": 1}],
    })
    assert r.status_code == 404


def test_create_order_no_items():
    c = create_client_fixture()
    r = client.post("/api/orders/", json={"client_id": c["id"], "items": []})
    assert r.status_code == 422


def test_create_order_nonexistent_product():
    c = create_client_fixture()
    r = client.post("/api/orders/", json={
        "client_id": c["id"],
        "items": [{"product_id": 9999, "quantity": 1}],
    })
    assert r.status_code == 404


def test_list_orders_by_client():
    c1 = create_client_fixture("C1", "c1@x.com")
    c2 = create_client_fixture("C2", "c2@x.com")
    p = create_product_fixture()

    client.post("/api/orders/", json={"client_id": c1["id"], "items": [{"product_id": p["id"], "quantity": 1}]})
    client.post("/api/orders/", json={"client_id": c1["id"], "items": [{"product_id": p["id"], "quantity": 2}]})
    client.post("/api/orders/", json={"client_id": c2["id"], "items": [{"product_id": p["id"], "quantity": 1}]})

    r = client.get(f"/api/orders/client/{c1['id']}")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_total_calculated_multiple_items():
    c = create_client_fixture()
    p1 = create_product_fixture("A", 10.00)
    p2 = create_product_fixture("B", 5.50)
    r = client.post("/api/orders/", json={
        "client_id": c["id"],
        "items": [
            {"product_id": p1["id"], "quantity": 3},
            {"product_id": p2["id"], "quantity": 2},
        ],
    })
    assert r.status_code == 201
    assert float(r.json()["total_amount"]) == pytest.approx(41.00)


def test_update_order_status():
    c = create_client_fixture()
    p = create_product_fixture()
    created = client.post("/api/orders/", json={
        "client_id": c["id"],
        "items": [{"product_id": p["id"], "quantity": 1}],
    }).json()

    r = client.patch(f"/api/orders/{created['id']}/status", json={"status": "paid"})

    assert r.status_code == 200
    assert r.json()["status"] == "paid"


def test_update_order_status_invalid_value():
    c = create_client_fixture()
    p = create_product_fixture()
    created = client.post("/api/orders/", json={
        "client_id": c["id"],
        "items": [{"product_id": p["id"], "quantity": 1}],
    }).json()

    r = client.patch(f"/api/orders/{created['id']}/status", json={"status": "unknown"})

    assert r.status_code == 422

