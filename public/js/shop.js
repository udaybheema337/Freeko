// 🚨 THESE IMPORTS ARE CRITICAL - DO NOT REMOVE THEM 🚨
import { db, auth } from "./config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const container = document.getElementById("product-grid");
let products = [];
let activeCategory = "All";
let searchTerm = "";

// ==========================================
// 1. AUTHENTICATION & LOGIN BUTTON LOGIC
// ==========================================
const authBtn = document.getElementById("loginBtn") || document.getElementById("auth-btn");

onAuthStateChanged(auth, (user) => {
    if (user) {
        if(authBtn) authBtn.innerText = "Logout";
        window.isLoggedIn = true;
    } else {
        if(authBtn) authBtn.innerText = "Login";
        window.isLoggedIn = false;
    }
});

if (authBtn) {
    authBtn.onclick = async () => {
        if (window.isLoggedIn) {
            try {
                await signOut(auth);
                localStorage.removeItem("cart"); 
                window.location.reload(); 
            } catch (error) {
                console.error("Error logging out: ", error);
            }
        } else {
            window.location.href = "login.html";
        }
    };
}

// ==========================================
// 2. FETCH PRODUCTS FROM FIREBASE
// ==========================================
onSnapshot(collection(db, "products"), (snapshot) => {
    products = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        products.push({ 
            ...data, // 🚨 Fix: Put data first so it doesn't overwrite the ID below
            id: String(doc.id), // 🚨 Fix: Force the ID to be a String
            inStock: data.inStock !== undefined ? data.inStock : true, 
            category: data.category || "Vegetables"
        });
    });
    renderShop();
});

// ==========================================
// 3. SEARCH & CATEGORY FILTERS
// ==========================================
window.filterCat = (cat) => {
    activeCategory = cat;
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.includes(cat) || (cat === 'All' && btn.innerText === 'All')) {
            btn.classList.add('active');
        }
    });
    renderShop();
};

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderShop();
    });
}

// ==========================================
// 4. RENDER SHOP UI
// ==========================================
function renderShop() {
    if (!container) return;
    container.innerHTML = "";
    
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name && p.name.toLowerCase().includes(searchTerm);
        const matchesCat = activeCategory === "All" || p.category === activeCategory;
        return matchesSearch && matchesCat;
    });

    if (filteredProducts.length === 0) {
        container.innerHTML = `<p style='text-align:center; width:100%; margin-top:40px; color:#888;'>No products found matching "${searchTerm}".</p>`;
        return;
    }

    filteredProducts.forEach(prod => {
        // 🚨 Fix: Match strings safely
        const cartItem = cart.find(item => String(item.id) === String(prod.id));
        const qty = cartItem ? cartItem.qty : 0;

        const card = document.createElement("div");
        card.style.cssText = "background:white; padding:15px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); text-align:center; display:flex; flex-direction:column; justify-content:space-between;";
        
        let buttonHTML = "";
        if (!prod.inStock) {
            buttonHTML = `<button disabled style="width:100%; padding:10px; background:#eee; color:#aaa; border:none; border-radius:6px; font-weight:bold;">OUT OF STOCK</button>`;
        } else if (qty === 0) {
            buttonHTML = `<button onclick="window.updateQty('${prod.id}', 1)" style="width:100%; padding:10px; background:white; color:#0c831f; border:1px solid #0c831f; border-radius:6px; font-weight:bold; cursor:pointer;">ADD</button>`;
        } else {
            buttonHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#0c831f; border-radius:6px; padding:4px;">
                    <button onclick="window.updateQty('${prod.id}', -1)" style="background:none; border:none; color:white; font-size:18px; width:30px; cursor:pointer;">−</button>
                    <span style="color:white; font-weight:bold; font-size:14px;">${qty}</span>
                    <button onclick="window.updateQty('${prod.id}', 1)" style="background:none; border:none; color:white; font-size:18px; width:30px; cursor:pointer;">+</button>
                </div>`;
        }

        card.innerHTML = `
            <img src="${prod.img}" alt="${prod.name}" onerror="this.src='https://via.placeholder.com/150'" style="width:100px; height:100px; object-fit:contain; margin:0 auto 10px;">
            <h3 style="font-size:15px; margin:0 0 5px; color:#333; text-transform: capitalize;">${prod.name.toLowerCase()}</h3>
            <p style="color:#666; font-size:12px; margin:0 0 5px;">${prod.category}</p>
            <p style="font-size:14px; font-weight:bold; color:#0c831f; margin:0 0 10px;">₹${prod.price}</p>
            ${buttonHTML}
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 5. CART UPDATE LOGIC
// ==========================================
window.updateQty = (id, change) => {
    // 🚨 Fix: Force target ID to be a string
    const targetId = String(id);
    
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let existingItem = cart.find(item => String(item.id) === targetId);
    let product = products.find(p => String(p.id) === targetId);

    if (product && !product.inStock && change > 0) return alert("Out of stock!");

    if (existingItem) {
        existingItem.qty += change;
        if (existingItem.qty <= 0) {
            cart = cart.filter(item => String(item.id) !== targetId);
        }
    } else if (change > 0 && product) {
        cart.push({ id: targetId, name: product.name, price: product.price, img: product.img, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    renderShop(); 
};