// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {SlipPay} from "../contracts/SlipPay.sol";

contract MockUsdg {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract SlipPayTest is Test {
    MockUsdg token;
    SlipPay pay;
    address owner = address(0xA11CE);
    address payer = address(0xB0B);
    address payee = address(0xCAFE);
    uint256 constant DUE = 40_000_000;
    uint256 constant FEE = 200_000;

    function setUp() public {
        token = new MockUsdg();
        pay = new SlipPay(address(token), owner, 50);
        token.mint(payer, DUE + FEE);
        vm.prank(payer);
        token.approve(address(pay), DUE + FEE);
    }

    function test_payeeGetsTheDueAndTheContractKeepsTheFee() public {
        vm.prank(payer);
        pay.pay(payee, DUE);
        assertEq(token.balanceOf(payee), DUE);
        assertEq(token.balanceOf(address(pay)), FEE);
        assertEq(token.balanceOf(payer), 0);
    }

    function test_onlyTheOwnerCanWithdraw() public {
        vm.prank(payer);
        pay.pay(payee, DUE);

        vm.prank(payer);
        vm.expectRevert(SlipPay.NotOwner.selector);
        pay.withdraw(payer, FEE);

        vm.prank(owner);
        pay.withdraw(owner, FEE);
        assertEq(token.balanceOf(owner), FEE);
        assertEq(token.balanceOf(address(pay)), 0);
    }

    function test_feeCannotExceedOnePercent() public {
        vm.prank(owner);
        vm.expectRevert(SlipPay.FeeTooHigh.selector);
        pay.setFeeBps(101);

        vm.prank(owner);
        pay.setFeeBps(100);
        assertEq(pay.feeOn(DUE), 400_000);
    }
}
