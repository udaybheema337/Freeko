// DOM Elements
const container = document.getElementById("cart-list");
const checkoutBar = document.getElementById("checkout-bar");
const totalEl = document.getElementById("total-price");

function loadCart() {
    // 1. Get Cart from LocalStorage
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    // Safety check if container exists
    if(!container) return;
    container.innerHTML = "";

    // 2. Handle Empty Cart
    if(cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; margin-top:100px; color:#888;">
                <h2 style="font-size:50px; margin-bottom:10px; filter:grayscale(1);">🛒</h2>
                <p>Your cart is empty</p>
                <button onclick="window.location.href='index.html'" style="margin-top:20px; padding:10px 20px; border:1px solid #0c831f; color:#0c831f; background:white; border-radius:6px; font-weight:bold;">Start Shopping</button>
            </div>
        `;
        if(checkoutBar) checkoutBar.style.display = "none";
        return;
    }

    // Show Checkout Bar
    if(checkoutBar) checkoutBar.style.display = "flex";

    let subtotal = 0;

    // 3. Render Items
    cart.forEach((item, index) => {
        subtotal += item.price * item.qty;
        
        // Use placeholder if image is missing
        const imgSrc = item.img || "https://cdn-icons-png.flaticon.com/512/2553/2553691.png";

        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-left">
                    <img src="${imgSrc}" class="cart-thumb">
                    <div class="cart-info">
                        <h4>${item.name}</h4>
                        <p>₹${item.price} / unit</p>
                    </div>
                </div>
                
                <div class="cart-qty-box">
                    <button class="cart-qty-btn" onclick="updateItem(${index}, -1)">−</button>
                    <span class="cart-qty-num">${item.qty}</span>
                    <button class="cart-qty-btn" onclick="updateItem(${index}, 1)">+</button>
                </div>
            </div>
        `;
    });

    // 4. Calculate Delivery Fee & Total
    // Rule: Order < 100 = ₹30 Fee. Order >= 100 = Free.
    const deliveryFee = subtotal >= 100 ? 0 : 30;
    const grandTotal = subtotal + deliveryFee;

    // 5. Render Bill Summary Card
    container.innerHTML += `
        <div class="bill-card">
            <h3 style="margin: 0 0 15px 0;">Bill Details</h3>
            
            <div class="bill-row">
                <span>Item Total</span>
                <span>₹${subtotal}</span>
            </div>
            
            <div class="bill-row">
                <span>Delivery Fee</span>
                <span style="color:${deliveryFee === 0 ? '#0c831f' : '#e74c3c'}; font-weight:bold;">
                    ${deliveryFee === 0 ? 'FREE' : '+ ₹30'}
                </span>
            </div>

            ${deliveryFee > 0 ? `<p style="font-size:12px; color:#e74c3c; background:#fdecea; padding:8px; border-radius:4px; margin-top:5px;">💡 Add items worth ₹${100 - subtotal} more for FREE Delivery!</p>` : ''}
            
            <div class="bill-total">
                <span>To Pay</span>
                <span>₹${grandTotal}</span>
            </div>
        </div>
    `;

    // 6. Update Sticky Footer
    if(totalEl) totalEl.innerText = `₹${grandTotal}`;
}

// Global Function to Update Quantity
window.updateItem = (index, change) => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    cart[index].qty += change;
    
    // Remove item if qty is 0
    if(cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart(); // Re-render
};

// Initialize
loadCart();