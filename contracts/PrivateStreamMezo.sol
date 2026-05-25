// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PrivateStreamMezo
 * @notice Privacy-preserving encrypted video access platform on Mezo.
 * @dev Mezo is a Bitcoin-first EVM-compatible chain where BTC is the native
 *      gas token (18 decimals). This contract is identical in logic to the
 *      Arbitrum version but is deployed on Mezo Testnet (chainId 31611) or
 *      Mezo Mainnet (chainId 31612).
 *
 *      Deploy via Remix:
 *        1. Set compiler to 0.8.24, enable optimizer (200 runs)
 *        2. In "Deploy & Run", select "Injected Provider - MetaMask"
 *        3. Make sure MetaMask is on Mezo Testnet (chainId 31611)
 *        4. Constructor args:
 *             _treasury  = your treasury wallet address
 *             _feeBps    = 1000  (= 10%)
 *             _revenueCapWei = revenue cap in wei (BTC, 18 decimals)
 *                             e.g. for $20 cap at $100,000/BTC:
 *                             0.0002 BTC = 200000000000000 wei
 */
contract PrivateStreamMezo {

    struct Campaign {
        uint256 id;
        address creator;
        string  metadataCID;
        uint256 priceWei;
        uint256 durationSeconds;
        uint256 totalRevenueWei;
        bool    active;
        bool    soldOut;
    }

    address public immutable platformTreasury;
    uint256 public immutable platformFeeBps;
    uint256 public immutable revenueCapWei;
    uint256 private _nextId;

    mapping(uint256 => Campaign)                    public campaigns;
    mapping(address => uint256[])                   public creatorCampaignIds;
    mapping(uint256 => mapping(address => uint256)) public accessExpiry;

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string  cid,
        uint256 price,
        uint256 duration
    );
    event AccessPurchased(
        uint256 indexed id,
        address indexed buyer,
        uint256 amount,
        uint256 expiresAt
    );
    event RevenueCapReached(uint256 indexed id, uint256 total);
    event CampaignDeactivated(uint256 indexed id);

    constructor(
        address _treasury,
        uint256 _feeBps,
        uint256 _revenueCapWei
    ) {
        require(_treasury != address(0), "Bad treasury");
        require(_feeBps <= 5000, "Fee too high");
        platformTreasury = _treasury;
        platformFeeBps   = _feeBps;
        revenueCapWei    = _revenueCapWei;
        _nextId          = 1;
    }

    /**
     * @notice Create a new campaign. One campaign per wallet.
     * @param metadataCID   IPFS CID of the encrypted metadata JSON
     * @param priceWei      Access price in wei (BTC, 18 decimals)
     * @param durationSeconds  How long access lasts after purchase
     */
    function createCampaign(
        string calldata metadataCID,
        uint256 priceWei,
        uint256 durationSeconds
    ) external returns (uint256 id) {
        require(bytes(metadataCID).length > 0, "Empty CID");
        require(priceWei > 0, "Price must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        id = _nextId++;
        campaigns[id] = Campaign(
            id,
            msg.sender,
            metadataCID,
            priceWei,
            durationSeconds,
            0,
            true,
            false
        );
        creatorCampaignIds[msg.sender].push(id);

        emit CampaignCreated(id, msg.sender, metadataCID, priceWei, durationSeconds);
    }

    /**
     * @notice Purchase access to a campaign. Send exactly priceWei BTC.
     * @param id  Campaign ID
     */
    function purchaseAccess(uint256 id) external payable {
        Campaign storage c = campaigns[id];
        require(c.id != 0,               "Not found");
        require(c.active,                "Not active");
        require(!c.soldOut,              "Sold out");
        require(msg.value >= c.priceWei, "Insufficient payment");

        // Refund overpayment
        uint256 payment = c.priceWei;
        if (msg.value > payment) {
            payable(msg.sender).transfer(msg.value - payment);
        }

        // Split: creator gets (100 - fee)%, treasury gets fee%
        uint256 fee     = (payment * platformFeeBps) / 10000;
        uint256 creator = payment - fee;
        payable(c.creator).transfer(creator);
        payable(platformTreasury).transfer(fee);

        // Extend access if already active
        uint256 exp = block.timestamp + c.durationSeconds;
        if (accessExpiry[id][msg.sender] > block.timestamp) {
            exp = accessExpiry[id][msg.sender] + c.durationSeconds;
        }
        accessExpiry[id][msg.sender] = exp;

        c.totalRevenueWei += payment;
        emit AccessPurchased(id, msg.sender, payment, exp);

        // Auto-close when revenue cap is hit
        if (c.totalRevenueWei >= revenueCapWei) {
            c.soldOut = true;
            c.active  = false;
            emit RevenueCapReached(id, c.totalRevenueWei);
        }
    }

    /** @notice Get full campaign data */
    function getCampaign(uint256 id) external view returns (Campaign memory) {
        require(campaigns[id].id != 0, "Not found");
        return campaigns[id];
    }

    /** @notice Check if a buyer has valid, unexpired access */
    function hasAccess(uint256 id, address buyer)
        external
        view
        returns (bool valid, uint256 expiresAt)
    {
        expiresAt = accessExpiry[id][buyer];
        valid     = expiresAt > block.timestamp;
    }

    /** @notice Get all campaign IDs owned by a creator */
    function getCreatorCampaignIds(address creator) external view returns (uint256[] memory) {
        return creatorCampaignIds[creator];
    }

    /** @notice Get the number of campaigns owned by a creator */
    function getCreatorCampaignCount(address creator) external view returns (uint256) {
        return creatorCampaignIds[creator].length;
    }

    /** @notice Total number of campaigns ever created */
    function totalCampaigns() external view returns (uint256) {
        return _nextId - 1;
    }

    /** @notice Creator can deactivate their own campaign */
    function deactivateCampaign(uint256 id) external {
        Campaign storage c = campaigns[id];
        require(c.creator == msg.sender, "Not owner");
        require(c.active, "Already inactive");
        c.active = false;
        emit CampaignDeactivated(id);
    }
}
