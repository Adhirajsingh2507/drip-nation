// ============================================================
// DRIP NATION — Store Bridge
// Reads the catalog from Supabase (source of truth) and drives storefront pages.
// Include on every storefront page AFTER cart.js, supabase-js, and supabase-client.js.
//
// Getters are ASYNC (they hit Supabase). Callers must await them.
// Row shapes are mapped back to the original localStorage shape so page-level
// rendering code is unchanged (product.category = name, sizes = "S, M, L, XL"
// string, product.desc, etc.).
//
// Kill-switch: window.DN_CONFIG.useSupabase = false falls back to the original
// localStorage prototype path (ensureDefaults) so a bad deploy degrades instead
// of breaking the store.
// ============================================================

const StoreBridge = {
    // Storage keys (must match admin.html) — used only by the localStorage fallback
    KEYS: {
        categories: 'dn_categories',
        products: 'dn_products',
        orders: 'dn_orders',
        promos: 'dn_promos',
        cms: 'dn_cms'
    },

    _useSb: function () {
        return !!(window.DN_CONFIG && window.DN_CONFIG.useSupabase && window.dnSupabase);
    },

    // ── Row → legacy-shape mappers ──
    _mapCategory: function (r) {
        return { id: r.id, name: r.name, slug: r.slug, image: r.image, desc: r.description || '', status: r.status };
    },
    _mapProduct: function (r) {
        return {
            id: r.id,
            name: r.name,
            category: r.categories ? r.categories.name : '',
            price: r.price,
            sale: r.sale,                                   // null = not on sale (falsy, like the old '')
            stock: r.stock,
            sizes: Array.isArray(r.sizes) ? r.sizes.join(', ') : (r.sizes || ''),  // page code does .split(',')
            sku: r.sku,
            images: r.images || [],
            material: r.material || '',
            desc: r.description || ''
        };
    },
    _mapPromo: function (r) {
        return {
            code: r.code, type: r.type, value: r.value,
            minOrder: r.min_order, maxUses: r.max_uses, used: r.used,
            expiry: r.expiry, status: r.status
        };
    },

    // ── Getters (async) ──
    getCategories: async function () {
        if (this._useSb()) {
            const { data, error } = await window.dnSupabase
                .from('categories').select('*').eq('status', 'Active').order('id');
            if (error) { console.error('[DripNation] getCategories', error); throw error; }
            return data.map(r => this._mapCategory(r));
        }
        this.ensureDefaults();
        return JSON.parse(localStorage.getItem(this.KEYS.categories)) || [];
    },

    getProducts: async function () {
        if (this._useSb()) {
            const { data, error } = await window.dnSupabase
                .from('products').select('*, categories(name)').eq('status', 'Active').order('id');
            if (error) { console.error('[DripNation] getProducts', error); throw error; }
            return data.map(r => this._mapProduct(r));
        }
        this.ensureDefaults();
        return JSON.parse(localStorage.getItem(this.KEYS.products)) || [];
    },

    getProductsByCategory: async function (categoryName) {
        const all = await this.getProducts();
        return all.filter(p => p.category.toLowerCase() === String(categoryName).toLowerCase());
    },

    getProductById: async function (id) {
        if (this._useSb()) {
            const { data, error } = await window.dnSupabase
                .from('products').select('*, categories(name)').eq('id', id).maybeSingle();
            if (error) { console.error('[DripNation] getProductById', error); throw error; }
            return data ? this._mapProduct(data) : null;
        }
        this.ensureDefaults();
        return (JSON.parse(localStorage.getItem(this.KEYS.products)) || []).find(p => p.id === parseInt(id)) || null;
    },

    getCategoryBySlug: async function (slug) {
        return (await this.getCategories()).find(c => c.slug === slug) || null;
    },

    getPromos: async function () {
        if (this._useSb()) {
            const { data, error } = await window.dnSupabase
                .from('promos').select('*').eq('status', 'Active');
            if (error) { console.error('[DripNation] getPromos', error); throw error; }
            return data.map(r => this._mapPromo(r));
        }
        return JSON.parse(localStorage.getItem(this.KEYS.promos)) || [];
    },

    // CMS is not in the DB schema; storefront pages don't read it. Kept for compat.
    getCMS: function () {
        return JSON.parse(localStorage.getItem(this.KEYS.cms)) || {};
    },

    // ── Validate Promo Code (client-side UX only; re-validated server-side in Phase 5) ──
    validatePromo: async function (code, cartTotal) {
        const promos = await this.getPromos();
        const promo = promos.find(
            p => p.code.toUpperCase() === code.toUpperCase() && p.status === 'Active'
        );
        if (!promo) return { valid: false, message: 'Invalid promo code.' };
        if (promo.minOrder > 0 && cartTotal < promo.minOrder) {
            return { valid: false, message: `Minimum order of ₹${promo.minOrder.toLocaleString('en-IN')} required.` };
        }
        if (promo.maxUses > 0 && promo.used >= promo.maxUses) {
            return { valid: false, message: 'This promo code has reached its usage limit.' };
        }
        if (promo.expiry && new Date(promo.expiry) < new Date()) {
            return { valid: false, message: 'This promo code has expired.' };
        }

        let discount = 0;
        let label = '';
        if (promo.type === 'percentage') {
            discount = Math.round(cartTotal * (promo.value / 100));
            label = promo.value + '% OFF';
        } else if (promo.type === 'fixed') {
            discount = promo.value;
            label = '₹' + promo.value + ' OFF';
        } else if (promo.type === 'shipping') {
            discount = 0; // handled separately
            label = 'FREE SHIPPING';
        }

        return { valid: true, discount, label, type: promo.type, code: promo.code };
    },

    // ── Render product card HTML (pure; unchanged) ──
    renderProductCard: function (product) {
        const priceDisplay = product.sale
            ? `<span style="text-decoration:line-through;color:var(--text-muted);margin-right:8px;">₹${product.price.toLocaleString('en-IN')}</span>₹${product.sale.toLocaleString('en-IN')}`
            : `₹${product.price.toLocaleString('en-IN')}`;
        const cartPrice = product.sale || product.price;
        const safeName = product.name.replace(/'/g, "\\'");

        // Handle migration from old 'image' property
        const primaryImage = product.images && product.images.length > 0 ? product.images[0] : (product.image || 'assets/images/default.jpg');

        return `
            <div class="dn-product-card" onclick="window.location.href='product.html?id=${product.id}'">
                <div class="dn-product-card-image" style="background-image: url('${primaryImage}');"></div>
                <div class="dn-product-card-info">
                    <span class="dn-product-card-name">${product.name}</span>
                    <span class="dn-product-card-price">${priceDisplay}</span>
                </div>
                <div class="dn-product-card-actions">
                    <button class="dn-add-cart-btn" onclick="event.stopPropagation(); CartEngine.addItem(${product.id}, '${safeName}', '${cartPrice}', '${primaryImage}', '')">Add</button>
                </div>
            </div>
        `;
    },

    // ── Seed default data for the localStorage FALLBACK path only ──
    // (No longer auto-runs. Only invoked when useSupabase is false / client missing.)
    ensureDefaults: function () {
        if (!localStorage.getItem(this.KEYS.categories)) {
            localStorage.setItem(this.KEYS.categories, JSON.stringify([
                { id: 1, name: 'Retro Jersey', slug: 'retro-jersey.html', image: 'assets/images/retro jerseys.jpeg', count: 30, status: 'Active', created: '01 Aug 2026', desc: 'Authentic vintage football jerseys.' },
                { id: 2, name: 'Accessories', slug: 'accessories.html', image: 'assets/images/accessories.jpeg', count: 30, status: 'Active', created: '01 Aug 2026', desc: 'Chains, caps, bags & watches.' },
                { id: 3, name: 'Jackets', slug: 'jackets.html', image: 'assets/images/jackets.jpeg', count: 30, status: 'Active', created: '01 Aug 2026', desc: 'Premium outerwear essentials.' },
                { id: 4, name: 'Track & Suit', slug: 'track-and-suit.html', image: 'assets/images/track and suit.jpeg', count: 30, status: 'Active', created: '01 Aug 2026', desc: 'Athletic performance meets street.' }
            ]));
        }

        if (!localStorage.getItem(this.KEYS.products)) {
            const defaultProducts = [];
            const jerseyNames = [
                "Vintage Milan '92", "Classic Inter '98", "Retro Brazil '70",
                "Heritage Arsenal '04", "Legend Madrid '02", "Golden Barça '06",
                "Imperial Roma '01", "Thunder Juve '96", "Eclipse Ajax '95",
                "Phantom PSG '99", "Dynasty Bayern '01", "Vortex Chelsea '05"
            ];
            const accNames = [
                'Shadow Chain', 'Midnight Beanie', 'Carbon Crossbody',
                'Phantom Cap', 'Onyx Wristband', 'Steel Dog Tag',
                'Noir Bucket Hat', 'Obsidian Ring', 'Venom Snapback',
                'Eclipse Durag', 'Blaze Lanyard', 'Iron Pendant'
            ];
            const jacketNames = [
                'Shadow Bomber', 'Midnight Varsity', 'Carbon Coach',
                'Phantom Windbreaker', 'Onyx Puffer', 'Steel Harrington',
                'Noir Flight Jacket', 'Obsidian Denim', 'Venom Track Top',
                'Eclipse Anorak', 'Blaze Leather', 'Iron Trucker'
            ];
            const trackNames = [
                'Shadow Tracksuit', 'Midnight Jogger Set', 'Carbon Velour',
                'Phantom Tech Fleece', 'Onyx Windpants', 'Steel Slim Track',
                'Noir Side-Stripe', 'Obsidian Zip Set', 'Venom Track Pants',
                'Eclipse Training Kit', 'Blaze Warm-Up', 'Iron Retro Track'
            ];

            const allImages = [
                'assets/images/i3 (1).jpeg', 'assets/images/i3 (2).jpeg', 'assets/images/i4.jpeg', 'assets/images/i5.jpeg',
                'assets/images/accessories.jpeg', 'assets/images/i6.jpeg', 'assets/images/WhatsApp Image 2026-07-06 at 15.58.23.jpeg', 'assets/images/second page image.jpeg',
                'assets/images/jackets.jpeg', 'assets/images/track and suit.jpeg'
            ];

            let id = 100;
            function addBatch(names, category, priceMin, priceMax, material) {
                names.forEach((name, i) => {
                    id++;
                    const img1 = allImages[(i) % allImages.length];
                    const img2 = allImages[(i + 1) % allImages.length];
                    const img3 = allImages[(i + 2) % allImages.length];
                    const img4 = allImages[(i + 3) % allImages.length];

                    defaultProducts.push({
                        id, name, category,
                        price: Math.floor(Math.random() * (priceMax - priceMin + 1)) + priceMin,
                        sale: '', stock: Math.floor(Math.random() * 80) + 5,
                        sizes: 'S, M, L, XL', sku: 'DN-' + id,
                        images: [img1, img2, img3, img4],
                        material: material,
                        desc: ''
                    });
                });
            }

            addBatch(jerseyNames, 'Retro Jersey', 1499, 3499, "100% Breathable Polyester");
            addBatch(accNames, 'Accessories', 299, 2499, "Premium Stainless Steel & Cotton");
            addBatch(jacketNames, 'Jackets', 1999, 5999, "Water-Resistant Nylon Blend");
            addBatch(trackNames, 'Track & Suit', 1299, 4999, "Luxury Velour & French Terry");

            localStorage.setItem(this.KEYS.products, JSON.stringify(defaultProducts));
        }

        if (!localStorage.getItem(this.KEYS.promos)) {
            localStorage.setItem(this.KEYS.promos, JSON.stringify([
                { code: 'DRIP20', type: 'percentage', value: 20, minOrder: 2000, maxUses: 200, used: 34, expiry: '2026-12-31', status: 'Active' },
                { code: 'FIRSTDROP', type: 'fixed', value: 500, minOrder: 1500, maxUses: 100, used: 89, expiry: '2026-09-30', status: 'Active' },
                { code: 'FREESHIP', type: 'shipping', value: 0, minOrder: 999, maxUses: 0, used: 156, expiry: '', status: 'Active' }
            ]));
        }
    }
};
