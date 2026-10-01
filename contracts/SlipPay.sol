// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IUsdg {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Forwards a due to the payee and keeps a fee of at most 1% for the owner to withdraw.
contract SlipPay {
    address public owner;
    address public immutable usdg;
    uint16 public feeBps;
    uint16 public constant MAX_FEE_BPS = 100;
    uint256 private constant DENOMINATOR = 10_000;
    uint256 private locked = 1;

    error NotOwner();
    error ZeroAddress();
    error ZeroAmount();
    error FeeTooHigh();
    error TransferFailed();
    error Reentrant();

    event Paid(address indexed payer, address indexed payee, uint256 amount, uint256 fee);
    event FeeSet(uint16 feeBps);
    event Withdraw(address indexed to, uint256 amount);
    event OwnerSet(address indexed owner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert Reentrant();
        locked = 2;
        _;
        locked = 1;
    }

    constructor(address usdg_, address owner_, uint16 feeBps_) {
        if (usdg_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        usdg = usdg_;
        owner = owner_;
        feeBps = feeBps_;
    }

    function feeOn(uint256 amount) public view returns (uint256) {
        return (amount * uint256(feeBps)) / DENOMINATOR;
    }

    /// @notice Pull `amount` to `payee` and the fee to this contract. The payer must approve both.
    function pay(address payee, uint256 amount) external nonReentrant {
        if (payee == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 fee = feeOn(amount);
        _pull(msg.sender, payee, amount);
        if (fee > 0) _pull(msg.sender, address(this), fee);
        emit Paid(msg.sender, payee, amount, fee);
    }

    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _send(to, amount);
        emit Withdraw(to, amount);
    }

    function setFeeBps(uint16 next) external onlyOwner {
        if (next > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = next;
        emit FeeSet(next);
    }

    function setOwner(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        owner = next;
        emit OwnerSet(next);
    }

    function _pull(address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = usdg.call(abi.encodeCall(IUsdg.transferFrom, (from, to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _send(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = usdg.call(abi.encodeCall(IUsdg.transfer, (to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
