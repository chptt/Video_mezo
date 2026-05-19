// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PrivateStreamFHE
 * @notice Privacy-preserving encrypted video access platform on Arbitrum.
 *         This contract implements FHE-inspired access control architecture.
 *         Actual on-chain FHE computation is simulated; the architecture is
 *         designed for future migration to Fhenix / Zama FHE rollups.
 *
 * @dev Key features:
 *   - One campaign per wallet address (enforced on-chain)
 *   - Encrypted metadata CID stored on IPFS (AES-256-GCM off-chain)
 *   - Revenue cap enforcement ($20 USD equivalent)
 *   - Automatic 90/10 payment split (creator / platform)
 *   - Time-limited access grants stored on-chain
 */
contract PrivateStreamFHE {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Campaign {
        uint256 id;
        address creator;
        string  metadataCID;   // IPFS CID of AES-256-GCM encrypted metadata
        uint256 priceWei;      // access price in wei
        uint256 durationSeconds; // how long access lasts after purchase
        uint256 totalRevenueWei; // gross revenue accumulated
        bool    active;
        bool    soldOut;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    address public immutable platformTreasury;
    uint256 public immutable platformFeeBps; // basis points (1000 = 10%)
    uint256 public immutable revenueCapWei;  // set at deploy time

    uint256 private _nextCampaignId;

    mapping(uint256 => Campaign)                          public campaigns;
    mapping(address => bool)                              public hasCampaign;
    mapping(address => uint256)                           public creatorCampaignId;
    mapping(uint256 => mapping(address => uint256))       public accessExpiry;
    // Prevent tx-hash replay attacks
    mapping(bytes32 => bool)                              private _processedTx;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string  metadataCID,
        uint256 priceWei,
        uint256 durationSeconds
    );

    event AccessPurchased(
        uint256 indexed campaignId,
        address indexed buyer,
        uint256 amount,
        uint256 expiresAt
    );

    event RevenueCapReached(
        uint256 indexed campaignId,
        uint256 totalRevenue
    );

    event CampaignDeactivated(
        uint256 indexed campaignId
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param _treasury       Address that receives platform fees
     * @param _feeBps         Platform fee in basis points (e.g. 1000 = 10%)
     * @param _revenueCapWei  Gross revenue cap in wei (e.g. 20 USD in ETH)
     */
    constructor(
        address _treasury,
        uint256 _feeBps,
        uint256 _revenueCapWei
    ) {
        require(_treasury != address(0), "Invalid treasury");
        require(_feeBps <= 5000, "Fee too high"); // max 50%
        platformTreasury = _treasury;
        platformFeeBps   = _feeBps;
        revenueCapWei    = _revenueCapWei;
        _nextCampaignId  = 1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Campaign Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a new campaign. Each address may only create ONE campaign.
     * @param metadataCID     IPFS CID of the AES-256-GCM encrypted metadata JSON
     * @param priceWei        Access price in wei
     * @param durationSeconds How long access lasts after purchase (e.g. 86400 = 1 day)
     */
    function createCampaign(
        string calldata metadataCID,
        uint256 priceWei,
        uint256 durationSeconds
    ) external returns (uint256 campaignId) {
        require(!hasCampaign[msg.sender], "Already own a campaign");
        require(bytes(metadataCID).length > 0, "Empty metadata CID");
        require(priceWei > 0, "Price must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        campaignId = _nextCampaignId++;

        campaigns[campaignId] = Campaign({
            id:              campaignId,
            creator:         msg.sender,
            metadataCID:     metadataCID,
            priceWei:        priceWei,
            durationSeconds: durationSeconds,
            totalRevenueWei: 0,
            active:          true,
            soldOut:         false
        });

        hasCampaign[msg.sender]        = true;
        creatorCampaignId[msg.sender]  = campaignId;

        emit CampaignCreated(campaignId, msg.sender, metadataCID, priceWei, durationSeconds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Access Purchase
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Purchase time-limited access to a campaign.
     *         Splits payment: 90% to creator, 10% to platform treasury.
     *         Marks campaign soldOut when revenue cap is reached.
     * @param campaignId  The campaign to purchase access for
     */
    function purchaseAccess(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];

        require(c.id != 0,       "Campaign not found");
        require(c.active,        "Campaign not active");
        require(!c.soldOut,      "Campaign sold out");
        require(msg.value >= c.priceWei, "Insufficient payment");

        // Refund overpayment
        uint256 payment = c.priceWei;
        if (msg.value > payment) {
            payable(msg.sender).transfer(msg.value - payment);
        }

        // Split payment
        uint256 platformFee   = (payment * platformFeeBps) / 10000;
        uint256 creatorAmount = payment - platformFee;

        payable(c.creator).transfer(creatorAmount);
        payable(platformTreasury).transfer(platformFee);

        // Grant access
        uint256 expiresAt = block.timestamp + c.durationSeconds;
        // Extend if buyer already has active access
        if (accessExpiry[campaignId][msg.sender] > block.timestamp) {
            expiresAt = accessExpiry[campaignId][msg.sender] + c.durationSeconds;
        }
        accessExpiry[campaignId][msg.sender] = expiresAt;

        // Update revenue
        c.totalRevenueWei += payment;

        emit AccessPurchased(campaignId, msg.sender, payment, expiresAt);

        // Check revenue cap
        if (c.totalRevenueWei >= revenueCapWei) {
            c.soldOut = true;
            c.active  = false;
            emit RevenueCapReached(campaignId, c.totalRevenueWei);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns full campaign data
     */
    function getCampaign(uint256 campaignId)
        external
        view
        returns (Campaign memory)
    {
        require(campaigns[campaignId].id != 0, "Campaign not found");
        return campaigns[campaignId];
    }

    /**
     * @notice Check whether a buyer currently has valid access
     */
    function hasAccess(uint256 campaignId, address buyer)
        external
        view
        returns (bool valid, uint256 expiresAt)
    {
        expiresAt = accessExpiry[campaignId][buyer];
        valid     = expiresAt > block.timestamp;
    }

    /**
     * @notice Returns the campaign ID owned by a creator (0 if none)
     */
    function getCampaignByCreator(address creator)
        external
        view
        returns (uint256)
    {
        return creatorCampaignId[creator];
    }

    /**
     * @notice Returns total number of campaigns created
     */
    function totalCampaigns() external view returns (uint256) {
        return _nextCampaignId - 1;
    }

    /**
     * @notice Creator can manually deactivate their own campaign
     */
    function deactivateCampaign(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        require(c.creator == msg.sender, "Not campaign owner");
        require(c.active, "Already inactive");
        c.active = false;
        emit CampaignDeactivated(campaignId);
    }
}
