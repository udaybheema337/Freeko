import { db, auth } from "./config.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let userProfile = null; // Stores full user data (Address, Name, etc.)
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ==========================================
// 1. CALCULATE TOTALS
// ==========================================
const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

// Logic: Charge ₹30 if order is below ₹100, otherwise FREE
const deliveryFee = subtotal >= 100 ? 0 : 30;
const totalAmount = subtotal + deliveryFee;

// ==========================================
// 2. RENDER BILL DETAILS
// ==========================================
const billContainer = document.getElementById("bill-container");
const footerTotal = document.getElementById("footer-total");
const payBtn = document.getElementById("payBtn");

if (billContainer) {
    billContainer.innerHTML = `
        <div class="bill-row">
            <span>Item Total</span>
            <span>₹${subtotal}</span>
        </div>
        <div class="bill-row">
            <span>Delivery Fee</span>
            <span class="${deliveryFee === 0 ? 'text-green' : 'text-red'}">
                ${deliveryFee === 0 ? 'FREE' : '+ ₹' + deliveryFee}
            </span>
        </div>
        <div class="bill-total">
            <span>Grand Total</span>
            <span>₹${totalAmount}</span>
        </div>
    `;
}

// Update the Sticky Footer Price
if (footerTotal) {
    footerTotal.innerText = `₹${totalAmount}`;
}

// Update the Big Green Button Text
if (payBtn) {
    payBtn.innerText = `PAY ₹${totalAmount}`;
}

// ==========================================
// 3. AUTHENTICATION & ADDRESS FETCH
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        // FETCH FULL USER PROFILE (Address, Name, Phone)
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                userProfile = userDoc.data();

                // Update the Payment Page UI with the fetched address
                const nameEl = document.getElementById("displayName");
                const addrEl = document.getElementById("displayAddress");
                const phoneEl = document.getElementById("displayPhone");

                if(nameEl) nameEl.innerText = userProfile.name || "Customer";
                if(addrEl) addrEl.innerText = userProfile.address || "❌ No address found. Please re-login.";
                if(phoneEl) phoneEl.innerText = "📞 " + (userProfile.phone || user.phoneNumber || "N/A");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }

    } else {
        // Force login if not authenticated
        window.location.href = "login.html";
    }
});

// ==========================================
// 4. HANDLE PAYMENT CLICK
// ==========================================
if (payBtn) {
    payBtn.addEventListener("click", async () => {
        // Validation: Ensure address is loaded
        if (!userProfile || !userProfile.address) {
            alert("Delivery address not found! Please register or login again.");
            return;
        }

        // Get selected payment method
        const methodInput = document.querySelector('input[name="paymentMethod"]:checked');
        const method = methodInput ? methodInput.value : "COD"; 
        
        if (method === "COD") {
            await saveOrder("COD", "Pending");
        } else {
            initRazorpay(totalAmount);
        }
    });
}

// ==========================================
// 5. RAZORPAY INTEGRATION
// ==========================================
function initRazorpay(amount) {
    var options = {
        "key": "rzp_live_SJ1cPiOaPN2EcL", // ⚠️ REPLACE WITH YOUR ACTUAL KEY ID
        "amount": amount * 100, 
        "currency": "INR",
        "name": "FreshKart",
        "description": "Grocery Order",
        "handler": async function (response) {
            await saveOrder(response.razorpay_payment_id, "Paid");
        },
        "prefill": {
            "name": userProfile?.name || currentUser?.displayName || "",
            "email": currentUser?.email || "",
            "contact": userProfile?.phone || currentUser?.phoneNumber || ""
        },
        "theme": { "color": "#0c831f" }
    };

    var rzp1 = new Razorpay(options);
    
    rzp1.on('payment.failed', function (response){
        alert("Payment Failed: " + response.error.description);
    });

    rzp1.open();
}

// ==========================================
// 6. SAVE ORDER TO FIREBASE
// ==========================================
async function saveOrder(paymentId, status) {
    try {
        // Disable button
        payBtn.innerText = "PROCESSING...";
        payBtn.disabled = true;

        // Calculate Delivery Slot
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

        // Save to Firestore
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            
            // 🚨 CRITICAL: SAVING ADDRESS & CONTACT FROM PROFILE 🚨
            customerName: userProfile.name || "Guest",
            customerPhone: userProfile.phone || "N/A",
            address: userProfile.address, // <--- This allows Admin/Driver to see location
            
            cart: cart,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            total: totalAmount,
            paymentId: paymentId,
            paymentStatus: status,
            paymentMethod: paymentId === "COD" ? "Cash on Delivery" : "Online",
            status: "Ordered",
            deliverySlot: `Tomorrow (${dateStr}), 7:30 AM - 9:30 AM`,
            timestamp: new Date()
        });

        // Clear Cart
        localStorage.removeItem("cart");

        // Redirect
        window.location.href = "order_confirmed.html"; 

    } catch (e) {
        console.error("Order Error:", e);
        alert("Error placing order: " + e.message);
        
        // Reset button
        payBtn.disabled = false;
        payBtn.innerText = `PAY ₹${totalAmount}`;
    }
}