// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract SalawatToken is ERC20, ERC20Burnable, AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant BASE_RATE = 10 * 10**18;
    uint256 public dailyCap = 5000 * 10**18;
    uint256 public multiplier = 100;
    string public specialDay = "";

    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;
    mapping(address => uint256) public lifetimeSalawat;
    mapping(address => bool) public allowedRecipients;

    event SalawatLogged(
        address indexed user,
        uint256 salawatCount,
        uint256 tokensEarned,
        uint256 multiplierUsed,
        uint256 timestamp
    );

    event MultiplierSet(uint256 newMultiplier, string specialDayName);

    constructor() ERC20("Ghadir Token", "GHDR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        allowedRecipients[msg.sender] = true;
    }

    function logSalawat(
        address user,
        uint256 count
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(count > 0 && count <= 1000, "Count: 1-1000");

        uint256 today = block.timestamp / 1 days;
        if (lastMintDay[user] < today) {
            dailyMinted[user] = 0;
            lastMintDay[user] = today;
        }

        uint256 baseEarned = count * BASE_RATE;
        uint256 earned = (baseEarned * multiplier) / 100;

        uint256 remaining = dailyCap - dailyMinted[user];
        if (earned > remaining) earned = remaining;
        if (earned == 0) return;

        dailyMinted[user] += earned;
        lifetimeSalawat[user] += count;
        _mint(user, earned);

        emit SalawatLogged(user, count, earned, multiplier, block.timestamp);
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(
            from == address(0) ||
            to == address(0) ||
            allowedRecipients[to],
            "GHDR: transfer restricted"
        );
        super._update(from, to, amount);
    }

    function setMultiplier(
        uint256 _multiplier,
        string calldata _specialDay
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_multiplier >= 100 && _multiplier <= 1000);
        multiplier = _multiplier;
        specialDay = _specialDay;
        emit MultiplierSet(_multiplier, _specialDay);
    }

    function setAllowedRecipient(
        address addr,
        bool allowed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedRecipients[addr] = allowed;
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }
}