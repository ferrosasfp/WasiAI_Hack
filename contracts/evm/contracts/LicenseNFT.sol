// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LicenseNFT is ERC721, Ownable {
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

    function updateExpires(uint256 tokenId, uint64 newExpiresAt) external onlyMarketplace {
        require(_ownerOf(tokenId) != address(0), "not exists");
        _license[tokenId].expiresAt = newExpiresAt;
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
