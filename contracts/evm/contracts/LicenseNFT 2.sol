// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract LicenseNFT is ERC721, Ownable {
    using Strings for uint256;
    struct LicenseData {
        uint256 modelId;
        uint8 licenseKind; // 0 = Perpetual, 1 = Subscription
        uint8 rights;      // bitmask
        uint64 expiresAt;  // unix seconds
        bool transferable;
        bytes32 termsHash; // keccak256 hash of terms blob
        uint16 version;
    }

    address public marketplace;
    uint256 public totalSupply;

    mapping(uint256 => LicenseData) private _license;

    // ===== Metadata state =====
    string private _baseTokenURI;
    mapping(uint256 => string) private _tokenURIs; // optional per-token URI (e.g., ipfs://...)

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "only marketplace");
        _;
    }

    constructor(address marketplace_) ERC721("MarketplaceAI License", "MPAILIC") Ownable(msg.sender) {
        marketplace = marketplace_;
    }

    function setMarketplace(address m) external onlyOwner {
        marketplace = m;
    }

    function getLicense(uint256 tokenId) external view returns (LicenseData memory) {
        require(_ownerOf(tokenId) != address(0), "not exists");
        return _license[tokenId];
    }

    function mint(address to, LicenseData memory d) external onlyMarketplace returns (uint256 tokenId) {
        tokenId = ++totalSupply;
        _license[tokenId] = d;
        _safeMint(to, tokenId);
    }

    /// @notice Mint con opción de fijar un tokenURI específico (p.ej., ipfs://...)
    /// @dev Si uri no es vacío, se guarda como override per-token; si es vacío, se usará baseURI.
    function mintWithURI(address to, LicenseData memory d, string calldata uri)
        external
        onlyMarketplace
        returns (uint256 tokenId)
    {
        tokenId = ++totalSupply;
        _license[tokenId] = d;
        _safeMint(to, tokenId);
        if (bytes(uri).length != 0) {
            _tokenURIs[tokenId] = uri;
        }
    }

    function updateExpires(uint256 tokenId, uint64 newExpiresAt) external onlyMarketplace {
        require(_ownerOf(tokenId) != address(0), "not exists");
        _license[tokenId].expiresAt = newExpiresAt;
    }

    // ===== Metadata management =====
    /// @notice Establece el baseURI para tokenURI(tokenId) cuando no hay URI por-token.
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    /// @notice Permite al marketplace fijar/actualizar el tokenURI de un token minteado.
    function setTokenURI(uint256 tokenId, string calldata uri) external onlyMarketplace {
        require(_ownerOf(tokenId) != address(0), "not exists");
        _tokenURIs[tokenId] = uri;
    }

    /// @dev Retorna tokenURI estándar ERC721. Prioriza URI por-token; si no, concatena baseURI + tokenId.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");

        string memory specific = _tokenURIs[tokenId];
        if (bytes(specific).length != 0) {
            return specific;
        }

        string memory baseUri = _baseTokenURI;
        if (bytes(baseUri).length == 0) {
            return ""; // sin metadata hasta que se configure baseURI o per-token URI
        }
        return string(abi.encodePacked(baseUri, tokenId.toString()));
    }

    // OpenZeppelin v5: _update is the transfer hook
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        // Call parent to update ownership/balances first and get previous owner
        from = super._update(to, tokenId, auth);
        // Block regular transfers if license is non-transferable (allow mint and burn)
        if (from != address(0) && to != address(0)) {
            require(_license[tokenId].transferable, "not transferable");
        }
    }
}
