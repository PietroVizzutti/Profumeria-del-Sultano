// auth.js - Gestione account cliente via Shopify Storefront API (Opzione B)
(function(){
  const SHOPIFY_DOMAIN = 'profumeriadelsultano.myshopify.com';
  const STOREFRONT_TOKEN = 'a9590da7439621917d2881dbc96b1517';
  const API_VERSION = '2024-04';
  const GRAPHQL_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

  const TOKEN_KEY = 'shopifyCustomerAccessToken';

  function saveToken(token, expiresAt){
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  }

  function getTokenObj(){
    const raw = localStorage.getItem(TOKEN_KEY);
    if(!raw) return null;
    try {
      return JSON.parse(raw);
    } catch { return null; }
  }

  function getToken(){
    const obj = getTokenObj();
    if(!obj) return null;
    // opzionale: validare scadenza
    return obj.token;
  }

  function clearToken(){
    localStorage.removeItem(TOKEN_KEY);
  }

  async function graphqlRequest(query, variables){
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });
    if(!res.ok) throw new Error('GraphQL HTTP error: '+res.status);
    const json = await res.json();
    if(json.errors) throw new Error('GraphQL errors: '+JSON.stringify(json.errors));
    return json.data;
  }

  async function customerRegister({email, password, firstName, lastName}){
    const query = `mutation customerCreate($input: CustomerCreateInput!){
      customerCreate(input: $input){
        customer { id }
        customerUserErrors { code message field }
      }
    }`;
    const data = await graphqlRequest(query, { input: { email, password, firstName, lastName }});
    const resp = data.customerCreate;
    if(resp.customerUserErrors && resp.customerUserErrors.length){
      throw new Error(resp.customerUserErrors.map(e=>e.message).join(', '));
    }
    return resp.customer;
  }

  async function customerLogin({email, password}){
    const query = `mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!){
      customerAccessTokenCreate(input: $input){
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { code message field }
      }
    }`;
    const data = await graphqlRequest(query, { input: { email, password }});
    const resp = data.customerAccessTokenCreate;
    if(resp.customerUserErrors && resp.customerUserErrors.length){
      throw new Error(resp.customerUserErrors.map(e=>e.message).join(', '));
    }
    const token = resp.customerAccessToken.accessToken;
    const expiresAt = resp.customerAccessToken.expiresAt;
    saveToken(token, expiresAt);
    return { token, expiresAt };
  }

  async function customerLogout(){
    const token = getToken();
    if(!token) { clearToken(); return true; }
    const query = `mutation customerAccessTokenDelete($customerAccessToken: String!){
      customerAccessTokenDelete(customerAccessToken: $customerAccessToken){
        deletedAccessToken
        deletedCustomerAccessTokenId
        userErrors { field message }
      }
    }`;
    try {
      await graphqlRequest(query, { customerAccessToken: token });
    } catch {}
    clearToken();
    return true;
  }

  async function getCustomer(){
    const token = getToken();
    if(!token) return null;
    const query = `query getCustomer($token: String!){
      customer(customerAccessToken: $token){
        id
        email
        firstName
        lastName
        lastIncompleteCheckout{
          id
          webUrl
          completedAt
          createdAt
        }
      }
    }`;
    const data = await graphqlRequest(query, { token });
    return data.customer;
  }

  async function associateCheckoutWithCustomer(checkoutId){
    const token = getToken();
    if(!token || !checkoutId) return null;
    const mutation = `mutation checkoutCustomerAssociateV2($checkoutId: ID!, $customerAccessToken: String!){
      checkoutCustomerAssociateV2(checkoutId: $checkoutId, customerAccessToken: $customerAccessToken){
        checkout{ id webUrl }
        customer{ id }
        userErrors{ field message }
      }
    }`;
    const data = await graphqlRequest(mutation, { checkoutId, customerAccessToken: token });
    const resp = data.checkoutCustomerAssociateV2;
    if(resp.userErrors && resp.userErrors.length){
      console.warn('Associate errors:', resp.userErrors);
    }
    return resp.checkout;
  }

  async function tryAssociateCurrentCheckout(){
    // Usa il client del Buy Button per prendere l'ID del checkout corrente, se esiste
    if(typeof ShopifyBuy === 'undefined') return;
    try{
      const client = ShopifyBuy.buildClient({
        domain: SHOPIFY_DOMAIN,
        storefrontAccessToken: STOREFRONT_TOKEN
      });
      // Alcune implementazioni memorizzano l'ultimo checkout; fetch() senza argomenti tenta di recuperarlo
      const checkout = await client.checkout.fetch();
      if(checkout && checkout.id){
        await associateCheckoutWithCustomer(checkout.id);
        return checkout.id;
      }
    }catch(e){ console.warn('Impossibile associare il checkout corrente:', e.message); }
    return null;
  }

  // UI Helpers
  function show(el){ if(el) el.style.display = ''; }
  function hide(el){ if(el) el.style.display = 'none'; }

  function initAuthUI(){
    const loginItem = document.getElementById('nav-login');
    const accountItem = document.getElementById('nav-account');
    const logoutItem = document.getElementById('nav-logout');
    const authModal = document.getElementById('auth-modal');
    const authTabs = document.querySelectorAll('[data-auth-tab]');

    function refreshNav(){
      const tk = getToken();
      if(tk){
        hide(loginItem);
        show(accountItem);
        show(logoutItem);
      }else{
        show(loginItem);
        hide(accountItem);
        hide(logoutItem);
      }
    }

    refreshNav();

    // Open modal
    const openLogin = document.getElementById('link-login');
    if(openLogin){
      openLogin.addEventListener('click', (e)=>{ e.preventDefault(); if(authModal) authModal.style.display='block'; });
    }

    // Close modal
    const closeBtn = document.getElementById('auth-close');
    if(closeBtn){ closeBtn.addEventListener('click', ()=>{ if(authModal) authModal.style.display='none'; }); }

    // Tab switch
    authTabs.forEach(tab=>{
      tab.addEventListener('click', ()=>{
        const target = tab.getAttribute('data-auth-tab');
        const map = { 'auth-login': 'auth-login-form', 'auth-register': 'auth-register-form' };
        const targetId = map[target] || target;
        const formEl = document.getElementById(targetId);
        document.querySelectorAll('.auth-form').forEach(f=> hide(f));
        if(formEl){
          show(formEl);
          const firstInput = formEl.querySelector('input');
          if(firstInput) firstInput.focus();
        }
      });
    });

    // Submit login
    const loginForm = document.getElementById('auth-login-form');
    if(loginForm){
      loginForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value.trim();
        const password = loginForm.querySelector('input[name="password"]').value;
        const msg = document.getElementById('auth-message');
        msg.textContent = 'Accesso in corso...';
        try{
          await customerLogin({ email, password });
          msg.textContent = 'Accesso effettuato';
          refreshNav();
          if(authModal) authModal.style.display='none';
          // Tenta l'associazione del checkout corrente
          await tryAssociateCurrentCheckout();
        }catch(err){
          const em = (err && err.message || '').toLowerCase();
          if(em.includes('customer') && (em.includes('disabled') || em.includes('not enabled') || em.includes('denied'))){
            msg.innerHTML = 'Accesso non disponibile via API. Usa il portale ufficiale: <a href="https://profumeriadelsultano.myshopify.com/account/login" target="_blank">Accedi qui</a>.';
          } else {
            msg.textContent = 'Errore: '+err.message;
          }
        }
      });
    }

    // Submit register
    const regForm = document.getElementById('auth-register-form');
    if(regForm){
      regForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const firstName = regForm.querySelector('input[name="firstName"]').value.trim();
        const lastName = regForm.querySelector('input[name="lastName"]').value.trim();
        const email = regForm.querySelector('input[name="email"]').value.trim();
        const password = regForm.querySelector('input[name="password"]').value;
        const msg = document.getElementById('auth-message');
        msg.textContent = 'Registrazione in corso...';
        try{
          await customerRegister({ firstName, lastName, email, password });
          msg.textContent = 'Registrazione completata. Ora accedi.';
        }catch(err){
          const em = (err && err.message || '').toLowerCase();
          if(em.includes('customer') && (em.includes('disabled') || em.includes('not enabled') || em.includes('denied'))){
            msg.innerHTML = 'Registrazione non disponibile via API. Usa il portale ufficiale: <a href="https://profumeriadelsultano.myshopify.com/account/register" target="_blank">Crea account qui</a>.';
          } else {
            msg.textContent = 'Errore: '+err.message;
          }
        }
      });
    }

    // Logout
    const logoutLink = document.getElementById('link-logout');
    if(logoutLink){
      logoutLink.addEventListener('click', async (e)=>{
        e.preventDefault();
        await customerLogout();
        refreshNav();
      });
    }
  }

  async function bootstrap(){
    document.addEventListener('DOMContentLoaded', async ()=>{
      initAuthUI();
      // Se l'utente è loggato, prova ad associare il checkout corrente subito
      if(getToken()){
        await tryAssociateCurrentCheckout();
      }
    });
  }

  // API pubblica
  window.ShopAuth = {
    getToken,
    clearToken,
    customerLogin,
    customerLogout,
    customerRegister,
    getCustomer,
    associateCheckoutWithCustomer,
    tryAssociateCurrentCheckout,
  };

  bootstrap();
})();
