// main.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM caricato, inizializzazione in corso...");
    
    // =================== SLIDER ===================
    function initializeSlider() {
        const sliderContainer = document.querySelector('.slider-container');
        if (sliderContainer) {
            const slides = document.querySelectorAll('.slide');
            let currentIndex = 0;

            sliderContainer.style.width = `${slides.length * 100}%`;

            setInterval(() => {
                currentIndex = (currentIndex + 1) % slides.length;
                sliderContainer.style.transform = `translateX(-${currentIndex * (100 / slides.length)}%)`;
            }, 3000);
        }
    }

    // =================== CARICAMENTO PRODOTTI ===================
    let products = [];

    function loadProducts() {
        const grids = document.querySelectorAll('.products-grid, #best-seller-grid, #new-arrivals-grid, #products-grid');
        grids.forEach(grid => {
            if (grid) grid.innerHTML = '<div class="loading">Caricamento prodotti...</div>';
        });
        
        fetch("products.json")
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => {
                products = data;
                
                if (document.getElementById("best-seller-grid")) {
                    renderProducts(document.getElementById("best-seller-grid"), 
                        products.filter(p => p.category === "Best Seller"));
                }
                if (document.getElementById("new-arrivals-grid")) {
                    renderProducts(document.getElementById("new-arrivals-grid"), 
                        products.filter(p => p.category === "Nuovi Arrivi"));
                }
                if (document.getElementById("products-grid")) {
                    renderProducts(document.getElementById("products-grid"), products);
                    initializeFilters(products);
                }
            })
            .catch(error => {
                console.error("Errore caricamento prodotti:", error);
                grids.forEach(grid => {
                    if (grid) grid.innerHTML = '<div class="error">Errore nel caricamento dei prodotti</div>';
                });
            });
    }

    function renderProducts(grid, productList) {
        if (!grid) return;
        
        grid.innerHTML = productList.length === 0 ? 
            '<div class="no-products">Nessun prodotto trovato</div>' : '';
        
        productList.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <a href="prodotto.html?id=${product.shopifyId}" class="product-link">
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                </a>
                <p>${product.brand} ${product.tipo ? "- " + product.tipo : ""}</p>
                <p class="product-price">€${product.price}</p>
                <div class="shopify-buy-button" data-product-id="${product.shopifyId}"></div>
            `;
            grid.appendChild(card);
        });
        // Aggiorna il conteggio del carrello dopo aver renderizzato i prodotti
        setTimeout(() => {
            if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
}, 500);

        // Inizializza i pulsanti Shopify dopo il rendering
        setTimeout(() => {
            if (typeof initShopifyButtons === 'function') {
                initShopifyButtons();
            }
        }, 100);
    }

    // =================== FILTRI ===================
    function initializeFilters(products) {
        const brandSelect = document.getElementById('brand');
        const tipoSelect = document.getElementById('tipo');
        
        if (brandSelect) {
            const brands = [...new Set(products.map(p => p.brand))];
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandSelect.appendChild(option);
            });
        }
        
        if (tipoSelect) {
            const tipos = [...new Set(products.map(p => p.tipo).filter(t => t))];
            tipos.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                tipoSelect.appendChild(option);
            });
        }

        // Event listener per filtri
        const filterInputs = document.querySelectorAll('#search-name, #min-price, #max-price, #brand, #tipo');
        filterInputs.forEach(input => {
            input.addEventListener('input', () => applyFilters(products));
        });
    }

    function applyFilters(products) {
        const searchName = document.getElementById('search-name').value.toLowerCase();
        const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
        const brand = document.getElementById('brand').value;
        const tipo = document.getElementById('tipo').value;
        
        const filteredProducts = products.filter(p => {
            return (
                p.name.toLowerCase().includes(searchName) &&
                p.price >= minPrice &&
                p.price <= maxPrice &&
                (brand === '' || p.brand === brand) &&
                (tipo === '' || p.tipo === tipo)
            );
        });
        
        renderProducts(document.getElementById('products-grid'), filteredProducts);
    }

    // =================== INIZIALIZZAZIONE ===================
    initializeSlider();
    loadProducts();
});