// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IERC20 {
    function decimals() external view returns (uint8);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
    function transfer(address _to, uint256 _amount) external returns (bool);
}

contract PayPort {
    IERC20 public immutable usdt;
    uint8 public immutable usdtDecimals;

    uint8 public constant USD_DECIMALS = 8;
    uint256 public constant ONE_USD = 10 ** uint256(USD_DECIMALS);

    uint256 private constant MAX_SLUG_LENGTH = 64;
    uint256 private constant MAX_TITLE_LENGTH = 200;

    constructor(IERC20 usdt_) {
        if (address(usdt_) == address(0)) revert TokenRequired();
        usdt = usdt_;
        usdtDecimals = usdt_.decimals();
    }

    struct PaymentLink {
        address merchant;
        uint64 priceUsdCents;
        uint64 createdAt;
        uint64 expiresAt;
        bool active;
        uint32 paymentCount;
        uint256 totalReceivedWei;
        uint64 totalReceivedUsdCents;
        string title;
        string slug;
    }

    mapping(bytes32 => PaymentLink) private links;

    bytes32[] private linkIds;

    mapping(address => bytes32[]) private merchantLinkIds;

    struct Payment {
        bytes32 linkId;
        address payer;
        uint256 amountWei;
        uint64 priceUsdCents;
        uint64 paidAt;
        uint256 feedUsdPrice;
        int8 feedUsdDecimals;
        uint8 asset;
    }

    Payment[] private payments;

    event PaymentLinkCreated(
        bytes32 indexed linkId,
        address indexed merchant,
        string slug,
        string title,
        uint64 priceUsdCents,
        uint64 expiresAt
    );

    event PaymentReceived(
        bytes32 indexed linkId,
        address indexed merchant,
        address indexed payer,
        uint256 amountWei,
        uint64 priceUsdCents,
        uint256 feedUsdPrice,
        int8 feedUsdDecimals,
        uint64 feedTimestamp,
        uint8 asset
    );

    event PaymentLinkClosed(bytes32 indexed linkId, address indexed merchant);

    error SlugRequired();
    error SlugTooLong();
    error SlugTaken();
    error TitleRequired();
    error TitleTooLong();
    error PriceRequired();
    error ExpiryInPast();
    error UnknownLink();
    error LinkInactive();
    error LinkExpired();
    error NotMerchant();
    error Underpaid(uint256 required, uint256 provided);
    error TokenRequired();
    error TransferFailed();

    function createPaymentLink(
        string calldata slug,
        string calldata title,
        uint64 priceUsdCents,
        uint64 expiresAt
    ) external returns (bytes32 linkId) {
        if (bytes(slug).length == 0) revert SlugRequired();
        if (bytes(slug).length > MAX_SLUG_LENGTH) revert SlugTooLong();
        if (bytes(title).length == 0) revert TitleRequired();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (priceUsdCents == 0) revert PriceRequired();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert ExpiryInPast();

        linkId = keccak256(bytes(slug));
        if (links[linkId].merchant != address(0)) revert SlugTaken();

        links[linkId] = PaymentLink({
            merchant: msg.sender,
            priceUsdCents: priceUsdCents,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            active: true,
            paymentCount: 0,
            totalReceivedWei: 0,
            totalReceivedUsdCents: 0,
            title: title,
            slug: slug
        });

        linkIds.push(linkId);
        merchantLinkIds[msg.sender].push(linkId);

        emit PaymentLinkCreated(linkId, msg.sender, slug, title, priceUsdCents, expiresAt);
    }

    function payToken(string calldata slug, uint256 amount) external {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        _assertPayable(link);

        uint256 required = _requiredAmount(link.priceUsdCents);

        if (amount < required) revert Underpaid(required, amount);

        _settle(link, linkId, msg.sender, required);

        if (!usdt.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        uint256 refund = amount - required;

        if (!usdt.transfer(link.merchant, required)) revert TransferFailed();

        if (refund > 0) {
            if (!usdt.transfer(msg.sender, refund)) revert TransferFailed();
        }
    }

    function closePaymentLink(string calldata slug) external {
        bytes32 linkId = keccak256(bytes(slug));
        PaymentLink storage link = links[linkId];

        if (link.merchant == address(0)) revert UnknownLink();
        if (link.merchant != msg.sender) revert NotMerchant();

        link.active = false;
        emit PaymentLinkClosed(linkId, msg.sender);
    }

    function quoteToken(string calldata slug)
        external
        view
        returns (
            uint256 requiredToken,
            uint256 usdPrice,
            int8 usdDecimals,
            uint64 quoteTime
        )
    {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        _assertQuoteable(link);

        requiredToken = _requiredAmount(link.priceUsdCents);
        usdPrice = ONE_USD;
        usdDecimals = int8(USD_DECIMALS);
        quoteTime = uint64(block.timestamp);
    }

    function getPaymentLink(string calldata slug)
        external
        view
        returns (PaymentLink memory)
    {
        PaymentLink storage link = links[keccak256(bytes(slug))];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function getPaymentLinkById(bytes32 linkId)
        external
        view
        returns (PaymentLink memory)
    {
        PaymentLink storage link = links[linkId];
        if (link.merchant == address(0)) revert UnknownLink();
        return link;
    }

    function linkCount() external view returns (uint256) {
        return linkIds.length;
    }

    function getLinks(uint256 offset, uint256 limit)
        external
        view
        returns (PaymentLink[] memory page, uint256 total)
    {
        total = linkIds.length;

        if (offset >= total || limit == 0) {
            return (new PaymentLink[](0), total);
        }

        uint256 remaining = total - offset;
        uint256 size = remaining < limit ? remaining : limit;

        page = new PaymentLink[](size);

        for (uint256 i = 0; i < size; i++) {
            page[i] = links[linkIds[total - 1 - offset - i]];
        }
    }

    function linkIdAt(uint256 index) external view returns (bytes32) {
        return linkIds[index];
    }

    function paymentCount() external view returns (uint256) {
        return payments.length;
    }

    function getPayments(uint256 offset, uint256 limit)
        external
        view
        returns (Payment[] memory page, string[] memory slugs, uint256 total)
    {
        total = payments.length;

        if (offset >= total || limit == 0) {
            return (new Payment[](0), new string[](0), total);
        }

        uint256 remaining = total - offset;
        uint256 size = remaining < limit ? remaining : limit;

        page = new Payment[](size);
        slugs = new string[](size);

        for (uint256 i = 0; i < size; i++) {
            Payment storage payment = payments[total - 1 - offset - i];
            page[i] = payment;
            slugs[i] = links[payment.linkId].slug;
        }
    }

    function merchantLinkCount(address merchant) external view returns (uint256) {
        return merchantLinkIds[merchant].length;
    }

    function merchantLinkIdAt(address merchant, uint256 index)
        external
        view
        returns (bytes32)
    {
        return merchantLinkIds[merchant][index];
    }

    function _assertPayable(PaymentLink storage link) private view {
        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();
    }

    function _assertQuoteable(PaymentLink storage link) private view {
        if (link.merchant == address(0)) revert UnknownLink();
        if (!link.active) revert LinkInactive();
        if (link.expiresAt != 0 && block.timestamp > link.expiresAt) revert LinkExpired();
    }

    function _settle(
        PaymentLink storage link,
        bytes32 linkId,
        address payer,
        uint256 amount
    ) private {
        link.paymentCount += 1;
        link.totalReceivedWei += amount;
        link.totalReceivedUsdCents += link.priceUsdCents;
        link.active = false;
        emit PaymentLinkClosed(linkId, link.merchant);

        payments.push(
            Payment({
                linkId: linkId,
                payer: payer,
                amountWei: amount,
                priceUsdCents: link.priceUsdCents,
                paidAt: uint64(block.timestamp),
                feedUsdPrice: ONE_USD,
                feedUsdDecimals: int8(USD_DECIMALS),
                asset: 1
            })
        );

        emit PaymentReceived(
            linkId,
            link.merchant,
            payer,
            amount,
            link.priceUsdCents,
            ONE_USD,
            int8(USD_DECIMALS),
            uint64(block.timestamp),
            1
        );
    }

    function _requiredAmount(uint64 priceUsdCents) private view returns (uint256) {
        uint256 scale = 10 ** uint256(usdtDecimals);
        return (uint256(priceUsdCents) * scale + 99) / 100;
    }
}
