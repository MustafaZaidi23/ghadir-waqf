// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISalawatToken is IERC20 {
    function burn(uint256 amount) external;
}

interface IWaqfTreasury {
    function releaseHadiya(address charity, uint256 amount) external;
}

/**
 * @title HadiyaRedemption
 * @notice Burns GHDR tokens and releases equivalent USDC to a verified charity.
 *         Rate: TOKENS_PER_DOLLAR GHDR = 1 USDC (6 decimals).
 */
contract HadiyaRedemption is Ownable, ReentrancyGuard {

    ISalawatToken public immutable salawatToken;
    IWaqfTreasury public immutable waqfTreasury;

    // 1000 GHDR (18 decimals) = $1 USDC
    uint256 public constant TOKENS_PER_DOLLAR = 1000 * 10**18;
    // USDC uses 6 decimals
    uint256 public constant USDC_DECIMALS = 10**6;

    mapping(address => bool) public verifiedCharities;

    event HadiyaRedeemed(
        address indexed user,
        address indexed charity,
        uint256 tokensBurned,
        uint256 usdcReleased
    );
    event CharityVerified(address indexed charity, bool status);

    constructor(address _salawatToken, address _waqfTreasury) Ownable(msg.sender) {
        require(_salawatToken != address(0), "Invalid token address");
        require(_waqfTreasury != address(0), "Invalid treasury address");
        salawatToken = ISalawatToken(_salawatToken);
        waqfTreasury = IWaqfTreasury(_waqfTreasury);
    }

    function setVerifiedCharity(address charity, bool status) external onlyOwner {
        require(charity != address(0), "Invalid charity address");
        verifiedCharities[charity] = status;
        emit CharityVerified(charity, status);
    }

    /**
     * @notice Redeem GHDR tokens as hadiya. Burns tokens and releases USDC to charity.
     * @param tokenAmount Amount of GHDR to burn (must be a multiple of TOKENS_PER_DOLLAR)
     * @param charity Verified charity wallet to receive USDC
     */
    function redeemHadiya(uint256 tokenAmount, address charity) external nonReentrant {
        require(verifiedCharities[charity], "Charity not verified");
        require(tokenAmount >= TOKENS_PER_DOLLAR, "Minimum 1000 GHDR");
        require(tokenAmount % TOKENS_PER_DOLLAR == 0, "Must be multiple of 1000 GHDR");

        uint256 usdcAmount = (tokenAmount / TOKENS_PER_DOLLAR) * USDC_DECIMALS;

        // Transfer tokens from caller to this contract, then burn
        salawatToken.transferFrom(msg.sender, address(this), tokenAmount);
        salawatToken.burn(tokenAmount);

        // Release equivalent USDC from treasury to charity
        waqfTreasury.releaseHadiya(charity, usdcAmount);

        emit HadiyaRedeemed(msg.sender, charity, tokenAmount, usdcAmount);
    }

    function usdcValueOf(uint256 tokenAmount) external pure returns (uint256) {
        return (tokenAmount / TOKENS_PER_DOLLAR) * USDC_DECIMALS;
    }
}
