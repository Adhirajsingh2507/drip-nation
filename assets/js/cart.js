// ============================================================
// DRIP NATION — Premium Cart Engine + Global UI
// ============================================================

const CartEngine = {
    key: 'drip_nation_cart',

    getItems: function () {
        return JSON.parse(localStorage.getItem(this.key)) || [];
    },

    // Stable per-line key = product_id + size (falls back to name for legacy items).
    // Two sizes of the same product are two lines; checkout (Phase 5) needs both.
    lineKey: function (item) {
        return (item.product_id != null ? item.product_id : item.name) + '|' + (item.size || '');
    },

    addItem: function (productId, name, price, image, size) {
        size = size || '';
        let items = this.getItems();
        const key = productId + '|' + size;
        let existing = items.find(i => this.lineKey(i) === key);
        if (existing) {
            existing.quantity += 1;
        } else {
            items.push({ product_id: productId, name, price, image, size, quantity: 1 });
        }
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateAllBadges();
        this.triggerHapticFeedback();
        this.showAddedFeedback();
    },

    removeItem: function (key) {
        let items = this.getItems().filter(i => this.lineKey(i) !== key);
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateAllBadges();
    },

    updateQuantity: function (key, delta) {
        let items = this.getItems();
        let item = items.find(i => this.lineKey(i) === key);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                items = items.filter(i => this.lineKey(i) !== key);
            }
        }
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateAllBadges();
    },

    getTotal: function () {
        let items = this.getItems();
        return items.reduce((total, item) => {
            let priceNum = parseInt(item.price.toString().replace(/[^0-9]/g, ''));
            return total + (priceNum * item.quantity);
        }, 0);
    },

    getCount: function () {
        return this.getItems().reduce((sum, i) => sum + i.quantity, 0);
    },

    updateAllBadges: function () {
        const count = this.getCount();
        document.querySelectorAll('.dn-cart-count, .dn-nav-cart-badge').forEach(badge => {
            badge.textContent = count;
        });
    },

    triggerHapticFeedback: function () {
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    },

    showAddedFeedback: function (message) {
        // Show a brief confirmation toast
        let toast = document.getElementById('dn-cart-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dn-cart-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #000;
                color: #fff;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 0.625rem;
                font-weight: 400;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                padding: 15px 34px;
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message || 'Added to bag';
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 1800);
    },

    // ── Coming Soon Modal ──
    showComingSoonModal: function () {
        let overlay = document.getElementById('dn-coming-soon-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dn-coming-soon-modal';
            overlay.className = 'dn-modal-overlay';
            overlay.innerHTML = `
                <div class="dn-modal-box">
                    <div class="dn-modal-title">Coming Soon</div>
                    <p class="dn-modal-text">Checkout opens with our next drop. Add pieces to your bag — they'll be waiting.</p>
                    <button class="dn-modal-close" onclick="CartEngine.hideModal()">Got it</button>
                </div>
            `;
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) CartEngine.hideModal();
            });
            document.body.appendChild(overlay);
        }
        // Force reflow to animate
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    },

    hideModal: function () {
        const overlay = document.getElementById('dn-coming-soon-modal');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => { overlay.style.display = 'none'; }, 400);
        }
    },

    // ── Global Navbar ──
    injectNavbar: function () {
        if (document.querySelector('.dn-navbar')) return;

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const count = this.getCount();

        const nav = document.createElement('nav');
        nav.className = 'dn-navbar';
        nav.innerHTML = `
            <a href="index.html" class="dn-navbar-brand">DRIP NATION</a>
            <ul class="dn-navbar-links">
                <li><a href="index.html" class="${currentPage === 'index.html' || currentPage === '' ? 'active' : ''}">Home</a></li>
                <li><a href="shop.html" class="${currentPage === 'shop.html' ? 'active' : ''}">Shop</a></li>
                <li>
                    <a href="cart.html" class="dn-nav-cart ${currentPage === 'cart.html' ? 'active' : ''}">
                        Bag <span class="dn-nav-cart-badge dn-cart-count">${count}</span>
                    </a>
                </li>
            </ul>
        `;
        document.body.prepend(nav);

        // Scroll detection for navbar background
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    },

    // ── Burger Menu (Mobile) ──
    injectBurgerMenu: function () {
        if (document.getElementById('dn-burger-menu')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            .dn-burger-toggle {
                position: fixed;
                top: 22px;
                right: 20px;
                width: 36px;
                height: 18px;
                display: none;
                flex-direction: column;
                justify-content: space-between;
                cursor: pointer;
                z-index: 10001;
                mix-blend-mode: difference;
            }
            @media (max-width: 768px) {
                .dn-burger-toggle { display: flex; }
            }
            .dn-burger-toggle span {
                width: 100%;
                height: 2px;
                background-color: #ffffff;
                transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s ease, opacity 0.3s ease;
                border-radius: 2px;
            }
            .dn-burger-toggle:hover span:nth-child(2) {
                width: 60%;
            }
            .dn-burger-toggle:hover span:nth-child(3) {
                width: 80%;
            }
            .dn-burger-toggle.open span:nth-child(1) {
                transform: translateY(8px) rotate(45deg);
            }
            .dn-burger-toggle.open span:nth-child(2) {
                opacity: 0;
            }
            .dn-burger-toggle.open span:nth-child(3) {
                transform: translateY(-8px) rotate(-45deg);
            }
            .dn-full-nav {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #000000;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                padding-left: 10vw;
                gap: 30px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .dn-full-nav.active {
                opacity: 1;
                pointer-events: auto;
            }
            .dn-full-nav a {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: clamp(3rem, 10vw, 6rem);
                color: #ffffff;
                text-decoration: none;
                text-transform: uppercase;
                letter-spacing: 0.02em;
                line-height: 0.9;
                margin: 0;
                opacity: 0.4;
                transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .dn-full-nav a:hover {
                opacity: 1;
            }
            .dn-full-nav a:active { opacity: 0.5; }
        `;
        document.head.appendChild(style);

        const toggle = document.createElement('div');
        toggle.className = 'dn-burger-toggle';
        toggle.id = 'dn-burger-menu';
        toggle.innerHTML = `<span></span><span></span><span></span>`;
        toggle.onclick = () => {
            toggle.classList.toggle('open');
            document.getElementById('dn-full-nav').classList.toggle('active');
        };
        document.body.appendChild(toggle);

        const count = this.getCount();
        const fullNav = document.createElement('div');
        fullNav.className = 'dn-full-nav';
        fullNav.id = 'dn-full-nav';
        fullNav.innerHTML = `
            <a href="index.html">Home</a>
            <a href="shop.html">Shop</a>
            <a href="cart.html">Bag (<span class="dn-cart-count">${count}</span>)</a>
        `;
        document.body.appendChild(fullNav);
    },

    // ── Global Footer ──
    injectFooter: function () {
        if (document.querySelector('.dn-footer')) return;

        const footer = document.createElement('footer');
        footer.className = 'dn-footer';
        footer.innerHTML = `
            <div class="dn-footer-grid">
                <div>
                    <div class="dn-footer-brand-name">DRIP NATION</div>
                    <p class="dn-footer-brand-desc">
                        Born from the streets, refined for the culture. Premium streetwear that blends athletic heritage with contemporary edge. Every piece is a statement.
                    </p>
                </div>
                <div>
                    <div class="dn-footer-col-title">Navigate</div>
                    <ul class="dn-footer-links">
                        <li><a href="index.html">Home</a></li>
                        <li><a href="shop.html">Shop All</a></li>
                        <li><a href="retro-jersey.html">Retro Jerseys</a></li>
                        <li><a href="accessories.html">Accessories</a></li>
                        <li><a href="jackets.html">Jackets</a></li>
                    </ul>
                </div>
                <div>
                    <div class="dn-footer-col-title">Support</div>
                    <ul class="dn-footer-links">
                        <li><a href="#">Size Guide</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <div class="dn-footer-col-title">Newsletter</div>
                    <p class="dn-footer-newsletter-text">Early access to drops, private offers, and studio notes.</p>
                    <form class="dn-footer-newsletter-form" onsubmit="event.preventDefault(); this.querySelector('input').value = ''; CartEngine.showAddedFeedback('Subscribed');">
                        <input type="email" class="dn-footer-newsletter-input" placeholder="Email address" required>
                        <button type="submit" class="dn-footer-newsletter-btn">Submit</button>
                    </form>
                </div>
            </div>
            <div class="dn-footer-bottom">
                <span class="dn-footer-copy">© 2026 Drip Nation</span>
                <div class="dn-footer-socials">
                    <a href="#">Instagram</a>
                </div>
            </div>
        `;
        document.body.appendChild(footer);
    },

    // ── Scroll Reveal Observer ──
    initScrollReveal: function () {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.dn-reveal, .dn-reveal-children').forEach(el => {
            observer.observe(el);
        });
    }
};

// ── Auto-Init on DOM Ready ──
document.addEventListener("DOMContentLoaded", () => {
    CartEngine.injectNavbar();
    CartEngine.injectBurgerMenu();
    CartEngine.injectFooter();
    CartEngine.updateAllBadges();
    // Init scroll reveal after a brief delay to allow DOM to settle
    setTimeout(() => CartEngine.initScrollReveal(), 100);
});
