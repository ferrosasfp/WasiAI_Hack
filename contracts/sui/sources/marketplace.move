module MarketplaceAI::marketplace {
    use std::string;
    use sui::coin;
    use sui::dynamic_field;
    use sui::event;

    // ============================================================
    //                 MarketplaceAI — Marketplace
    // ------------------------------------------------------------
    // Diseño:
    // - Un solo objeto compartido `Marketplace` (shared).
    // - Cada modelo es un registro guardado como Dynamic Field
    //   (key = ModelKey{id}, value = Model).
    // - Licencias se mintean como objetos con `key`.
    // - Índice por familia (owner + slug) para auto-versionado:
    //     - Primera publicación crea FamilyMeta (v=1).
    //     - Un upgrade publica un nuevo Model y "deslista" el previo.
    // - "Legacy list" permite venta directa; el flujo nuevo se centra
    //   en licencias (perpetua / suscripción).
    // - Validaciones estrictas: pausa, bps, derechos/hints, límites,
    //   precios máximos, owner-only mutations, etc.
    //
    // Buenas prácticas:
    // - Helpers de validación centralizados (DRY).
    // - Eventos detallados y coherentes (útiles a indexers/UX).
    // - Split de pagos aislado para minimizar errores.
    // - Lecturas que no mutan no toman &mut.
    // - Cálculos puros para UI (estimate_splits).
    // ============================================================

    // ======================== CONSTANTS =========================

    /// 10_000 bps = 100.00%
    const MAX_BPS: u64 = 10_000;
    /// Tope de fee del marketplace: 20% = 2_000 bps
    const MAX_FEE_BPS_CAP: u64 = 2_000;
    /// Días → segundos
    const SECONDS_PER_DAY: u64 = 86_400;

    /// Derechos de uso (bitmask válidos: 1, 2 o 3=1+2)
    const RIGHTS_API: u8 = 1;       // uso en API/portal
    const RIGHTS_DOWNLOAD: u8 = 2;  // descarga controlada

    /// Tipos de licencia
    const KIND_PERPETUAL: u8    = 0; // pago único, sin vencimiento
    const KIND_SUBSCRIPTION: u8 = 1; // pago por meses, con vencimiento

    /// “Delivery hint” (UX) válidos: 1, 2 o 3=1+2
    const DELIVERY_API: u8      = 1;
    const DELIVERY_DOWNLOAD: u8 = 2;

    // ========================== ERRORS ==========================

    const E_PRICE_ZERO: u64 = 100;
    const E_ROYALTY_BPS_INVALID: u64 = 101;
    const E_NEW_PRICE_ZERO: u64 = 102;
    const E_NOT_OWNER: u64 = 103;
    const E_NOT_LISTED: u64 = 110;
    const E_INSUFFICIENT_FUNDS: u64 = 111;
    const E_FEE_PLUS_ROYALTY_OVER_100_PCT: u64 = 112;
    const E_MARKET_PAUSED: u64 = 114;
    const E_FEE_BPS_ABOVE_CAP: u64 = 115;
    const E_ZERO_ADDR: u64 = 116;
    const E_MODEL_NOT_FOUND: u64 = 118;
    const E_PRICE_TOO_HIGH: u64 = 300;

    // Licencias
    const E_INVALID_LICENSE_KIND: u64 = 201;
    const E_INVALID_DURATION: u64 = 202;
    const E_LICENSE_NOT_SUBSCRIPTION: u64 = 203;
    const E_LICENSE_REVOKED: u64 = 204;
    const E_DIRECT_SALE_DISABLED: u64 = 205;
    const E_MODEL_NOT_LISTABLE: u64 = 206;
    const E_PRICE_NOT_CONFIGURED: u64 = 207;
    const E_INVALID_RIGHTS: u64 = 208;
    const E_INVALID_DELIVERY_MODE: u64 = 209;
    const E_LICENSE_NOT_TRANSFERABLE: u64 = 210;

    // Límite de modelos activos
    const E_MODELS_LIMIT_REACHED: u64 = 400;

    // =========================== ROLES ==========================

    /// Capacidad de administrador del marketplace
    public struct AdminCap has key, store { id: sui::object::UID }

    // ========================== ENTIDADES =======================

    /// Estado raíz del marketplace (shared object)
    public struct Marketplace has key {
        id: sui::object::UID,
        next_id: u64,
        next_license_id: u64,
        fee_bps: u64,
        fee_recipient: address,
        paused: bool,
        active_models: u64,
        models_limit: u64,
    }

    /// Clave DF de modelos
    public struct ModelKey has copy, drop, store { id: u64 }

    /// Registro de modelo (metadatos + política comercial)
    public struct Model has store, drop {
        owner: address,
        creator: address,
        name: string::String,
        uri: string::String,
        // Venta directa (opcional – legado)
        price: u64,
        allow_direct_sale: bool,
        // Royalties & listing
        royalty_bps: u64,
        listed: bool,
        // Licencias
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64,
        delivery_rights_default: u8,
        delivery_mode_hint: u8,
        version: u16,
        terms_hash: vector<u8>,
    }

    /// Licencia (NFT)
    public struct License has key, store {
        id: sui::object::UID,
        license_id: u64,
        model_id: u64,
        owner: address,
        license_kind: u8,
        rights: u8,
        expires_at: u64,
        transferable: bool,
        terms_hash: vector<u8>,
        version: u16,
    }

    /// Flags DF de licencias revocadas
    public struct LicenseFlagKey has copy, drop, store { id: u64 }
    public struct LicenseStatus has store, drop { revoked: bool }

    /// Resumen compacto para listados/paginación
    public struct ModelSummary has store, drop {
        id: u64,
        owner: address,
        listed: bool,
        price_direct: u64,
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64,
        version: u16,
    }

    // Índice por familia (owner + slug)
    public struct FamilyKey has store, copy, drop { owner: address, slug: string::String }
    public struct FamilyMeta has store, copy, drop { latest_id: u64, latest_version: u16 }

    // =========================== EVENTOS ========================

    public struct MarketCreated      has copy, drop, store { fee_bps: u64, fee_recipient: address, models_limit: u64 }
    public struct MarketPaused       has copy, drop, store { paused: bool }
    public struct MarketFeesSet      has copy, drop, store { fee_bps: u64, fee_recipient: address }
    public struct ModelsLimitSet     has copy, drop, store { new_limit: u64 }
    public struct ModelsCountChanged has copy, drop, store { active_models: u64 }

    public struct ModelListed   has copy, drop, store { id: u64, owner: address, price: u64 }
    public struct ModelUpdated  has copy, drop, store { id: u64, owner: address, price: u64, listed: bool }
    public struct ModelUnlisted has copy, drop, store { id: u64, owner: address }
    public struct ModelDeleted  has copy, drop, store { id: u64, owner: address }

    public struct ModelSold has copy, drop, store {
        id: u64, price: u64, buyer: address, seller: address, fee_paid: u64, royalty_paid: u64
    }

    public struct LicenseMinted has copy, drop, store {
        license_id: u64, model_id: u64, buyer: address,
        license_kind: u8, rights: u8, expires_at: u64, version: u16, price_paid: u64,
        fee_paid: u64, royalty_paid: u64
    }
    public struct LicenseRenewed has copy, drop, store {
        license_id: u64, model_id: u64, new_expires_at: u64, months: u16, price_paid: u64,
        fee_paid: u64, royalty_paid: u64
    }
    #[allow(unused_field)]
    public struct LicenseRevoked has copy, drop, store { license_id: u64, model_id: u64, by: address }
    public struct LicenseTransferred has copy, drop, store { license_id: u64, from: address, to: address }
    public struct ModelVersionUpdated has copy, drop, store { id: u64, old_version: u16, new_version: u16 }

    /// Para facilitar indexación desde eventos
    public struct MarketObjects has copy, drop, store { market_id: sui::object::ID, admin_cap_id: sui::object::ID }
    public struct ExistsEvent   has copy, drop, store { id: u64, exists: bool }

    /// Info extendida de modelo (cómodo para frontends/event-sourcing)
    public struct ModelInfoExEmitted has copy, drop, store {
        id: u64,
        owner: address, creator: address, royalty_bps: u64, listed: bool,
        price_direct: u64, price_perpetual: u64, price_subscription: u64,
        default_duration_days: u64, delivery_rights_default: u8, delivery_mode_hint: u8,
        version: u16, terms_hash: vector<u8>,
    }

    /// Errores legibles por humanos
    public struct ErrorEmitted has copy, drop, store { code: u64, message: string::String }

    // Familia/versionado
    public struct FamilyInitialized has copy, drop, store { owner: address, slug: string::String, first_id: u64, version: u16 }
    public struct ModelUpgraded     has copy, drop, store { owner: address, slug: string::String, old_id: u64, new_id: u64, new_version: u16 }

    // ======================= HELPERS (validación) ===============

    fun ensure_not_paused(market: &Marketplace) { assert!(!market.paused, E_MARKET_PAUSED); }
    fun ensure_valid_bps(bps: u64) { assert!(bps <= MAX_BPS, E_ROYALTY_BPS_INVALID); }
    fun ensure_fee_under_cap(fee_bps: u64) { assert!(fee_bps <= MAX_FEE_BPS_CAP, E_FEE_BPS_ABOVE_CAP); }
    fun ensure_addr_nonzero(addr: address) { assert!(addr != @0x0, E_ZERO_ADDR); }
    fun ensure_fee_plus_royalty_ok(fee_bps: u64, royalty_bps: u64) { assert!(fee_bps + royalty_bps <= MAX_BPS, E_FEE_PLUS_ROYALTY_OVER_100_PCT); }

    fun ensure_valid_rights(rights: u8) {
        assert!(
            rights == RIGHTS_API
            || rights == RIGHTS_DOWNLOAD
            || rights == (RIGHTS_API + RIGHTS_DOWNLOAD),
            E_INVALID_RIGHTS
        );
    }
    fun ensure_valid_delivery_hint(h: u8) {
        assert!(
            h == DELIVERY_API
            || h == DELIVERY_DOWNLOAD
            || h == (DELIVERY_API + DELIVERY_DOWNLOAD),
            E_INVALID_DELIVERY_MODE
        );
    }

    /// Listing legacy (con venta directa) — validación combinada
    fun validate_listing_params(
        price: u64,
        allow_direct_sale: bool,
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64
    ) {
        // Debe haber al menos un precio de licencia o venta directa
        assert!(price_perpetual > 0 || price_subscription > 0, E_MODEL_NOT_LISTABLE);
        // Si hay venta directa, el precio directo debe ser > 0
        assert!(!allow_direct_sale || price > 0, E_PRICE_ZERO);
        // Si hay suscripción, duración base > 0
        assert!(price_subscription == 0 || default_duration_days > 0, E_INVALID_DURATION);
        // Guard rails de precios (en MIST)
        assert!(price_perpetual    <= 1_000_000_000_000_000, E_PRICE_TOO_HIGH);
        assert!(price_subscription <=   100_000_000_000_000, E_PRICE_TOO_HIGH);
    }

    /// Validación para flujo “solo licencias” (MVP sin venta directa)
    fun validate_licensing(price_perpetual: u64, price_subscription: u64, default_duration_days: u64) {
        // Requiere al menos un precio de licencia
        assert!(price_perpetual > 0 || price_subscription > 0, E_MODEL_NOT_LISTABLE);
        // Si no hay sub, la duración debe ser 0; si hay sub, duración >=1
        if (price_subscription == 0) {
            assert!(default_duration_days == 0, E_INVALID_DURATION);
        } else {
            assert!(default_duration_days >= 1, E_INVALID_DURATION);
        };
        assert!(price_perpetual    <= 1_000_000_000_000_000, E_PRICE_TOO_HIGH);
        assert!(price_subscription <=   100_000_000_000_000, E_PRICE_TOO_HIGH);
    }

    // ======================= HELPERS (pago, DF, etc.) ===========

    fun split_and_transfer_or_destroy(
        payment: &mut coin::Coin<sui::sui::SUI>,
        amount: u64,
        to: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        if (amount > 0) {
            let c = coin::split(payment, amount, ctx);
            sui::transfer::public_transfer(c, to);
        } else {
            let z = coin::zero<sui::sui::SUI>(ctx);
            coin::destroy_zero(z);
        }
    }

    fun distribute_payment(
        payment: &mut coin::Coin<sui::sui::SUI>,
        total: u64,
        fee_bps: u64,
        fee_recipient: address,
        royalty_bps: u64,
        creator: address,
        seller: address,
        ctx: &mut sui::tx_context::TxContext
    ): (u64, u64, u64) {
        let fee_paid      = (total * fee_bps)     / MAX_BPS;
        let royalty_paid  = (total * royalty_bps) / MAX_BPS;
        let seller_amount = total - fee_paid - royalty_paid;

        split_and_transfer_or_destroy(payment, fee_paid,     fee_recipient, ctx);
        split_and_transfer_or_destroy(payment, royalty_paid, creator,       ctx);
        split_and_transfer_or_destroy(payment, seller_amount, seller,       ctx);

        (fee_paid, royalty_paid, seller_amount)
    }

    /// Estimación pura para UI (no toca estado)
    public fun estimate_splits(total: u64, fee_bps: u64, royalty_bps: u64): (u64, u64, u64) {
        assert!(fee_bps + royalty_bps <= MAX_BPS, E_FEE_PLUS_ROYALTY_OVER_100_PCT);
        let fee      = (total * fee_bps)     / MAX_BPS;
        let royalty  = (total * royalty_bps) / MAX_BPS;
        let seller   = total - fee - royalty;
        (fee, royalty, seller)
    }

    // Borrow helpers de Model
    fun borrow_model_mut(market: &mut Marketplace, model_id: u64): &mut Model {
        let key = ModelKey { id: model_id };
        dynamic_field::borrow_mut<ModelKey, Model>(&mut market.id, key)
    }
    fun borrow_model(market: &Marketplace, model_id: u64): &Model {
        let key = ModelKey { id: model_id };
        dynamic_field::borrow<ModelKey, Model>(&market.id, key)
    }
    fun model_df_exists(market: &Marketplace, model_id: u64): bool {
        let key = ModelKey { id: model_id };
        dynamic_field::exists_<ModelKey>(&market.id, key)
    }

    /// Flag revocado?
    fun is_license_revoked(market: &Marketplace, license_id: u64): bool {
        let key = LicenseFlagKey { id: license_id };
        if (dynamic_field::exists_<LicenseFlagKey>(&market.id, key)) {
            let st = dynamic_field::borrow<LicenseFlagKey, LicenseStatus>(&market.id, key);
            st.revoked
        } else { false }
    }

    /// now + days*86400
    fun add_days(now: u64, days: u64): u64 { now + (days * SECONDS_PER_DAY) }

    // Helpers familia/slug (clonado seguro)
    fun str_clone(s: &string::String): string::String {
        let b_ref: &vector<u8> = string::as_bytes(s);
        let mut out: vector<u8> = std::vector::empty<u8>();
        let len: u64 = std::vector::length(b_ref);
        let mut i: u64 = 0;
        while (i < len) { std::vector::push_back(&mut out, *std::vector::borrow(b_ref, i)); i = i + 1; };
        string::utf8(out)
    }
    fun family_key(owner: address, slug: &string::String): FamilyKey { FamilyKey { owner, slug: str_clone(slug) } }

    // ============================ SETUP =========================

    /// Crea el marketplace compartido y entrega el AdminCap al creador
    #[allow(lint(self_transfer))]
    public fun create(
        fee_bps: u64,
        fee_recipient: address,
        models_limit: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_valid_bps(fee_bps);
        ensure_fee_under_cap(fee_bps);
        ensure_addr_nonzero(fee_recipient);

        let market = Marketplace {
            id: sui::object::new(ctx),
            next_id: 0,
            next_license_id: 0,
            fee_bps,
            fee_recipient,
            paused: false,
            active_models: 0,
            models_limit
        };
        let cap = AdminCap { id: sui::object::new(ctx) };

        event::emit(MarketCreated { fee_bps, fee_recipient, models_limit });

        let market_id_id = sui::object::uid_to_inner(&market.id);
        let cap_id_id    = sui::object::uid_to_inner(&cap.id);
        event::emit(MarketObjects { market_id: market_id_id, admin_cap_id: cap_id_id });

        sui::transfer::share_object(market);
        sui::transfer::public_transfer(cap, sui::tx_context::sender(ctx));
    }

    // ============================ ADMIN =========================

    public fun set_fees(market: &mut Marketplace, _cap: &AdminCap, new_fee_bps: u64, new_fee_recipient: address) {
        ensure_not_paused(market);
        ensure_valid_bps(new_fee_bps);
        ensure_fee_under_cap(new_fee_bps);
        ensure_addr_nonzero(new_fee_recipient);

        market.fee_bps = new_fee_bps;
        market.fee_recipient = new_fee_recipient;
        event::emit(MarketFeesSet { fee_bps: new_fee_bps, fee_recipient: new_fee_recipient });
    }

    public fun set_paused(market: &mut Marketplace, _cap: &AdminCap, paused: bool) {
        market.paused = paused;
        event::emit(MarketPaused { paused });
    }

    public fun set_models_limit(market: &mut Marketplace, _cap: &AdminCap, new_limit: u64) {
        market.models_limit = new_limit;
        event::emit(ModelsLimitSet { new_limit });
    }

    // =========================== LISTINGS =======================

    /// (LEGACY) Publica con venta directa opcional y precios de licencia.
    public fun list(
        market: &mut Marketplace,
        name: string::String,
        uri: string::String,
        price: u64,
        allow_direct_sale: bool,
        royalty_bps: u64,
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64,
        delivery_rights_default: u8,
        delivery_mode_hint: u8,
        version: u16,
        terms_hash: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        ensure_valid_bps(royalty_bps);
        ensure_fee_plus_royalty_ok(market.fee_bps, royalty_bps);
        ensure_valid_rights(delivery_rights_default);
        ensure_valid_delivery_hint(delivery_mode_hint);
        validate_listing_params(price, allow_direct_sale, price_perpetual, price_subscription, default_duration_days);

        if (market.models_limit > 0) {
            assert!(market.active_models < market.models_limit, E_MODELS_LIMIT_REACHED);
        };

        let id = market.next_id;
        market.next_id = id + 1;

        let sender = sui::tx_context::sender(ctx);
        let model = Model {
            owner: sender, creator: sender,
            name, uri,
            price, allow_direct_sale,
            royalty_bps, listed: true,
            price_perpetual, price_subscription, default_duration_days,
            delivery_rights_default, delivery_mode_hint,
            version, terms_hash,
        };

        dynamic_field::add<ModelKey, Model>(&mut market.id, ModelKey { id }, model);

        market.active_models = market.active_models + 1;
        event::emit(ModelsCountChanged { active_models: market.active_models });
        event::emit(ModelListed { id, owner: sender, price });
    }

    /// NUEVO: publicar o actualizar (auto-versionado por familia owner+slug).
    /// No habilita venta directa (MVP centrado en licencias).
    public fun list_or_upgrade(
        market: &mut Marketplace,
        slug: string::String,
        name: string::String,
        uri: string::String,
        royalty_bps: u64,
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64,
        delivery_rights_default: u8,
        delivery_mode_hint: u8,
        terms_hash: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        ensure_valid_bps(royalty_bps);
        ensure_fee_plus_royalty_ok(market.fee_bps, royalty_bps);
        ensure_valid_rights(delivery_rights_default);
        ensure_valid_delivery_hint(delivery_mode_hint);
        validate_licensing(price_perpetual, price_subscription, default_duration_days);

        if (market.models_limit > 0) {
            assert!(market.active_models < market.models_limit, E_MODELS_LIMIT_REACHED);
        };

        let owner = sui::tx_context::sender(ctx);

        // Versión siguiente y deslistar anterior si corresponde
        let (new_version, old_id) = if (dynamic_field::exists_<FamilyKey>(&market.id, family_key(owner, &slug))) {
            let meta_mut = dynamic_field::borrow_mut<FamilyKey, FamilyMeta>(&mut market.id, family_key(owner, &slug));
            let ver = meta_mut.latest_version + 1;
            let prev_id = meta_mut.latest_id;

            let old = dynamic_field::borrow_mut<ModelKey, Model>(&mut market.id, ModelKey { id: prev_id });
            if (old.listed) {
                old.listed = false;
                assert!(market.active_models > 0, E_MODELS_LIMIT_REACHED);
                market.active_models = market.active_models - 1;
                event::emit(ModelsCountChanged { active_models: market.active_models });
                event::emit(ModelUnlisted { id: prev_id, owner: old.owner });
            };
            (ver, prev_id)
        } else {
            dynamic_field::add<FamilyKey, FamilyMeta>(&mut market.id, family_key(owner, &slug), FamilyMeta { latest_id: 0, latest_version: 0 });
            (1, 0)
        };

        // Crear nuevo modelo (venta directa OFF)
        let id = market.next_id;
        market.next_id = id + 1;

        let model = Model {
            owner, creator: owner,
            name, uri,
            price: 0,
            allow_direct_sale: false,
            royalty_bps, listed: true,
            price_perpetual, price_subscription, default_duration_days,
            delivery_rights_default, delivery_mode_hint,
            version: new_version,
            terms_hash,
        };

        dynamic_field::add<ModelKey, Model>(&mut market.id, ModelKey { id }, model);

        // Actualiza familia (latest = nuevo)
        {
            let meta_mut2 = dynamic_field::borrow_mut<FamilyKey, FamilyMeta>(&mut market.id, family_key(owner, &slug));
            meta_mut2.latest_id = id;
            meta_mut2.latest_version = new_version;
        };

        // Contadores + eventos
        market.active_models = market.active_models + 1;
        event::emit(ModelsCountChanged { active_models: market.active_models });

        if (new_version == 1) {
            event::emit(FamilyInitialized { owner, slug, first_id: id, version: new_version });
        } else {
            event::emit(ModelUpgraded { owner, slug, old_id, new_id: id, new_version: new_version });
        };

        event::emit(ModelListed { id, owner, price: 0 });
    }

    // ======== Mutaciones parciales (entry para ser invocables) ========

    public fun set_price_direct(market: &mut Marketplace, model_id: u64, new_price: u64, ctx: &mut sui::tx_context::TxContext) {
        ensure_not_paused(market);
        assert!(new_price > 0, E_NEW_PRICE_ZERO);
        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);
        m.price = new_price;
        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: new_price, listed: m.listed });
    }

    /// Ajuste atómico de parámetros de licencias
    public fun set_licensing_params(
        market: &mut Marketplace,
        model_id: u64,
        price_perpetual: u64,
        price_subscription: u64,
        default_duration_days: u64,
        delivery_rights_default: u8,
        delivery_mode_hint: u8,
        version: u16,
        terms_hash: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        ensure_valid_rights(delivery_rights_default);
        ensure_valid_delivery_hint(delivery_mode_hint);
        validate_listing_params(0, false, price_perpetual, price_subscription, default_duration_days);

        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);

        m.price_perpetual = price_perpetual;
        m.price_subscription = price_subscription;
        m.default_duration_days = default_duration_days;
        m.delivery_rights_default = delivery_rights_default;
        m.delivery_mode_hint = delivery_mode_hint;
        m.version = version;
        m.terms_hash = terms_hash;

        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: m.price, listed: m.listed });
    }

    /// Listar / Deslistar (no borra el registro)
    public fun set_listed(market: &mut Marketplace, model_id: u64, listed: bool, ctx: &mut sui::tx_context::TxContext) {
        ensure_not_paused(market);
        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);
        let was = m.listed;
        m.listed = listed;
        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: m.price, listed });
        if (!listed) {
            event::emit(ModelUnlisted { id: model_id, owner: m.owner });
            if (was && market.active_models > 0) {
                market.active_models = market.active_models - 1;
                event::emit(ModelsCountChanged { active_models: market.active_models });
            }
        } else if (!was) {
            market.active_models = market.active_models + 1;
            event::emit(ModelsCountChanged { active_models: market.active_models });
        }
    }

    /// Borrar registro del modelo (no afecta licencias emitidas)
    public fun delete(market: &mut Marketplace, model_id: u64, ctx: &mut sui::tx_context::TxContext) {
        let sender = sui::tx_context::sender(ctx);
        { let m_ref = borrow_model_mut(market, model_id); assert!(m_ref.owner == sender, E_NOT_OWNER); };
        let key = ModelKey { id: model_id };
        let model = dynamic_field::remove<ModelKey, Model>(&mut market.id, key);
        let owner = model.owner;

        if (market.active_models > 0) {
            market.active_models = market.active_models - 1;
            event::emit(ModelsCountChanged { active_models: market.active_models });
        };
        event::emit(ModelDeleted { id: model_id, owner });

        // Descarta campos (para el verificador)
        let Model { owner: _, creator: _, name: _, uri: _, price: _, allow_direct_sale: _,
            royalty_bps: _, listed: _, price_perpetual: _, price_subscription: _,
            default_duration_days: _, delivery_rights_default: _, delivery_mode_hint: _,
            version: _, terms_hash: _ } = model;
    }

    /// Actualiza solo URI (owner-only)
    public fun set_model_uri(
        market: &mut Marketplace, model_id: u64, new_uri: string::String, ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);
        m.uri = new_uri;
        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: m.price, listed: m.listed });
    }

    /// Actualiza términos y versión (owner-only)
    public fun set_model_terms(
        market: &mut Marketplace, model_id: u64, version: u16, terms_hash: vector<u8>, ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);
        m.version = version;
        m.terms_hash = terms_hash;
        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: m.price, listed: m.listed });
    }

    /// Actualiza “delivery” por defecto (owner-only)
    public fun set_model_delivery(
        market: &mut Marketplace, model_id: u64, delivery_rights_default: u8, delivery_mode_hint: u8, ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        ensure_valid_rights(delivery_rights_default);
        ensure_valid_delivery_hint(delivery_mode_hint);
        let m = borrow_model_mut(market, model_id);
        assert!(m.owner == sui::tx_context::sender(ctx), E_NOT_OWNER);
        m.delivery_rights_default = delivery_rights_default;
        m.delivery_mode_hint = delivery_mode_hint;
        event::emit(ModelUpdated { id: model_id, owner: m.owner, price: m.price, listed: m.listed });
    }

    /// Solo actualiza `version`. Emite evento si hay licencias activas (stub).
    public fun update_model_version(
        market: &mut Marketplace, model_id: u64, new_version: u16, ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        let sender = sui::tx_context::sender(ctx);

        let should_emit = has_active_licenses(market, model_id);

        let old_v: u16 = {
            let m_read = borrow_model(market, model_id);
            assert!(m_read.owner == sender, E_NOT_OWNER);
            m_read.version
        };
        { let m_mut = borrow_model_mut(market, model_id); m_mut.version = new_version; };

        if (should_emit) { event::emit(ModelVersionUpdated { id: model_id, old_version: old_v, new_version }); }
    }

    /// MVP: no hay índice on-chain de licencias → retorno false
    fun has_active_licenses(_market: &Marketplace, _model_id: u64): bool { false }

    // ===================== DIRECT SALE: BUY =====================

    public fun buy(market: &mut Marketplace, model_id: u64, payment: coin::Coin<sui::sui::SUI>, ctx: &mut sui::tx_context::TxContext) {
        ensure_not_paused(market);
        let fee_bps_local = market.fee_bps;
        let fee_recipient_local = market.fee_recipient;
        let mut pay = payment;
        let buyer = sui::tx_context::sender(ctx);

        {
            let m = borrow_model_mut(market, model_id);
            assert!(m.listed, E_NOT_LISTED);
            assert!(m.allow_direct_sale, E_DIRECT_SALE_DISABLED);
            ensure_fee_plus_royalty_ok(fee_bps_local, m.royalty_bps);

            let price = m.price;
            let seller = m.owner;
            assert!(buyer != seller, E_NOT_OWNER);
            assert!(coin::value(&pay) == price, E_INSUFFICIENT_FUNDS);

            let (fee_paid, royalty_paid, _seller_amount) =
                distribute_payment(&mut pay, price, fee_bps_local, fee_recipient_local, m.royalty_bps, m.creator, seller, ctx);
            coin::destroy_zero(pay);

            m.owner  = buyer;
            m.listed = false;

            event::emit(ModelSold { id: model_id, price, buyer, seller, fee_paid, royalty_paid });
        };
    }

    // ================== LICENSES: BUY / RENEW ===================

    fun license_price(m: &Model, kind: u8, months: u16): u64 {
        if (kind == KIND_PERPETUAL) {
            assert!(m.price_perpetual > 0, E_PRICE_NOT_CONFIGURED);
            m.price_perpetual
        } else if (kind == KIND_SUBSCRIPTION) {
            assert!(m.price_subscription > 0, E_PRICE_NOT_CONFIGURED);
            assert!(months > 0, E_INVALID_DURATION);
            (m.price_subscription as u64) * (months as u64)
        } else { abort E_INVALID_LICENSE_KIND }
    }

    #[allow(lint(self_transfer))]
    public fun buy_license(
        market: &mut Marketplace,
        model_id: u64,
        license_kind: u8,
        months: u16,
        transferable: bool,
        clk: &sui::clock::Clock,
        payment: coin::Coin<sui::sui::SUI>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        let fee_bps_local = market.fee_bps;
        let fee_recipient_local = market.fee_recipient;
        let mut pay = payment;
        let buyer = sui::tx_context::sender(ctx);

        let (price_due, royalty_bps, rights, version, terms_hash, default_duration_days, creator_addr, owner_addr) = {
            let mm = borrow_model(market, model_id);
            assert!(mm.listed, E_NOT_LISTED);
            ensure_fee_plus_royalty_ok(fee_bps_local, mm.royalty_bps);
            ensure_valid_rights(mm.delivery_rights_default);
            ensure_valid_delivery_hint(mm.delivery_mode_hint);
            let p = license_price(mm, license_kind, months);
            (p, mm.royalty_bps, mm.delivery_rights_default, mm.version, mm.terms_hash, mm.default_duration_days, mm.creator, mm.owner)
        };

        assert!(coin::value(&pay) == price_due, E_INSUFFICIENT_FUNDS);

        let (_fee_paid, _royalty_paid, _seller_amount) =
            distribute_payment(&mut pay, price_due, fee_bps_local, fee_recipient_local, royalty_bps, creator_addr, owner_addr, ctx);
        coin::destroy_zero(pay);

        let now = sui::clock::timestamp_ms(clk) / 1000;
        let mut expires_at: u64 = 0;
        if (license_kind == KIND_SUBSCRIPTION) {
            let total_days = default_duration_days * (months as u64);
            expires_at = add_days(now, total_days);
        };

        let lid = market.next_license_id;
        market.next_license_id = lid + 1;

        let lic = License {
            id: sui::object::new(ctx),
            license_id: lid,
            model_id,
            owner: buyer,
            license_kind,
            rights,
            expires_at,
            transferable,
            terms_hash,
            version
        };
        sui::transfer::public_transfer(lic, buyer);

        event::emit(LicenseMinted {
            license_id: lid, model_id, buyer,
            license_kind, rights, expires_at, version, price_paid: price_due,
            fee_paid: (price_due * fee_bps_local) / MAX_BPS,
            royalty_paid: (price_due * royalty_bps)   / MAX_BPS
        });
    }

    public fun renew_license(
        market: &mut Marketplace,
        license: &mut License,
        months: u16,
        clk: &sui::clock::Clock,
        payment: coin::Coin<sui::sui::SUI>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        assert!(license.license_kind == KIND_SUBSCRIPTION, E_LICENSE_NOT_SUBSCRIPTION);
        assert!(months > 0, E_INVALID_DURATION);
        assert!(!is_license_revoked(market, license.license_id), E_LICENSE_REVOKED);

        let fee_bps_local = market.fee_bps;
        let fee_recipient_local = market.fee_recipient;

        let (price_due, royalty_bps, model_owner, model_creator, model_id_local, default_days) = {
            let m = borrow_model(market, license.model_id);
            let p = license_price(m, KIND_SUBSCRIPTION, months);
            (p, m.royalty_bps, m.owner, m.creator, license.model_id, m.default_duration_days)
        };

        let mut pay = payment;
        assert!(coin::value(&pay) == price_due, E_INSUFFICIENT_FUNDS);

        let (_fee_paid, _royalty_paid, _seller_amount) =
            distribute_payment(&mut pay, price_due, fee_bps_local, fee_recipient_local, royalty_bps, model_creator, model_owner, ctx);
        coin::destroy_zero(pay);

        let now = sui::clock::timestamp_ms(clk) / 1000;
        let base = if (license.expires_at > now) { license.expires_at } else { now };
        let new_exp = add_days(base, default_days * (months as u64));
        license.expires_at = new_exp;

        event::emit(LicenseRenewed {
            license_id: license.license_id, model_id: model_id_local, new_expires_at: new_exp,
            months, price_paid: price_due,
            fee_paid: (price_due * fee_bps_local) / MAX_BPS,
            royalty_paid: (price_due * royalty_bps) / MAX_BPS
        });
    }

    public fun transfer_license(
        market: &mut Marketplace, license: &mut License, to: address, ctx: &mut sui::tx_context::TxContext
    ) {
        ensure_not_paused(market);
        assert!(!is_license_revoked(market, license.license_id), E_LICENSE_REVOKED);
        assert!(license.transferable, E_LICENSE_NOT_TRANSFERABLE);

        let sender = sui::tx_context::sender(ctx);
        assert!(license.owner == sender, E_NOT_OWNER);

        let from = sender;
        license.owner = to;
        event::emit(LicenseTransferred { license_id: license.license_id, from, to });
    }

    public fun revoke_license_admin(
        market: &mut Marketplace, _cap: &AdminCap, license_id: u64, model_id: u64, _ctx: &mut sui::tx_context::TxContext
    ) {
        // Idempotente: elimina si existía y vuelve a crear con revoked=true
        let key = LicenseFlagKey { id: license_id };
        if (dynamic_field::exists_<LicenseFlagKey>(&market.id, key)) {
            let _old: LicenseStatus = dynamic_field::remove<LicenseFlagKey, LicenseStatus>(&mut market.id, key);
        };
        dynamic_field::add<LicenseFlagKey, LicenseStatus>(&mut market.id, LicenseFlagKey { id: license_id }, LicenseStatus { revoked: true });

        // Nota: no determinamos aquí el "by"; se envía 0x0 (frontend puede correlacionar por tx sender si lo requiere)
        event::emit(LicenseRevoked { license_id, model_id, by: @0x0 });
    }

    public fun revoke_license_by_model_owner(
        market: &mut Marketplace, model_id: u64, license_id: u64, ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        { let m = borrow_model(market, model_id); assert!(m.owner == sender, E_NOT_OWNER); };

        let key = LicenseFlagKey { id: license_id };
        if (dynamic_field::exists_<LicenseFlagKey>(&market.id, key)) {
            let _old: LicenseStatus = dynamic_field::remove<LicenseFlagKey, LicenseStatus>(&mut market.id, key);
        };
        dynamic_field::add<LicenseFlagKey, LicenseStatus>(&mut market.id, LicenseFlagKey { id: license_id }, LicenseStatus { revoked: true });

        event::emit(LicenseRevoked { license_id, model_id, by: sender });
    }

    // ============================ LECTURAS ======================

    public fun get_model_primitives(market: &Marketplace, model_id: u64): (address, address, u64, u64, bool) {
        assert!(model_df_exists(market, model_id), E_MODEL_NOT_FOUND);
        let m = borrow_model(market, model_id);
        (m.owner, m.creator, m.price, m.royalty_bps, m.listed)
    }

    public fun get_model_info_ex(market: &Marketplace, model_id: u64)
        : (address, address, u64, bool, u64, u64, u64, u8, u8, u16, vector<u8>) {
        assert!(model_df_exists(market, model_id), E_MODEL_NOT_FOUND);
        let m = borrow_model(market, model_id);
        (
            m.owner, m.creator, m.royalty_bps, m.listed,
            m.price_perpetual, m.price_subscription, m.default_duration_days,
            m.delivery_rights_default, m.delivery_mode_hint, m.version, m.terms_hash
        )
    }

    /// “Existe por rango” (id < next_id)
    public fun model_exists(market: &Marketplace, model_id: u64): bool { model_id < market.next_id }

    public fun emit_model_exists(market: &Marketplace, model_id: u64) {
        event::emit(ExistsEvent { id: model_id, exists: model_id < market.next_id });
    }

    /// Página de modelos (skip gaps si se borraron DFs)
    public fun get_models_page(market: &Marketplace, start_id: u64, limit: u64): vector<ModelSummary> {
        let mut out = std::vector::empty<ModelSummary>();
        let max: u64 = if (limit > 50) { 50 } else { limit };

        let mut taken: u64 = 0;
        let mut id: u64 = start_id;

        while (taken < max && id < market.next_id) {
            if (model_df_exists(market, id)) {
                let m = borrow_model(market, id);
                std::vector::push_back(&mut out, ModelSummary {
                    id,
                    owner: m.owner,
                    listed: m.listed,
                    price_direct: m.price,
                    price_perpetual: m.price_perpetual,
                    price_subscription: m.price_subscription,
                    default_duration_days: m.default_duration_days,
                    version: m.version,
                });
                taken = taken + 1;
            };
            id = id + 1;
        };
        out
    }

    public fun get_market_info(market: &Marketplace): (u64, address, bool, u64, u64, u64, u64) {
        (market.fee_bps, market.fee_recipient, market.paused, market.next_id, market.next_license_id, market.active_models, market.models_limit)
    }

    public fun is_revoked(market: &Marketplace, license_id: u64): bool { is_license_revoked(market, license_id) }

    public fun emit_model_info_ex(market: &Marketplace, model_id: u64) {
        assert!(model_df_exists(market, model_id), E_MODEL_NOT_FOUND);
        let m = borrow_model(market, model_id);
        event::emit(ModelInfoExEmitted {
            id: model_id,
            owner: m.owner, creator: m.creator, royalty_bps: m.royalty_bps, listed: m.listed,
            price_direct: m.price, price_perpetual: m.price_perpetual, price_subscription: m.price_subscription,
            default_duration_days: m.default_duration_days, delivery_rights_default: m.delivery_rights_default, delivery_mode_hint: m.delivery_mode_hint,
            version: m.version, terms_hash: m.terms_hash,
        });
    }

    /// Estado de licencia (útil para backends)
    public fun license_status(market: &Marketplace, l: &License, clk: &sui::clock::Clock): (bool, bool, bool, u8, u64, address) {
        let revoked = is_license_revoked(market, l.license_id);
        let valid_api = if (!revoked) { is_valid_for(market, l, clk, RIGHTS_API) } else { false };
        let valid_dl  = if (!revoked) { is_valid_for(market, l, clk, RIGHTS_DOWNLOAD) } else { false };
        (revoked, valid_api, valid_dl, l.license_kind, l.expires_at, l.owner)
    }

    public fun get_license_info(l: &License): (u64, u64, address, u8, u8, u64, bool, vector<u8>, u16) {
        (l.license_id, l.model_id, l.owner, l.license_kind, l.rights, l.expires_at, l.transferable, l.terms_hash, l.version)
    }

    public fun latest_for_family(market: &Marketplace, owner: address, slug: &string::String): (bool, u64, u16) {
        if (!dynamic_field::exists_<FamilyKey>(&market.id, family_key(owner, slug))) {
            (false, 0, 0)
        } else {
            let m = dynamic_field::borrow<FamilyKey, FamilyMeta>(&market.id, family_key(owner, slug));
            (true, m.latest_id, m.latest_version)
        }
    }

    // ============== VALIDACIÓN DE LICENCIAS (API) ==============

    public fun is_valid_for(market: &Marketplace, l: &License, clk: &sui::clock::Clock, right: u8): bool {
        let now_sec = sui::clock::timestamp_ms(clk) / 1000;
        is_valid_for_at(market, l, now_sec, right)
    }

    public fun is_valid_for_at(market: &Marketplace, l: &License, now_sec: u64, right: u8): bool {
        if (is_license_revoked(market, l.license_id)) {
            false
        } else if (!(right == RIGHTS_API || right == RIGHTS_DOWNLOAD)) {
            false
        } else if (right == RIGHTS_API && !(l.rights == RIGHTS_API || l.rights == (RIGHTS_API + RIGHTS_DOWNLOAD))) {
            false
        } else if (right == RIGHTS_DOWNLOAD && !(l.rights == RIGHTS_DOWNLOAD || l.rights == (RIGHTS_API + RIGHTS_DOWNLOAD))) {
            false
        } else if (l.license_kind == KIND_PERPETUAL) {
            true
        } else {
            now_sec < l.expires_at // exclusión en el segundo exacto de expiración
        }
    }

    // ================== ERRORES HUMAN-READABLE ==================

    public fun error_message(code: u64): string::String {
        if (code == E_PRICE_ZERO) { string::utf8(b"Price must be greater than 0") }
        else if (code == E_ROYALTY_BPS_INVALID) { string::utf8(b"Invalid basis points (max 10000)") }
        else if (code == E_NEW_PRICE_ZERO) { string::utf8(b"New price must be greater than 0") }
        else if (code == E_NOT_OWNER) { string::utf8(b"Operation restricted to the owner") }
        else if (code == E_NOT_LISTED) { string::utf8(b"Model is not listed") }
        else if (code == E_INSUFFICIENT_FUNDS) { string::utf8(b"Insufficient funds or wrong amount") }
        else if (code == E_FEE_PLUS_ROYALTY_OVER_100_PCT) { string::utf8(b"Sum of fee + royalty exceeds 100%") }
        else if (code == E_MARKET_PAUSED) { string::utf8(b"Marketplace is paused") }
        else if (code == E_FEE_BPS_ABOVE_CAP) { string::utf8(b"Marketplace fee exceeds allowed cap") }
        else if (code == E_ZERO_ADDR) { string::utf8(b"Zero address is not allowed") }
        else if (code == E_MODEL_NOT_FOUND) { string::utf8(b"Model not found") }
        else if (code == E_INVALID_LICENSE_KIND) { string::utf8(b"Invalid license kind") }
        else if (code == E_INVALID_DURATION) { string::utf8(b"Invalid duration") }
        else if (code == E_LICENSE_NOT_SUBSCRIPTION) { string::utf8(b"License is not a subscription") }
        else if (code == E_LICENSE_REVOKED) { string::utf8(b"License has been revoked") }
        else if (code == E_DIRECT_SALE_DISABLED) { string::utf8(b"Direct sale is disabled for this model") }
        else if (code == E_MODEL_NOT_LISTABLE) { string::utf8(b"Model not listable: configure license prices") }
        else if (code == E_PRICE_NOT_CONFIGURED) { string::utf8(b"License price not configured") }
        else if (code == E_LICENSE_NOT_TRANSFERABLE) { string::utf8(b"License is not transferable") }
        else if (code == E_INVALID_RIGHTS) { string::utf8(b"Invalid rights (bitmask)") }
        else if (code == E_INVALID_DELIVERY_MODE) { string::utf8(b"Invalid delivery mode hint") }
        else if (code == E_MODELS_LIMIT_REACHED) { string::utf8(b"Models limit reached") }
        else if (code == E_PRICE_TOO_HIGH) { string::utf8(b"Price out of allowed range") }
        else { string::utf8(b"Unknown error") }
    }

    public fun emit_error_message(code: u64) {
        event::emit(ErrorEmitted { code, message: error_message(code) });
    }
}
