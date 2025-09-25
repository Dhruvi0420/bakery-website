let cart = [];
let cartCount = 0;
let cartTotal = 0;

const cartBtn = document.getElementById("cart-btn");
const cartSection = document.getElementById("cart-section");
const cartItems = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cart-count");

// Add to Cart
document.querySelectorAll(".add-to-cart").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.getAttribute("data-name");
    const price = parseInt(button.getAttribute("data-price"));

    cart.push({ name, price });
    cartCount++;
    cartTotal += price;

    updateCart();
  });
});

// Show/Hide Cart
cartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  cartSection.classList.toggle("hidden");
});

// Update Cart
function updateCart() {
  cartItems.innerHTML = "";
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name} - ₹${item.price}`;
    cartItems.appendChild(li);
  });

  cartCountEl.textContent = cartCount;
  cartTotalEl.textContent = cartTotal;
}

// Checkout
document.getElementById("checkout-btn").addEventListener("click", () => {
  alert("Proceeding to checkout!");
});
