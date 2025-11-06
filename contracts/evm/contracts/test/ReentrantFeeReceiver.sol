// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Marketplace} from "../Marketplace.sol";

contract ReentrantFeeReceiver {
    Marketplace public immutable market;
    uint256 public modelId;
    uint8 public kind;
    uint16 public months;
    bool public attempted;

    constructor(Marketplace _market) {
        market = _market;
    }

    function listSelf(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash
    ) external {
        market.listOrUpgrade(
            slug,
            name,
            uri,
            royaltyBps,
            pricePerpetual,
            priceSubscription,
            defaultDurationDays,
            deliveryRightsDefault,
            deliveryModeHint,
            termsHash
        );
    }

    function setParams(uint256 _modelId, uint8 _kind, uint16 _months) external {
        modelId = _modelId;
        kind = _kind;
        months = _months;
    }

    receive() external payable {
        // Try to reenter into buyLicense during fee payout
        if (!attempted) {
            attempted = true;
            try market.buyLicense{value: msg.value}(modelId, kind, months, false) {
                // should not succeed due to nonReentrant
            } catch {
                // expected to revert
            }
        }
    }
}
