// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LicenseNFT} from "./LicenseNFT.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MarketplaceAI License Marketplace
/// @notice Marketplace para listar modelos de IA y vender licencias (perpetuas o por suscripción) como NFTs.
/// @dev Separa claramente: metadatos del modelo (on-chain) y licencias (ERC721 en LicenseNFT).
contract Marketplace is Ownable, ReentrancyGuard {
    // ===== Constants =====

    /// @notice 10_000 basis points = 100%
    uint256 public constant MAX_BPS = 10_000; // 100%

    /// @notice Tope duro para la comisión del marketplace: 2_000 bps = 20%
    uint256 public constant MAX_FEE_BPS_CAP = 2_000; // 20%

    /// @notice Guardrail UX para precios (máx ~100,000 ETH por operación)
    uint256 public constant MAX_PRICE_CAP = 1e23; // 100,000 ETH (UX guardrail)

    /// @notice Derechos de uso de la licencia: permiso para usar vía API/servicio
    uint8 public constant RIGHTS_API = 1;
    /// @notice Derechos de uso de la licencia: permiso para descargas controladas
    uint8 public constant RIGHTS_DOWNLOAD = 2;

    /// @notice Tipo de licencia: pago único, sin vencimiento
    uint8 public constant KIND_PERPETUAL = 0;
    /// @notice Tipo de licencia: suscripción por meses, con vencimiento
    uint8 public constant KIND_SUBSCRIPTION = 1;

    // ===== Errors =====
    // Errores específicos para hacer revert más legible y manejable desde el front.

    error NotOwner();                 // Operación restringida al owner
    error NotListed();                // Modelo no está listado
    error InvalidBps();               // Bps > MAX_BPS
    error FeeOverCap();               // feeBps > MAX_FEE_BPS_CAP
    error FeePlusRoyaltyOver100();    // feeBps + royaltyBps > 100%
    error InvalidRights();            // Bitmask de derechos inválido
    error InvalidDelivery();          // deliveryMode inválido
    error InvalidKind();              // Tipo de licencia desconocido
    error InvalidDuration();          // Duración inválida (0 o inconsistente)
    error InsufficientFunds();        // msg.value no coincide con el precio esperado
    error ModelsLimitReached();       // Se alcanzó el límite de modelos listados
    error PriceNotConfigured();       // No hay precio configurado para este tipo de licencia
    error PriceTooHigh();             // Precio supera MAX_PRICE_CAP
    error MarketIsPaused();           // Marketplace pausado
    error TransferFailed();           // Falló envío de ETH vía call
    error ZeroAddress();              // Dirección cero no permitida
    error LicenseRevokedError();      // Licencia revocada
    error InvalidVersion();           // version == uint16.max

    // ===== Types =====

    /// @notice Información de un modelo listado en el marketplace.
    /// @dev No contiene el slug; el "family" se maneja en el mapping families.
    struct Model {
        /// @notice Owner actual del modelo (puede ser distinto del creador original)
        address owner;
        /// @notice Creador original (para royalties)
        address creator;
        /// @notice Nombre legible del modelo (p.ej. "Llama-3 Finetuned Spanish")
        string name;
        /// @notice URI a metadatos/artefactos (IPFS, HTTP, etc)
        string uri;
        /// @notice Bps de royalty para el creador (0..10000)
        uint256 royaltyBps; // 0..10000
        /// @notice Flag de si el modelo está o no listado para nuevas licencias
        bool listed;
        /// @notice Precio para licencia perpetua (en wei)
        uint256 pricePerpetual;
        /// @notice Precio mensual para licencia de suscripción (en wei)
        uint256 priceSubscription; // price per month
        /// @notice Días por cada "mes" de suscripción (ej. 30)
        uint256 defaultDurationDays; // base duration for 1 month
        /// @notice Derechos por defecto de la licencia (bitmask: API, DOWNLOAD o ambos)
        uint8 deliveryRightsDefault; // bitmask
        /// @notice Hint para UI sobre modo de entrega (API, download, etc)
        uint8 deliveryModeHint; // UX hint
        /// @notice Versión del modelo dentro de la familia (owner + slug)
        uint16 version;
        /// @notice Hash de términos legales (keccak256 del documento de términos)
        bytes32 termsHash; // keccak256 of terms blob
    }

    /// @notice Metadatos por "familia" de modelo (owner + slug)
    /// @dev latestId/version apuntan siempre a la versión más reciente de la familia.
    struct FamilyMeta {
        uint256 latestId;
        uint16 latestVersion;
    }

    // ===== State =====

    /// @notice Siguiente ID de modelo a asignar (1-based)
    uint256 public nextId = 1;

    /// @notice Último ID de licencia minteada (para tracking externo)
    uint256 public lastLicenseId;

    /// @notice Fee del marketplace expresado en basis points (0..MAX_BPS)
    uint256 public feeBps;

    /// @notice Dirección que recibe la comisión del marketplace
    address public feeRecipient;

    /// @notice Flag global de pausa del marketplace
    bool public paused;

    /// @notice Cantidad de modelos actualmente listados (activos)
    uint256 public activeModels;

    /// @notice Límite máximo de modelos listados simultáneamente (0 = sin límite)
    uint256 public modelsLimit; // 0 = no limit

    /// @notice Registro de modelos por ID
    mapping(uint256 => Model) public models; // id => Model

    /// @notice Índice de familias por owner y slug hasheado (keccak256(slug))
    /// @dev Permite versionado automático: cada listOrUpgrade crea una nueva versión.
    mapping(address => mapping(bytes32 => FamilyMeta)) public families; // owner => keccak256(slug) => meta

    /// @notice Contrato ERC721 que representa las licencias
    LicenseNFT public immutable licenseNFT;

    /// @notice Devuelve la dirección del contrato de licencias
    function licenseNFTAddress() external view returns (address) {
        return address(licenseNFT);
    }

    // ===== Events =====

    /// @notice Emitted when the LicenseNFT contract is created
    event LicenseNFTCreated(address license);

    /// @notice Emitted when marketplace fee / recipient are updated
    event MarketFeesSet(uint256 feeBps, address feeRecipient);

    /// @notice Emitted when the marketplace is paused/unpaused
    event MarketPaused(bool paused);

    /// @notice Emitted when the models limit is updated
    event ModelsLimitSet(uint256 newLimit);

    /// @notice Emitted when the counter of active listed models changes
    event ModelsCountChanged(uint256 active);

    /// @notice Emitted when a model is listed (new or upgraded)
    event ModelListed(uint256 id, address owner);

    /// @notice Emitted when a model's listing status or params are updated
    event ModelUpdated(uint256 id, address owner, bool listed);

    /// @notice Emitted when a model is explicitly unlisted
    event ModelUnlisted(uint256 id, address owner);

    /// @notice Emitted when a new license is minted
    event LicenseMinted(
        uint256 licenseId,
        uint256 modelId,
        address buyer,
        uint8 kind,
        uint8 rights,
        uint64 expiresAt,
        uint16 version,
        uint256 pricePaid,
        uint256 feePaid,
        uint256 royaltyPaid
    );

    /// @notice Emitted when an existing license is renewed
    event LicenseRenewed(
        uint256 licenseId,
        uint256 modelId,
        uint64 newExpiresAt,
        uint16 months,
        uint256 pricePaid,
        uint256 feePaid,
        uint256 royaltyPaid
    );

    // ===== Modifiers & internal checks =====

    /// @dev Rechaza llamadas si el marketplace está pausado
    modifier notPaused() {
        if (paused) revert MarketIsPaused();
        _;
    }

    /// @dev Valida que los basis points no excedan 100%
    function _ensureValidBps(uint256 bps) internal pure {
        if (bps > MAX_BPS) revert InvalidBps();
    }

    /// @dev Valida que la comisión del mercado no exceda el cap
    function _ensureFeeUnderCap(uint256 bps) internal pure {
        if (bps > MAX_FEE_BPS_CAP) revert FeeOverCap();
    }

    /// @dev Valida que fee + royalty no excedan 100% en conjunto
    function _ensureFeePlusRoyaltyOk(uint256 fee, uint256 royalty) internal pure {
        if (fee + royalty > MAX_BPS) revert FeePlusRoyaltyOver100();
    }

    /// @dev Valida bitmask de derechos (1, 2 o 3)
    function _ensureValidRights(uint8 r) internal pure {
        if (!(r == RIGHTS_API || r == RIGHTS_DOWNLOAD || r == RIGHTS_API + RIGHTS_DOWNLOAD)) revert InvalidRights();
    }

    /// @dev Valida hint de modo de entrega (reutiliza los mismos valores que RIGHTS_*)
    function _ensureValidDelivery(uint8 d) internal pure {
        if (!(d == RIGHTS_API || d == RIGHTS_DOWNLOAD || d == RIGHTS_API + RIGHTS_DOWNLOAD)) revert InvalidDelivery();
    }

    // ===== Ctor =====

    /// @notice Deploys the marketplace and creates the LicenseNFT contract.
    /// @param feeBps_ Marketplace fee in basis points (0..MAX_FEE_BPS_CAP).
    /// @param feeRecipient_ Address that receives marketplace fees (non-zero).
    /// @param modelsLimit_ Max concurrently listed models (0 = unlimited).
    /// @param licenseNFTOwner Owner address of the LicenseNFT contract.
    constructor(
        uint256 feeBps_,
        address feeRecipient_,
        uint256 modelsLimit_,
        address licenseNFTOwner
    ) Ownable(msg.sender) {
        _ensureValidBps(feeBps_);
        _ensureFeeUnderCap(feeBps_);
        if (feeRecipient_ == address(0)) revert ZeroAddress();

        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        modelsLimit = modelsLimit_;

        // Deploy del contrato de licencias, con el marketplace como "marketplace" autorizado
        licenseNFT = new LicenseNFT(address(this));
        // Transferimos la propiedad del NFT al owner indicado (p.ej. multisig del protocolo)
        licenseNFT.transferOwnership(licenseNFTOwner);

        emit LicenseNFTCreated(address(licenseNFT));
    }

    // ===== Admin =====

    /// @notice Updates marketplace fee parameters.
    /// @dev Solo callable por el owner del marketplace.
    /// @param newFeeBps New fee in basis points (0..MAX_FEE_BPS_CAP).
    /// @param newRecipient New fee recipient address (non-zero).
    function setFees(uint256 newFeeBps, address newRecipient) external onlyOwner {
        _ensureValidBps(newFeeBps);
        _ensureFeeUnderCap(newFeeBps);
        if (newRecipient == address(0)) revert ZeroAddress();

        feeBps = newFeeBps;
        feeRecipient = newRecipient;

        emit MarketFeesSet(newFeeBps, newRecipient);
    }

    /// @notice Pauses or unpauses the marketplace for state-changing operations.
    /// @dev Afecta a listOrUpgrade, setLicensingParams, setListed, buyLicense y renewLicense.
    /// @param p True para pausar, false para reanudar.
    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit MarketPaused(p);
    }

    /// @notice Sets the maximum number of concurrently listed models.
    /// @dev Si se establece en 0, no hay límite.
    /// @param lim New limit of active models (0 = unlimited).
    function setModelsLimit(uint256 lim) external onlyOwner {
        modelsLimit = lim;
        emit ModelsLimitSet(lim);
    }

    // ===== Listing =====

    /// @dev Valida que la configuración de precios y duración tenga sentido.
    /// - Requiere al menos un precio (perpetual o subscription).
    /// - Enforcea caps para UX (MAX_PRICE_CAP).
    /// - Si no hay suscripción, durationDays debe ser 0; si hay, debe ser >=1.
    function _validateLicensing(uint256 pricePerp, uint256 priceSub, uint256 durationDays) internal pure {
        if (pricePerp == 0 && priceSub == 0) revert PriceNotConfigured();
        if (pricePerp > MAX_PRICE_CAP || priceSub > MAX_PRICE_CAP) revert PriceTooHigh();

        if (priceSub == 0) {
            // Sin suscripción, la duración base debe ser 0
            if (durationDays != 0) revert InvalidDuration();
        } else {
            // Con suscripción, debe haber al menos 1 día
            if (durationDays < 1) revert InvalidDuration();
        }
    }

    /// @notice Lists a new model or upgrades an existing family version (owner+slug).
    /// @dev Si ya existe un modelo para ese (owner, slug), se deslista la versión previa
    ///      y se crea una nueva con version incrementada. El "slug" actúa como "nombre de familia".
    /// @param slug Human-readable identifier for the model family (versioned series).
    /// @param name Display name of the specific model version.
    /// @param uri URI to model metadata / artifacts.
    /// @param royaltyBps_ Creator royalty in basis points (0..MAX_BPS).
    /// @param pricePerpetual Price in wei for perpetual license.
    /// @param priceSubscription Monthly price in wei for subscription license.
    /// @param defaultDurationDays Base number of days per "month" for subscriptions.
    /// @param deliveryRightsDefault Default rights bitmask for licenses.
    /// @param deliveryModeHint UX hint for delivery mode (API, download, both).
    /// @param termsHash keccak256 hash of the legal terms associated with this version.
    function listOrUpgrade(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps_,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash
    ) external notPaused {
        _ensureValidBps(royaltyBps_);
        _ensureFeePlusRoyaltyOk(feeBps, royaltyBps_);
        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);

        // Calculamos el hash del slug para usarlo como key en el mapping
        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[msg.sender][slugHash];

        // Evita overflow de versión: si llegamos a uint16.max, ya no permitimos upgrades
        if (fam.latestVersion == type(uint16).max) revert InvalidVersion();

        // Si ya hay un modelo anterior en esta familia, lo deslistamos
        if (fam.latestId != 0) {
            Model storage oldM = models[fam.latestId];
            if (oldM.listed) {
                oldM.listed = false;
                if (activeModels > 0) {
                    activeModels -= 1;
                    emit ModelsCountChanged(activeModels);
                }
                emit ModelUnlisted(fam.latestId, oldM.owner);
            }
        }

        // Enforce límite de modelos activos
        if (modelsLimit > 0 && activeModels >= modelsLimit) revert ModelsLimitReached();

        // Creamos un nuevo modelo
        uint256 id = nextId++;
        Model storage m = models[id];
        m.owner = msg.sender;
        m.creator = msg.sender;
        m.name = name;
        m.uri = uri;
        m.royaltyBps = royaltyBps_;
        m.listed = true;
        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;

        // version = 1 si es la primera vez, si no, latestVersion + 1
        uint16 newVersion = fam.latestId != 0 ? uint16(fam.latestVersion + 1) : uint16(1);
        m.version = newVersion;
        m.termsHash = termsHash;

        // Actualizamos metadata de familia
        fam.latestId = id;
        fam.latestVersion = newVersion;

        // Actualizamos contador de modelos activos
        activeModels += 1;
        emit ModelsCountChanged(activeModels);
        emit ModelListed(id, msg.sender);
    }

    /// @notice Updates licensing parameters for an existing model and bumps its version.
    /// @dev Solo el owner del modelo puede modificar estos parámetros.
    /// @param modelId ID of the model to update.
    /// @param pricePerpetual New perpetual license price in wei.
    /// @param priceSubscription New subscription monthly price in wei.
    /// @param defaultDurationDays New base duration in days per subscription "month".
    /// @param deliveryRightsDefault New default rights bitmask for issued licenses.
    /// @param deliveryModeHint New delivery mode UX hint.
    /// @param termsHash New hash of legal terms blob.
    function setLicensingParams(
        uint256 modelId,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash
    ) external notPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();

        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);

        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;

        // Protegemos overflow de versión
        if (m.version == type(uint16).max) revert InvalidVersion();
        uint16 newVersion = m.version != 0 ? uint16(m.version + 1) : uint16(1);
        m.version = newVersion;
        m.termsHash = termsHash;

        emit ModelUpdated(modelId, m.owner, m.listed);
    }

    /// @notice Sets the listed flag for a model.
    /// @dev Sirve para pausar un modelo concreto sin eliminarlo.
    /// @param modelId ID of the model to update.
    /// @param listed True to list the model, false to unlist it.
    function setListed(uint256 modelId, bool listed) external notPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();

        bool was = m.listed;
        m.listed = listed;

        emit ModelUpdated(modelId, m.owner, listed);

        if (!listed) {
            emit ModelUnlisted(modelId, m.owner);
            // Solo decrementamos si antes estaba listado
            if (was && activeModels > 0) {
                activeModels -= 1;
                emit ModelsCountChanged(activeModels);
            }
        } else if (!was) {
            // Solo incrementamos si antes NO estaba listado
            activeModels += 1;
            emit ModelsCountChanged(activeModels);
        }
    }

    // ===== Payments =====

    /// @dev Envía ETH a una dirección con manejo explícito de errores.
    /// @param to Recipient address.
    /// @param amount Amount in wei to transfer.
    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @dev Distribuye el pago total entre el marketplace, el creador y el seller.
    /// @param total Total amount paid by the buyer.
    /// @param royaltyBps Royalty in bps for the creator.
    /// @param creator Address receiving royalties.
    /// @param seller Address receiving the remainder after fee and royalty.
    /// @return feePaid Amount sent to feeRecipient.
    /// @return royaltyPaid Amount sent to creator.
    /// @return sellerAmount Amount sent to seller.
    function _distribute(
        uint256 total,
        uint256 royaltyBps,
        address creator,
        address seller
    ) internal returns (uint256 feePaid, uint256 royaltyPaid, uint256 sellerAmount) {
        feePaid = (total * feeBps) / MAX_BPS;
        royaltyPaid = (total * royaltyBps) / MAX_BPS;
        sellerAmount = total - feePaid - royaltyPaid;

        _send(feeRecipient, feePaid);
        _send(creator, royaltyPaid);
        _send(seller, sellerAmount);
    }

    /// @dev Calcula el precio de la licencia según el tipo (perpetua o suscripción).
    /// @param m Model storage reference.
    /// @param kind License kind (KIND_PERPETUAL or KIND_SUBSCRIPTION).
    /// @param months Number of months for subscription (ignored for perpetual).
    /// @return Price in wei.
    function _licensePrice(Model storage m, uint8 kind, uint16 months) internal view returns (uint256) {
        if (kind == KIND_PERPETUAL) {
            if (m.pricePerpetual == 0) revert PriceNotConfigured();
            return m.pricePerpetual;
        } else if (kind == KIND_SUBSCRIPTION) {
            if (m.priceSubscription == 0) revert PriceNotConfigured();
            if (months == 0) revert InvalidDuration();

            uint256 total = uint256(m.priceSubscription) * uint256(months);
            if (total > MAX_PRICE_CAP) revert PriceTooHigh();
            return total;
        } else {
            revert InvalidKind();
        }
    }

    // ===== Buy / Renew =====

    /// @notice Buys a license for a given model (either perpetual or subscription).
    /// @dev msg.value must match the computed license price.
    /// @param modelId ID of the model to license.
    /// @param licenseKind KIND_PERPETUAL or KIND_SUBSCRIPTION.
    /// @param months Number of months when buying a subscription (ignored for perpetual).
    /// @param transferable Whether the resulting license NFT is transferable.
    function buyLicense(
        uint256 modelId,
        uint8 licenseKind,
        uint16 months,
        bool transferable
    ) external payable notPaused nonReentrant {
        Model storage m = models[modelId];
        if (!m.listed) revert NotListed();

        _ensureFeePlusRoyaltyOk(feeBps, m.royaltyBps);
        _ensureValidRights(m.deliveryRightsDefault);
        _ensureValidDelivery(m.deliveryModeHint);

        // Calculamos el precio a pagar según.tipo de licencia
        uint256 priceDue = _licensePrice(m, licenseKind, months);
        if (msg.value != priceDue) revert InsufficientFunds();

        // Distribuimos fee + royalty + sellerAmount
        (uint256 feePaid, uint256 royaltyPaid, ) = _distribute(priceDue, m.royaltyBps, m.creator, m.owner);

        // Calculamos expiración solo si es suscripción
        uint64 expiresAt = 0;
        if (licenseKind == KIND_SUBSCRIPTION) {
            uint256 totalDays = m.defaultDurationDays * uint256(months);
            expiresAt = uint64(block.timestamp + totalDays * 1 days);
        }

        // Construimos los datos de la licencia para el NFT
        LicenseNFT.LicenseData memory d = LicenseNFT.LicenseData({
            modelId: modelId,
            licenseKind: licenseKind,
            rights: m.deliveryRightsDefault,
            expiresAt: expiresAt,
            transferable: transferable,
            termsHash: m.termsHash,
            version: m.version
        });

        // Mint del NFT de licencia al buyer
        uint256 lid = licenseNFT.mint(msg.sender, d);
        lastLicenseId = lid;

        emit LicenseMinted(
            lid,
            modelId,
            msg.sender,
            licenseKind,
            m.deliveryRightsDefault,
            expiresAt,
            m.version,
            priceDue,
            feePaid,
            royaltyPaid
        );
    }

    /// @notice Renews a subscription license NFT.
    /// @dev Only the token owner can renew, and only if it is a subscription license.
    /// @param tokenId License NFT token ID.
    /// @param months Additional months to add to the subscription.
    function renewLicense(uint256 tokenId, uint16 months) external payable notPaused nonReentrant {
        if (months == 0) revert InvalidDuration();

        // Leemos datos de licencia del NFT
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);

        // Solo el owner actual del NFT puede renovar
        if (licenseNFT.ownerOf(tokenId) != msg.sender) revert NotOwner();

        // Solo aplica a licencias de tipo suscripción
        if (lic.licenseKind != KIND_SUBSCRIPTION) revert InvalidKind();

        // No se puede renovar una licencia revocada
        if (revoked[tokenId]) revert LicenseRevokedError();

        Model storage m = models[lic.modelId];

        _ensureFeePlusRoyaltyOk(feeBps, m.royaltyBps);

        // Precio de renovación (solo KIND_SUBSCRIPTION)
        uint256 priceDue = _licensePrice(m, KIND_SUBSCRIPTION, months);
        if (msg.value != priceDue) revert InsufficientFunds();

        (uint256 feePaid, uint256 royaltyPaid, ) = _distribute(priceDue, m.royaltyBps, m.creator, m.owner);

        // Si aún no expiró, extendemos desde expiresAt; si ya expiró, desde ahora
        uint64 base = lic.expiresAt > block.timestamp ? lic.expiresAt : uint64(block.timestamp);
        uint64 newExp = uint64(uint256(base) + m.defaultDurationDays * uint256(months) * 1 days);

        licenseNFT.updateExpires(tokenId, newExp);

        emit LicenseRenewed(tokenId, lic.modelId, newExp, months, priceDue, feePaid, royaltyPaid);
    }

    // ===== Revocation =====

    /// @notice Emitted when a license token is revoked.
    event LicenseRevoked(uint256 tokenId, uint256 modelId, address by);

    /// @notice Estado de revocación por tokenId (true = revocada).
    mapping(uint256 => bool) public revoked;

    /// @notice Admin revokes a license token.
    /// @dev No quema el NFT, solo marca el token como revocado y lo reporta en licenseStatus/renewLicense.
    /// @param tokenId License NFT token ID to revoke.
    function revokeByAdmin(uint256 tokenId) external onlyOwner {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);
        revoked[tokenId] = true;
        emit LicenseRevoked(tokenId, lic.modelId, msg.sender);
    }

    /// @notice Model owner revokes a license token for one of their models.
    /// @dev El owner del modelo puede revocar licencias emitidas sobre su modelo.
    /// @param tokenId License NFT token ID to revoke.
    function revokeByModelOwner(uint256 tokenId) external {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);

        // Solo el owner del modelo asociado a la licencia puede revocarla
        if (models[lic.modelId].owner != msg.sender) revert NotOwner();

        revoked[tokenId] = true;
        emit LicenseRevoked(tokenId, lic.modelId, msg.sender);
    }

    // ===== ETH handling =====

    /// @dev Accept stray ETH (e.g. direct transfers).
    receive() external payable {}

    /// @notice Owner can withdraw stray ETH from the contract.
    /// @dev Usa el mismo helper _send para manejo de errores.
    /// @param to Recipient address.
    /// @param amount Amount in wei to sweep.
    function sweep(address to, uint256 amount) external onlyOwner {
        _send(to, amount);
    }

    // ===== Views =====

    /// @notice Returns license status info for frontends/indexers.
    /// @dev Métrica de alto nivel: revocado, vigencia, derechos disponibles, tipo y owner actual.
    /// @param tokenId License NFT token ID.
    /// @return revoked_ Whether the license is revoked.
    /// @return validApi Whether the license is currently valid for API usage.
    /// @return validDownload Whether the license is currently valid for download usage.
    /// @return kind License kind (perpetual or subscription).
    /// @return expiresAt Expiration timestamp in seconds (0 for perpetual).
    /// @return owner Current owner of the license NFT.
    function licenseStatus(uint256 tokenId)
        external
        view
        returns (
            bool revoked_,
            bool validApi,
            bool validDownload,
            uint8 kind,
            uint64 expiresAt,
            address owner
        )
    {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);

        revoked_ = revoked[tokenId];
        owner = licenseNFT.ownerOf(tokenId);
        kind = lic.licenseKind;
        expiresAt = lic.expiresAt;

        if (revoked_) {
            // Revocada = no válida para ningún derecho
            validApi = false;
            validDownload = false;
        } else {
            // Licencias perpetuas nunca expiran; suscripciones dependen de expiresAt
            bool perpetual = (kind == KIND_PERPETUAL);
            bool notExpired = perpetual || block.timestamp < expiresAt;

            uint8 r = lic.rights;

            // Tiene derecho a API si la máscara incluye RIGHTS_API
            validApi = notExpired && (r == RIGHTS_API || r == RIGHTS_API + RIGHTS_DOWNLOAD);

            // Tiene derecho a descarga si la máscara incluye RIGHTS_DOWNLOAD
            validDownload = notExpired && (r == RIGHTS_DOWNLOAD || r == RIGHTS_API + RIGHTS_DOWNLOAD);
        }
    }
}
