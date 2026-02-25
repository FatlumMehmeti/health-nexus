from pydantic import BaseModel


class CartItemBase(BaseModel):
    cart_id: int
    product_id: int
    quantity: int


class CartItemCreate(CartItemBase):
    pass


class CartItemRead(CartItemBase):
    id: int

    class Config:
        from_attributes = True