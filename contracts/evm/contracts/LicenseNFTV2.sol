// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title LicenseNFTV2 - Enhanced License NFT with Security Best Practices
/// @notice ERC721 representing AI model licenses with improved security
/// @dev Implements Ownable2Step, ReentrancyGuard, Pausable, and timelock for critical changes
/// @custom:security-contact security@wasiai.com
contract LicenseNFTV2 is ERC721, Ownable2Step, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ============ TYPES ============

    /// @notice License data stored per token
    struct LicenseData {
        uint256 modelId;        // Reference to Marketplace model
        uint8 licenseKind;      // 0 = Perpetual, 1 = Subscription
        uint8 rights;           // Bitmask: 1=API, 2=Download, 3=Both
        uint64 expiresAt;       // Unix timestamp (0 for perpetual)
        bool transferable;      // Whether NFT can be transferred
        bytes32 termsHash;      // Hash of legal terms
        uint16 version;         // Model version at mint time
    }
    
    /// @notice Pending marketplace change with timelock
    struct PendingMarketplaceChange {
        address newMarketplace;
        uint256 effectiveAt;
    }

    // ============ CONSTANTS ============
    
    /// @notice Timelock delay for marketplace change (24 hours)
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    
    /// @notice Maximum URI length to prevent gas griefing
    uint256 public constant MAX_URI_LENGTH = 512;

    // ============ ERRORS ============
    
    error OnlyMarketplace();
    error TokenNotExists();
    error NotTransferable();
    error ZeroAddress();
    error URITooLong();
    error TimelockNotExpired();
    error NoPendingChange();

    // ============ STATE ============

    /// @notice Authorized marketplace contract
    address public marketplace;
    
    /// @notice Pending marketplace change
    PendingMarketplaceChange public pendingMarketplaceChange;

    /// @notice Total supply counter
    uint256 public totalSupply;

    /// @notice License data per token
    mapping(uint256 => LicenseData) private _license;

    /// @notice Base URI for token metadata
    string private _baseTokenURI;
    
    /// @notice Per-token URI overrides
    mapping(uint256 => string) private _tokenURIs;

    // ============ EVENTS ============
    
    event MarketplaceChangeRequested(
        address indexed oldMarketplace,
        address indexed newMarketplace,
        uint256 effectiveAt
    );
    
    event MarketplaceChanged(
        address indexed oldMarketplace,
        address indexed newMarketplace
    );
    
    event BaseURIUpdated(string newBaseURI);
    
    event TokenURIUpdated(uint256 indexed tokenId, string uri);
    
    event LicenseExpirationUpdated(uint256 indexed tokenId, uint64 newExpiresAt);

    // ============ MODIFIERS ============

    /// @dev Only marketplace can call
    modifier onlyMarketplace() {
        if (msg.sender != marketplace) revert OnlyMarketplace();
        _;
    }
    
    /// @dev Token must exist
    modifier tokenExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotExists();
        _;
    }

    // ============ CONSTRUCTOR ============

    /// @notice Deploy LicenseNFT
    /// @param marketplace_ Authorized marketplace address
    constructor(address marketplace_) 
        ERC721("MarketplaceAI License V2", "MPAILIC2") 
        Ownable(msg.sender) 
    {
        if (marketplace_ == address(0)) revert ZeroAddress();
        marketplace = marketplace_;
    }

    // ============ MARKETPLACE MANAGEMENT (TIMELOCK) ============
    
    /// @notice Request marketplace change (starts 24h timelock)
    /// @param newMarketplace New marketplace address
    function requestMarketplaceChange(address newMarketplace) external onlyOwner {
        if (newMarketplace == address(0)) revert ZeroAddress();
        
        pendingMarketplaceChange = PendingMarketplaceChange({
            newMarketplace: newMarketplace,
            effectiveAt: block.timestamp + TIMELOCK_DELAY
        });
        
        emit MarketplaceChangeRequested(marketplace, newMarketplace, block.timestamp + TIMELOCK_DELAY);
    }
    
    /// @notice Execute marketplace change after timelock
    function executeMarketplaceChange() external onlyOwner {
        PendingMarketplaceChange memory pending = pendingMarketplaceChange;
        if (pending.effectiveAt == 0) revert NoPendingChange();
        if (block.timestamp < pending.effectiveAt) revert TimelockNotExpired();
        
        address oldMarketplace = marketplace;
        marketplace = pending.newMarketplace;
        
        delete pendingMarketplaceChange;
        
        emit MarketplaceChanged(oldMarketplace, pending.newMarketplace);
    }
    
    /// @notice Cancel pending marketplace change
    function cancelMarketplaceChange() external onlyOwner {
        delete pendingMarketplaceChange;
    }

    // ============ MINTING ============

    /// @notice Mint a new license NFT
    /// @param to Recipient address
    /// @param d License data
    /// @return tokenId Minted token ID
    function mint(address to, LicenseData memory d) 
        external 
        onlyMarketplace 
        nonReentrant 
        whenNotPaused 
        returns (uint256 tokenId) 
    {
        if (to == address(0)) revert ZeroAddress();
        
        tokenId = ++totalSupply;
        _license[tokenId] = d;
        _safeMint(to, tokenId);
    }

    /// @notice Mint with custom token URI
    /// @param to Recipient address
    /// @param d License data
    /// @param uri Token URI (IPFS, etc)
    /// @return tokenId Minted token ID
    function mintWithURI(address to, LicenseData memory d, string calldata uri)
        external
        onlyMarketplace
        nonReentrant
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        if (bytes(uri).length > MAX_URI_LENGTH) revert URITooLong();
        
        tokenId = ++totalSupply;
        _license[tokenId] = d;
        _safeMint(to, tokenId);
        
        if (bytes(uri).length != 0) {
            _tokenURIs[tokenId] = uri;
            emit TokenURIUpdated(tokenId, uri);
        }
    }

    // ============ LICENSE MANAGEMENT ============

    /// @notice Update license expiration (for renewals)
    /// @param tokenId Token ID
    /// @param newExpiresAt New expiration timestamp
    function updateExpires(uint256 tokenId, uint64 newExpiresAt) 
        external 
        onlyMarketplace 
        tokenExists(tokenId) 
    {
        _license[tokenId].expiresAt = newExpiresAt;
        emit LicenseExpirationUpdated(tokenId, newExpiresAt);
    }

    /// @notice Get license data
    /// @param tokenId Token ID
    /// @return License data struct
    function getLicense(uint256 tokenId) 
        external 
        view 
        tokenExists(tokenId) 
        returns (LicenseData memory) 
    {
        return _license[tokenId];
    }

    // ============ METADATA ============

    /// @notice Set base URI for all tokens
    /// @param newBaseURI New base URI
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (bytes(newBaseURI).length > MAX_URI_LENGTH) revert URITooLong();
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /// @notice Set token-specific URI
    /// @param tokenId Token ID
    /// @param uri New URI
    function setTokenURI(uint256 tokenId, string calldata uri) 
        external 
        onlyMarketplace 
        tokenExists(tokenId) 
    {
        if (bytes(uri).length > MAX_URI_LENGTH) revert URITooLong();
        _tokenURIs[tokenId] = uri;
        emit TokenURIUpdated(tokenId, uri);
    }

    /// @notice Get token URI
    /// @param tokenId Token ID
    /// @return Token URI string
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        tokenExists(tokenId) 
        returns (string memory) 
    {
        string memory specific = _tokenURIs[tokenId];
        if (bytes(specific).length != 0) {
            return specific;
        }

        string memory baseUri = _baseTokenURI;
        if (bytes(baseUri).length == 0) {
            return "";
        }
        return string(abi.encodePacked(baseUri, tokenId.toString()));
    }

    // ============ PAUSABLE ============

    /// @notice Pause minting
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause minting
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ TRANSFER RESTRICTIONS ============

    /// @dev Override transfer hook to enforce transferability
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);
        
        // Allow mint (from=0) and burn (to=0), block transfers if not transferable
        if (from != address(0) && to != address(0)) {
            if (!_license[tokenId].transferable) revert NotTransferable();
        }
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Check if license is valid (not expired)
    /// @param tokenId Token ID
    /// @return valid Whether license is currently valid
    function isValid(uint256 tokenId) external view tokenExists(tokenId) returns (bool) {
        LicenseData memory lic = _license[tokenId];
        
        // Perpetual licenses never expire
        if (lic.licenseKind == 0) return true;
        
        // Subscription: check expiration
        return block.timestamp < lic.expiresAt;
    }
    
    /// @notice Check if license has API rights
    /// @param tokenId Token ID
    /// @return hasApi Whether license has API access
    function hasApiRights(uint256 tokenId) external view tokenExists(tokenId) returns (bool) {
        uint8 rights = _license[tokenId].rights;
        return rights == 1 || rights == 3; // RIGHTS_API or RIGHTS_API + RIGHTS_DOWNLOAD
    }
    
    /// @notice Check if license has download rights
    /// @param tokenId Token ID
    /// @return hasDownload Whether license has download access
    function hasDownloadRights(uint256 tokenId) external view tokenExists(tokenId) returns (bool) {
        uint8 rights = _license[tokenId].rights;
        return rights == 2 || rights == 3; // RIGHTS_DOWNLOAD or RIGHTS_API + RIGHTS_DOWNLOAD
    }
}
