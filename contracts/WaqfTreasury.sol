// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WaqfTreasury
 * @notice Permanent Islamic Waqf vault on Celo. Principal is locked forever.
 *         Releasing yield requires 3-of-5 trustee signatures + 1 scholar signature.
 */
contract WaqfTreasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant TRUSTEE_ROLE = keccak256("TRUSTEE_ROLE");
    bytes32 public constant SCHOLAR_ROLE  = keccak256("SCHOLAR_ROLE");

    IERC20 public immutable usdc;

    uint256 public totalPrincipal;
    uint256 public constant TRUSTEE_THRESHOLD = 3;

    struct ReleaseProposal {
        address charity;
        uint256 amount;
        string  purpose;
        uint256 trusteeApprovals;
        bool    scholarApproved;
        bool    executed;
        mapping(address => bool) approvedBy;
    }

    uint256 public proposalCount;
    mapping(uint256 => ReleaseProposal) public proposals;

    event WaqfContribution(address indexed donor, uint256 amount, string waqfName);
    event ProposalCreated(uint256 indexed proposalId, address charity, uint256 amount, string purpose);
    event ProposalApproved(uint256 indexed proposalId, address approver, bool isScholar);
    event FundsReleased(uint256 indexed proposalId, address charity, uint256 amount);

    constructor(address _usdc, address[] memory _trustees, address _scholar) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_trustees.length >= TRUSTEE_THRESHOLD, "Need at least 3 trustees");

        usdc = IERC20(_usdc);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SCHOLAR_ROLE, _scholar);
        for (uint256 i = 0; i < _trustees.length; i++) {
            _grantRole(TRUSTEE_ROLE, _trustees[i]);
        }
    }

    function contributeToWaqf(uint256 amount, string calldata waqfName) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalPrincipal += amount;
        emit WaqfContribution(msg.sender, amount, waqfName);
    }

    function createReleaseProposal(
        address charity,
        uint256 amount,
        string calldata purpose
    ) external onlyRole(TRUSTEE_ROLE) returns (uint256) {
        require(charity != address(0), "Invalid charity");
        require(amount > 0, "Amount must be > 0");
        // Only yield can be released — principal stays locked
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > totalPrincipal, "No yield available");
        require(amount <= balance - totalPrincipal, "Exceeds available yield");

        uint256 id = proposalCount++;
        ReleaseProposal storage p = proposals[id];
        p.charity = charity;
        p.amount  = amount;
        p.purpose = purpose;

        emit ProposalCreated(id, charity, amount, purpose);
        return id;
    }

    function approveTrustee(uint256 proposalId) external onlyRole(TRUSTEE_ROLE) {
        ReleaseProposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(!p.approvedBy[msg.sender], "Already approved");
        p.approvedBy[msg.sender] = true;
        p.trusteeApprovals++;
        emit ProposalApproved(proposalId, msg.sender, false);
    }

    function approveScholar(uint256 proposalId) external onlyRole(SCHOLAR_ROLE) {
        ReleaseProposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(!p.scholarApproved, "Scholar already approved");
        p.scholarApproved = true;
        emit ProposalApproved(proposalId, msg.sender, true);
    }

    function executeFundRelease(uint256 proposalId) external nonReentrant onlyRole(TRUSTEE_ROLE) {
        ReleaseProposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(p.trusteeApprovals >= TRUSTEE_THRESHOLD, "Not enough trustee approvals");
        require(p.scholarApproved, "Scholar approval required");

        uint256 balance = usdc.balanceOf(address(this));
        require(balance > totalPrincipal, "No yield available");
        require(p.amount <= balance - totalPrincipal, "Exceeds available yield");

        p.executed = true;
        usdc.safeTransfer(p.charity, p.amount);
        emit FundsReleased(proposalId, p.charity, p.amount);
    }

    // Called by SadaqahRedemption to release sadaqah directly to a charity
    function releaseSadaqah(address charity, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(charity != address(0), "Invalid charity");
        require(amount > 0, "Amount must be > 0");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > totalPrincipal, "No yield available");
        require(amount <= balance - totalPrincipal, "Exceeds available yield");
        usdc.safeTransfer(charity, amount);
        emit FundsReleased(0, charity, amount);
    }

    function availableYield() external view returns (uint256) {
        uint256 balance = usdc.balanceOf(address(this));
        return balance > totalPrincipal ? balance - totalPrincipal : 0;
    }
}
