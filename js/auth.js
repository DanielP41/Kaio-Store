/* ============================================================
   Kaio-Store — Auth System
   Registro · Login · Logout · Perfil · Pedidos · Puntos Kaio
   ============================================================ */
(() => {
    /* ── Supabase Auth Integration ────────────────────────────── */
    const supabase = window.supabaseClient;
    let currentUser = null; // Caché síncrona para la app
    
    if (supabase) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const [profile, orders] = await Promise.all([
                    window.KAIOSupabaseStore?.loadUserProfile?.(),
                    window.KAIOSupabaseStore?.loadUserOrders?.()
                ]);
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.name || 'Usuario',
                    points: profile?.points || 0,
                    orders: orders || [],
                    createdAt: session.user.created_at
                };
            } else {
                currentUser = null;
            }
            dispatchChange(currentUser);
            refreshView();
            updateHeaderBtn();
        });
        
        // Carga inicial
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const [profile, orders] = await Promise.all([
                    window.KAIOSupabaseStore?.loadUserProfile?.(),
                    window.KAIOSupabaseStore?.loadUserOrders?.()
                ]);
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.name || 'Usuario',
                    points: profile?.points || 0,
                    orders: orders || [],
                    createdAt: session.user.created_at
                };
            }
            refreshView();
            updateHeaderBtn();
        });
    }

    /* ── Utilidades de Seguridad ───────────────────────────────── */
    window.escapeHTML = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    /* ── Funciones de Autenticación ───────────────────────────── */
    const getCurrentUser = () => currentUser;
    const isLoggedIn = () => !!currentUser;

    const register = async (name, email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name.trim() } }
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true, user: data.user };
    };

    const login = async (email, password, remember = false) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, message: error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message };
        return { ok: true, user: data.user };
    };

    const logout = async () => {
        if (supabase) await supabase.auth.signOut();
    };

    const loginWithGoogle = async () => {
        if (!supabase) return { ok: false, message: 'Auth no disponible.' };
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true, data };
    };

    const requestPasswordReset = async (email) => {
        if (!supabase) return { ok: false, message: 'Auth no disponible.' };
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/full.html'
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
    };

    const updateProfile = async (newName, newEmail) => {
        if (!currentUser) return { ok: false, message: 'No hay sesión activa.' };
        const updates = {};
        if (newName && newName !== currentUser.name) updates.data = { name: newName.trim() };
        if (newEmail && newEmail !== currentUser.email) updates.email = newEmail.toLowerCase().trim();
        
        if (Object.keys(updates).length === 0) return { ok: true };
        
        const { error } = await supabase.auth.updateUser(updates);
        if (error) return { ok: false, message: error.message };
        
        // Actualizar caché manual mientras se refleja
        if (updates.data) currentUser.name = updates.data.name;
        if (updates.email) currentUser.email = updates.email;
        dispatchChange(currentUser);
        return { ok: true };
    };

    const reloadUserData = async () => {
        if (!currentUser) return;
        const [profile, orders] = await Promise.all([
            window.KAIOSupabaseStore?.loadUserProfile?.(),
            window.KAIOSupabaseStore?.loadUserOrders?.()
        ]);
        currentUser.points = profile?.points || 0;
        currentUser.orders = orders || [];
        dispatchChange(currentUser);
        refreshView();
    };

    /* ── Eventos ──────────────────────────────────────────────── */
    const dispatchChange = (user) =>
        document.dispatchEvent(new CustomEvent('kaio:auth-changed', { detail: { user, isLoggedIn: !!user } }));

    /* ── Utilidades UI ────────────────────────────────────────── */
    const initials = (name) => {
        const p = (name || '').trim().split(/\s+/);
        return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (name || '??').slice(0, 2).toUpperCase();
    };

    const showErr = (id, visible, msg = '') => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        if (msg) el.textContent = msg;
    };

    const clearErrs = (...ids) => ids.forEach(id => showErr(id, false));

    /* ── HTML del modal ───────────────────────────────────────── */
    const buildModal = () => {
        if (document.getElementById('authModal')) return;
        const wrap = document.createElement('div');
        wrap.id = 'authModal';
        wrap.innerHTML = `
<!-- Overlay (backdrop + contenedor centrador) -->
<div id="authOverlay"
     class="fixed inset-0 z-[90] hidden flex items-center justify-center p-4"
     style="background:rgba(8,6,24,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
            opacity:0;transition:opacity 0.25s ease;">

<!-- Card centrado -->
<div id="authCard"
     class="w-full max-w-[540px] bg-surface-container flex flex-col overflow-hidden relative"
     style="max-height:88vh;
            box-shadow:0 40px 100px rgba(0,0,0,0.85),0 0 0 1px rgba(255,144,106,0.12),inset 0 1px 0 rgba(255,255,255,0.04);
            opacity:0;transform:scale(0.93) translateY(22px);
            transition:opacity 0.32s ease,transform 0.38s cubic-bezier(0.22,1.2,0.36,1);">

    <!-- Línea decorativa superior -->
    <div style="height:2px;background:linear-gradient(90deg,transparent,#ff906a 30%,#00d2fd 70%,transparent);flex-shrink:0"></div>

    <!-- ── Cabecera ── -->
    <div class="flex items-center justify-between px-7 py-5 border-b border-outline-variant/20 flex-shrink-0">
        <span class="font-headline font-black text-lg italic tracking-widest text-primary">KAIO-STORE</span>
        <button id="authClose"
                class="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <span class="material-symbols-outlined text-on-surface-variant">close</span>
        </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         VISTA INVITADO
    ══════════════════════════════════════════════════════════ -->
    <div id="authGuestView" class="flex-1 flex flex-col overflow-hidden">

        <!-- Tabs -->
        <div class="flex border-b border-outline-variant/20 flex-shrink-0">
            <button id="tabLogin"
                    class="flex-1 py-4 font-headline font-bold text-xs uppercase tracking-widest
                           transition-all border-b-2 border-primary text-primary">
                Iniciar sesión
            </button>
            <button id="tabRegister"
                    class="flex-1 py-4 font-headline font-bold text-xs uppercase tracking-widest
                           transition-all border-b-2 border-transparent text-on-surface-variant
                           hover:text-on-surface">
                Crear cuenta
            </button>
        </div>

        <!-- Scroll container -->
        <div class="flex-1 overflow-y-auto">

            <!-- ─── FORMULARIO LOGIN ─── -->
            <div id="formLogin" class="px-7 pt-8 pb-10">

                <!-- Google Sign-In -->
                <button id="googleSignInBtn"
                        class="w-full flex items-center justify-center gap-3
                               bg-surface-container-high hover:bg-surface-container-highest
                               border border-outline-variant/30 py-3 mb-5 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.388 17.64 12.08 17.64 9.2Z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
                    </svg>
                    <span class="font-label text-sm font-bold">Continuar con Google</span>
                </button>

                <div class="flex items-center gap-3 mb-5">
                    <div class="flex-1 h-px bg-outline-variant/25"></div>
                    <span class="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">O</span>
                    <div class="flex-1 h-px bg-outline-variant/25"></div>
                </div>

                <!-- Campos -->
                <div class="space-y-4">
                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Email</label>
                        <input id="loginEmail" type="email" autocomplete="email" placeholder="tu@email.com"
                               class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                      py-3 px-4 font-label text-sm placeholder:text-outline transition-all"/>
                        <p id="loginEmailErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá un email válido.</p>
                    </div>

                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Contraseña</label>
                        <div class="relative">
                            <input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••"
                                   class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                          py-3 px-4 pr-11 font-label text-sm placeholder:text-outline transition-all"/>
                            <button type="button" id="toggleLoginPwd"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors">
                                <span class="material-symbols-outlined text-base">visibility</span>
                            </button>
                        </div>
                        <p id="loginPasswordErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá tu contraseña.</p>
                    </div>

                    <div class="flex items-center justify-between">
                        <label class="flex items-center gap-2 cursor-pointer select-none">
                            <input id="loginRemember" type="checkbox" class="w-4 h-4 accent-[#ff906a]"/>
                            <span class="font-label text-xs text-on-surface-variant">Recordarme</span>
                        </label>
                        <button type="button" id="forgotPasswordBtn"
                                class="font-label text-xs text-secondary hover:underline transition-colors">
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                </div>

                <p id="loginGeneralErr"
                   class="hidden mt-3 text-error font-label text-xs bg-error-container/20 px-3 py-2 leading-relaxed"></p>

                <button id="loginSubmit"
                        class="w-full mt-6 bg-gradient-to-br from-primary to-primary-container
                               text-on-primary-fixed py-4 font-headline font-black uppercase tracking-widest
                               hover:shadow-[0_0_28px_rgba(255,144,106,0.45)] transition-all">
                    Iniciar sesión
                </button>

                <p class="mt-5 text-center font-label text-xs text-on-surface-variant">
                    ¿No tenés cuenta?
                    <button id="switchToRegister" class="text-secondary font-bold hover:underline ml-1">Crear cuenta →</button>
                </p>
            </div>

            <!-- ─── FORMULARIO REGISTRO ─── -->
            <div id="formRegister" class="hidden px-7 pt-8 pb-10">
                <div class="space-y-4">
                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Nombre completo</label>
                        <input id="regName" type="text" autocomplete="name" placeholder="Nombre Apellido"
                               class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                      py-3 px-4 font-label text-sm placeholder:text-outline transition-all"/>
                        <p id="regNameErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá nombre y apellido.</p>
                    </div>

                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Email</label>
                        <input id="regEmail" type="email" autocomplete="email" placeholder="tu@email.com"
                               class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                      py-3 px-4 font-label text-sm placeholder:text-outline transition-all"/>
                        <p id="regEmailErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá un email válido.</p>
                    </div>

                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Contraseña</label>
                        <div class="relative">
                            <input id="regPassword" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"
                                   class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                          py-3 px-4 pr-11 font-label text-sm placeholder:text-outline transition-all"/>
                            <button type="button" id="toggleRegPwd"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors">
                                <span class="material-symbols-outlined text-base">visibility</span>
                            </button>
                        </div>
                        <p id="regPasswordErr" class="hidden text-error font-label text-[10px] mt-1">Mínimo 6 caracteres.</p>
                    </div>

                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Confirmar contraseña</label>
                        <input id="regPasswordConfirm" type="password" autocomplete="new-password" placeholder="Repetí tu contraseña"
                               class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                      py-3 px-4 font-label text-sm placeholder:text-outline transition-all"/>
                        <p id="regConfirmErr" class="hidden text-error font-label text-[10px] mt-1">Las contraseñas no coinciden.</p>
                    </div>

                    <label class="flex items-start gap-2.5 cursor-pointer select-none">
                        <input id="regTerms" type="checkbox" class="w-4 h-4 mt-0.5 accent-[#ff906a] flex-shrink-0"/>
                        <span class="font-label text-xs text-on-surface-variant leading-relaxed">
                            Acepto los
                            <button type="button" class="text-secondary hover:underline"
                                    onclick="window.location.href='legales.html'">
                                términos y condiciones
                            </button>
                            de Kaio-Store.
                        </span>
                    </label>
                </div>

                <p id="regGeneralErr"
                   class="hidden mt-3 text-error font-label text-xs bg-error-container/20 px-3 py-2 leading-relaxed"></p>

                <button id="regSubmit"
                        class="w-full mt-5 bg-gradient-to-br from-secondary to-secondary-container
                               text-on-primary-fixed py-4 font-headline font-black uppercase tracking-widest
                               hover:shadow-[0_0_28px_rgba(0,210,253,0.35)] transition-all">
                    Crear cuenta
                </button>

                <p class="mt-5 text-center font-label text-xs text-on-surface-variant">
                    ¿Ya tenés cuenta?
                    <button id="switchToLogin" class="text-secondary font-bold hover:underline ml-1">Iniciar sesión →</button>
                </p>
            </div>

            <!-- ─── FORMULARIO FORGOT PASSWORD ─── -->
            <div id="formForgot" class="hidden px-7 pt-8 pb-10">
                <p class="font-headline font-black uppercase text-sm tracking-widest mb-2">Recuperar contraseña</p>
                <p class="font-label text-xs text-on-surface-variant leading-relaxed mb-5">
                    Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
                </p>

                <div class="space-y-4">
                    <div>
                        <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Email</label>
                        <input id="forgotEmail" type="email" autocomplete="email" placeholder="tu@email.com"
                               class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary
                                      py-3 px-4 font-label text-sm placeholder:text-outline transition-all"/>
                        <p id="forgotEmailErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá un email válido.</p>
                    </div>
                </div>

                <p id="forgotGeneralMsg"
                   class="hidden mt-3 font-label text-xs px-3 py-2 leading-relaxed"></p>

                <button id="forgotSubmit"
                        class="w-full mt-6 bg-gradient-to-br from-secondary to-secondary-container
                               text-on-primary-fixed py-4 font-headline font-black uppercase tracking-widest
                               hover:shadow-[0_0_28px_rgba(0,210,253,0.35)] transition-all">
                    Enviar link
                </button>

                <p class="mt-5 text-center font-label text-xs text-on-surface-variant">
                    <button id="forgotBackToLogin" class="text-secondary font-bold hover:underline">← Volver al login</button>
                </p>
            </div>

        </div><!-- /scroll -->
    </div><!-- /authGuestView -->

    <!-- ══════════════════════════════════════════════════════════
         VISTA USUARIO LOGUEADO
    ══════════════════════════════════════════════════════════ -->
    <div id="authUserView" class="hidden flex-1 flex flex-col overflow-hidden">

        <!-- Perfil -->
        <div class="px-7 py-8 border-b border-outline-variant/20 bg-surface-container-low flex-shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-sm flex items-center justify-center
                            bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                    <span id="authUserInitials" class="font-headline font-black text-xl text-[#0c0c1f] select-none">KA</span>
                </div>
                <div class="min-w-0">
                    <p id="authUserName"  class="font-headline font-bold uppercase tracking-tight leading-tight truncate">Usuario</p>
                    <p id="authUserEmail" class="font-label text-xs text-on-surface-variant mt-0.5 truncate">email@kaio.com</p>
                </div>
            </div>
            <!-- Puntos -->
            <div class="mt-4 flex items-center gap-2 bg-surface-container-highest px-3 py-2">
                <span class="material-symbols-outlined text-[#ffd200] text-sm leading-none"
                      style="font-variation-settings:'FILL' 1">star</span>
                <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Puntos Kaio:</span>
                <span id="authUserPoints" class="font-headline font-black text-sm text-[#ffd200] ml-1">0</span>
            </div>
        </div>

        <!-- Menú -->
        <nav id="authUserNav" class="flex-1 overflow-y-auto py-3">
            <button id="authProfileBtn"
               class="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-container-high transition-colors group text-left">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[20px]">person</span>
                <span class="font-label text-sm font-semibold">Mi Perfil</span>
            </button>

            <button id="authOrdersBtn"
                    class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-high
                           transition-colors group text-left">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[20px]">inventory_2</span>
                <span class="font-label text-sm font-semibold">Mis Pedidos</span>
                <span id="authOrderCount"
                      class="ml-auto bg-surface-container-highest font-label text-[10px] font-bold px-2 py-0.5 min-w-[22px] text-center">0</span>
            </button>

            <a href="wishlist.html"
               class="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-high transition-colors group">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors text-[20px]">favorite</span>
                <span class="font-label text-sm font-semibold">Mis Favoritos</span>
            </a>

            <div class="mx-6 my-3 h-px bg-outline-variant/20"></div>

            <button id="authNotificationsBtn"
               class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-high transition-colors group text-left">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors text-[20px]">notifications</span>
                <span class="font-label text-sm font-semibold">Notificaciones y Newsletter</span>
            </button>

            <button id="authCouponsBtn"
               class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-high transition-colors group text-left">
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors text-[20px]">local_offer</span>
                <span class="font-label text-sm font-semibold">Mis Cupones</span>
            </button>
        </nav>

        <!-- Panel de perfil -->
        <div id="authProfilePanel" class="hidden flex-1 flex flex-col overflow-hidden">
            <div class="flex items-center gap-3 px-7 py-4 border-b border-outline-variant/20 flex-shrink-0">
                <button id="authProfileBack" class="text-outline hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Mi Perfil</span>
            </div>
            <div class="flex-1 overflow-y-auto px-7 py-5 space-y-4">
                <div>
                    <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Nombre</label>
                    <input type="text" id="authProfileName" class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary py-3 px-4 font-label text-sm transition-all" disabled />
                    <p id="authProfileNameErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá nombre y apellido.</p>
                </div>
                <div>
                    <label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">Email</label>
                    <input type="text" id="authProfileEmail" class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-secondary py-3 px-4 font-label text-sm transition-all" disabled />
                    <p id="authProfileEmailErr" class="hidden text-error font-label text-[10px] mt-1">Ingresá un email válido.</p>
                </div>
                <p id="authProfileGeneralErr" class="hidden text-error font-label text-[10px] mt-1"></p>
                <button id="authProfileEditBtn" class="w-full mt-2 bg-surface-container-highest text-on-surface py-3 font-headline font-black uppercase tracking-widest text-xs hover:bg-surface-container-high transition-all">
                    EDITAR DATOS
                </button>
            </div>
        </div>

        <!-- Panel de notificaciones -->
        <div id="authNotificationsPanel" class="hidden flex-1 flex flex-col overflow-hidden">
            <div class="flex items-center gap-3 px-7 py-4 border-b border-outline-variant/20 flex-shrink-0">
                <button id="authNotificationsBack" class="text-outline hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Notificaciones</span>
            </div>
            <div class="flex-1 overflow-y-auto px-7 py-5 space-y-4">
                <label class="flex items-center justify-between cursor-pointer border border-outline-variant/20 p-4 bg-surface-container-low">
                    <span class="font-label text-xs text-on-surface-variant">Newsletter Kaio-Store</span>
                    <input type="checkbox" class="w-4 h-4 accent-[#ff906a]" checked/>
                </label>
                <label class="flex items-center justify-between cursor-pointer border border-outline-variant/20 p-4 bg-surface-container-low">
                    <span class="font-label text-xs text-on-surface-variant">Ofertas Flash y Descuentos</span>
                    <input type="checkbox" class="w-4 h-4 accent-[#ff906a]" checked/>
                </label>
                <label class="flex items-center justify-between cursor-pointer border border-outline-variant/20 p-4 bg-surface-container-low">
                    <span class="font-label text-xs text-on-surface-variant">Actualizaciones de Pedidos</span>
                    <input type="checkbox" class="w-4 h-4 accent-[#ff906a]" checked disabled/>
                </label>
            </div>
        </div>

        <!-- Panel de cupones -->
        <div id="authCouponsPanel" class="hidden flex-1 flex flex-col overflow-hidden">
            <div class="flex items-center gap-3 px-7 py-4 border-b border-outline-variant/20 flex-shrink-0">
                <button id="authCouponsBack" class="text-outline hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Mis Cupones</span>
            </div>
            <div class="flex-1 overflow-y-auto px-7 py-5 space-y-3">
                <div class="border border-outline-variant/20 p-4 bg-surface-container-low flex justify-between items-center group hover:border-primary/50 transition-colors cursor-pointer" onclick="navigator.clipboard.writeText('KAIO10'); window.showToast?.('Cupón KAIO10 copiado')">
                    <div>
                        <p class="font-headline font-black text-primary uppercase text-lg tracking-wider">KAIO10</p>
                        <p class="font-label text-[10px] text-on-surface-variant mt-1">10% de descuento en toda la tienda</p>
                    </div>
                    <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors">content_copy</span>
                </div>
                <div class="border border-outline-variant/20 p-4 bg-surface-container-low flex justify-between items-center group hover:border-secondary/50 transition-colors cursor-pointer" onclick="navigator.clipboard.writeText('MANGA20'); window.showToast?.('Cupón MANGA20 copiado')">
                    <div>
                        <p class="font-headline font-black text-secondary uppercase text-lg tracking-wider">MANGA20</p>
                        <p class="font-label text-[10px] text-on-surface-variant mt-1">20% off en sección Manga</p>
                    </div>
                    <span class="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">content_copy</span>
                </div>
            </div>
        </div>

        <!-- Panel de pedidos (oculto inicialmente) -->
        <div id="authOrdersPanel" class="hidden flex-1 flex flex-col overflow-hidden">
            <div class="flex items-center gap-3 px-7 py-4 border-b border-outline-variant/20 flex-shrink-0">
                <button id="authOrdersBack"
                        class="text-outline hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Mis Pedidos</span>
            </div>
            <div id="authOrdersList" class="flex-1 overflow-y-auto px-7 py-5"></div>
        </div>

        <!-- Logout -->
        <div class="px-7 py-5 border-t border-outline-variant/20 flex-shrink-0">
            <button id="authLogoutBtn"
                    class="w-full flex items-center justify-center gap-2 py-3
                           border border-outline-variant/30 hover:border-error/60 hover:text-error
                           transition-all font-label text-sm font-semibold">
                <span class="material-symbols-outlined text-[18px]">logout</span>
                Cerrar sesión
            </button>
        </div>

    </div><!-- /authUserView -->

</div><!-- /authCard -->
</div><!-- /authOverlay -->
        `;
        document.body.appendChild(wrap);
    };

    /* ── Abrir / cerrar modal ─────────────────────────────────── */
    const openModal = () => {
        const overlay = document.getElementById('authOverlay');
        const card    = document.getElementById('authCard');
        if (!overlay || !card) return;
        overlay.classList.remove('hidden');
        /* Doble rAF garantiza que el browser registra el estado inicial antes de animar */
        requestAnimationFrame(() => requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.opacity    = '1';
            card.style.transform  = 'scale(1) translateY(0)';
        }));
        refreshView();
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        const overlay = document.getElementById('authOverlay');
        const card    = document.getElementById('authCard');
        if (!overlay || !card) return;
        overlay.style.opacity = '0';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.95) translateY(14px)';
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    };

    /* ── Tabs ─────────────────────────────────────────────────── */
    const showTab = (tab) => {
        const isLogin = tab === 'login';
        const isRegister = tab === 'register';
        const isForgot = tab === 'forgot';

        document.getElementById('formLogin')?.classList.toggle('hidden', !isLogin);
        document.getElementById('formRegister')?.classList.toggle('hidden', !isRegister);
        document.getElementById('formForgot')?.classList.toggle('hidden', !isForgot);

        const tL = document.getElementById('tabLogin');
        const tR = document.getElementById('tabRegister');
        if (!tL || !tR) return;

        // Mientras esté el forgot abierto, ocultamos los tabs para no confundir.
        const tabsContainer = tL.parentElement;
        if (tabsContainer) tabsContainer.classList.toggle('hidden', isForgot);

        tL.classList.toggle('text-primary',           isLogin);
        tL.classList.toggle('border-primary',         isLogin);
        tL.classList.toggle('text-on-surface-variant', !isLogin);
        tL.classList.toggle('border-transparent',     !isLogin);

        tR.classList.toggle('text-primary',           isRegister);
        tR.classList.toggle('border-primary',         isRegister);
        tR.classList.toggle('text-on-surface-variant', !isRegister);
        tR.classList.toggle('border-transparent',     !isRegister);
    };

    /* ── Refrescar vista del drawer ───────────────────────────── */
    const refreshView = () => {
        const user     = getCurrentUser();
        const guestEl  = document.getElementById('authGuestView');
        const userEl   = document.getElementById('authUserView');
        if (!guestEl || !userEl) return;

        if (user) {
            guestEl.classList.add('hidden');
            userEl.classList.remove('hidden');
            document.getElementById('authUserName').textContent    = user.name;
            document.getElementById('authUserEmail').textContent   = user.email;
            document.getElementById('authUserInitials').textContent = initials(user.name);
            document.getElementById('authUserPoints').textContent  = user.points || 0;
            document.getElementById('authOrderCount').textContent  = (user.orders || []).length;
            document.getElementById('authOrdersPanel')?.classList.add('hidden');
            document.getElementById('authProfilePanel')?.classList.add('hidden');
            document.getElementById('authCouponsPanel')?.classList.add('hidden');
            document.getElementById('authNotificationsPanel')?.classList.add('hidden');
            document.getElementById('authUserNav')?.classList.remove('hidden');
            
            // Populate profile data
            const inputName = document.getElementById('authProfileName');
            const inputEmail = document.getElementById('authProfileEmail');
            if (inputName) inputName.value = user.name;
            if (inputEmail) inputEmail.value = user.email;
        } else {
            guestEl.classList.remove('hidden');
            userEl.classList.add('hidden');
            showTab('login');
        }
    };

    /* ── Actualizar botón en el header ───────────────────────── */
    const updateHeaderBtn = () => {
        const user      = getCurrentUser();
        const iconEl    = document.getElementById('authBtnIcon');
        const avatarEl  = document.getElementById('authBtnAvatar');
        const initEl    = document.getElementById('authBtnInitials');
        if (!iconEl || !avatarEl) return;
        if (user) {
            iconEl.classList.add('hidden');
            avatarEl.classList.remove('hidden');
            if (initEl) initEl.textContent = initials(user.name);
        } else {
            iconEl.classList.remove('hidden');
            avatarEl.classList.add('hidden');
        }
    };

    /* ── Render pedidos ───────────────────────────────────────── */
    const renderOrders = () => {
        const user   = getCurrentUser();
        const list   = document.getElementById('authOrdersList');
        if (!list) return;
        const orders = user?.orders || [];

        if (!orders.length) {
            list.innerHTML = `
                <div class="py-12 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline mb-3 block"
                          style="font-variation-settings:'FILL' 0">inventory_2</span>
                    <p class="font-label text-xs text-on-surface-variant uppercase tracking-widest">Sin pedidos aún</p>
                    <p class="font-label text-[10px] text-outline mt-1">Tus compras aparecerán acá.</p>
                </div>`;
            return;
        }

        list.innerHTML = orders.map(o => `
            <div class="border border-outline-variant/20 p-4 mb-3 bg-surface-container-low">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-headline font-bold text-xs uppercase tracking-tight">#${window.escapeHTML(o.orderId)}</span>
                    <span class="font-label text-[10px] text-on-surface-variant">
                        ${window.escapeHTML(new Date(o.date).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }))}
                    </span>
                </div>
                <p class="font-label text-xs text-on-surface-variant">
                    ${window.escapeHTML(o.items)} artículo${o.items !== 1 ? 's' : ''}
                </p>
                <p class="font-headline font-bold text-secondary text-sm mt-1">
                    $${(o.total || 0).toFixed(2)}
                </p>
            </div>`).join('');
    };

    /* ── Bind de todos los eventos ────────────────────────────── */
    const bindEvents = () => {

        /* Cerrar */
        document.getElementById('authClose')?.addEventListener('click', closeModal);
        /* Clic en el overlay (fondo) cierra; clic dentro de la card no */
        document.getElementById('authOverlay')?.addEventListener('click', (e) => {
            if (!e.target.closest('#authCard')) closeModal();
        });

        /* Tabs */
        document.getElementById('tabLogin')?.addEventListener('click', () => showTab('login'));
        document.getElementById('tabRegister')?.addEventListener('click', () => showTab('register'));
        document.getElementById('switchToRegister')?.addEventListener('click', () => showTab('register'));
        document.getElementById('switchToLogin')?.addEventListener('click', () => showTab('login'));

        /* ── Google Sign-In ── */
        document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('googleSignInBtn');
            if (btn) btn.disabled = true;
            const result = await loginWithGoogle();
            if (!result.ok) {
                if (btn) btn.disabled = false;
                showErr('loginGeneralErr', true, result.message || 'No se pudo iniciar sesión con Google.');
            }
            // Si fue ok, Supabase redirige al provider; no hace falta hacer nada más acá.
        });

        /* ── Forgot password ── */
        document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
            // Pre-rellenamos el email si ya estaba escrito en login.
            const existing = document.getElementById('loginEmail')?.value || '';
            const target = document.getElementById('forgotEmail');
            if (target) target.value = existing;
            clearErrs('forgotEmailErr');
            const msg = document.getElementById('forgotGeneralMsg');
            if (msg) msg.classList.add('hidden');
            showTab('forgot');
        });

        document.getElementById('forgotBackToLogin')?.addEventListener('click', () => showTab('login'));

        document.getElementById('forgotSubmit')?.addEventListener('click', async () => {
            clearErrs('forgotEmailErr');
            const msg = document.getElementById('forgotGeneralMsg');
            const email = document.getElementById('forgotEmail')?.value.trim() || '';

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showErr('forgotEmailErr', true);
                return;
            }

            const btn = document.getElementById('forgotSubmit');
            if (btn) btn.disabled = true;

            const result = await requestPasswordReset(email);
            if (btn) btn.disabled = false;

            if (!msg) return;
            msg.classList.remove('hidden');
            if (result.ok) {
                msg.textContent = 'Revisá tu email. Te enviamos un link para restablecer tu contraseña.';
                msg.className = 'mt-3 font-label text-xs px-3 py-2 leading-relaxed text-secondary bg-secondary-container/20';
            } else {
                msg.textContent = result.message || 'No se pudo enviar el email.';
                msg.className = 'mt-3 font-label text-xs px-3 py-2 leading-relaxed text-error bg-error-container/20';
            }
        });

        /* Clic en botón del header (delega en document por carga asíncrona) */
        document.addEventListener('click', (e) => {
            if (e.target.closest('#authBtn')) openModal();
        });

        /* Toggle contraseña */
        const togglePwd = (btnId, inputId) => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                const inp  = document.getElementById(inputId);
                const icon = document.querySelector(`#${btnId} .material-symbols-outlined`);
                if (!inp) return;
                const isText = inp.type === 'text';
                inp.type     = isText ? 'password' : 'text';
                if (icon) icon.textContent = isText ? 'visibility' : 'visibility_off';
            });
        };
        togglePwd('toggleLoginPwd', 'loginPassword');
        togglePwd('toggleRegPwd',   'regPassword');

        /* ── Throttling: deshabilita el botón mientras corre la auth call.
              Evita doble-click y limita la frecuencia de intentos por sesión. ── */
        const lockButton = (btn, ms = 2000) => {
            if (!btn) return;
            btn.disabled = true;
            btn.dataset.lockedUntil = String(Date.now() + ms);
            const restore = () => {
                const until = Number(btn.dataset.lockedUntil || 0);
                const remaining = until - Date.now();
                if (remaining > 0) {
                    setTimeout(restore, remaining);
                } else {
                    btn.disabled = false;
                    delete btn.dataset.lockedUntil;
                }
            };
            setTimeout(restore, ms);
        };

        /* ── LOGIN ── */
        document.getElementById('loginSubmit')?.addEventListener('click', async (event) => {
            const btn = event.currentTarget;
            if (btn?.disabled) return;

            clearErrs('loginEmailErr', 'loginPasswordErr', 'loginGeneralErr');

            const email    = document.getElementById('loginEmail')?.value.trim()  || '';
            const password = document.getElementById('loginPassword')?.value       || '';
            const remember = document.getElementById('loginRemember')?.checked     || false;

            let valid = true;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  { showErr('loginEmailErr', true);    valid = false; }
            if (!password)                                    { showErr('loginPasswordErr', true); valid = false; }
            if (!valid) return;

            lockButton(btn, 2000);
            const result = await login(email, password, remember);
            if (!result.ok) { showErr('loginGeneralErr', true, result.message); return; }

            window.showToast?.(`¡Bienvenido de vuelta, ${result.user.name.split(' ')[0]}!`);
            updateHeaderBtn();
            refreshView();
            setTimeout(closeModal, 500);
        });

        /* ── REGISTRO ── */
        document.getElementById('regSubmit')?.addEventListener('click', async (event) => {
            const btn = event.currentTarget;
            if (btn?.disabled) return;

            clearErrs('regNameErr', 'regEmailErr', 'regPasswordErr', 'regConfirmErr', 'regGeneralErr');

            const name    = document.getElementById('regName')?.value.trim()            || '';
            const email   = document.getElementById('regEmail')?.value.trim()           || '';
            const pwd     = document.getElementById('regPassword')?.value               || '';
            const confirm = document.getElementById('regPasswordConfirm')?.value        || '';
            const terms   = document.getElementById('regTerms')?.checked               || false;

            let valid = true;
            if (name.trim().split(/\s+/).filter(Boolean).length < 2) { showErr('regNameErr',     true); valid = false; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))           { showErr('regEmailErr',    true); valid = false; }
            if (pwd.length < 6)                                        { showErr('regPasswordErr', true); valid = false; }
            if (pwd !== confirm || !confirm)                           { showErr('regConfirmErr',  true); valid = false; }
            if (!valid) return;

            if (!terms) {
                showErr('regGeneralErr', true, 'Debés aceptar los términos y condiciones.');
                return;
            }

            lockButton(btn, 2000);
            const result = await register(name, email, pwd);
            if (!result.ok) { showErr('regGeneralErr', true, result.message); return; }

            window.showToast?.(`¡Bienvenido, ${result.user.name.split(' ')[0]}!`);
            updateHeaderBtn();
            refreshView();
            setTimeout(closeModal, 600);
        });

        /* ── LOGOUT ── */
        document.getElementById('authLogoutBtn')?.addEventListener('click', () => {
            const name = getCurrentUser()?.name?.split(' ')?.[0] || '';
            logout();
            updateHeaderBtn();
            refreshView();
            window.showToast?.(`¡Hasta pronto, ${name}!`);
            closeModal();
        });

        /* ── Paneles Navigación ── */
        const showPanel = (panelId) => {
            document.getElementById('authUserNav')?.classList.add('hidden');
            document.getElementById(panelId)?.classList.remove('hidden');
        };
        const hidePanels = () => {
            document.getElementById('authOrdersPanel')?.classList.add('hidden');
            document.getElementById('authProfilePanel')?.classList.add('hidden');
            document.getElementById('authCouponsPanel')?.classList.add('hidden');
            document.getElementById('authNotificationsPanel')?.classList.add('hidden');
            document.getElementById('authUserNav')?.classList.remove('hidden');
        };

        /* ── Panel de pedidos ── */
        document.getElementById('authOrdersBtn')?.addEventListener('click', () => {
            showPanel('authOrdersPanel');
            renderOrders();
        });
        document.getElementById('authOrdersBack')?.addEventListener('click', hidePanels);

        /* ── Otros paneles ── */
        document.getElementById('authProfileBtn')?.addEventListener('click', () => {
            showPanel('authProfilePanel');
            // Resetear el estado del botón editar datos
            const btn = document.getElementById('authProfileEditBtn');
            const inputName = document.getElementById('authProfileName');
            const inputEmail = document.getElementById('authProfileEmail');
            if(btn && inputName && inputEmail) {
                inputName.disabled = true;
                inputEmail.disabled = true;
                btn.textContent = 'EDITAR DATOS';
                btn.className = 'w-full mt-2 bg-surface-container-highest text-on-surface py-3 font-headline font-black uppercase tracking-widest text-xs hover:bg-surface-container-high transition-all';
            }
            clearErrs('authProfileNameErr', 'authProfileEmailErr', 'authProfileGeneralErr');
        });
        document.getElementById('authProfileBack')?.addEventListener('click', hidePanels);
        
        document.getElementById('authCouponsBtn')?.addEventListener('click', () => showPanel('authCouponsPanel'));
        document.getElementById('authCouponsBack')?.addEventListener('click', hidePanels);
        
        document.getElementById('authNotificationsBtn')?.addEventListener('click', () => showPanel('authNotificationsPanel'));
        document.getElementById('authNotificationsBack')?.addEventListener('click', hidePanels);

        /* ── Edición de Perfil ── */
        document.getElementById('authProfileEditBtn')?.addEventListener('click', async (e) => {
            const btn = e.target;
            const inputName = document.getElementById('authProfileName');
            const inputEmail = document.getElementById('authProfileEmail');
            if (!inputName || !inputEmail) return;

            clearErrs('authProfileNameErr', 'authProfileEmailErr', 'authProfileGeneralErr');

            if (btn.textContent.trim() === 'EDITAR DATOS') {
                inputName.disabled = false;
                inputEmail.disabled = false;
                inputName.focus();
                btn.textContent = 'GUARDAR CAMBIOS';
                btn.classList.replace('bg-surface-container-highest', 'bg-gradient-to-br');
                btn.classList.replace('text-on-surface', 'text-on-primary-fixed');
                btn.classList.add('from-secondary', 'to-secondary-container', 'shadow-[0_0_15px_rgba(0,210,253,0.35)]');
            } else {
                const newName = inputName.value.trim();
                const newEmail = inputEmail.value.trim();
                let valid = true;

                if (newName.split(/\s+/).filter(Boolean).length < 2) { showErr('authProfileNameErr', true); valid = false; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { showErr('authProfileEmailErr', true); valid = false; }

                if (!valid) return;

                const result = await updateProfile(newName, newEmail);
                if (!result.ok) {
                    showErr('authProfileGeneralErr', true, result.message);
                    return;
                }

                inputName.disabled = true;
                inputEmail.disabled = true;
                btn.textContent = 'EDITAR DATOS';
                btn.className = 'w-full mt-2 bg-surface-container-highest text-on-surface py-3 font-headline font-black uppercase tracking-widest text-xs hover:bg-surface-container-high transition-all';

                window.showToast?.('Perfil actualizado correctamente');
                refreshView();
                updateHeaderBtn();
            }
        });
    };

    /* ── Integración con checkout ─────────────────────────────── */
    document.addEventListener('kaio:order-placed', async (e) => {
        if (isLoggedIn()) {
            // Recargar datos desde Supabase tras 1 segundo para asegurar la escritura
            setTimeout(() => reloadUserData(), 1000);
        }
    });

    /* ── Init ─────────────────────────────────────────────────── */
    const init = () => {
        buildModal();
        bindEvents();
        updateHeaderBtn();
    };

    /* Escucha header cargado (carga asíncrona del componente) */
    document.addEventListener('kaio:header-loaded', updateHeaderBtn);

    /* Si el DOM ya está listo */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ── API pública ─────────────────────────────────────────── */
    window.KAIOAuth = { register, login, logout, loginWithGoogle, requestPasswordReset, getCurrentUser, isLoggedIn, updateProfile, openModal, closeModal };

})();
