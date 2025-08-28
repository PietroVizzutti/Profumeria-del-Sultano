// shopify-cart.js
let shopifyUI = null;
let cart = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Shopify...');
    
    function initShopify() {
        if (typeof ShopifyBuy === 'undefined') {
            console.error('Shopify Buy Button non è caricato');
            return;
        }
        
        try {
            const client = ShopifyBuy.buildClient({
                domain: 'profumeriadelsultano.myshopify.com',
                storefrontAccessToken: 'a9590da7439621917d2881dbc96b1517'
            });
            
            ShopifyBuy.UI.onReady(client).then(function(ui) {
                console.log('Shopify UI pronto');
                shopifyUI = ui;
                
                // Crea il componente carrello (solo ufficiale Shopify, nessun container custom)
                ui.createComponent('cart', {
                    moneyFormat: '%E2%82%AC%7B%7Bamount%7D%7D',
                    options: {
                        "cart": {
                            "contents": {
                                "button": true
                            },
                            "text": {
                                "title": "Il tuo carrello",
                                "empty": "Il tuo carrello è vuoto",
                                "button": "Checkout",
                                "total": "Subtotale"
                            },
                            "popup": false,
                            "styles": {
                                "button": {
                                    "background-color": "#d4b670",
                                    ":hover": {
                                        "background-color": "#b79d57"
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Aggiungi il toggle ufficiale Shopify per aprire/chiudere il carrello
                ui.createComponent('toggle', {
                    options: {
                        "toggle": {
                            "styles": {
                                "toggle": {
                                    "background-color": "#d4b670",
                                    ":hover": {
                                        "background-color": "#b79d57"
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Inizializza i pulsanti prodotto
                initShopifyButtons();
                
                // Aggiorna il conteggio del carrello
                updateCartCount();
                
            }).catch(function(error) {
                console.error('Errore inizializzazione Shopify UI:', error);
            });
        } catch (error) {
            console.error('Errore costruzione client Shopify:', error);
        }
    }
    
        
    // Controlla se Shopify Buy Button è già caricato
    if (typeof ShopifyBuy !== 'undefined') {
        initShopify();
    } else {
        const checkShopify = setInterval(function() {
            if (typeof ShopifyBuy !== 'undefined') {
                clearInterval(checkShopify);
                initShopify();
            }
        }, 100);
        
        setTimeout(function() {
            clearInterval(checkShopify);
            if (typeof ShopifyBuy === 'undefined') {
                console.error('Shopify Buy Button non si è caricato dopo 5 secondi');
            }
        }, 5000);
    }
});

// Funzione per inizializzare i pulsanti prodotto
function initShopifyButtons() {
    if (!shopifyUI) {
        console.log('Shopify UI non ancora inizializzato');
        return;
    }
    
    const buyButtons = document.querySelectorAll('.shopify-buy-button');
    console.log('Trovati', buyButtons.length, 'pulsanti Shopify');
    
    buyButtons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (productId && !button.hasAttribute('data-shopify-initialized')) {
            button.setAttribute('data-shopify-initialized', 'true');
            
            shopifyUI.createComponent('product', {
                id: productId,
                node: button,
                moneyFormat: '%E2%82%AC%7B%7Bamount%7D%7D',
                options: {
                    "product": {
                        "contents": {
                            "img": false,
                            "title": false,
                            "price": false
                        },
                        "text": {
                            "button": "Aggiungi al carrello"
                        },
                        "styles": {
                            "button": {
                                "background-color": "#d4b670",
                                "font-family": "Helvetica Neue, Arial, sans-serif",
                                ":hover": {
                                    "background-color": "#b79d57"
                                },
                                "border-radius": "8px"
                            }
                        }
                    },
                    "cart": {
                        "popup": false
                    }
                }
            });
        }
    });
}

// Funzione per aggiornare il conteggio del carrello
function updateCartCount() {
    if (typeof ShopifyBuy === 'undefined') return;
    
    const client = ShopifyBuy.buildClient({
        domain: 'profumeriadelsultano.myshopify.com',
        storefrontAccessToken: 'a9590da7439621917d2881dbc96b1517'
    });
    
    client.checkout.fetch().then(function(checkout) {
        const count = checkout.lineItems.length;
        const badge = document.querySelector('.floating-cart-count');
        if (badge) badge.textContent = count;
    });
}

// Esponi le funzioni per essere chiamate da altri script
window.initShopifyButtons = initShopifyButtons;
window.updateCartCount = updateCartCount;