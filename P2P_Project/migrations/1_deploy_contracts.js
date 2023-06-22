const BattleShipGame = artifacts.require("../contracts/BattleShipGame.sol");

module.exports = function (instance) {
    instance.deploy(BattleShipGame);
};