/* Kaio-Store Supabase Data Layer (graceful fallback) */
(() => {
    const getClient = () => window.supabaseClient || null;
    const getUserId = () => window.KAIOAuth?.getCurrentUser?.()?.id || null;

    const safe = async (fn, fallback) => {
        try {
            return await fn();
        } catch (error) {
            console.warn('[KAIO][SupabaseStore]', error?.message || error);
            return fallback;
        }
    };

    const mapProduct = (row) => ({
        id: row.id,
        name: row.name,
        priceNum: Number(row.price_num || row.priceNum || 0),
        price: row.price || `$${Number(row.price_num || row.priceNum || 0).toFixed(2)}`,
        img: row.img || '',
        category: row.category || '',
        section: row.section || '',
        url: row.url || 'full.html',
        stock: row.stock == null ? Infinity : Number(row.stock)
    });

    const fetchProducts = async () => {
        const supabase = getClient();
        if (!supabase) return [];

        return safe(async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id,name,price_num,price,img,category,section,url,stock')
                .eq('is_active', true);
            if (error) throw error;
            return (data || []).map(mapProduct);
        }, []);
    };

    // Decrementa stock atómicamente. Devuelve { ok, missing? }.
    const decrementStock = async (items) => {
        const supabase = getClient();
        if (!supabase) return { ok: false, missing: [] };

        return safe(async () => {
            const payload = (items || []).map((item) => ({
                id: item.id,
                qty: Number(item.qty || 1)
            }));
            const { data, error } = await supabase.rpc('decrement_stock', { items: payload });
            if (error) throw error;
            return data || { ok: false };
        }, { ok: false, missing: [] });
    };

    const loadUserProfile = async () => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return { points: 50 };

        return safe(async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', userId)
                .single();
            
            // Si no existe, creamos el perfil inicial con 50 puntos
            if (error && error.code === 'PGRST116') {
                await supabase.from('profiles').insert({ id: userId, points: 50 });
                return { points: 50 };
            }
            if (error) throw error;
            
            return { points: Number(data?.points || 0) };
        }, { points: 50 });
    };

    const updatePoints = async (delta) => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return false;

        return safe(async () => {
            const profile = await loadUserProfile();
            const newPoints = Math.max(0, profile.points + delta);
            
            const { error } = await supabase
                .from('profiles')
                .update({ points: newPoints })
                .eq('id', userId);
                
            if (error) throw error;
            return true;
        }, false);
    };

    const loadUserOrders = async () => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return [];

        return safe(async () => {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('id, created_at, total, order_items(qty)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            return (orders || []).map(o => ({
                orderId: o.id,
                date: o.created_at,
                total: Number(o.total || 0),
                items: (o.order_items || []).reduce((sum, item) => sum + Number(item.qty || 1), 0)
            }));
        }, []);
    };

    const loadCart = async () => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return null;

        return safe(async () => {
            const { data, error } = await supabase
                .from('cart_items')
                .select('product_id,qty')
                .eq('user_id', userId);
            if (error) throw error;
            return (data || []).map((item) => ({
                id: item.product_id,
                qty: Number(item.qty || 1)
            }));
        }, null);
    };

    const saveCart = async (cart) => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return false;

        return safe(async () => {
            const next = (Array.isArray(cart) ? cart : []).map((item) => ({
                user_id: userId,
                product_id: item.id,
                qty: Number(item.qty || 1)
            }));

            const { data: existing, error: existingError } = await supabase
                .from('cart_items')
                .select('product_id')
                .eq('user_id', userId);
            if (existingError) throw existingError;

            const currentIds = new Set((existing || []).map((row) => row.product_id));
            const nextIds = new Set(next.map((row) => row.product_id));
            const toDelete = [...currentIds].filter((id) => !nextIds.has(id));

            if (toDelete.length) {
                const { error: deleteError } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', userId)
                    .in('product_id', toDelete);
                if (deleteError) throw deleteError;
            }

            if (next.length) {
                const { error: upsertError } = await supabase
                    .from('cart_items')
                    .upsert(next, { onConflict: 'user_id,product_id' });
                if (upsertError) throw upsertError;
            }

            return true;
        }, false);
    };

    const loadWishlist = async () => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return null;

        return safe(async () => {
            const { data, error } = await supabase
                .from('wishlist_items')
                .select('product_id')
                .eq('user_id', userId);
            if (error) throw error;
            return (data || []).map((row) => row.product_id);
        }, null);
    };

    const saveWishlist = async (ids) => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return false;

        return safe(async () => {
            const next = (Array.isArray(ids) ? ids : []).map((id) => ({
                user_id: userId,
                product_id: id
            }));

            const { data: existing, error: existingError } = await supabase
                .from('wishlist_items')
                .select('product_id')
                .eq('user_id', userId);
            if (existingError) throw existingError;

            const currentIds = new Set((existing || []).map((row) => row.product_id));
            const nextIds = new Set(next.map((row) => row.product_id));
            const toDelete = [...currentIds].filter((id) => !nextIds.has(id));

            if (toDelete.length) {
                const { error: deleteError } = await supabase
                    .from('wishlist_items')
                    .delete()
                    .eq('user_id', userId)
                    .in('product_id', toDelete);
                if (deleteError) throw deleteError;
            }

            if (next.length) {
                const { error: upsertError } = await supabase
                    .from('wishlist_items')
                    .upsert(next, { onConflict: 'user_id,product_id' });
                if (upsertError) throw upsertError;
            }

            return true;
        }, false);
    };

    // Placement de orden vía RPC server-side. El servidor recalcula precios y descuentos
    // contra la BD, valida stock y descuenta atómicamente.
    // Retorna { ok, orderId?, total?, error?, missing? }.
    const placeOrder = async ({ items, couponCode, shippingMethod, paymentMethod, customerEmail, customerName, usePoints }) => {
        const supabase = getClient();
        const userId = getUserId();
        if (!supabase || !userId) return { ok: false, error: 'auth_required' };

        try {
            const payload = {
                items: (items || []).map((item) => ({ id: item.id, qty: Number(item.qty || 1) })),
                coupon_code: couponCode || null,
                shipping_method: shippingMethod || 'standard',
                payment_method: paymentMethod || 'card',
                customer_email: customerEmail || '',
                customer_name: customerName || '',
                use_points: !!usePoints
            };
            const { data, error } = await supabase.rpc('place_order', payload);
            if (error) {
                console.warn('[KAIO][placeOrder]', error.message);
                return { ok: false, error: error.message };
            }
            if (!data?.ok) {
                return { ok: false, error: data?.error || 'unknown', missing: data?.missing };
            }
            return {
                ok: true,
                orderId: data.order_id,
                subtotal: Number(data.subtotal || 0),
                shipping: Number(data.shipping || 0),
                discount: Number(data.discount || 0),
                total: Number(data.total || 0)
            };
        } catch (error) {
            console.warn('[KAIO][placeOrder] threw', error);
            return { ok: false, error: 'exception' };
        }
    };

    // Crea preferencia en MercadoPago. La Edge Function valida + crea la orden internamente
    // llamando a place_order; el cliente solo provee items y datos de envío/contacto.
    const createMpPreference = async (payload) => {
        const supabase = getClient();
        if (!supabase) return { ok: false, error: 'no_client' };
        try {
            const { data, error } = await supabase.functions.invoke('create-mp-preference', {
                body: payload
            });
            if (error) return { ok: false, error: error.message || 'function_error' };
            if (!data?.ok) return { ok: false, ...data };
            return data;
        } catch (error) {
            console.warn('[KAIO][createMpPreference]', error);
            return { ok: false, error: 'exception' };
        }
    };

    window.KAIOSupabaseStore = {
        fetchProducts,
        loadUserProfile,
        updatePoints,
        loadUserOrders,
        loadCart,
        saveCart,
        loadWishlist,
        saveWishlist,
        placeOrder,
        decrementStock,
        createMpPreference
    };
})();
