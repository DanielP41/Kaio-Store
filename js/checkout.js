/* Kaio-Store Checkout Logic */
(() => {
    const fmt = (value) => window.KAIOCatalog?.formatMoney?.(value) || `$${Number(value || 0).toFixed(2)}`;
    const DRAFT_KEY = 'kaioCheckoutDraft';
    // PCI: no se persisten datos de tarjeta. Solo envío y contacto.
    const DRAFT_FIELDS = ['f-email', 'f-phone', 'f-name', 'f-address', 'f-city', 'f-zip', 'f-notes'];
    const SHIPPING_OPTIONS = {
        0: {
            label: 'Envio estandar',
            eta: 'Entrega estimada en 5-7 dias habiles',
            promise: 'Despacho en 24 hs'
        },
        14.99: {
            label: 'Envio express',
            eta: 'Entrega estimada en 1-2 dias habiles',
            promise: 'Prioridad alta'
        }
    };
    const PAYMENT_OPTIONS = {
        mercadopago: {
            label: 'MercadoPago',
            note: 'Te redirigimos a MercadoPago para completar el pago de forma segura.'
        },
        paypal: {
            label: 'PayPal',
            note: 'Redireccion segura simulada para confirmar tu pago.'
        },
        transfer: {
            label: 'Transferencia',
            note: 'Te mostramos los datos de pago al cerrar el pedido.'
        },
        cash: {
            label: 'Contra entrega',
            note: 'Pagas al recibir y mantenemos el pedido reservado.'
        }
    };

    let extraShipping = 0;

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    const getSummary = () => window.KAIOCart?.getSummary?.(extraShipping) || {
        subtotal: 0,
        shipping: 0,
        baseShipping: 0,
        discount: 0,
        total: 0,
        coupon: null,
        items: [],
        totalItems: 0,
        remainingForFreeShipping: 0
    };

    const getSelectedShipping = () => {
        const value = Number(document.querySelector('input[name="shipping"]:checked')?.value || 0);
        return SHIPPING_OPTIONS[value] || SHIPPING_OPTIONS[0];
    };

    const getSelectedPayment = () => {
        const value = document.querySelector('input[name="payment"]:checked')?.value || 'mercadopago';
        return PAYMENT_OPTIONS[value] || PAYMENT_OPTIONS.mercadopago;
    };

    const saveDraft = () => {
        const draft = {
            fields: {},
            shipping: document.querySelector('input[name="shipping"]:checked')?.value || '0',
            payment: document.querySelector('input[name="payment"]:checked')?.value || 'mercadopago',
            terms: document.getElementById('f-terms')?.checked || false
        };

        DRAFT_FIELDS.forEach((id) => {
            const input = document.getElementById(id);
            if (!input) return;
            draft.fields[id] = input.value;
        });

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    };

    const restoreDraft = () => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;

        try {
            const draft = JSON.parse(raw);

            // Limpieza retroactiva: drafts antiguos pueden tener datos de tarjeta persistidos.
            // Los descartamos antes de restaurar y re-guardamos el draft limpio.
            let hadLegacyCardFields = false;
            const allowedFields = new Set(DRAFT_FIELDS);
            Object.entries(draft.fields || {}).forEach(([id, value]) => {
                if (!allowedFields.has(id)) {
                    hadLegacyCardFields = true;
                    delete draft.fields[id];
                    return;
                }
                const input = document.getElementById(id);
                if (input) input.value = value;
            });

            if (hadLegacyCardFields) {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            }

            const shipping = document.querySelector(`input[name="shipping"][value="${draft.shipping || '0'}"]`);
            if (shipping) shipping.checked = true;

            const payment = document.querySelector(`input[name="payment"][value="${draft.payment || 'mercadopago'}"]`);
            if (payment) payment.checked = true;

            const terms = document.getElementById('f-terms');
            if (terms) terms.checked = !!draft.terms;
        } catch (error) {
            localStorage.removeItem(DRAFT_KEY);
        }
    };

    const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

    const renderItems = () => {
        const container = document.getElementById('checkout-items');
        if (!container) return;

        const summary = getSummary();
        if (!summary.items.length) {
            container.innerHTML = '<p class="text-on-surface-variant font-label text-xs uppercase text-center py-8">Tu carrito esta vacio</p>';
            return;
        }

        container.innerHTML = summary.items.map((item) => `
            <div class="flex gap-4">
                <div class="w-16 h-20 bg-surface-container-lowest flex-shrink-0 overflow-hidden">
                    <img class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" src="${window.escapeHTML(item.img)}" alt="${window.escapeHTML(item.name)}" loading="lazy" decoding="async">
                </div>
                <div class="flex-grow flex flex-col justify-between py-1">
                    <div>
                        <h4 class="font-headline font-bold text-xs leading-tight uppercase">${window.escapeHTML(item.name)}</h4>
                        <p class="font-label text-[10px] text-on-surface-variant uppercase mt-1">Cant: ${window.escapeHTML(item.qty)}</p>
                    </div>
                    <p class="font-headline font-bold text-secondary text-sm">${window.escapeHTML(fmt(item.lineTotal))}</p>
                </div>
            </div>
        `).join('');
    };

    const updateSummary = () => {
        const summary = getSummary();
        const shipping = getSelectedShipping();
        const payment = getSelectedPayment();

        setText('checkout-subtotal', fmt(summary.subtotal));
        setText('checkout-total', fmt(summary.total));
        setText('checkout-discount', `-${fmt(summary.discount)}`);
        setText('checkout-items-count', `${summary.totalItems} articulo${summary.totalItems !== 1 ? 's' : ''}`);
        setText('checkout-shipping-method', shipping.label);
        setText('checkout-estimate', shipping.eta);
        setText('checkout-payment-method', payment.label);
        setText('checkout-payment-note', payment.note);
        setText('checkoutDeliveryPromise', shipping.promise);

        const shippingEl = document.getElementById('checkout-shipping');
        if (shippingEl) {
            shippingEl.textContent = summary.shipping === 0 ? 'GRATIS' : fmt(summary.shipping);
            shippingEl.className = summary.shipping === 0 ? 'text-secondary font-bold' : 'text-on-surface';
        }

        const standardShippingEl = document.getElementById('std-shipping-price');
        if (standardShippingEl) {
            standardShippingEl.textContent = summary.baseShipping === 0 ? 'GRATIS' : fmt(summary.baseShipping);
        }

        const discountRow = document.getElementById('checkout-discount-row');
        if (discountRow) {
            discountRow.style.display = summary.discount > 0 ? 'flex' : 'none';
        }

        const freeShippingNote = document.getElementById('checkout-free-shipping-note');
        if (freeShippingNote) {
            if (!summary.items.length) {
                freeShippingNote.classList.add('hidden');
            } else if (summary.remainingForFreeShipping > 0) {
                freeShippingNote.textContent = `Te faltan ${fmt(summary.remainingForFreeShipping)} para activar envio gratis`;
                freeShippingNote.classList.remove('hidden');
            } else {
                freeShippingNote.textContent = 'Envio gratis desbloqueado en esta compra';
                freeShippingNote.classList.remove('hidden');
            }
        }

        const couponInput = document.getElementById('checkout-coupon-input');
        const couponMsg = document.getElementById('checkout-coupon-msg');
        if (couponInput && couponMsg) {
            if (summary.coupon && window.KAIOCart?.coupons?.[summary.coupon]) {
                couponInput.value = summary.coupon;
                couponInput.disabled = true;
                couponMsg.textContent = `Cupon "${summary.coupon}" - ${window.KAIOCart.coupons[summary.coupon] * 100}% OFF`;
                couponMsg.className = 'font-label text-[10px] mt-1.5 text-secondary';
                couponMsg.classList.remove('hidden');
            } else {
                couponInput.disabled = false;
                couponMsg.classList.add('hidden');
            }
        }

        const finalizeButton = document.getElementById('btnFinalizar');
        if (finalizeButton) finalizeButton.disabled = summary.items.length === 0;
    };

    const applyCouponFromCheckout = () => {
        const input = document.getElementById('checkout-coupon-input');
        const msg = document.getElementById('checkout-coupon-msg');
        if (!input || !msg) return;

        const result = window.KAIOCart?.setCoupon?.(input.value);
        if (!result) return;

        msg.textContent = result.message;
        msg.className = `font-label text-[10px] mt-1.5 ${result.ok ? 'text-secondary' : 'text-error'}`;
        msg.classList.remove('hidden');

        if (result.ok) {
            input.value = result.coupon;
            input.disabled = true;
        }

        updateSummary();
    };

    const setupCoupon = () => {
        document.getElementById('checkout-coupon-btn')?.addEventListener('click', applyCouponFromCheckout);
        document.getElementById('checkout-coupon-input')?.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            applyCouponFromCheckout();
        });
    };

    const setupShippingOptions = () => {
        const syncShippingState = (value) => {
            document.querySelectorAll('#shippingOptions label').forEach((label) => {
                const active = label.dataset.shipping === String(value);
                label.classList.toggle('border-secondary/50', active);
                label.classList.toggle('border-transparent', !active);
            });
        };

        document.querySelectorAll('#shippingOptions input[type=radio]').forEach((radio) => {
            radio.addEventListener('change', () => {
                extraShipping = Number(radio.value) || 0;
                syncShippingState(radio.value);
                saveDraft();
                updateSummary();
            });
        });

        extraShipping = Number(document.querySelector('#shippingOptions input[type=radio]:checked')?.value || 0);
        syncShippingState(extraShipping);
    };

    const validate = () => {
        const rules = [
            { id: 'f-email', err: 'e-email', test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) },
            { id: 'f-phone', err: 'e-phone', test: (value) => value.replace(/\D/g, '').length >= 8 },
            { id: 'f-name', err: 'e-name', test: (value) => value.trim().split(' ').length >= 2 },
            { id: 'f-address', err: 'e-address', test: (value) => value.trim().length >= 5 },
            { id: 'f-city', err: 'e-city', test: (value) => value.trim().length >= 2 },
            { id: 'f-zip', err: 'e-zip', test: (value) => /^\d{4,10}$/.test(value.trim()) }
        ];

        let validForm = true;
        rules.forEach(({ id, err, test }) => {
            const input = document.getElementById(id);
            const error = document.getElementById(err);
            const valid = !!input && test(input.value);

            input?.classList.toggle('field-error', !valid);
            input?.classList.toggle('field-ok', valid);
            error?.classList.toggle('show', !valid);

            if (!valid) validForm = false;
        });

        const terms = document.getElementById('f-terms');
        const termsError = document.getElementById('e-terms');
        const validTerms = !!terms?.checked;
        termsError?.classList.toggle('show', !validTerms);
        if (!validTerms) validForm = false;

        return validForm;
    };

    const generateLocalOrderId = () => {
        const raw = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2);
        return `KAO-${raw.slice(0, 8).toUpperCase()}`;
    };

    const hideProcessing = (processScreen) => {
        if (!processScreen) return;
        processScreen.style.opacity = '0';
        setTimeout(() => processScreen.classList.add('hidden'), 300);
    };

    const showConfirmation = async () => {
        const confirmScreen = document.getElementById('confirmationScreen');
        const processScreen = document.getElementById('processingScreen');
        const summaryBox = document.getElementById('confirmation-summary');
        const finalizeButton = document.getElementById('btnFinalizar');
        if (!confirmScreen || !summaryBox) return;

        if (processScreen) {
            processScreen.classList.remove('hidden');
            processScreen.style.opacity = '0';
            requestAnimationFrame(() => {
                processScreen.style.transition = 'opacity 0.3s ease';
                processScreen.style.opacity = '1';
            });
        }
        if (finalizeButton) finalizeButton.disabled = true;

        const summary = getSummary();
        const shipping = getSelectedShipping();
        const paymentKey = document.querySelector('input[name="payment"]:checked')?.value || 'mercadopago';
        const payment = PAYMENT_OPTIONS[paymentKey] || PAYMENT_OPTIONS.mercadopago;
        const name = document.getElementById('f-name')?.value || 'Cliente';
        const email = document.getElementById('f-email')?.value || '';

        // El servidor recalcula precios/descuentos y valida stock — el cliente NO puede
        // manipular el total. Si falla, abortamos.
        const isAuthed = !!window.KAIOAuth?.isLoggedIn?.();
        const shippingMethodKey = Number(document.querySelector('input[name="shipping"]:checked')?.value || 0) > 0
            ? 'express'
            : 'standard';

        const errorMessages = {
            auth_required: 'Iniciá sesión para finalizar la compra.',
            empty_cart: 'Tu carrito está vacío.',
            invalid_product: 'Uno de los productos ya no está disponible.',
            invalid_qty: 'Cantidad inválida en uno de los productos.',
            insufficient_stock: 'No hay stock suficiente. Revisá las cantidades.',
            invalid_coupon: 'El cupón no es válido o expiró.',
            coupon_not_applicable: 'El cupón no aplica a los productos de tu carrito.',
            mp_preference_failed: 'No pudimos contactar a MercadoPago. Intentá de nuevo.',
            mp_not_configured: 'MercadoPago no está configurado. Avisanos por WhatsApp.'
        };
        const abortWithError = (errKey, missing) => {
            hideProcessing(processScreen);
            if (finalizeButton) finalizeButton.disabled = summary.items.length === 0;
            window.showToast?.(errorMessages[errKey] || 'No pudimos procesar tu pedido. Intentá de nuevo.');
            if (missing?.length) console.warn('[KAIO][checkout] stock missing:', missing);
        };

        // ── Branch MercadoPago: creamos preferencia y redirigimos a MP. ──
        if (paymentKey === 'mercadopago' && isAuthed) {
            const result = await window.KAIOSupabaseStore?.createMpPreference?.({
                items: summary.items.map((it) => ({ id: it.id, qty: it.qty })),
                couponCode: summary.coupon,
                shippingMethod: shippingMethodKey,
                customerEmail: email,
                customerName: name,
                usePoints: !!summary.pointsUsed
            });

            if (!result?.ok) {
                abortWithError(result?.error, result?.missing);
                return;
            }

            // Limpiar el draft local antes de salir; la orden ya está en BD.
            clearDraft();
            // Vaciamos el carrito local — el server ya descontó stock y registró la orden.
            window.KAIOCart?.clear?.();

            // Redirigir a MP. Usamos sandbox_init_point si estamos en localhost.
            const target = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                ? (result.sandboxInitPoint || result.initPoint)
                : result.initPoint;
            window.location.href = target;
            return;
        }

        if (paymentKey === 'mercadopago' && !isAuthed) {
            abortWithError('auth_required');
            return;
        }

        // ── Branch local (transfer / cash / paypal-simulado): place_order directo. ──
        let placement = null;
        if (isAuthed) {
            placement = await window.KAIOSupabaseStore?.placeOrder?.({
                items: summary.items.map((it) => ({ id: it.id, qty: it.qty })),
                couponCode: summary.coupon,
                shippingMethod: shippingMethodKey,
                paymentMethod: paymentKey,
                customerEmail: email,
                customerName: name,
                usePoints: !!summary.pointsUsed
            });

            if (!placement || !placement.ok) {
                abortWithError(placement?.error, placement?.missing);
                return;
            }
        }

        const realOrderId = placement?.orderId || null;
        const serverTotal = placement?.total ?? summary.total;
        const orderId = realOrderId
            ? `KAO-${String(realOrderId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
            : generateLocalOrderId();

        summaryBox.innerHTML = `
            <p class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">Detalle del pedido</p>
            <div class="space-y-1.5">
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">N de pedido</span><span class="text-secondary font-bold">${window.escapeHTML(orderId)}</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Cliente</span><span>${window.escapeHTML(name)}</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Email</span><span>${window.escapeHTML(email)}</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Productos</span><span>${summary.totalItems} item(s)</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Envio</span><span>${window.escapeHTML(shipping.label)}</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Entrega</span><span>${window.escapeHTML(shipping.eta)}</span></div>
                <div class="flex justify-between font-label text-xs"><span class="text-on-surface-variant">Pago</span><span class="text-tertiary">${window.escapeHTML(payment.label)}</span></div>
                <div class="flex justify-between font-headline font-black text-primary text-base mt-3 pt-3 border-t border-outline-variant/20">
                    <span>TOTAL PAGADO</span><span>${fmt(serverTotal)}</span>
                </div>
            </div>
        `;

        // El RPC place_order ya descontó stock, ajustó puntos y creó la orden.
        // No hay que llamar a updatePoints — eso era el flujo viejo client-side.

        // Notificar al sistema de autenticación para refrescar puntos/órdenes en el header.
        document.dispatchEvent(new CustomEvent('kaio:order-placed', {
            detail: {
                orderId: orderId,
                items: summary.totalItems,
                total: serverTotal,
                pointsUsed: summary.pointsUsed
            }
        }));

        setTimeout(() => {
            hideProcessing(processScreen);

            window.KAIOCart?.clear?.();
            clearDraft();

            confirmScreen.classList.remove('hidden');
            confirmScreen.style.opacity = '0';
            requestAnimationFrame(() => {
                confirmScreen.style.transition = 'opacity .5s ease';
                confirmScreen.style.opacity = '1';

                if (window.confetti) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#ff906a', '#00d2fd', '#ff6c92']
                    });
                }
            });
        }, 2200);
    };

    const setupPaymentOptions = () => {
        // El bloque cardDetails es legacy: lo ocultamos siempre porque ahora MercadoPago
        // maneja los datos de tarjeta en su propia página.
        const cardDetails = document.getElementById('cardDetails');
        if (cardDetails) cardDetails.style.display = 'none';

        const syncPaymentState = (value) => {
            document.querySelectorAll('#paymentOptions label').forEach((label) => {
                const active = label.dataset.payment === value;
                label.classList.toggle('border-secondary/50', active);
                label.classList.toggle('border-transparent', !active);
            });
        };

        document.querySelectorAll('input[name="payment"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                syncPaymentState(radio.value);
                saveDraft();
                updateSummary();
            });
        });

        syncPaymentState(document.querySelector('input[name="payment"]:checked')?.value || 'mercadopago');
    };

    // La validación de tarjeta vivía acá. MercadoPago se encarga de validar los datos
    // de la tarjeta en su propia UI, así que esta función ya no tiene chequeos extra.
    const validatePayment = () => true;

    const bindDraftPersistence = () => {
        document.querySelectorAll('#checkoutMain input, #checkoutMain textarea').forEach((field) => {
            const eventName = field.type === 'radio' || field.type === 'checkbox' ? 'change' : 'input';
            field.addEventListener(eventName, saveDraft);
        });
    };

    const autoFillFromAuth = () => {
        const user = window.KAIOAuth?.getCurrentUser?.();
        if (!user) return;

        const nameInput = document.getElementById('f-name');
        const emailInput = document.getElementById('f-email');

        let changed = false;
        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = user.name;
            changed = true;
        }
        if (emailInput && !emailInput.value.trim()) {
            emailInput.value = user.email;
            changed = true;
        }
        
        if (changed) {
            validate();
            saveDraft();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        restoreDraft();
        autoFillFromAuth();
        renderItems();
        setupCoupon();
        setupShippingOptions();
        setupPaymentOptions();
        bindDraftPersistence();
        updateSummary();

        document.getElementById('btnFinalizar')?.addEventListener('click', async () => {
            const summary = getSummary();
            if (!summary.items.length) {
                window.location.href = 'full.html';
                return;
            }

            if (validate() && validatePayment()) {
                await showConfirmation();
                return;
            }

            document.querySelector('.field-error, .error-msg.show')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        ['f-email', 'f-phone', 'f-name', 'f-address', 'f-city', 'f-zip'].forEach((id) => {
            document.getElementById(id)?.addEventListener('blur', validate);
        });

        ['f-card-name', 'f-card-number', 'f-card-cvv', 'f-card-expiry', 'f-card-zip'].forEach((id) => {
            document.getElementById(id)?.addEventListener('blur', validatePayment);
        });
    });

    document.addEventListener('kaio:cart-updated', () => {
        renderItems();
        updateSummary();
        saveDraft();
    });

    document.addEventListener('kaio:coupon-updated', updateSummary);
    document.addEventListener('kaio:auth-changed', autoFillFromAuth);
})();
