// Premium Cart Engine

const CartEngine = {
    key: 'drip_nation_cart',

    getItems: function () {
        return JSON.parse(localStorage.getItem(this.key)) || [];
    },

    addItem: function (name, price, image) {
        let items = this.getItems();
        let existing = items.find(i => i.name === name);
        if (existing) {
            existing.quantity += 1;
        } else {
            items.push({ name, price, image, quantity: 1 });
        }
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateBadge();
        this.triggerHapticFeedback();
    },

    removeItem: function (name) {
        let items = this.getItems();
        items = items.filter(i => i.name !== name);
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateBadge();
    },

    getTotal: function () {
        let items = this.getItems();
        return items.reduce((total, item) => {
            let priceNum = parseInt(item.price.toString().replace(/[^0-9]/g, ''));
            return total + (priceNum * item.quantity);
        }, 0);
    },

    updateBadge: function () {
        // Find all cart badge instances manually placed on pages
        const badges = document.querySelectorAll('.dn-cart-count');
        const count = this.getItems().reduce((sum, i) => sum + i.quantity, 0);

        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.transform = 'scale(1.2)';
            setTimeout(() => badge.style.transform = 'scale(1)', 200);
            badge.style.display = 'inline-block';
            badge.style.transition = 'transform 0.2s ease';
        });
    },

    triggerHapticFeedback: function () {
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    },

    injectBurgerMenu: function () {
        if (document.getElementById('dn-burger-menu')) return;

        // Global Burger CSS - Super Professional & Crisp
        const style = document.createElement('style');
        style.innerHTML = `
            .dn-burger-toggle {
                position: fixed;
                top: 35px;
                right: 40px;
                width: 40px;
                height: 20px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                cursor: pointer;
                z-index: 10001; /* Must sit ABOVE the black nav so it acts as the close toggle too! */
                mix-blend-mode: difference;
            }
            .dn-burger-toggle span {
                width: 100%;
                height: 2px;
                background-color: #ffffff;
                transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                border-radius: 2px;
            }
            .dn-burger-toggle:hover span:nth-child(2) {
                width: 60%; /* Razor crisp staggered hover */
            }
            .dn-burger-toggle:hover span:nth-child(3) {
                width: 80%;
            }
            .dn-full-nav {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000000; /* Crisp stark black */
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start; /* Perfectly Left Aligned */
                padding-left: 10vw; /* Cinema margin left */
                gap: 30px; /* Equal spacing strictly applied */
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .dn-full-nav.active {
                opacity: 1;
                pointer-events: auto;
            }
            .dn-full-nav a {
                font-family: 'Bebas Neue', sans-serif;
                font-size: clamp(4rem, 10vw, 8rem); /* Massive athletic impact unified */
                color: #ffffff;
                text-decoration: none;
                text-transform: uppercase;
                letter-spacing: 0.02em;
                line-height: 0.9;
                margin: 0; /* Nullify any manual margins */
                opacity: 0.4; /* Cinematic inactive state */
                transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .dn-full-nav a:hover {
                opacity: 1;
                transform: translateX(30px); /* Professional slide reveal, amplified */
            }
            @media (max-width: 768px) {
                .dn-burger-toggle {
                    top: 25px;
                    right: 20px;
                }
                .dn-full-nav {
                    padding-left: 20px; /* Snap correctly to mobile bounds */
                }
            }
        `;
        document.head.appendChild(style);

        // Global Burger DOM
        const toggle = document.createElement('div');
        toggle.className = 'dn-burger-toggle';
        toggle.id = 'dn-burger-menu';
        toggle.innerHTML = `<span></span><span></span><span></span>`;
        // Toggle active state intelligently using the same button
        toggle.onclick = () => {
            document.getElementById('dn-full-nav').classList.toggle('active');
        };
        document.body.appendChild(toggle);

        const nav = document.createElement('div');
        nav.className = 'dn-full-nav';
        nav.id = 'dn-full-nav';
        nav.innerHTML = `
            <a href="index.html">HOME</a>
            <a href="shop.html">CATEGORIES</a>
            <a href="cart.html">CART (<span class="dn-cart-count">0</span>)</a>
        `;
        document.body.appendChild(nav);
    }
};

// Update badges and inject burger on load
document.addEventListener("DOMContentLoaded", () => {
    CartEngine.injectBurgerMenu();
    CartEngine.updateBadge();
});
