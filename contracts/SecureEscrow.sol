// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SecureEscrow
/// @notice Escrow for payments priced in Naira and settled in ETH. The buyer locks the ETH
///         equivalent of a Naira amount, then releases it to the seller once the goods arrive.
/// @dev The Naira price is fixed when the escrow is created, using a rate pushed on-chain by the
///      rate updater. State is always updated before any external call and every function that
///      moves funds is guarded against reentrancy.
contract SecureEscrow is ReentrancyGuard, Ownable {
    enum State {
        None,
        Funded,
        Released,
        Refunded
    }

    struct Escrow {
        address buyer;
        uint96 amount;
        address seller;
        uint64 deadline;
        State state;
        uint64 amountKobo;
    }

    uint64 public constant MAX_DELIVERY_WINDOW = 90 days;
    uint256 public constant MAX_RATE_CHANGE_BPS = 1_000;

    uint256 private constant BPS = 10_000;

    /// @notice Longest time the rate may go without an update before new escrows are refused.
    uint64 public immutable maxRateAge;

    uint256 public escrowCount;

    /// @notice Price of one ETH in kobo (1 Naira = 100 kobo).
    uint256 public koboPerEth;
    uint64 public rateUpdatedAt;
    address public rateUpdater;

    mapping(uint256 => Escrow) private _escrows;

    event EscrowCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint64 amountKobo,
        uint256 amountWei,
        uint64 deadline
    );
    event Released(uint256 indexed id, address indexed seller, uint256 amount);
    event Refunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event RateUpdated(uint256 koboPerEth);
    event RateUpdaterChanged(address indexed updater);

    error ZeroAmount();
    error AmountTooLarge();
    error InvalidSeller();
    error InvalidDeliveryWindow();
    error InvalidRate();
    error InvalidRateAge();
    error InvalidRateUpdater();
    error NotRateUpdater();
    error RateChangeTooLarge(uint256 min, uint256 max);
    error StaleRate();
    error Underfunded(uint256 required);
    error NotBuyer();
    error NotSeller();
    error InvalidState(State current);
    error DeadlineNotReached(uint64 deadline);
    error TransferFailed();

    /// @param updater Account allowed to update the exchange rate.
    /// @param initialRate Initial price of one ETH in kobo.
    /// @param maxRateAge_ Seconds after which an un-refreshed rate is considered stale.
    constructor(address updater, uint256 initialRate, uint64 maxRateAge_) {
        if (updater == address(0)) revert InvalidRateUpdater();
        if (initialRate == 0) revert InvalidRate();
        if (maxRateAge_ == 0) revert InvalidRateAge();

        rateUpdater = updater;
        koboPerEth = initialRate;
        rateUpdatedAt = uint64(block.timestamp);
        maxRateAge = maxRateAge_;

        emit RateUpdaterChanged(updater);
        emit RateUpdated(initialRate);
    }

    /// @notice Updates the ETH price in kobo. A single update may move the rate by at most
    ///         MAX_RATE_CHANGE_BPS in either direction.
    function setRate(uint256 newRate) external {
        if (msg.sender != rateUpdater) revert NotRateUpdater();
        if (newRate == 0) revert InvalidRate();

        uint256 min = (koboPerEth * (BPS - MAX_RATE_CHANGE_BPS)) / BPS;
        uint256 max = (koboPerEth * (BPS + MAX_RATE_CHANGE_BPS)) / BPS;
        if (newRate < min || newRate > max) revert RateChangeTooLarge(min, max);

        koboPerEth = newRate;
        rateUpdatedAt = uint64(block.timestamp);

        emit RateUpdated(newRate);
    }

    /// @notice Replaces the account allowed to update the rate.
    function setRateUpdater(address updater) external onlyOwner {
        if (updater == address(0)) revert InvalidRateUpdater();

        rateUpdater = updater;

        emit RateUpdaterChanged(updater);
    }

    /// @notice ETH, in wei, required to cover an amount in kobo at the current rate.
    function quote(uint64 amountKobo) public view returns (uint256) {
        if (block.timestamp - rateUpdatedAt > maxRateAge) revert StaleRate();
        return Math.mulDiv(amountKobo, 1 ether, koboPerEth, Math.Rounding.Up);
    }

    /// @notice Locks the ETH equivalent of `amountKobo` for the seller. Any value sent above the
    ///         quote is returned to the buyer, so a small buffer can be sent to absorb rate updates.
    /// @param seller Address paid when the buyer releases the funds.
    /// @param amountKobo Price in kobo.
    /// @param deliveryWindow Seconds after which the buyer may reclaim unreleased funds.
    function createEscrow(
        address seller,
        uint64 amountKobo,
        uint64 deliveryWindow
    ) external payable nonReentrant returns (uint256 id) {
        if (amountKobo == 0) revert ZeroAmount();
        if (seller == address(0) || seller == msg.sender) revert InvalidSeller();
        if (deliveryWindow == 0 || deliveryWindow > MAX_DELIVERY_WINDOW) {
            revert InvalidDeliveryWindow();
        }

        uint256 required = quote(amountKobo);
        if (required > type(uint96).max) revert AmountTooLarge();
        if (msg.value < required) revert Underfunded(required);

        uint64 deadline = uint64(block.timestamp) + deliveryWindow;

        id = escrowCount++;
        _escrows[id] = Escrow({
            buyer: msg.sender,
            amount: uint96(required),
            seller: seller,
            deadline: deadline,
            state: State.Funded,
            amountKobo: amountKobo
        });

        emit EscrowCreated(id, msg.sender, seller, amountKobo, required, deadline);

        uint256 excess = msg.value - required;
        if (excess > 0) _transfer(msg.sender, excess);
    }

    /// @notice Buyer confirms receipt and pays the escrowed funds to the seller.
    function release(uint256 id) external nonReentrant {
        Escrow storage e = _escrows[id];
        if (msg.sender != e.buyer) revert NotBuyer();
        if (e.state != State.Funded) revert InvalidState(e.state);

        address seller = e.seller;
        uint256 amount = e.amount;

        e.state = State.Released;

        emit Released(id, seller, amount);
        _transfer(seller, amount);
    }

    /// @notice Seller returns the funds to the buyer before they are released.
    function sellerRefund(uint256 id) external nonReentrant {
        Escrow storage e = _escrows[id];
        if (msg.sender != e.seller) revert NotSeller();
        if (e.state != State.Funded) revert InvalidState(e.state);

        _refund(id, e);
    }

    /// @notice Buyer reclaims funds once the delivery window has elapsed without a release.
    function claimRefund(uint256 id) external nonReentrant {
        Escrow storage e = _escrows[id];
        if (msg.sender != e.buyer) revert NotBuyer();
        if (e.state != State.Funded) revert InvalidState(e.state);
        if (block.timestamp <= e.deadline) revert DeadlineNotReached(e.deadline);

        _refund(id, e);
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return _escrows[id];
    }

    function _refund(uint256 id, Escrow storage e) private {
        address buyer = e.buyer;
        uint256 amount = e.amount;

        e.state = State.Refunded;

        emit Refunded(id, buyer, amount);
        _transfer(buyer, amount);
    }

    function _transfer(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
