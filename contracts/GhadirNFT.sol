// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GhadirNFT
 * @notice Soulbound ERC-721 certificates — non-transferable after mint.
 *         Types: GhadeerDay, WaqfFounder, SadaqahPioneer, Arbaeen, CommunityBuilder
 */
contract GhadirNFT is ERC721, ERC721URIStorage, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    enum CertType { GhadeerDay, WaqfFounder, SadaqahPioneer, Arbaeen, CommunityBuilder }

    uint256 private _nextTokenId;

    mapping(uint256 => CertType) public certType;
    mapping(uint256 => uint256) public issuedAt;

    event CertificateMinted(address indexed recipient, uint256 tokenId, CertType certType, string tokenURI);

    constructor() ERC721("Ghadir Certificate", "GHDRNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(
        address recipient,
        CertType _certType,
        string calldata _tokenURI
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        certType[tokenId] = _certType;
        issuedAt[tokenId] = block.timestamp;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit CertificateMinted(recipient, tokenId, _certType, _tokenURI);
        return tokenId;
    }

    // Soulbound — block all transfers except mint (from == 0) and burn (to == 0)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "GhadirNFT: soulbound, non-transferable");
        return super._update(to, tokenId, auth);
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
